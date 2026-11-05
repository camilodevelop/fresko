-- ---------------------------------------------------------------------------
-- Novedades de entrega: el domiciliario no pudo entregar un pedido.
-- El pedido queda "no entregado" y en espera; el domiciliario sigue su ruta y regresa
-- el pedido a la cocina. El equipo de pedidos decide: nuevo intento o cancelar.
-- ---------------------------------------------------------------------------

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pendiente_pago', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'no_entregado', 'cancelado'));

alter table public.order_incidents drop constraint if exists order_incidents_stage_check;
alter table public.order_incidents add constraint order_incidents_stage_check check (stage in ('cocina', 'alistamiento', 'entrega'));
alter table public.order_incidents drop constraint if exists order_incidents_reason_check;
alter table public.order_incidents add constraint order_incidents_reason_check check (reason in (
  'falta_insumo', 'plato_danado', 'sin_preparar', 'incompleto', 'cliente', 'direccion', 'otro',
  'cliente_ausente', 'sin_contacto', 'rechazado', 'danado_transito'
));
-- Foto de evidencia (bucket delivery-proofs, carpeta del pedido).
alter table public.order_incidents add column if not exists photo_path text;

create or replace function public.incident_reason_label(p_reason text)
returns text
language sql
immutable
as $$
  select case p_reason
    when 'falta_insumo' then 'Falta de insumo'
    when 'plato_danado' then 'Plato dañado o mal preparado'
    when 'sin_preparar' then 'No se alcanzó a preparar'
    when 'incompleto' then 'Pedido incompleto'
    when 'cliente' then 'El cliente pidió no entregar'
    when 'direccion' then 'Problema con la dirección'
    when 'cliente_ausente' then 'El cliente no estaba'
    when 'sin_contacto' then 'No contestó'
    when 'rechazado' then 'El cliente rechazó el pedido'
    when 'danado_transito' then 'Se dañó en el camino'
    else 'Otro' end
$$;

/** La ruta termina cuando cada parada quedó entregada, no entregada o cancelada. */
create or replace function public.complete_route_if_done(p_route_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.delivery_routes r set status = 'completada', completed_at = now()
  where r.id = p_route_id and r.status = 'en_camino'
    and not exists (
      select 1 from public.route_stops s join public.orders x on x.id = s.order_id
      where s.route_id = r.id and x.status not in ('entregado', 'no_entregado', 'cancelado')
    );
$$;

create or replace function public.deliver_order(p_order_id uuid, p_photo_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  rt public.delivery_routes%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  select r.* into rt from public.delivery_routes r join public.route_stops s on s.route_id = r.id where s.order_id = o.id;
  if not ((public.has_permission('delivery.deliver') and rt.courier_id = auth.uid()) or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Este pedido no está en tu ruta.';
  end if;
  if o.status <> 'en_camino' then raise exception 'ESTADO' using hint = 'Primero sal a ruta con este pedido.'; end if;
  if coalesce(p_photo_path, '') = '' or p_photo_path not like o.id::text || '/%' then
    raise exception 'FOTO' using hint = 'Toma la foto de la entrega.';
  end if;

  update public.orders
  set status = 'entregado', delivered_at = now(), delivered_by = auth.uid(), delivery_photo_path = p_photo_path, updated_at = now()
  where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'entregado', 'Entregado con foto');
  insert into public.notifications (user_id, kind, title, body, href)
  values (o.user_id, 'success', 'Tu pedido ' || o.code || ' fue entregado', '¡Buen provecho!', '/cuenta/pedidos/' || o.code);
  if rt.id is not null then perform public.complete_route_if_done(rt.id); end if;
end;
$$;

/** El domiciliario no pudo entregar: motivo, explicación y foto opcional. Sigue con su ruta. */
create or replace function public.report_delivery_incident(p_order_id uuid, p_reason text, p_note text, p_photo_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  rt public.delivery_routes%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  select r.* into rt from public.delivery_routes r join public.route_stops s on s.route_id = r.id where s.order_id = o.id;
  if not ((public.has_permission('delivery.deliver') and rt.courier_id = auth.uid()) or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Este pedido no está en tu ruta.';
  end if;
  if o.status <> 'en_camino' then raise exception 'ESTADO' using hint = 'Solo puedes reportar pedidos que llevas en camino.'; end if;
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

/**
 * Resolver una novedad. Liberar: si el pedido no se entregó es un nuevo intento (vuelve a
 * "en preparación", ya preparado y sin canasta); si no, entra al próximo cálculo de rutas.
 * Cancelar cierra todas sus novedades. Las de cocina siguen abiertas hasta prepararse.
 */
create or replace function public.resolve_order_incident(p_order_id uuid, p_resolution text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  if not public.has_permission('orders.manage') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para resolver novedades.';
  end if;
  if p_resolution not in ('liberado', 'cancelado') then raise exception 'RESOLUCION' using hint = 'Acción inválida.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or not o.on_hold then raise exception 'PEDIDO' using hint = 'Este pedido no tiene una novedad pendiente.'; end if;

  update public.order_incidents set resolution = p_resolution, resolved_at = now(), resolved_by = auth.uid()
  where order_id = o.id and resolution is null and (p_resolution = 'cancelado' or stage in ('alistamiento', 'entrega'));
  update public.orders set on_hold = false, updated_at = now() where id = o.id;

  if p_resolution = 'cancelado' then
    update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', coalesce(nullif(trim(p_note), ''), 'Cancelado por novedad'));
    insert into public.notifications (user_id, kind, title, body, href)
    values (o.user_id, 'warning', 'Tu pedido ' || o.code || ' fue cancelado', coalesce(nullif(trim(p_note), ''), ''), '/cuenta/pedidos/' || o.code);
  elsif o.status = 'no_entregado' then
    -- Nuevo intento: sale de la ruta anterior y vuelve como pedido listo sin canasta.
    delete from public.route_stops where order_id = o.id;
    update public.orders set status = 'en_preparacion', packed_at = null, packed_by = null, updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'en_preparacion', 'Nuevo intento de entrega');
    insert into public.notifications (user_id, kind, title, body, href)
    values (o.user_id, 'info', 'Haremos un nuevo intento con tu pedido ' || o.code, 'Te avisamos cuando vaya en camino.', '/cuenta/pedidos/' || o.code);
  else
    insert into public.order_events (order_id, status, note) values (o.id, o.status, 'Novedad resuelta: liberado para una nueva ruta');
  end if;
end;
$$;

-- El equipo de pedidos también puede cancelar un pedido no entregado desde el detalle.
create or replace function public.set_order_status(p_order_id uuid, p_status text, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  allowed text[];
  label text;
begin
  if not public.has_permission('orders.manage') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar el estado de los pedidos.';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;

  allowed := case o.status
    when 'pendiente_pago' then array['cancelado']
    when 'confirmado' then array['en_preparacion', 'cancelado']
    when 'en_preparacion' then array['en_camino', 'cancelado']
    when 'en_camino' then array['entregado']
    when 'no_entregado' then array['cancelado']
    else array[]::text[]
  end;
  if not (p_status = any (allowed)) then
    raise exception 'TRANSICION' using hint = 'Ese cambio de estado no es posible desde el estado actual.';
  end if;

  update public.orders
  set status = p_status,
      cancelled_at = case when p_status = 'cancelado' then now() else cancelled_at end,
      updated_at = now()
  where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, p_status, left(coalesce(p_note, ''), 300));

  label := case p_status
    when 'en_preparacion' then 'se está preparando'
    when 'en_camino' then 'va en camino'
    when 'entregado' then 'fue entregado'
    when 'cancelado' then 'fue cancelado'
  end;
  insert into public.notifications (user_id, kind, title, body, href)
  values (o.user_id,
          case when p_status = 'cancelado' then 'warning' when p_status = 'entregado' then 'success' else 'info' end,
          'Tu pedido ' || o.code || ' ' || label,
          case when p_status = 'en_camino' then 'Llega hoy entre ' || o.slot_label || '.'
               when p_status = 'cancelado' and coalesce(p_note, '') <> '' then p_note
               else '' end,
          '/cuenta/pedidos/' || o.code);
end;
$$;

revoke execute on function public.report_delivery_incident(uuid, text, text, text) from public, anon;
revoke execute on function public.complete_route_if_done(uuid) from public, anon, authenticated;
grant execute on function public.report_delivery_incident(uuid, text, text, text) to authenticated;
