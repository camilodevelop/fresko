-- FRESKO · Fase 5: cocina, alistamiento y rutas.
--
--   · Cocinas con ubicación; cada zona de cobertura se atiende desde una cocina.
--   · Domiciliarios asignados por zona y franja (varios por zona para crecer).
--   · Tandas de cocina: se agrupan platos iguales por franja; los armados van uno a uno.
--     Miden el tiempo de preparación y al terminar descuentan el inventario.
--   · Rutas por domiciliario con paradas en orden; el empaque va al revés de la ruta.
--   · Entrega con foto de evidencia.

-- ---------------------------------------------------------------------------
-- Cocinas y domiciliarios
-- ---------------------------------------------------------------------------

create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.zones add column kitchen_id uuid references public.kitchens (id) on delete set null;

create table public.courier_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  -- null = todas las franjas de la zona
  slot_id uuid references public.delivery_slots (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index courier_assignments_unique on public.courier_assignments (user_id, zone_id, coalesce(slot_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.kitchens enable row level security;
alter table public.courier_assignments enable row level security;
create policy "kitchens read" on public.kitchens for select using (public.has_permission('admin.access'));
create policy "kitchens write" on public.kitchens for all using (public.has_permission('zones.manage')) with check (public.has_permission('zones.manage'));
create policy "couriers read" on public.courier_assignments for select using (public.has_permission('admin.access'));
create policy "couriers write" on public.courier_assignments for all using (public.has_permission('zones.manage')) with check (public.has_permission('zones.manage'));

-- Cocina inicial (ubicación aproximada en Kennedy: ajústala en Configuración → Operación).
insert into public.kitchens (name, address, lat, lng) values ('Cocina Kennedy', 'Kennedy, Bogotá', 4.6237, -74.1588);
update public.zones set kitchen_id = (select id from public.kitchens where name = 'Cocina Kennedy') where kitchen_id is null;

-- El domiciliario de prueba queda asignado a todas las zonas (si existe).
insert into public.courier_assignments (user_id, zone_id)
select u.id, z.id from auth.users u cross join public.zones z where u.email = 'domicilios@fresko.test'
on conflict do nothing;

-- Tamaño de etiqueta (mm): ancho × alto
insert into public.settings (key, value, description)
values ('label_size', '"100x50"', 'Tamaño de la etiqueta de cocina en milímetros (ancho x alto)')
on conflict (key) do nothing;

-- Cocina y domicilios necesitan ver los pedidos que preparan y entregan.
drop policy "orders read" on public.orders;
create policy "orders read" on public.orders for select
  using (user_id = auth.uid() or public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver'));
drop policy "order items read" on public.order_items;
create policy "order items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver'))));
drop policy "order events read" on public.order_events;
create policy "order events read" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver'))));

-- ---------------------------------------------------------------------------
-- Tandas de cocina
-- ---------------------------------------------------------------------------

create table public.prep_batches (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens (id) on delete cascade,
  delivery_date date not null,
  slot_id uuid not null references public.delivery_slots (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  kind text not null check (kind in ('lote', 'armado')),
  quantity integer not null check (quantity > 0),
  status text not null default 'en_preparacion' check (status in ('en_preparacion', 'listo', 'cancelado')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer,
  started_by uuid references public.profiles (id) on delete set null default auth.uid(),
  finished_by uuid references public.profiles (id) on delete set null
);
create index prep_batches_day_idx on public.prep_batches (kitchen_id, delivery_date, slot_id);

alter table public.order_items add column batch_id uuid references public.prep_batches (id) on delete set null;
alter table public.order_items add column prepared_at timestamptz;
create index order_items_batch_idx on public.order_items (batch_id);

alter table public.orders add column prepared_at timestamptz;
alter table public.orders add column delivered_at timestamptz;
alter table public.orders add column delivery_photo_path text;
alter table public.orders add column delivered_by uuid references public.profiles (id) on delete set null;

alter table public.prep_batches enable row level security;
create policy "prep batches read" on public.prep_batches for select
  using (public.has_permission('kitchen.prepare') or public.has_permission('orders.view'));

-- Tiempo promedio por plato (últimos 60 días)
create or replace view public.prep_stats
with (security_invoker = true)
as
select product_id, kind,
       count(*)::integer as batches,
       sum(quantity)::integer as units,
       round(sum(duration_seconds)::numeric / nullif(sum(quantity), 0))::integer as seconds_per_unit
from public.prep_batches
where status = 'listo' and duration_seconds is not null and finished_at > now() - interval '60 days'
group by product_id, kind;

/** Pedidos que se preparan en una cocina un día y franja (confirmados o en preparación). */
create or replace function public.kitchen_orders(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns setof public.orders
language sql
stable
security definer
set search_path = public
as $$
  select o.* from public.orders o
  join public.zones z on z.id = o.zone_id
  where z.kitchen_id = p_kitchen_id and o.delivery_date = p_date and o.slot_id = p_slot_id
    and o.status in ('confirmado', 'en_preparacion');
$$;

/**
 * Inicia una tanda. Sin p_order_item_id toma todos los platos pendientes de ese producto en la
 * franja (receta fija); con p_order_item_id prepara un armado puntual.
 */
create or replace function public.start_prep_batch(
  p_kitchen_id uuid,
  p_date date,
  p_slot_id uuid,
  p_product_id uuid,
  p_order_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  batch uuid;
  qty integer;
  prod public.products%rowtype;
  pid uuid;
  o record;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para preparar pedidos.';
  end if;

  if p_order_item_id is not null then
    select i.quantity, i.product_id into qty, pid
    from public.order_items i
    join public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) ko on ko.id = i.order_id
    where i.id = p_order_item_id and i.batch_id is null;
    if qty is null then raise exception 'PLATO' using hint = 'Ese plato ya se está preparando o no es de esta franja.'; end if;
    select * into prod from public.products where id = pid;
    insert into public.prep_batches (kitchen_id, delivery_date, slot_id, product_id, name, kind, quantity)
    values (p_kitchen_id, p_date, p_slot_id, prod.id, coalesce(prod.name, 'Armado'), 'armado', qty)
    returning id into batch;
    update public.order_items set batch_id = batch where id = p_order_item_id;
  else
    select * into prod from public.products where id = p_product_id;
    if not found then raise exception 'PRODUCTO' using hint = 'Producto no encontrado.'; end if;
    select coalesce(sum(i.quantity), 0) into qty
    from public.order_items i
    join public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) ko on ko.id = i.order_id
    where i.product_id = p_product_id and i.batch_id is null and jsonb_array_length(i.options) = 0;
    if qty = 0 then raise exception 'VACIO' using hint = 'No hay platos pendientes de este producto en la franja.'; end if;
    insert into public.prep_batches (kitchen_id, delivery_date, slot_id, product_id, name, kind, quantity)
    values (p_kitchen_id, p_date, p_slot_id, prod.id, prod.name, 'lote', qty)
    returning id into batch;
    update public.order_items i set batch_id = batch
    from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) ko
    where ko.id = i.order_id and i.product_id = p_product_id and i.batch_id is null and jsonb_array_length(i.options) = 0;
  end if;

  -- Los pedidos que entran a cocina pasan a "en preparación" (ya no se pueden cambiar).
  for o in
    select distinct ord.id from public.orders ord join public.order_items i on i.order_id = ord.id
    where i.batch_id = batch and ord.status = 'confirmado'
  loop
    update public.orders set status = 'en_preparacion', updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'en_preparacion', 'En cocina');
  end loop;

  return batch;
end;
$$;

/** Termina la tanda: tiempo, consumo de inventario y pedidos listos para alistar. */
create or replace function public.finish_prep_batch(p_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.prep_batches%rowtype;
  secs integer;
  r record;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para preparar pedidos.';
  end if;
  select * into b from public.prep_batches where id = p_batch_id for update;
  if not found or b.status <> 'en_preparacion' then raise exception 'TANDA' using hint = 'Esta tanda ya no está en preparación.'; end if;

  secs := greatest(1, extract(epoch from now() - b.started_at)::integer);
  update public.prep_batches
  set status = 'listo', finished_at = now(), duration_seconds = secs, finished_by = auth.uid()
  where id = b.id;
  update public.order_items set prepared_at = now() where batch_id = b.id;

  -- Consumo: receta fija × cantidad, o las opciones del armador × cantidad.
  for r in
    select ingredient_id, sum(qty) as qty from (
      select ri.ingredient_id, ri.quantity * i.quantity as qty
      from public.order_items i
      join public.recipe_items ri on ri.product_id = i.product_id
      join public.products p on p.id = i.product_id and p.kind = 'fixed'
      where i.batch_id = b.id
      union all
      select bo.ingredient_id, bo.quantity * i.quantity
      from public.order_items i
      cross join lateral jsonb_array_elements(i.options) opt
      join public.builder_options bo on bo.id = (opt->>'id')::uuid
      where i.batch_id = b.id and bo.ingredient_id is not null and bo.quantity > 0
    ) x
    group by ingredient_id
    having sum(qty) > 0
  loop
    insert into public.inventory_movements (ingredient_id, kind, quantity, reason, note)
    values (r.ingredient_id, 'consumo', -r.qty, 'preparacion', b.name || ' × ' || b.quantity || ' · ' || to_char(b.delivery_date, 'DD/MM'));
  end loop;

  -- Un pedido queda listo cuando todos sus platos están preparados.
  update public.orders o set prepared_at = now(), updated_at = now()
  where o.prepared_at is null
    and o.id in (select order_id from public.order_items where batch_id = b.id)
    and not exists (select 1 from public.order_items x where x.order_id = o.id and x.prepared_at is null);

  return secs;
end;
$$;

create or replace function public.cancel_prep_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.prep_batches%rowtype;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para preparar pedidos.';
  end if;
  select * into b from public.prep_batches where id = p_batch_id for update;
  if not found or b.status <> 'en_preparacion' then raise exception 'TANDA' using hint = 'Esta tanda ya no está en preparación.'; end if;
  update public.order_items set batch_id = null where batch_id = b.id;
  update public.prep_batches set status = 'cancelado', finished_at = now() where id = b.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rutas y entregas
-- ---------------------------------------------------------------------------

create table public.delivery_routes (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens (id) on delete cascade,
  delivery_date date not null,
  slot_id uuid not null references public.delivery_slots (id) on delete cascade,
  courier_id uuid references public.profiles (id) on delete set null,
  status text not null default 'planificada' check (status in ('planificada', 'en_camino', 'completada')),
  -- 'google' (Routes API) o 'local' (algoritmo propio)
  method text not null default 'local',
  distance_m integer not null default 0,
  duration_s integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index delivery_routes_day_idx on public.delivery_routes (delivery_date, slot_id, kitchen_id);

create table public.route_stops (
  route_id uuid not null references public.delivery_routes (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  position integer not null check (position > 0),
  eta timestamptz,
  primary key (route_id, order_id)
);
create unique index route_stops_order_idx on public.route_stops (order_id);

alter table public.delivery_routes enable row level security;
alter table public.route_stops enable row level security;
create policy "routes read" on public.delivery_routes for select
  using (courier_id = auth.uid() or public.has_permission('orders.view') or public.has_permission('kitchen.prepare'));
create policy "route stops read" on public.route_stops for select
  using (exists (select 1 from public.delivery_routes r where r.id = route_id
                 and (r.courier_id = auth.uid() or public.has_permission('orders.view') or public.has_permission('kitchen.prepare'))));

/**
 * Guarda las rutas calculadas de una cocina, día y franja (reemplaza las que no han salido).
 *   p_routes: [{ courier_id, method, distance_m, duration_s, stops: [{ order_id, eta }] }]
 */
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
  delete from public.delivery_routes
  where kitchen_id = p_kitchen_id and delivery_date = p_date and slot_id = p_slot_id and status = 'planificada';

  for r in select * from jsonb_array_elements(p_routes) loop
    insert into public.delivery_routes (kitchen_id, delivery_date, slot_id, courier_id, method, distance_m, duration_s)
    values (p_kitchen_id, p_date, p_slot_id, nullif(r->>'courier_id', '')::uuid, coalesce(r->>'method', 'local'),
            coalesce((r->>'distance_m')::integer, 0), coalesce((r->>'duration_s')::integer, 0))
    returning id into rid;
    pos := 0;
    for s in select * from jsonb_array_elements(r->'stops') loop
      pos := pos + 1;
      insert into public.route_stops (route_id, order_id, position, eta)
      select rid, o.id, pos, nullif(s->>'eta', '')::timestamptz
      from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) o
      where o.id = (s->>'order_id')::uuid;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;

/** El domiciliario sale a ruta: sus pedidos pasan a "en camino" y se avisa a cada cliente. */
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
  if exists (select 1 from public.route_stops s join public.orders x on x.id = s.order_id where s.route_id = rt.id and x.prepared_at is null and x.status <> 'cancelado') then
    raise exception 'PENDIENTES' using hint = 'Hay pedidos de esta ruta que aún no están listos en cocina.';
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

/** Entrega con foto de evidencia (ruta en el bucket delivery-proofs). */
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

  if rt.id is not null and not exists (
    select 1 from public.route_stops s join public.orders x on x.id = s.order_id
    where s.route_id = rt.id and x.status not in ('entregado', 'cancelado')
  ) then
    update public.delivery_routes set status = 'completada', completed_at = now() where id = rt.id;
  end if;
end;
$$;

-- Fotos de entrega (privadas): las sube el domiciliario; las ve el equipo y el dueño del pedido.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proofs', 'delivery-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "delivery proofs insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-proofs' and (public.has_permission('delivery.deliver') or public.has_permission('orders.manage')));
create policy "delivery proofs read" on storage.objects for select to authenticated
  using (bucket_id = 'delivery-proofs' and (
    public.has_permission('orders.view') or public.has_permission('delivery.deliver')
    or exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[1] and o.user_id = auth.uid())
  ));

revoke execute on function public.kitchen_orders(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function public.start_prep_batch(uuid, date, uuid, uuid, uuid) from public, anon;
revoke execute on function public.finish_prep_batch(uuid) from public, anon;
revoke execute on function public.cancel_prep_batch(uuid) from public, anon;
revoke execute on function public.save_delivery_routes(uuid, date, uuid, jsonb) from public, anon;
revoke execute on function public.start_delivery_route(uuid) from public, anon;
revoke execute on function public.deliver_order(uuid, text) from public, anon;
grant execute on function public.start_prep_batch(uuid, date, uuid, uuid, uuid) to authenticated;
grant execute on function public.finish_prep_batch(uuid) to authenticated;
grant execute on function public.cancel_prep_batch(uuid) to authenticated;
grant execute on function public.save_delivery_routes(uuid, date, uuid, jsonb) to authenticated;
grant execute on function public.start_delivery_route(uuid) to authenticated;
grant execute on function public.deliver_order(uuid, text) to authenticated;

alter publication supabase_realtime add table public.prep_batches;
alter publication supabase_realtime add table public.delivery_routes;

-- Alerta de inventario: avisa al cruzar el mínimo y también al agotarse
-- (antes, un ingrediente que ya estaba bajo podía llegar a cero sin avisar).
create or replace function public.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_label text := case new.unit when 'g' then 'g' when 'ml' then 'ml' else 'un' end;
  crossed_min boolean := new.min_stock > 0 and new.stock < new.min_stock and old.stock >= old.min_stock;
  ran_out boolean := new.stock <= 0 and old.stock > 0;
begin
  if crossed_min or ran_out then
    insert into public.notifications (user_id, kind, title, body, href)
    select distinct ur.user_id,
           case when new.stock <= 0 then 'alert' else 'warning' end,
           case when new.stock <= 0 then 'Sin stock: ' else 'Stock bajo: ' end || new.name,
           case when new.stock < 0
             then 'Faltan ' || replace(to_char(round(-new.stock), 'FM999,999,990'), ',', '.') || ' ' || unit_label || ' según lo preparado. Registra la compra o un ajuste.'
             else 'Quedan ' || replace(to_char(round(greatest(new.stock, 0)), 'FM999,999,990'), ',', '.') || ' ' || unit_label
                  || ' (mínimo ' || replace(to_char(round(new.min_stock), 'FM999,999,990'), ',', '.') || ' ' || unit_label || ').' end,
           '/admin/inventario'
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where rp.permission_key = 'inventory.view';
  end if;
  return new;
end;
$$;

-- Trazado de la ruta por las calles (polilínea codificada de Google) para dibujarla en el mapa.
alter table public.delivery_routes add column polyline text;

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
  delete from public.delivery_routes
  where kitchen_id = p_kitchen_id and delivery_date = p_date and slot_id = p_slot_id and status = 'planificada';

  for r in select * from jsonb_array_elements(p_routes) loop
    insert into public.delivery_routes (kitchen_id, delivery_date, slot_id, courier_id, method, distance_m, duration_s, polyline)
    values (p_kitchen_id, p_date, p_slot_id, nullif(r->>'courier_id', '')::uuid, coalesce(r->>'method', 'local'),
            coalesce((r->>'distance_m')::integer, 0), coalesce((r->>'duration_s')::integer, 0), nullif(r->>'polyline', ''))
    returning id into rid;
    pos := 0;
    for s in select * from jsonb_array_elements(r->'stops') loop
      pos := pos + 1;
      insert into public.route_stops (route_id, order_id, position, eta)
      select rid, o.id, pos, nullif(s->>'eta', '')::timestamptz
      from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) o
      where o.id = (s->>'order_id')::uuid;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Empaque por pedido (alistamiento): la cocina prepara por plato; aquí se arma
-- cada pedido en el orden de la canasta y se le pone su etiqueta (4 × 6 in).
-- ---------------------------------------------------------------------------

alter table public.orders add column packed_at timestamptz;
alter table public.orders add column packed_by uuid references public.profiles (id) on delete set null;

update public.settings set value = '"102x152"', description = 'Tamaño de la etiqueta por pedido en milímetros (4 × 6 pulgadas)' where key = 'label_size';

/** Marca un pedido como empacado (o lo desmarca). Solo si ya está listo en cocina. */
create or replace function public.pack_order(p_order_id uuid, p_packed boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para empacar pedidos.';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  if o.status not in ('confirmado', 'en_preparacion') then
    raise exception 'ESTADO' using hint = 'Este pedido ya salió a ruta.';
  end if;
  if p_packed and o.prepared_at is null then
    raise exception 'COCINA' using hint = 'Aún faltan platos de este pedido en cocina.';
  end if;
  update public.orders
  set packed_at = case when p_packed then now() end,
      packed_by = case when p_packed then auth.uid() end,
      updated_at = now()
  where id = o.id;
  if p_packed then
    insert into public.order_events (order_id, status, note) values (o.id, o.status, 'Empacado');
  end if;
end;
$$;

revoke execute on function public.pack_order(uuid, boolean) from public, anon;
grant execute on function public.pack_order(uuid, boolean) to authenticated;

-- Para salir a ruta, todos los pedidos deben estar empacados.
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
  if exists (select 1 from public.route_stops s join public.orders x on x.id = s.order_id where s.route_id = rt.id and x.packed_at is null and x.status <> 'cancelado') then
    raise exception 'PENDIENTES' using hint = 'Hay pedidos de esta ruta que aún no están empacados.';
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

-- Cocina y equipo de pedidos ven el nombre de los domiciliarios (alistamiento y etiquetas).
create policy "couriers visible to operations" on public.profiles for select
  using (
    (public.has_permission('kitchen.prepare') or public.has_permission('orders.view'))
    and (exists (select 1 from public.courier_assignments ca where ca.user_id = profiles.id)
         or exists (select 1 from public.delivery_routes r where r.courier_id = profiles.id))
  );

/** Empaca de una vez todos los pedidos listos de una canasta. Devuelve cuántos quedaron empacados. */
create or replace function public.pack_route_orders(p_route_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para empacar pedidos.';
  end if;
  with done as (
    update public.orders o
    set packed_at = now(), packed_by = auth.uid(), updated_at = now()
    from public.route_stops s
    where s.route_id = p_route_id and s.order_id = o.id
      and o.packed_at is null and o.prepared_at is not null and o.status in ('confirmado', 'en_preparacion')
    returning o.id, o.status
  )
  insert into public.order_events (order_id, status, note) select id, status, 'Empacado' from done;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.pack_route_orders(uuid) from public, anon;
grant execute on function public.pack_route_orders(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Novedades de alistamiento: un pedido que no se pudo empacar sale de la ruta
-- (para que la canasta pueda salir) y queda en espera con su explicación.
-- ---------------------------------------------------------------------------

create table public.order_incidents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  route_id uuid references public.delivery_routes (id) on delete set null,
  stage text not null default 'alistamiento' check (stage in ('alistamiento')),
  reason text not null check (reason in ('falta_insumo', 'plato_danado', 'sin_preparar', 'incompleto', 'cliente', 'direccion', 'otro')),
  note text not null check (length(trim(note)) >= 3 and length(note) <= 500),
  resolution text check (resolution in ('liberado', 'cancelado')),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index order_incidents_order_idx on public.order_incidents (order_id);
create index order_incidents_day_idx on public.order_incidents (created_at);

alter table public.order_incidents enable row level security;
create policy "incidents read" on public.order_incidents for select
  using (public.has_permission('orders.view') or public.has_permission('kitchen.prepare'));

-- Pedido en espera por una novedad: no entra al calcular rutas hasta que se libere.
alter table public.orders add column on_hold boolean not null default false;

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
    else 'Otro' end
$$;

/** Registra la novedad, saca el pedido de su ruta (sin renumerar: las etiquetas ya están impresas) y lo deja en espera. */
create or replace function public.report_packing_incident(p_order_id uuid, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  rid uuid;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para registrar novedades.';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  if o.status not in ('confirmado', 'en_preparacion') then raise exception 'ESTADO' using hint = 'Este pedido ya salió a ruta.'; end if;
  if o.packed_at is not null then raise exception 'EMPACADO' using hint = 'Este pedido ya está empacado: deshaz el empaque primero.'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'NOTA' using hint = 'Explica qué pasó con el pedido.'; end if;

  select s.route_id into rid from public.route_stops s join public.delivery_routes r on r.id = s.route_id
  where s.order_id = o.id and r.status = 'planificada';

  insert into public.order_incidents (order_id, route_id, reason, note) values (o.id, rid, p_reason, trim(p_note));
  delete from public.route_stops where order_id = o.id and route_id = rid;
  update public.orders set on_hold = true, updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note)
  values (o.id, o.status, 'Novedad en alistamiento: ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
  perform public.notify_permission('orders.manage', 'warning', 'Novedad en ' || o.code,
          public.incident_reason_label(p_reason) || ': ' || left(trim(p_note), 120), '/admin/pedidos/' || o.code);
end;
$$;

/** El equipo de pedidos resuelve la novedad: libera el pedido para una nueva ruta o lo cancela. */
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
  where order_id = o.id and resolution is null;
  update public.orders set on_hold = false, updated_at = now() where id = o.id;
  if p_resolution = 'cancelado' then
    perform public.set_order_status(o.id, 'cancelado', coalesce(nullif(trim(p_note), ''), 'Cancelado por novedad'));
  else
    insert into public.order_events (order_id, status, note) values (o.id, o.status, 'Novedad resuelta: liberado para una nueva ruta');
  end if;
end;
$$;

revoke execute on function public.report_packing_incident(uuid, text, text) from public, anon;
revoke execute on function public.resolve_order_incident(uuid, text, text) from public, anon;
grant execute on function public.report_packing_incident(uuid, text, text) to authenticated;
grant execute on function public.resolve_order_incident(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------------
-- Novedades de cocina por unidades. Ej.: tanda de 10 ensaladas de pollo, se acaba el pollo
-- en la 8 → 2 quedan sin preparar. Esas unidades vuelven a "por preparar" (con la novedad
-- abierta) y el pedido sigue en su ruta sin poder empacarse. Si llega el insumo y se preparan
-- antes de cerrar la canasta, la novedad queda solucionada sola; si no, en alistamiento se
-- cierra la canasta con novedad y el pedido queda en espera.
-- ---------------------------------------------------------------------------

alter table public.order_incidents drop constraint if exists order_incidents_stage_check;
alter table public.order_incidents add constraint order_incidents_stage_check check (stage in ('cocina', 'alistamiento'));
alter table public.order_incidents drop constraint if exists order_incidents_resolution_check;
alter table public.order_incidents add constraint order_incidents_resolution_check check (resolution in ('liberado', 'cancelado', 'solucionado'));
alter table public.order_incidents add column if not exists order_item_id uuid references public.order_items (id) on delete set null;
alter table public.order_incidents add column if not exists item_name text;
alter table public.order_incidents add column if not exists quantity integer check (quantity > 0);

-- Unidades de cada línea en cada tanda (una línea puede repartirse entre varias tandas).
create table if not exists public.prep_batch_items (
  batch_id uuid not null references public.prep_batches (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  primary key (batch_id, order_item_id)
);
create index if not exists prep_batch_items_item_idx on public.prep_batch_items (order_item_id);
alter table public.prep_batch_items enable row level security;
drop policy if exists "batch items read" on public.prep_batch_items;
create policy "batch items read" on public.prep_batch_items for select
  using (public.has_permission('kitchen.prepare') or public.has_permission('orders.view'));

alter table public.order_items add column if not exists prepared_qty integer not null default 0 check (prepared_qty >= 0);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_items' and column_name = 'batch_id') then
    insert into public.prep_batch_items (batch_id, order_item_id, quantity)
    select batch_id, id, quantity from public.order_items where batch_id is not null
    on conflict do nothing;
    update public.order_items set prepared_qty = quantity where prepared_at is not null;
    alter table public.order_items drop column batch_id;
  end if;
end $$;

/** Unidades de la línea que están en una tanda en curso. */
create or replace function public.item_in_progress(p_order_item_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(l.quantity), 0)::integer
  from public.prep_batch_items l join public.prep_batches b on b.id = l.batch_id
  where l.order_item_id = p_order_item_id and b.status = 'en_preparacion';
$$;

-- Los pedidos en espera no entran a nuevas tandas.
create or replace function public.kitchen_orders(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns setof public.orders
language sql
stable
security definer
set search_path = public
as $$
  select o.* from public.orders o
  join public.zones z on z.id = o.zone_id
  where z.kitchen_id = p_kitchen_id and o.delivery_date = p_date and o.slot_id = p_slot_id
    and o.status in ('confirmado', 'en_preparacion') and not o.on_hold;
$$;

/** Inicia una tanda con las unidades pendientes (de un producto, o de un armado puntual). */
create or replace function public.start_prep_batch(
  p_kitchen_id uuid,
  p_date date,
  p_slot_id uuid,
  p_product_id uuid,
  p_order_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  batch uuid;
  qty integer;
  it public.order_items%rowtype;
  prod public.products%rowtype;
  o record;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para preparar pedidos.';
  end if;
  -- Varios cocineros a la vez: se toma la franja en turno para que dos tandas no se lleven las mismas unidades.
  perform pg_advisory_xact_lock(hashtext('prep:' || p_kitchen_id || ':' || p_date || ':' || p_slot_id));

  if p_order_item_id is not null then
    select i.* into it from public.order_items i
    join public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) ko on ko.id = i.order_id
    where i.id = p_order_item_id;
    qty := coalesce(it.quantity - it.prepared_qty - public.item_in_progress(it.id), 0);
    if it.id is null or qty <= 0 then raise exception 'PLATO' using hint = 'Ese plato ya se está preparando o no es de esta franja.'; end if;
    select * into prod from public.products where id = it.product_id;
    insert into public.prep_batches (kitchen_id, delivery_date, slot_id, product_id, name, kind, quantity)
    values (p_kitchen_id, p_date, p_slot_id, prod.id, coalesce(prod.name, it.name), 'armado', qty)
    returning id into batch;
    insert into public.prep_batch_items (batch_id, order_item_id, quantity) values (batch, it.id, qty);
  else
    select * into prod from public.products where id = p_product_id;
    if not found then raise exception 'PRODUCTO' using hint = 'Producto no encontrado.'; end if;
    insert into public.prep_batches (kitchen_id, delivery_date, slot_id, product_id, name, kind, quantity)
    values (p_kitchen_id, p_date, p_slot_id, prod.id, prod.name, 'lote', 1)
    returning id into batch;
    insert into public.prep_batch_items (batch_id, order_item_id, quantity)
    select batch, x.id, x.pending from (
      select i.id, i.quantity - i.prepared_qty - public.item_in_progress(i.id) as pending
      from public.order_items i
      join public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) ko on ko.id = i.order_id
      where i.product_id = p_product_id and jsonb_array_length(i.options) = 0
    ) x where x.pending > 0;
    select sum(quantity) into qty from public.prep_batch_items where batch_id = batch;
    if qty is null then raise exception 'VACIO' using hint = 'No hay platos pendientes de este producto en la franja.'; end if;
    update public.prep_batches set quantity = qty where id = batch;
  end if;

  -- Los pedidos que entran a cocina pasan a "en preparación" (ya no se pueden cambiar).
  for o in
    select distinct ord.id from public.orders ord
    join public.order_items i on i.order_id = ord.id
    join public.prep_batch_items l on l.order_item_id = i.id
    where l.batch_id = batch and ord.status = 'confirmado'
  loop
    update public.orders set status = 'en_preparacion', updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'en_preparacion', 'En cocina');
  end loop;

  return batch;
end;
$$;

/** Termina la tanda: tiempo, consumo de inventario, unidades listas y novedades solucionadas. */
create or replace function public.finish_prep_batch(p_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.prep_batches%rowtype;
  secs integer;
  r record;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para preparar pedidos.';
  end if;
  select * into b from public.prep_batches where id = p_batch_id for update;
  if not found or b.status <> 'en_preparacion' then raise exception 'TANDA' using hint = 'Esta tanda ya no está en preparación.'; end if;

  secs := greatest(1, extract(epoch from now() - b.started_at)::integer);
  update public.prep_batches
  set status = 'listo', finished_at = now(), duration_seconds = secs, finished_by = auth.uid()
  where id = b.id;

  update public.order_items i set prepared_qty = least(i.quantity, i.prepared_qty + l.quantity)
  from public.prep_batch_items l where l.batch_id = b.id and l.order_item_id = i.id;
  update public.order_items i set prepared_at = now()
  from public.prep_batch_items l where l.batch_id = b.id and l.order_item_id = i.id and i.prepared_qty >= i.quantity;

  -- Consumo: receta fija o las opciones del armador, por las unidades de esta tanda.
  for r in
    select ingredient_id, sum(qty) as qty from (
      select ri.ingredient_id, ri.quantity * l.quantity as qty
      from public.prep_batch_items l
      join public.order_items i on i.id = l.order_item_id
      join public.recipe_items ri on ri.product_id = i.product_id
      join public.products p on p.id = i.product_id and p.kind = 'fixed'
      where l.batch_id = b.id
      union all
      select bo.ingredient_id, bo.quantity * l.quantity
      from public.prep_batch_items l
      join public.order_items i on i.id = l.order_item_id
      cross join lateral jsonb_array_elements(i.options) opt
      join public.builder_options bo on bo.id = (opt->>'id')::uuid
      where l.batch_id = b.id and bo.ingredient_id is not null and bo.quantity > 0
    ) x
    group by ingredient_id
    having sum(qty) > 0
  loop
    insert into public.inventory_movements (ingredient_id, kind, quantity, reason, note)
    values (r.ingredient_id, 'consumo', -r.qty, 'preparacion', b.name || ' × ' || b.quantity || ' · ' || to_char(b.delivery_date, 'DD/MM'));
  end loop;

  -- Novedades de cocina cuyas unidades faltantes ya se prepararon.
  for r in
    update public.order_incidents n set resolution = 'solucionado', resolved_at = now(), resolved_by = auth.uid()
    from public.order_items i
    where n.order_item_id = i.id and n.stage = 'cocina' and n.resolution is null and i.prepared_qty >= i.quantity
      and i.id in (select order_item_id from public.prep_batch_items where batch_id = b.id)
    returning n.order_id, i.name
  loop
    insert into public.order_events (order_id, status, note)
    select r.order_id, status, 'Novedad solucionada en cocina: se prepararon los faltantes de ' || r.name from public.orders where id = r.order_id;
  end loop;

  -- Un pedido queda listo cuando todas sus unidades están preparadas.
  update public.orders o set prepared_at = now(), updated_at = now()
  where o.prepared_at is null
    and o.id in (select i.order_id from public.order_items i join public.prep_batch_items l on l.order_item_id = i.id where l.batch_id = b.id)
    and not exists (select 1 from public.order_items x where x.order_id = o.id and x.prepared_qty < x.quantity);

  return secs;
end;
$$;

create or replace function public.cancel_prep_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.prep_batches%rowtype;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para preparar pedidos.';
  end if;
  select * into b from public.prep_batches where id = p_batch_id for update;
  if not found or b.status <> 'en_preparacion' then raise exception 'TANDA' using hint = 'Esta tanda ya no está en preparación.'; end if;
  -- Las unidades vuelven a pendientes (ya no cuentan como "en curso").
  update public.prep_batches set status = 'cancelado', finished_at = now() where id = b.id;
end;
$$;

drop function if exists public.report_kitchen_incident(uuid, text, text);

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

  insert into public.order_incidents (order_id, stage, order_item_id, item_name, quantity, reason, note)
  values (o.id, 'cocina', it.id, it.name, p_quantity, p_reason, trim(p_note));
  insert into public.order_events (order_id, status, note)
  values (o.id, o.status, 'Novedad en cocina: ' || p_quantity || ' × ' || it.name || ' sin preparar. ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
  perform public.notify_permission('orders.manage', 'warning', 'Novedad en cocina: ' || o.code,
          p_quantity || ' × ' || it.name || ' · ' || public.incident_reason_label(p_reason) || ': ' || left(trim(p_note), 100), '/admin/pedidos/' || o.code);
end;
$$;

revoke execute on function public.report_kitchen_incident(uuid, integer, text, text) from public, anon;
grant execute on function public.report_kitchen_incident(uuid, integer, text, text) to authenticated;
revoke execute on function public.item_in_progress(uuid) from public, anon;
grant execute on function public.item_in_progress(uuid) to authenticated;

/** Liberar resuelve las novedades de alistamiento; las de cocina siguen hasta que se preparen. Cancelar cierra todas. */
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
  where order_id = o.id and resolution is null and (p_resolution = 'cancelado' or stage = 'alistamiento');
  update public.orders set on_hold = false, updated_at = now() where id = o.id;
  if p_resolution = 'cancelado' then
    perform public.set_order_status(o.id, 'cancelado', coalesce(nullif(trim(p_note), ''), 'Cancelado por novedad'));
  else
    insert into public.order_events (order_id, status, note) values (o.id, o.status, 'Novedad resuelta: liberado para una nueva ruta');
  end if;
end;
$$;

-- Varios cocineros: el resto del equipo ve quién preparó cada tanda y quién reportó cada novedad.
drop policy if exists "kitchen staff visible to operations" on public.profiles;
create policy "kitchen staff visible to operations" on public.profiles for select
  using (
    (public.has_permission('kitchen.prepare') or public.has_permission('orders.view'))
    and (exists (select 1 from public.prep_batches b where b.started_by = profiles.id)
         or exists (select 1 from public.order_incidents n where n.created_by = profiles.id))
  );

-- ---------------------------------------------------------------------------
-- Alistamiento al salir. Una canasta (ruta) se alista solo cuando cocina terminó todos sus
-- pedidos (o cerró la franja con novedades). Al empezar a alistarla queda fija: recalcular
-- solo reparte los pedidos nuevos entre domiciliarios que aún no han alistado.
-- El domiciliario puede alistar su propia canasta.
-- ---------------------------------------------------------------------------

alter table public.delivery_routes add column if not exists packing_started_at timestamptz;

/** Puede alistar la ruta: personal de cocina/pedidos o el domiciliario de esa ruta. */
create or replace function public.can_pack_route(p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')
      or exists (select 1 from public.delivery_routes r where r.id = p_route_id and r.courier_id = auth.uid());
$$;

/** Pedidos de la ruta que cocina aún no termina. */
create or replace function public.route_kitchen_pending(p_route_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.route_stops s join public.orders o on o.id = s.order_id
  where s.route_id = p_route_id and o.prepared_at is null and o.status in ('confirmado', 'en_preparacion');
$$;

/** Empieza (fija) el alistamiento de una canasta. Exige que cocina haya terminado sus pedidos. */
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
  n := public.route_kitchen_pending(rt.id);
  if n > 0 then
    raise exception 'COCINA' using hint = 'Cocina aún no termina ' || n || case when n = 1 then ' pedido' else ' pedidos' end
      || ' de esta canasta. Espera, o pide que cierren la preparación con novedades.';
  end if;
  update public.delivery_routes set packing_started_at = now() where id = rt.id;
end;
$$;

create or replace function public.pack_order(p_order_id uuid, p_packed boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  rid uuid;
begin
  select s.route_id into rid from public.route_stops s join public.delivery_routes r on r.id = s.route_id
  where s.order_id = p_order_id and r.status = 'planificada';
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage') or (rid is not null and public.can_pack_route(rid))) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para empacar pedidos.';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  if o.status not in ('confirmado', 'en_preparacion') then
    raise exception 'ESTADO' using hint = 'Este pedido ya salió a ruta.';
  end if;
  if p_packed then
    if o.prepared_at is null then raise exception 'COCINA' using hint = 'Aún faltan platos de este pedido en cocina.'; end if;
    if rid is null then raise exception 'RUTA' using hint = 'Este pedido aún no tiene ruta: calcula las rutas primero.'; end if;
    perform public.lock_route_packing(rid);
  end if;
  update public.orders
  set packed_at = case when p_packed then now() end,
      packed_by = case when p_packed then auth.uid() end,
      updated_at = now()
  where id = o.id;
  if p_packed then
    insert into public.order_events (order_id, status, note) values (o.id, o.status, 'Empacado');
  end if;
end;
$$;

create or replace function public.pack_route_orders(p_route_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  perform public.lock_route_packing(p_route_id);
  with done as (
    update public.orders o
    set packed_at = now(), packed_by = auth.uid(), updated_at = now()
    from public.route_stops s
    where s.route_id = p_route_id and s.order_id = o.id
      and o.packed_at is null and o.prepared_at is not null and o.status in ('confirmado', 'en_preparacion')
    returning o.id, o.status
  )
  insert into public.order_events (order_id, status, note) select id, status, 'Empacado' from done;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- El domiciliario también puede cerrar su canasta con novedades.
create or replace function public.report_packing_incident(p_order_id uuid, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  rid uuid;
begin
  select s.route_id into rid from public.route_stops s join public.delivery_routes r on r.id = s.route_id
  where s.order_id = p_order_id and r.status = 'planificada';
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage') or (rid is not null and public.can_pack_route(rid))) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para registrar novedades.';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  if o.status not in ('confirmado', 'en_preparacion') then raise exception 'ESTADO' using hint = 'Este pedido ya salió a ruta.'; end if;
  if o.packed_at is not null then raise exception 'EMPACADO' using hint = 'Este pedido ya está empacado: deshaz el empaque primero.'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'NOTA' using hint = 'Explica qué pasó con el pedido.'; end if;

  insert into public.order_incidents (order_id, route_id, reason, note) values (o.id, rid, p_reason, trim(p_note));
  delete from public.route_stops where order_id = o.id and route_id = rid;
  update public.orders set on_hold = true, updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note)
  values (o.id, o.status, 'Novedad en alistamiento: ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
  perform public.notify_permission('orders.manage', 'warning', 'Novedad en ' || o.code,
          public.incident_reason_label(p_reason) || ': ' || left(trim(p_note), 120), '/admin/pedidos/' || o.code);
end;
$$;

/** Recalcular solo reemplaza las canastas que nadie ha empezado a alistar. */
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
    if exists (select 1 from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
               and x.courier_id = nullif(r->>'courier_id', '')::uuid) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario ya tiene su canasta alistada: los pedidos nuevos van con otro.';
    end if;
    insert into public.delivery_routes (kitchen_id, delivery_date, slot_id, courier_id, method, distance_m, duration_s, polyline)
    values (p_kitchen_id, p_date, p_slot_id, nullif(r->>'courier_id', '')::uuid, coalesce(r->>'method', 'local'),
            coalesce((r->>'distance_m')::integer, 0), coalesce((r->>'duration_s')::integer, 0), nullif(r->>'polyline', ''))
    returning id into rid;
    pos := 0;
    for s in select * from jsonb_array_elements(r->'stops') loop
      -- Un pedido que ya va en una canasta alistada o en camino no se mueve.
      continue when exists (select 1 from public.route_stops x where x.order_id = (s->>'order_id')::uuid);
      pos := pos + 1;
      insert into public.route_stops (route_id, order_id, position, eta)
      select rid, o.id, pos, nullif(s->>'eta', '')::timestamptz
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

/**
 * Cocina cierra la preparación de la franja con novedades: los platos que no se alcanzaron a
 * hacer quedan registrados, sus pedidos salen de la ruta y quedan en espera, y alistamiento sigue.
 */
create or replace function public.close_kitchen_slot(p_kitchen_id uuid, p_date date, p_slot_id uuid, p_reason text, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  it record;
  n integer := 0;
  detail text;
begin
  if not public.has_permission('kitchen.prepare') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cerrar la preparación.';
  end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'NOTA' using hint = 'Explica por qué no se pudo preparar.'; end if;
  perform pg_advisory_xact_lock(hashtext('prep:' || p_kitchen_id || ':' || p_date || ':' || p_slot_id));
  if exists (select 1 from public.prep_batches where kitchen_id = p_kitchen_id and delivery_date = p_date and slot_id = p_slot_id and status = 'en_preparacion') then
    raise exception 'TANDA' using hint = 'Hay tandas en preparación: termínalas o repórtalas primero.';
  end if;

  for o in
    select ko.id, ko.code, ko.status from public.kitchen_orders(p_kitchen_id, p_date, p_slot_id) ko where ko.prepared_at is null
  loop
    detail := '';
    for it in select i.id, i.name, i.quantity - i.prepared_qty as pending from public.order_items i where i.order_id = o.id and i.prepared_qty < i.quantity loop
      -- Si ya había una novedad abierta por esas unidades, no se duplica.
      if coalesce((select sum(quantity) from public.order_incidents where order_item_id = it.id and stage = 'cocina' and resolution is null), 0) < it.pending then
        insert into public.order_incidents (order_id, stage, order_item_id, item_name, quantity, reason, note)
        values (o.id, 'cocina', it.id, it.name, it.pending, p_reason, trim(p_note));
      end if;
      detail := detail || case when detail = '' then '' else ', ' end || it.pending || ' × ' || it.name;
    end loop;
    delete from public.route_stops s using public.delivery_routes r
    where s.order_id = o.id and r.id = s.route_id and r.status = 'planificada';
    update public.orders set on_hold = true, updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note)
    values (o.id, o.status, 'Cocina cerró la preparación sin terminar (' || detail || '). ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
    perform public.notify_permission('orders.manage', 'warning', 'Pedido en espera: ' || o.code,
            'Cocina cerró la franja sin terminar: ' || detail, '/admin/pedidos/' || o.code);
    n := n + 1;
  end loop;
  -- Canastas que quedaron vacías.
  delete from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
    and x.status = 'planificada' and not exists (select 1 from public.route_stops s where s.route_id = x.id);
  return n;
end;
$$;

revoke execute on function public.can_pack_route(uuid) from public, anon;
revoke execute on function public.route_kitchen_pending(uuid) from public, anon;
revoke execute on function public.lock_route_packing(uuid) from public, anon;
revoke execute on function public.close_kitchen_slot(uuid, date, uuid, text, text) from public, anon;
grant execute on function public.can_pack_route(uuid) to authenticated;
grant execute on function public.route_kitchen_pending(uuid) to authenticated;
grant execute on function public.lock_route_packing(uuid) to authenticated;
grant execute on function public.close_kitchen_slot(uuid, date, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Alistamiento solo en la página de Alistamiento; el domiciliario verifica su canasta.
-- Pedidos tardíos: si no hay domiciliario libre, se agregan a una canasta ya alistada sin
-- cambiar las etiquetas: el número de parada (position) es el de la etiqueta y no se mueve;
-- el orden real de entrega es seq, y el pedido nuevo se intercala donde menos alarga la ruta.
-- ---------------------------------------------------------------------------

alter table public.route_stops add column if not exists seq numeric;
update public.route_stops set seq = position where seq is null;
alter table public.route_stops alter column seq set not null;
alter table public.route_stops add column if not exists verified_at timestamptz;
alter table public.route_stops add column if not exists added_late boolean not null default false;

-- Alistar es del personal de cocina/pedidos (el domiciliario solo verifica).
create or replace function public.can_pack_route(p_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('kitchen.prepare') or public.has_permission('orders.manage');
$$;

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
    if exists (select 1 from public.delivery_routes x where x.kitchen_id = p_kitchen_id and x.delivery_date = p_date and x.slot_id = p_slot_id
               and x.courier_id = nullif(r->>'courier_id', '')::uuid) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario ya tiene su canasta alistada: los pedidos nuevos van con otro.';
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

/**
 * Agrega un pedido tardío a una canasta que aún no sale, sin tocar las paradas existentes:
 * etiqueta con el siguiente número libre y orden de entrega después de p_after_seq (0 = primero).
 */
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
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para cambiar rutas.';
  end if;
  select * into rt from public.delivery_routes where id = p_route_id for update;
  if not found or rt.status <> 'planificada' then raise exception 'RUTA' using hint = 'Esa canasta ya salió.'; end if;
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
      polyline = null  -- el trazado de Google ya no corresponde; el mapa usa líneas rectas
  where id = rt.id;
  insert into public.order_events (order_id, status, note)
  select p_order_id, status, 'Agregado a la canasta de ' || coalesce((select full_name from public.profiles where id = rt.courier_id), 'la ruta') || ' (parada ' || pos || ')'
  from public.orders where id = p_order_id;
  return pos;
end;
$$;

/** El domiciliario confirma que recibió el pedido y está correcto. */
create or replace function public.verify_route_stop(p_order_id uuid, p_ok boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st record;
begin
  select s.route_id, r.courier_id, r.status, o.packed_at into st
  from public.route_stops s join public.delivery_routes r on r.id = s.route_id join public.orders o on o.id = s.order_id
  where s.order_id = p_order_id;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado en una ruta.'; end if;
  if not (st.courier_id = auth.uid() or public.has_permission('orders.manage')) then raise exception 'PERMISO' using hint = 'Esta ruta no está asignada a ti.'; end if;
  if st.status <> 'planificada' then raise exception 'ESTADO' using hint = 'La ruta ya salió.'; end if;
  if p_ok and st.packed_at is null then raise exception 'EMPAQUE' using hint = 'Este pedido aún no está alistado.'; end if;
  update public.route_stops set verified_at = case when p_ok then now() end where order_id = p_order_id;
end;
$$;

-- Deshacer el empaque quita también la verificación del domiciliario.
create or replace function public.clear_verification_on_unpack()
returns trigger
language plpgsql
as $$
begin
  if new.packed_at is null and old.packed_at is not null then
    update public.route_stops set verified_at = null where order_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_clear_verification on public.orders;
create trigger orders_clear_verification after update of packed_at on public.orders
for each row execute function public.clear_verification_on_unpack();

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

revoke execute on function public.add_order_to_route(uuid, uuid, numeric, integer, integer, timestamptz) from public, anon;
revoke execute on function public.verify_route_stop(uuid, boolean) from public, anon;
grant execute on function public.add_order_to_route(uuid, uuid, numeric, integer, integer, timestamptz) to authenticated;
grant execute on function public.verify_route_stop(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Canastas mínimas: el sistema crea solo las canastas necesarias para la franja y asigna
-- domiciliario; quien alista puede cambiarlo. Una canasta puede quedar sin domiciliario
-- (faltan domiciliarios) hasta que se le asigne uno.
-- ---------------------------------------------------------------------------

/** Cambia (o quita) el domiciliario de una canasta que no ha salido. Devuelve true si ya tenía etiquetas impresas. */
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
    select zone_id into zone from public.delivery_slots where id = rt.slot_id;
    if not exists (select 1 from public.courier_assignments ca where ca.user_id = p_courier_id and ca.zone_id = zone and ca.active
                   and (ca.slot_id is null or ca.slot_id = rt.slot_id)) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario no está asignado a esta zona y franja.';
    end if;
    if exists (select 1 from public.delivery_routes x where x.id <> rt.id and x.courier_id = p_courier_id and x.delivery_date = rt.delivery_date
               and x.slot_id = rt.slot_id and x.status <> 'completada') then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario ya tiene otra canasta en esta franja.';
    end if;
  end if;
  update public.delivery_routes set courier_id = p_courier_id where id = rt.id;
  -- Si ya había verificado, la verificación era del domiciliario anterior.
  update public.route_stops set verified_at = null where route_id = rt.id;
  return rt.packing_started_at is not null;
end;
$$;

revoke execute on function public.set_route_courier(uuid, uuid) from public, anon;
grant execute on function public.set_route_courier(uuid, uuid) to authenticated;

-- Velocidad real de la ciudad aprendida de Google (tiempos reales / estimación propia).
-- Cada cálculo de canastas la ajusta un poco; así el siguiente arranca más cerca de la realidad.
insert into public.settings (key, value, description)
values ('routing_speed_factor', '1.6', 'Proporción entre los tiempos de Google y la estimación propia (se aprende sola).')
on conflict (key) do nothing;

create or replace function public.record_routing_factor(p_measured numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  cur numeric;
  nxt numeric;
begin
  if not (public.has_permission('kitchen.prepare') or public.has_permission('orders.manage')) then return null; end if;
  if p_measured is null or p_measured < 0.5 or p_measured > 4 then return null; end if;
  select (value #>> '{}')::numeric into cur from public.settings where key = 'routing_speed_factor';
  nxt := round(coalesce(cur, p_measured) * 0.7 + p_measured * 0.3, 3);
  update public.settings set value = to_jsonb(nxt), updated_at = now() where key = 'routing_speed_factor';
  return nxt;
end;
$$;
revoke execute on function public.record_routing_factor(numeric) from public, anon;
grant execute on function public.record_routing_factor(numeric) to authenticated;
