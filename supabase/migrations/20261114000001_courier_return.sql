-- ---------------------------------------------------------------------------
-- Regreso del domiciliario a la cocina. Al terminar todas sus paradas registra que llegó:
-- queda disponible para otra canasta (incluso en la misma franja) y se miden los tiempos
-- reales de la ruta: salida → última entrega → regreso.
-- ---------------------------------------------------------------------------

alter table public.delivery_routes add column if not exists returned_at timestamptz;
alter table public.delivery_routes add column if not exists returned_by uuid references public.profiles (id) on delete set null;

/** El domiciliario tiene una canasta de esa franja y aún no regresa a la cocina. */
create or replace function public.courier_busy(p_courier_id uuid, p_date date, p_slot_id uuid, p_except uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.delivery_routes r
    where r.courier_id = p_courier_id and r.delivery_date = p_date and r.slot_id = p_slot_id
      and r.returned_at is null and (p_except is null or r.id <> p_except)
  );
$$;

/** Llegué a la cocina: cierra la ruta (todas las paradas resueltas) y libera al domiciliario. */
create or replace function public.return_to_kitchen(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  pending integer;
  back integer;
  who text;
begin
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found then raise exception 'RUTA' using hint = 'Ruta no encontrada.'; end if;
  if not ((public.has_permission('delivery.deliver') and rt.courier_id = auth.uid()) or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Esta ruta no está asignada a ti.';
  end if;
  if rt.returned_at is not null then return; end if;
  if rt.status = 'planificada' then raise exception 'ESTADO' using hint = 'Aún no has salido a ruta.'; end if;
  select count(*) into pending from public.route_stops s join public.orders o on o.id = s.order_id
  where s.route_id = rt.id and o.status not in ('entregado', 'no_entregado', 'cancelado');
  if pending > 0 then
    raise exception 'PENDIENTES' using hint = 'Te ' || case when pending = 1 then 'falta 1 pedido' else 'faltan ' || pending || ' pedidos' end
      || ' por entregar o reportar.';
  end if;

  update public.delivery_routes
  set returned_at = now(), returned_by = auth.uid(),
      status = 'completada', completed_at = coalesce(completed_at, now())
  where id = rt.id;

  -- Pedidos no entregados que vuelven con él.
  select count(*) into back from public.route_stops s join public.orders o on o.id = s.order_id
  where s.route_id = rt.id and o.status = 'no_entregado';
  if back > 0 then
    insert into public.order_events (order_id, status, note)
    select o.id, o.status, 'El domiciliario regresó el pedido a la cocina'
    from public.route_stops s join public.orders o on o.id = s.order_id
    where s.route_id = rt.id and o.status = 'no_entregado';
    select coalesce(full_name, 'El domiciliario') into who from public.profiles where id = rt.courier_id;
    perform public.notify_permission('kitchen.prepare', 'warning', who || ' regresó con ' || back || case when back = 1 then ' pedido no entregado' else ' pedidos no entregados' end,
            'Recíbelos en la cocina; el equipo de pedidos decide un nuevo intento o cancelar.', '/admin/novedades?fecha=' || rt.delivery_date);
  end if;
end;
$$;

-- Asignar domiciliario: no puede tener otra canasta de la franja sin haber regresado.
create or replace function public.set_route_courier(p_route_id uuid, p_courier_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  zone uuid;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para asignar domiciliarios.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found then raise exception 'RUTA' using hint = 'Canasta no encontrada.'; end if;
  if rt.status <> 'planificada' then raise exception 'ESTADO' using hint = 'Esta canasta ya salió.'; end if;
  if p_courier_id is not null then
    if not exists (select 1 from public.profiles where id = p_courier_id and active) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario está inactivo.';
    end if;
    select zone_id into zone from public.delivery_slots where id = rt.slot_id;
    if not exists (select 1 from public.courier_assignments ca where ca.user_id = p_courier_id and ca.zone_id = zone and ca.active
                   and (ca.slot_id is null or ca.slot_id = rt.slot_id)) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario no está asignado a esta zona y franja.';
    end if;
    if public.courier_busy(p_courier_id, rt.delivery_date, rt.slot_id, rt.id) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario tiene otra canasta de esta franja y aún no regresa a la cocina.';
    end if;
  end if;
  update public.delivery_routes set courier_id = p_courier_id where id = rt.id;
  update public.route_stops set verified_at = null where route_id = rt.id;
  return rt.packing_started_at is not null;
end;
$$;

/** Recalcular: reemplaza las canastas sin alistar; los domiciliarios que regresaron pueden recibir otra. */
create or replace function public.save_delivery_routes(p_kitchen_id uuid, p_date date, p_slot_id uuid, p_routes jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  s jsonb;
  rid uuid;
  pos integer;
  n integer := 0;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para planear rutas.';
  end if;
  perform pg_advisory_xact_lock(hashtext('routes:' || p_kitchen_id || ':' || p_date || ':' || p_slot_id));
  delete from public.delivery_routes
  where kitchen_id = p_kitchen_id and delivery_date = p_date and slot_id = p_slot_id and status = 'planificada' and packing_started_at is null;

  for r in select * from jsonb_array_elements(p_routes) loop
    if nullif(r->>'courier_id', '') is not null and public.courier_busy((r->>'courier_id')::uuid, p_date, p_slot_id) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario tiene una canasta de esta franja y aún no regresa a la cocina.';
    end if;
    insert into public.delivery_routes (kitchen_id, delivery_date, slot_id, courier_id, method, distance_m, duration_s, polyline)
    values (p_kitchen_id, p_date, p_slot_id, nullif(r->>'courier_id', '')::uuid, coalesce(r->>'method', 'local'),
            coalesce((r->>'distance_m')::integer, 0), coalesce((r->>'duration_s')::integer, 0), nullif(r->>'polyline', ''))
    returning id into rid;
    pos := 0;
    for s in select * from jsonb_array_elements(r->'stops') loop
      continue when exists (select 1 from public.route_stops x where x.order_id = (s->>'order_id')::uuid);
      pos := pos + 1;
      insert into public.route_stops (route_id, order_id, position, seq, eta)
      select rid, o.id, pos, pos, nullif(s->>'eta', '')::timestamptz
      from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) o
      where o.id = (s->>'order_id')::uuid;
      n := n + 1;
    end loop;
  end loop;
  delete from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
    and not exists (select 1 from public.route_stops s where s.route_id = x.id);
  return n;
end;
$$;

revoke execute on function public.courier_busy(uuid, date, uuid, uuid) from public, anon;
revoke execute on function public.return_to_kitchen(uuid) from public, anon;
grant execute on function public.courier_busy(uuid, date, uuid, uuid) to authenticated;
grant execute on function public.return_to_kitchen(uuid) to authenticated;

-- Rutas de días pasados ya terminadas: se dan por regresadas (no bloquean a nadie).
update public.delivery_routes set returned_at = completed_at
where returned_at is null and status = 'completada' and completed_at is not null and delivery_date < public.today_local();

/** El domiciliario confirma de una vez todos los pedidos alistados de su canasta. Devuelve cuántos marcó. */
create or replace function public.verify_route_all(p_route_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  n integer;
begin
  select * into rt from public.delivery_routes where id = p_route_id;
  if not found then raise exception 'RUTA' using hint = 'Ruta no encontrada.'; end if;
  if not (rt.courier_id = auth.uid() or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Esta ruta no está asignada a ti.';
  end if;
  if rt.status <> 'planificada' then raise exception 'ESTADO' using hint = 'La ruta ya salió.'; end if;
  update public.route_stops s set verified_at = now()
  from public.orders o
  where s.route_id = rt.id and o.id = s.order_id and o.packed_at is not null and s.verified_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.verify_route_all(uuid) from public, anon;
grant execute on function public.verify_route_all(uuid) to authenticated;
