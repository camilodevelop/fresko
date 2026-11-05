-- ---------------------------------------------------------------------------
-- Espera en la entrega. El domiciliario avisa que llegó (se notifica al cliente) y empieza
-- a correr el tiempo de espera; solo cuando termina puede reportar que el cliente no salió o no contestó.
-- El tiempo es parametrizable (Configuración → Operación) y también es el tiempo por parada
-- con el que se calculan las canastas.
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, description)
values ('delivery_wait_minutes', '5', 'Minutos que el domiciliario espera al cliente antes de poder reportar que no se pudo entregar.')
on conflict (key) do nothing;

alter table public.route_stops add column if not exists arrived_at timestamptz;

create or replace function public.delivery_wait_minutes()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::integer from public.settings where key = 'delivery_wait_minutes'), 5);
$$;

/** Cambia los minutos de espera (1 a 30). */
create or replace function public.set_delivery_wait_minutes(p_minutes integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('zones.manage') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar la operación.';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 30 then
    raise exception 'MINUTOS' using hint = 'Escribe entre 1 y 30 minutos.';
  end if;
  insert into public.settings (key, value, description, updated_at)
  values ('delivery_wait_minutes', to_jsonb(p_minutes), 'Minutos que el domiciliario espera al cliente antes de poder reportar que no se pudo entregar.', now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

/** El domiciliario llegó: se avisa al cliente y empieza la espera. Devuelve la hora de llegada. */
create or replace function public.mark_arrived(p_order_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  st record;
  mins integer := public.delivery_wait_minutes();
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  select s.route_id, s.arrived_at, r.courier_id into st
  from public.route_stops s join public.delivery_routes r on r.id = s.route_id where s.order_id = o.id;
  if not ((public.has_permission('delivery.deliver') and st.courier_id = auth.uid()) or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Este pedido no está en tu ruta.';
  end if;
  if o.status <> 'en_camino' then raise exception 'ESTADO' using hint = 'Este pedido no va en camino.'; end if;
  if st.arrived_at is not null then return st.arrived_at; end if;

  update public.route_stops set arrived_at = now() where order_id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, o.status, 'El domiciliario llegó y avisó al cliente');
  insert into public.notifications (user_id, kind, title, body, href)
  values (o.user_id, 'info', 'Tu pedido ' || o.code || ' llegó',
          'El domiciliario te espera en la entrada durante ' || mins || ' minutos.', '/cuenta/pedidos/' || o.code);
  return now();
end;
$$;

-- "El cliente no estaba" / "No contestó" solo después de avisar la llegada y esperar el tiempo configurado.
create or replace function public.report_delivery_incident(p_order_id uuid, p_reason text, p_note text, p_photo_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  rt public.delivery_routes%rowtype;
  arrived timestamptz;
  mins integer := public.delivery_wait_minutes();
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  select r.* into rt from public.delivery_routes r join public.route_stops s on s.route_id = r.id where s.order_id = o.id;
  select s.arrived_at into arrived from public.route_stops s where s.order_id = o.id;
  if not ((public.has_permission('delivery.deliver') and rt.courier_id = auth.uid()) or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Este pedido no está en tu ruta.';
  end if;
  if o.status <> 'en_camino' then raise exception 'ESTADO' using hint = 'Solo puedes reportar pedidos que llevas en camino.'; end if;
  -- La espera solo aplica cuando el cliente no sale o no contesta; los demás motivos
  -- (dirección, rechazo, daño, otro) se reportan en cualquier momento. El equipo de pedidos
  -- puede registrarla sin esperar (p. ej. el domiciliario llamó).
  if p_reason in ('cliente_ausente', 'sin_contacto') and not public.has_permission('orders.manage') then
    if arrived is null then
      raise exception 'LLEGADA' using hint = 'Primero avisa que llegaste: el cliente recibe la notificación y empieza la espera.';
    end if;
    if now() < arrived + make_interval(mins => mins) then
      raise exception 'ESPERA' using hint = 'Espera ' || mins || ' minutos desde que avisaste que llegaste.';
    end if;
  end if;
  if p_reason not in ('cliente_ausente', 'sin_contacto', 'direccion', 'rechazado', 'danado_transito', 'otro') then
    raise exception 'MOTIVO' using hint = 'Elige el motivo.';
  end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'NOTA' using hint = 'Explica qué pasó.'; end if;
  if coalesce(p_photo_path, '') <> '' and p_photo_path not like o.id::text || '/%' then
    raise exception 'FOTO' using hint = 'Foto inválida.';
  end if;

  update public.orders set status = 'no_entregado', on_hold = true, updated_at = now() where id = o.id;
  insert into public.order_incidents (order_id, route_id, stage, reason, note, photo_path)
  values (o.id, rt.id, 'entrega', p_reason, trim(p_note), nullif(p_photo_path, ''));
  insert into public.order_events (order_id, status, note)
  values (o.id, 'no_entregado', 'No se pudo entregar: ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
  insert into public.notifications (user_id, kind, title, body, href)
  values (o.user_id, 'warning', 'No pudimos entregar tu pedido ' || o.code,
          'Te contactaremos para coordinar la entrega.', '/cuenta/pedidos/' || o.code);
  perform public.notify_permission('orders.manage', 'warning', 'No entregado: ' || o.code,
          public.incident_reason_label(p_reason) || ': ' || left(trim(p_note), 120), '/admin/pedidos/' || o.code);
  if rt.id is not null then perform public.complete_route_if_done(rt.id); end if;
end;
$$;

revoke execute on function public.delivery_wait_minutes() from public, anon;
revoke execute on function public.set_delivery_wait_minutes(integer) from public, anon;
revoke execute on function public.mark_arrived(uuid) from public, anon;
grant execute on function public.delivery_wait_minutes() to authenticated;
grant execute on function public.set_delivery_wait_minutes(integer) to authenticated;
grant execute on function public.mark_arrived(uuid) to authenticated;
