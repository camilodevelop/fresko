-- ---------------------------------------------------------------------------
-- Máximo de pedidos por canasta (parametrizable, inicia en 12). Las canastas se arman con la
-- ruta óptima hasta llenarse (o hasta que no alcance la franja) y se abre otra; un pedido nuevo
-- no puede entrar a una canasta llena.
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, description)
values ('basket_max_orders', '12', 'Pedidos máximos por canasta (domiciliario por viaje).')
on conflict (key) do nothing;

create or replace function public.basket_max_orders()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::integer from public.settings where key = 'basket_max_orders'), 12);
$$;

/** Cambia el máximo de pedidos por canasta (1 a 50). */
create or replace function public.set_basket_max_orders(p_max integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('zones.manage') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar la operación.';
  end if;
  if p_max is null or p_max < 1 or p_max > 50 then
    raise exception 'MAXIMO' using hint = 'Escribe entre 1 y 50 pedidos.';
  end if;
  insert into public.settings (key, value, description, updated_at)
  values ('basket_max_orders', to_jsonb(p_max), 'Pedidos máximos por canasta (domiciliario por viaje).', now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

/** Agregar un pedido tardío a una canasta que aún no sale y tiene cupo, sin mover las demás paradas. */
create or replace function public.add_order_to_route(p_route_id uuid, p_order_id uuid, p_after_seq numeric, p_extra_m integer, p_extra_s integer, p_eta timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  nxt numeric;
  pos integer;
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
  select count(*) into n from public.route_stops where route_id = rt.id;
  if n >= public.basket_max_orders() then
    raise exception 'LLENA' using hint = 'Esa canasta ya está llena (' || n || ' pedidos; máximo ' || public.basket_max_orders() || '). El pedido va en otra canasta.';
  end if;
  if not exists (select 1 from public.kitchen_orders(rt.kitchen_id, rt.delivery_date, rt.slot_id) o where o.id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'El pedido no es de esta franja o está en espera.';
  end if;
  if exists (select 1 from public.route_stops where order_id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'Ese pedido ya tiene canasta.';
  end if;
  select min(seq) into nxt from public.route_stops where route_id = rt.id and seq > coalesce(p_after_seq, 0);
  select coalesce(max(position), 0) + 1 into pos from public.route_stops where route_id = rt.id;
  insert into public.route_stops (route_id, order_id, position, seq, eta, added_late)
  values (rt.id, p_order_id, pos, case when nxt is null then coalesce(p_after_seq, 0) + 1 else (coalesce(p_after_seq, 0) + nxt) / 2 end, p_eta, true);
  update public.delivery_routes
  set distance_m = distance_m + greatest(0, coalesce(p_extra_m, 0)), duration_s = duration_s + greatest(0, coalesce(p_extra_s, 0)),
      polyline = null
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;

revoke execute on function public.basket_max_orders() from public, anon;
revoke execute on function public.set_basket_max_orders(integer) from public, anon;
grant execute on function public.basket_max_orders() to authenticated;
grant execute on function public.set_basket_max_orders(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Alistar por franja: ninguna canasta se empieza hasta que cocina termine todos los pedidos de
-- la franja que ya están en canastas (o cierre la franja con novedades, que los deja en espera).
-- Los pedidos tardíos aún sin canasta no frenan; las canastas ya empezadas siguen normal.
-- ---------------------------------------------------------------------------

/** Pedidos de la franja (en canastas por salir) que cocina aún no termina. */
create or replace function public.slot_kitchen_pending(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.route_stops s
  join public.delivery_routes r on r.id = s.route_id
  join public.orders o on o.id = s.order_id
  where r.kitchen_id = p_kitchen_id and r.delivery_date = p_date and r.slot_id = p_slot_id and r.status = 'planificada'
    and o.prepared_at is null and o.status in ('confirmado', 'en_preparacion') and not o.on_hold;
$$;

create or replace function public.lock_route_packing(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  n integer;
begin
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found then raise exception 'RUTA' using hint = 'Ruta no encontrada.'; end if;
  if not public.can_pack_route(rt.id) then raise exception 'PERMISO' using hint = 'No tienes permiso para alistar esta canasta.'; end if;
  if rt.status <> 'planificada' then raise exception 'ESTADO' using hint = 'Esta ruta ya salió.'; end if;
  if rt.packing_started_at is not null then return; end if;
  n := public.slot_kitchen_pending(rt.kitchen_id, rt.delivery_date, rt.slot_id);
  if n > 0 then
    raise exception 'COCINA' using hint = 'Cocina aún no termina ' || n || case when n = 1 then ' pedido' else ' pedidos' end
      || ' de esta franja. Las canastas se alistan cuando toda la franja esté lista o cocina la cierre con novedades.';
  end if;
  update public.delivery_routes set packing_started_at = now() where id = rt.id;
end;
$$;

revoke execute on function public.slot_kitchen_pending(uuid, date, uuid) from public, anon;
grant execute on function public.slot_kitchen_pending(uuid, date, uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- Calcular y asignar canastas solo cuando cocina tiene lista la franja (o la cerró con
-- novedades, que deja en espera lo que faltaba). Un pedido tardío entra a una canasta solo
-- cuando ya está preparado.
-- ---------------------------------------------------------------------------

/** Pedidos de la franja que cocina aún no termina (los que están en espera no cuentan). */
create or replace function public.slot_unprepared(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) o where o.prepared_at is null;
$$;
revoke execute on function public.slot_unprepared(uuid, date, uuid) from public, anon;
grant execute on function public.slot_unprepared(uuid, date, uuid) to authenticated;

/** Calcular canastas: solo con la franja lista en cocina; reemplaza las canastas sin alistar y respeta a quien no ha regresado. */
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
  -- Las canastas se calculan cuando cocina terminó la franja (o la cerró con novedades).
  n := public.slot_unprepared(p_kitchen_id, p_date, p_slot_id);
  if n > 0 then
    raise exception 'COCINA' using hint = 'Cocina aún no termina ' || n || case when n = 1 then ' pedido' else ' pedidos' end
      || ' de esta franja. Calcula las canastas cuando todo esté listo o cocina cierre la franja con novedades.';
  end if;
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

/** Agregar un pedido tardío a una canasta que aún no sale y tiene cupo, sin mover las demás paradas. */
create or replace function public.add_order_to_route(p_route_id uuid, p_order_id uuid, p_after_seq numeric, p_extra_m integer, p_extra_s integer, p_eta timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  nxt numeric;
  pos integer;
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
  select count(*) into n from public.route_stops where route_id = rt.id;
  if n >= public.basket_max_orders() then
    raise exception 'LLENA' using hint = 'Esa canasta ya está llena (' || n || ' pedidos; máximo ' || public.basket_max_orders() || '). El pedido va en otra canasta.';
  end if;
  if not exists (select 1 from public.kitchen_orders(rt.kitchen_id, rt.delivery_date, rt.slot_id) o where o.id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'El pedido no es de esta franja o está en espera.';
  end if;
  if exists (select 1 from public.orders where id = p_order_id and prepared_at is null) then
    raise exception 'COCINA' using hint = 'Ese pedido aún está en cocina: se agrega a una canasta cuando esté listo.';
  end if;
  if exists (select 1 from public.route_stops where order_id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'Ese pedido ya tiene canasta.';
  end if;
  select min(seq) into nxt from public.route_stops where route_id = rt.id and seq > coalesce(p_after_seq, 0);
  select coalesce(max(position), 0) + 1 into pos from public.route_stops where route_id = rt.id;
  insert into public.route_stops (route_id, order_id, position, seq, eta, added_late)
  values (rt.id, p_order_id, pos, case when nxt is null then coalesce(p_after_seq, 0) + 1 else (coalesce(p_after_seq, 0) + nxt) / 2 end, p_eta, true);
  update public.delivery_routes
  set distance_m = distance_m + greatest(0, coalesce(p_extra_m, 0)), duration_s = duration_s + greatest(0, coalesce(p_extra_s, 0)),
      polyline = null
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;


-- ---------------------------------------------------------------------------
-- Pedidos con novedad de cocina abierta: no bloquean calcular ni alistar la franja, y no entran
-- a ninguna canasta hasta que cocina los prepare (ahí aparecen como pedidos nuevos).
-- ---------------------------------------------------------------------------

/** El pedido tiene una novedad de cocina sin resolver (faltantes por preparar). */
create or replace function public.has_open_kitchen_incident(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.order_incidents n where n.order_id = p_order_id and n.stage = 'cocina' and n.resolution is null);
$$;

/** Pedidos de la franja que cocina no ha terminado y no tienen novedad (estos sí bloquean). */
create or replace function public.slot_unprepared(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) o
  where o.prepared_at is null and not public.has_open_kitchen_incident(o.id);
$$;

/** Pedidos de la franja en canastas por salir que cocina aún no termina (sin contar los que tienen novedad). */
create or replace function public.slot_kitchen_pending(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.route_stops s
  join public.delivery_routes r on r.id = s.route_id
  join public.orders o on o.id = s.order_id
  where r.kitchen_id = p_kitchen_id and r.delivery_date = p_date and r.slot_id = p_slot_id and r.status = 'planificada'
    and o.prepared_at is null and o.status in ('confirmado', 'en_preparacion') and not o.on_hold
    and not public.has_open_kitchen_incident(o.id);
$$;

revoke execute on function public.has_open_kitchen_incident(uuid) from public, anon;
grant execute on function public.has_open_kitchen_incident(uuid) to authenticated;

-- Solo los pedidos ya preparados entran a las canastas.
/** Calcular canastas: solo con la franja lista en cocina; reemplaza las canastas sin alistar y respeta a quien no ha regresado. */
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
  -- Las canastas se calculan cuando cocina terminó la franja (o la cerró con novedades).
  n := public.slot_unprepared(p_kitchen_id, p_date, p_slot_id);
  if n > 0 then
    raise exception 'COCINA' using hint = 'Cocina aún no termina ' || n || case when n = 1 then ' pedido' else ' pedidos' end
      || ' de esta franja. Calcula las canastas cuando todo esté listo o cocina cierre la franja con novedades.';
  end if;
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
      where o.id = (s->>'order_id')::uuid and o.prepared_at is not null;
      n := n + 1;
    end loop;
  end loop;
  delete from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
    and not exists (select 1 from public.route_stops s where s.route_id = x.id);
  return n;
end;
$$;


-- ---------------------------------------------------------------------------
-- Se alista lo que ya está preparado (decisión del 6 nov): calcular y alistar canastas no espera
-- a que cocina termine la franja. Solo los pedidos preparados entran a las canastas; los demás
-- (en cocina o con novedad) aparecen como pedidos nuevos cuando cocina los termina.
-- ---------------------------------------------------------------------------

/** Calcular canastas en cualquier momento: solo entran los pedidos ya preparados; reemplaza las canastas sin alistar y respeta a quien no ha regresado. */
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
      where o.id = (s->>'order_id')::uuid and o.prepared_at is not null;
      n := n + 1;
    end loop;
  end loop;
  delete from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
    and not exists (select 1 from public.route_stops s where s.route_id = x.id);
  return n;
end;
$$;

create or replace function public.lock_route_packing(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
begin
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found then raise exception 'RUTA' using hint = 'Ruta no encontrada.'; end if;
  if not public.can_pack_route(rt.id) then raise exception 'PERMISO' using hint = 'No tienes permiso para alistar esta canasta.'; end if;
  if rt.status <> 'planificada' then raise exception 'ESTADO' using hint = 'Esta ruta ya salió.'; end if;
  if rt.packing_started_at is not null then return; end if;
  -- Cada pedido se empaca solo si está preparado (pack_order); la canasta no espera al resto de la franja.
  update public.delivery_routes set packing_started_at = now() where id = rt.id;
end;
$$;


-- ---------------------------------------------------------------------------
-- La etiqueta ya no lleva número de parada (ni domiciliario): las paradas se renumeran solas
-- 1, 2, 3… en el orden real de entrega cada vez que la canasta cambia (pedido nuevo, novedad).
-- ---------------------------------------------------------------------------

create or replace function public.renumber_route(p_route_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.route_stops s set position = x.rn
  from (select order_id, row_number() over (order by seq, position) as rn from public.route_stops where route_id = p_route_id) x
  where s.route_id = p_route_id and s.order_id = x.order_id and s.position <> x.rn;
$$;

create or replace function public.route_stops_renumber()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform public.renumber_route(new.route_id); end if;
  if tg_op in ('DELETE', 'UPDATE') and (tg_op = 'DELETE' or old.route_id <> new.route_id) then perform public.renumber_route(old.route_id); end if;
  return null;
end;
$$;

drop trigger if exists route_stops_renumber on public.route_stops;
create trigger route_stops_renumber after insert or delete or update of seq, route_id on public.route_stops
for each row execute function public.route_stops_renumber();

revoke execute on function public.renumber_route(uuid) from public, anon, authenticated;

/** Agregar un pedido tardío a una canasta que aún no sale y tiene cupo, en el punto de la ruta donde menos la alarga. */
create or replace function public.add_order_to_route(p_route_id uuid, p_order_id uuid, p_after_seq numeric, p_extra_m integer, p_extra_s integer, p_eta timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  nxt numeric;
  pos integer;
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
  select count(*) into n from public.route_stops where route_id = rt.id;
  if n >= public.basket_max_orders() then
    raise exception 'LLENA' using hint = 'Esa canasta ya está llena (' || n || ' pedidos; máximo ' || public.basket_max_orders() || '). El pedido va en otra canasta.';
  end if;
  if not exists (select 1 from public.kitchen_orders(rt.kitchen_id, rt.delivery_date, rt.slot_id) o where o.id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'El pedido no es de esta franja o está en espera.';
  end if;
  if exists (select 1 from public.orders where id = p_order_id and prepared_at is null) then
    raise exception 'COCINA' using hint = 'Ese pedido aún está en cocina: se agrega a una canasta cuando esté listo.';
  end if;
  if exists (select 1 from public.route_stops where order_id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'Ese pedido ya tiene canasta.';
  end if;
  select min(seq) into nxt from public.route_stops where route_id = rt.id and seq > coalesce(p_after_seq, 0);
  insert into public.route_stops (route_id, order_id, position, seq, eta, added_late)
  values (rt.id, p_order_id, 1, case when nxt is null then coalesce(p_after_seq, 0) + 1 else (coalesce(p_after_seq, 0) + nxt) / 2 end, p_eta, true);
  -- El trigger renumera las paradas en el orden de entrega: esta es su parada definitiva.
  select position into pos from public.route_stops where order_id = p_order_id;
  update public.delivery_routes
  set distance_m = distance_m + greatest(0, coalesce(p_extra_m, 0)), duration_s = duration_s + greatest(0, coalesce(p_extra_s, 0)),
      polyline = null
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;

-- Renumerar las canastas existentes (las que quedaron con huecos o con paradas tardías al final).
do $$ declare r record; begin for r in select id from public.delivery_routes loop perform public.renumber_route(r.id); end loop; end $$;


-- ---------------------------------------------------------------------------
-- Como la etiqueta ya no lleva parada, las canastas se arman con todos los pedidos de la franja
-- (preparados o no). En alistamiento cada pedido muestra si sigue en cocina y solo se empaca
-- cuando está preparado (pack_order).
-- ---------------------------------------------------------------------------

/** Calcular canastas en cualquier momento con todos los pedidos de la franja (preparados o no); reemplaza las canastas sin alistar y respeta a quien no ha regresado. */
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

/** Agregar un pedido tardío a una canasta que aún no sale y tiene cupo, en el punto de la ruta donde menos la alarga. */
create or replace function public.add_order_to_route(p_route_id uuid, p_order_id uuid, p_after_seq numeric, p_extra_m integer, p_extra_s integer, p_eta timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  nxt numeric;
  pos integer;
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
  select count(*) into n from public.route_stops where route_id = rt.id;
  if n >= public.basket_max_orders() then
    raise exception 'LLENA' using hint = 'Esa canasta ya está llena (' || n || ' pedidos; máximo ' || public.basket_max_orders() || '). El pedido va en otra canasta.';
  end if;
  if not exists (select 1 from public.kitchen_orders(rt.kitchen_id, rt.delivery_date, rt.slot_id) o where o.id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'El pedido no es de esta franja o está en espera.';
  end if;
  if exists (select 1 from public.route_stops where order_id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'Ese pedido ya tiene canasta.';
  end if;
  select min(seq) into nxt from public.route_stops where route_id = rt.id and seq > coalesce(p_after_seq, 0);
  insert into public.route_stops (route_id, order_id, position, seq, eta, added_late)
  values (rt.id, p_order_id, 1, case when nxt is null then coalesce(p_after_seq, 0) + 1 else (coalesce(p_after_seq, 0) + nxt) / 2 end, p_eta, true);
  -- El trigger renumera las paradas en el orden de entrega: esta es su parada definitiva.
  select position into pos from public.route_stops where order_id = p_order_id;
  update public.delivery_routes
  set distance_m = distance_m + greatest(0, coalesce(p_extra_m, 0)), duration_s = duration_s + greatest(0, coalesce(p_extra_s, 0)),
      polyline = null
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;


-- ---------------------------------------------------------------------------
-- Los pedidos con novedad de cocina abierta no van en canastas: se excluyen al calcular, salen de
-- su canasta por salir al registrar la novedad y no se pueden agregar. Cuando cocina prepara los
-- faltantes, la novedad se soluciona y el pedido aparece como pedido nuevo sin canasta.
-- ---------------------------------------------------------------------------

/**
 * Registra unidades de una línea que no se pudieron preparar. Salen primero de la tanda en curso
 * y, si ya estaban listas (p. ej. se dañaron), de las preparadas. Quedan por preparar.
 */
create or replace function public.report_kitchen_incident(p_order_item_id uuid, p_quantity integer, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it public.order_items%rowtype;
  o public.orders%rowtype;
  l record;
  remaining integer;
  take integer;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para registrar novedades.';
  end if;
  select * into it from public.order_items where id = p_order_item_id for update;
  if not found then raise exception 'PLATO' using hint = 'Plato no encontrado.'; end if;
  select * into o from public.orders where id = it.order_id for update;
  if o.status not in ('confirmado', 'en_preparacion') then raise exception 'ESTADO' using hint = 'Este pedido ya salió a ruta.'; end if;
  if o.packed_at is not null then raise exception 'EMPACADO' using hint = 'Este pedido ya está empacado: repórtalo desde Alistamiento.'; end if;
  if coalesce(p_quantity, 0) < 1 or p_quantity > it.quantity then raise exception 'CANTIDAD' using hint = 'Cantidad inválida.'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'NOTA' using hint = 'Explica qué pasó con el plato.'; end if;

  remaining := p_quantity;
  -- 1) Unidades en una tanda en curso: salen de ella (la tanda sigue con el resto).
  for l in
    select pbi.batch_id, pbi.quantity from public.prep_batch_items pbi join public.prep_batches b on b.id = pbi.batch_id
    where pbi.order_item_id = it.id and b.status = 'en_preparacion' for update of pbi
  loop
    exit when remaining = 0;
    take := least(remaining, l.quantity);
    if take = l.quantity then
      delete from public.prep_batch_items where batch_id = l.batch_id and order_item_id = it.id;
    else
      update public.prep_batch_items set quantity = quantity - take where batch_id = l.batch_id and order_item_id = it.id;
    end if;
    update public.prep_batches set quantity = quantity - take where id = l.batch_id;
    update public.prep_batches set status = 'cancelado', finished_at = now() where id = l.batch_id and quantity <= 0;
    remaining := remaining - take;
  end loop;
  -- 2) Unidades ya preparadas que se perdieron (dañadas).
  if remaining > 0 and it.prepared_qty > 0 then
    take := least(remaining, it.prepared_qty);
    update public.order_items set prepared_qty = prepared_qty - take where id = it.id;
  end if;

  update public.order_items set prepared_at = null where id = it.id and prepared_qty < quantity;
  update public.orders set prepared_at = null, updated_at = now() where id = o.id
    and exists (select 1 from public.order_items x where x.order_id = o.id and x.prepared_qty < x.quantity);

  -- Un pedido con novedad no va en canastas: sale de la canasta por salir (las paradas se renumeran solas).
  delete from public.route_stops s using public.delivery_routes r
  where s.order_id = o.id and r.id = s.route_id and r.status = 'planificada';
  insert into public.order_incidents (order_id, stage, order_item_id, item_name, quantity, reason, note)
  values (o.id, 'cocina', it.id, it.name, p_quantity, p_reason, trim(p_note));
  insert into public.order_events (order_id, status, note)
  values (o.id, o.status, 'Novedad en cocina: ' || p_quantity || ' × ' || it.name || ' sin preparar. ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
  perform public.notify_permission('orders.manage', 'warning', 'Novedad en cocina: ' || o.code,
          p_quantity || ' × ' || it.name || ' · ' || public.incident_reason_label(p_reason) || ': ' || left(trim(p_note), 100), '/admin/pedidos/' || o.code);
end;
$$;

/** Calcular canastas en cualquier momento con todos los pedidos de la franja (preparados o no), menos los que tienen novedad de cocina abierta; reemplaza las canastas sin alistar y respeta a quien no ha regresado. */
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
      where o.id = (s->>'order_id')::uuid and not public.has_open_kitchen_incident(o.id);
      if found then n := n + 1; end if;  -- solo cuenta los pedidos que sí entraron
    end loop;
  end loop;
  delete from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
    and not exists (select 1 from public.route_stops s where s.route_id = x.id);
  return n;
end;
$$;

/** Agregar un pedido tardío a una canasta que aún no sale y tiene cupo, en el punto de la ruta donde menos la alarga. */
create or replace function public.add_order_to_route(p_route_id uuid, p_order_id uuid, p_after_seq numeric, p_extra_m integer, p_extra_s integer, p_eta timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  nxt numeric;
  pos integer;
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
  select count(*) into n from public.route_stops where route_id = rt.id;
  if n >= public.basket_max_orders() then
    raise exception 'LLENA' using hint = 'Esa canasta ya está llena (' || n || ' pedidos; máximo ' || public.basket_max_orders() || '). El pedido va en otra canasta.';
  end if;
  if not exists (select 1 from public.kitchen_orders(rt.kitchen_id, rt.delivery_date, rt.slot_id) o where o.id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'El pedido no es de esta franja o está en espera.';
  end if;
  if public.has_open_kitchen_incident(p_order_id) then
    raise exception 'NOVEDAD' using hint = 'Ese pedido tiene una novedad de cocina abierta: entra a una canasta cuando cocina lo prepare.';
  end if;
  if exists (select 1 from public.route_stops where order_id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'Ese pedido ya tiene canasta.';
  end if;
  select min(seq) into nxt from public.route_stops where route_id = rt.id and seq > coalesce(p_after_seq, 0);
  insert into public.route_stops (route_id, order_id, position, seq, eta, added_late)
  values (rt.id, p_order_id, 1, case when nxt is null then coalesce(p_after_seq, 0) + 1 else (coalesce(p_after_seq, 0) + nxt) / 2 end, p_eta, true);
  -- El trigger renumera las paradas en el orden de entrega: esta es su parada definitiva.
  select position into pos from public.route_stops where order_id = p_order_id;
  update public.delivery_routes
  set distance_m = distance_m + greatest(0, coalesce(p_extra_m, 0)), duration_s = duration_s + greatest(0, coalesce(p_extra_s, 0)),
      polyline = null
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;

-- Pedidos que ya tenían una novedad de cocina abierta dentro de una canasta por salir (registrada
-- antes de esta regla): salen de la canasta; las paradas se renumeran solas.
delete from public.route_stops s
using public.delivery_routes r, public.orders o
where r.id = s.route_id and o.id = s.order_id and r.status = 'planificada' and o.packed_at is null
  and public.has_open_kitchen_incident(o.id);


-- ---------------------------------------------------------------------------
-- Una canasta existe solo si tiene al menos un pedido: si se queda sin pedidos antes de salir
-- (novedad, cierre con novedad…), se elimina sola; y no puede salir a ruta vacía.
-- ---------------------------------------------------------------------------

create or replace function public.route_stops_renumber()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform public.renumber_route(new.route_id); end if;
  if tg_op in ('DELETE', 'UPDATE') and (tg_op = 'DELETE' or old.route_id <> new.route_id) then
    perform public.renumber_route(old.route_id);
    -- Canasta que se quedó sin pedidos y no ha salido: se elimina.
    delete from public.delivery_routes r
    where r.id = old.route_id and r.status = 'planificada'
      and not exists (select 1 from public.route_stops s where s.route_id = r.id);
  end if;
  return null;
end;
$$;

/** Para salir: todo empacado y verificado por el domiciliario. */
create or replace function public.start_delivery_route(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  o record;
begin
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found then raise exception 'RUTA' using hint = 'Ruta no encontrada.'; end if;
  if not ((public.has_permission('delivery.deliver') and rt.courier_id = auth.uid()) or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'Esta ruta no está asignada a ti.';
  end if;
  if rt.status <> 'planificada' then raise exception 'ESTADO' using hint = 'Esta ruta ya salió.'; end if;
  if not exists (select 1 from public.route_stops where route_id = rt.id) then
    raise exception 'VACIA' using hint = 'Esta canasta no tiene pedidos: no puede salir.';
  end if;
  if exists (select 1 from public.route_stops s join public.orders x on x.id = s.order_id where s.route_id = rt.id and x.packed_at is null and x.status <> 'cancelado') then
    raise exception 'PENDIENTES' using hint = 'Hay pedidos de esta ruta que aún no están alistados.';
  end if;
  if exists (select 1 from public.route_stops s join public.orders x on x.id = s.order_id where s.route_id = rt.id and s.verified_at is null and x.status <> 'cancelado') then
    raise exception 'VERIFICAR' using hint = 'Verifica todos los pedidos de tu canasta antes de salir.';
  end if;

  update public.delivery_routes set status = 'en_camino', started_at = now() where id = rt.id;
  for o in
    select x.* from public.route_stops s join public.orders x on x.id = s.order_id
    where s.route_id = rt.id and x.status in ('confirmado', 'en_preparacion')
  loop
    update public.orders set status = 'en_camino', updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'en_camino', 'Salió a ruta');
    insert into public.notifications (user_id, kind, title, body, href)
    values (o.user_id, 'info', 'Tu pedido ' || o.code || ' va en camino', 'Llega hoy entre ' || o.slot_label || '.', '/cuenta/pedidos/' || o.code);
  end loop;
end;
$$;

-- Canastas vacías que quedaron por salir: se eliminan.
delete from public.delivery_routes r
where r.status = 'planificada' and not exists (select 1 from public.route_stops s where s.route_id = r.id);


-- ---------------------------------------------------------------------------
-- Una canasta recibe pedidos nuevos mientras no esté lista para salir (todo empacado) y tenga cupo.
-- ---------------------------------------------------------------------------

/** Agregar un pedido tardío a una canasta que aún no sale y tiene cupo, en el punto de la ruta donde menos la alarga. */
create or replace function public.add_order_to_route(p_route_id uuid, p_order_id uuid, p_after_seq numeric, p_extra_m integer, p_extra_s integer, p_eta timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rt public.delivery_routes%rowtype;
  nxt numeric;
  pos integer;
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
  select count(*) into n from public.route_stops where route_id = rt.id;
  -- Canasta lista para salir (todo empacado): ya no recibe pedidos.
  if n > 0 and not exists (select 1 from public.route_stops s join public.orders o on o.id = s.order_id where s.route_id = rt.id and o.packed_at is null) then
    raise exception 'LISTA' using hint = 'Esa canasta ya está lista para salir. El pedido va en otra canasta.';
  end if;
  if n >= public.basket_max_orders() then
    raise exception 'LLENA' using hint = 'Esa canasta ya está llena (' || n || ' pedidos; máximo ' || public.basket_max_orders() || '). El pedido va en otra canasta.';
  end if;
  if not exists (select 1 from public.kitchen_orders(rt.kitchen_id, rt.delivery_date, rt.slot_id) o where o.id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'El pedido no es de esta franja o está en espera.';
  end if;
  if public.has_open_kitchen_incident(p_order_id) then
    raise exception 'NOVEDAD' using hint = 'Ese pedido tiene una novedad de cocina abierta: entra a una canasta cuando cocina lo prepare.';
  end if;
  if exists (select 1 from public.route_stops where order_id = p_order_id) then
    raise exception 'PEDIDO' using hint = 'Ese pedido ya tiene canasta.';
  end if;
  select min(seq) into nxt from public.route_stops where route_id = rt.id and seq > coalesce(p_after_seq, 0);
  insert into public.route_stops (route_id, order_id, position, seq, eta, added_late)
  values (rt.id, p_order_id, 1, case when nxt is null then coalesce(p_after_seq, 0) + 1 else (coalesce(p_after_seq, 0) + nxt) / 2 end, p_eta, true);
  -- El trigger renumera las paradas en el orden de entrega: esta es su parada definitiva.
  select position into pos from public.route_stops where order_id = p_order_id;
  update public.delivery_routes
  set distance_m = distance_m + greatest(0, coalesce(p_extra_m, 0)), duration_s = duration_s + greatest(0, coalesce(p_extra_s, 0)),
      polyline = null
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;

-- Ya no existe "cerrar la franja con novedades" en Cocina: una novedad de cocina no deja el pedido en
-- espera (sus faltantes siguen en Cocina). Los pedidos que quedaron en espera solo por eso vuelven.
update public.orders o set on_hold = false, updated_at = now()
where o.on_hold and o.status in ('confirmado', 'en_preparacion')
  and exists (select 1 from public.order_incidents n where n.order_id = o.id and n.stage = 'cocina' and n.resolution is null)
  and not exists (select 1 from public.order_incidents n where n.order_id = o.id and n.stage <> 'cocina' and n.resolution is null);
