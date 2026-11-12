-- Fase 9: puntos de venta estratégicos.
--   · Puntos (de una cocina) con vendedores asignados.
--   · Vida útil por producto (por defecto 24 h) y "próximo a vencer" (8 h): lo vigente vuelve a cocina.
--   · Platos terminados por lotes (cocina, en tránsito o en un punto) con su vencimiento y costo.
--   · Plan de carga del día con sugerencia (promedio vendido los últimos 4 días iguales).
--   · Producción de la carga en cocina, despacho, recepción, venta desde el celular y cierre
--     (devolver a cocina, alimentación del equipo, donación o pérdida; faltantes).
--   · Transporte del despacho: gasto de la cocina (y salida de caja si se pagó con la venta).
--   · Mostrador: vender platos ya preparados del stock de la cocina (vitrina).

-- ---------------------------------------------------------------------------
-- Ajustes y productos
-- ---------------------------------------------------------------------------
insert into public.settings (key, value, description) values
  ('shelf_life_hours', '24', 'Vida útil por defecto de un plato preparado (horas)'),
  ('near_expiry_hours', '8', 'Si a un plato le quedan menos horas de vida útil, ya no vuelve a cocina al cerrar un punto')
on conflict (key) do nothing;

alter table public.products
  add column shelf_life_hours integer check (shelf_life_hours between 1 and 240),
  add column sold_at_points boolean not null default false;
-- Los platos de receta fija se pueden llevar a puntos; los armados no.
update public.products set sold_at_points = true where kind <> 'builder';

create or replace function public.setting_int(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::integer from public.settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- Permisos y rol
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, description) values
  ('points.manage', 'Puntos de venta', 'Crear puntos, planear cargas y despachar'),
  ('points.sell', 'Puntos de venta', 'Vender en un punto: recibir la carga, cobrar y cerrar')
on conflict (key) do nothing;

insert into public.roles (key, name, description, is_system, kitchen_assignable) values
  ('vendedor', 'Vendedor de punto', 'Lleva la carga a su punto, vende desde el celular y cierra el día', true, true)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join (values ('points.manage'), ('points.sell')) p(key)
where r.key = 'admin' on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, 'points.manage' from public.roles r where r.key = 'admin_cocina' on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join (values ('admin.access'), ('points.sell')) p(key)
where r.key = 'vendedor' on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Puntos y vendedores
-- ---------------------------------------------------------------------------
create table public.sale_points (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id),
  name text not null check (length(trim(name)) between 2 and 80),
  address text not null default '' check (length(address) <= 200),
  schedule text not null default '' check (length(schedule) <= 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sale_point_users (
  point_id uuid not null references public.sale_points(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (point_id, user_id)
);

-- ¿El usuario actual vende en ese punto? (o lo administra)
create or replace function public.can_point(p_point_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sale_points sp
    where sp.id = p_point_id and public.can_kitchen(sp.kitchen_id) and (
      public.has_permission('points.manage')
      or (public.has_permission('points.sell') and exists (select 1 from public.sale_point_users u where u.point_id = sp.id and u.user_id = auth.uid()))
    )
  );
$$;

alter table public.sale_points enable row level security;
alter table public.sale_point_users enable row level security;
create or replace function public.is_point_user(p_point_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sale_point_users where point_id = p_point_id and user_id = auth.uid());
$$;
create or replace function public.point_manageable(p_point_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission('points.manage') and exists (select 1 from public.sale_points where id = p_point_id and public.can_kitchen(kitchen_id));
$$;
create policy "sale points read" on public.sale_points for select to authenticated using (
  public.can_kitchen(kitchen_id) and (
    public.has_permission('points.manage') or public.has_permission('kitchen.prepare') or public.has_permission('reports.view')
    or public.has_permission('orders.view') or public.has_permission('counter.sell') or public.is_point_user(id)
  )
);
create policy "sale points write" on public.sale_points for all to authenticated
  using (public.has_permission('points.manage') and public.can_kitchen(kitchen_id))
  with check (public.has_permission('points.manage') and public.can_kitchen(kitchen_id));
create policy "point users read" on public.sale_point_users for select to authenticated using (user_id = auth.uid() or public.point_manageable(point_id));
create policy "point users write" on public.sale_point_users for all to authenticated
  using (public.point_manageable(point_id))
  with check (public.point_manageable(point_id) and public.user_can_kitchen(user_id, (select kitchen_id from public.sale_points where id = point_id)));

-- ---------------------------------------------------------------------------
-- Cargas del día
-- ---------------------------------------------------------------------------
create table public.point_loads (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.sale_points(id),
  kitchen_id uuid not null references public.kitchens(id),
  load_date date not null,
  status text not null default 'planeada' check (status in ('planeada', 'en_produccion', 'despachada', 'en_venta', 'cerrada', 'cancelada')),
  notes text not null default '' check (length(notes) <= 300),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  dispatched_at timestamptz,
  dispatched_by uuid references public.profiles(id),
  received_at timestamptz,
  received_by uuid references public.profiles(id),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  transport_cost integer not null default 0 check (transport_cost >= 0),
  transport_from_cash boolean not null default false,
  transport_entry_id uuid references public.finance_entries(id) on delete set null,
  unique (point_id, load_date)
);
create index point_loads_kitchen_date on public.point_loads (kitchen_id, load_date);

create table public.point_load_items (
  load_id uuid not null references public.point_loads(id) on delete cascade,
  product_id uuid not null references public.products(id),
  planned integer not null default 0 check (planned >= 0),
  to_produce integer not null default 0 check (to_produce >= 0),
  produced integer not null default 0,
  dispatched integer not null default 0,
  received integer not null default 0,
  primary key (load_id, product_id)
);

alter table public.point_loads enable row level security;
create policy "point loads read" on public.point_loads for select to authenticated using (
  public.can_kitchen(kitchen_id) and (
    public.has_permission('points.manage') or public.has_permission('kitchen.prepare') or public.has_permission('reports.view') or public.can_point(point_id)
  )
);
alter table public.point_load_items enable row level security;
create policy "point load items read" on public.point_load_items for select to authenticated using (
  exists (select 1 from public.point_loads l where l.id = load_id and public.can_kitchen(l.kitchen_id) and (
    public.has_permission('points.manage') or public.has_permission('kitchen.prepare') or public.has_permission('reports.view') or public.can_point(l.point_id)
  ))
);

alter table public.prep_batches add column load_id uuid references public.point_loads(id);
alter table public.orders add column point_id uuid references public.sale_points(id);
alter table public.cash_sessions
  add column point_id uuid references public.sale_points(id),
  add column cash_out integer not null default 0 check (cash_out >= 0);

-- ---------------------------------------------------------------------------
-- Platos terminados: lotes y movimientos
-- ---------------------------------------------------------------------------
create table public.dish_lots (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id),
  product_id uuid not null references public.products(id),
  batch_id uuid references public.prep_batches(id),
  load_id uuid references public.point_loads(id),
  produced_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unit_cost numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index dish_lots_kitchen_product on public.dish_lots (kitchen_id, product_id, expires_at);

create table public.dish_movements (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.dish_lots(id),
  kind text not null check (kind in ('produccion', 'despacho', 'recepcion', 'venta', 'devolucion', 'equipo', 'donacion', 'perdida', 'faltante', 'ajuste')),
  location text not null check (location in ('cocina', 'transito', 'punto')),
  point_id uuid references public.sale_points(id),
  quantity integer not null check (quantity <> 0),
  load_id uuid references public.point_loads(id),
  order_item_id uuid references public.order_items(id) on delete set null,
  note text not null default '' check (length(note) <= 300),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check ((location = 'cocina') = (point_id is null))
);
create index dish_movements_lot on public.dish_movements (lot_id);
create index dish_movements_load on public.dish_movements (load_id) where load_id is not null;
create index dish_movements_kind_date on public.dish_movements (kind, created_at);

alter table public.dish_lots enable row level security;
create policy "dish lots read" on public.dish_lots for select to authenticated using (
  public.can_kitchen(kitchen_id) and (
    public.has_permission('points.manage') or public.has_permission('points.sell') or public.has_permission('kitchen.prepare')
    or public.has_permission('reports.view') or public.has_permission('counter.sell') or public.has_permission('orders.view')
  )
);
alter table public.dish_movements enable row level security;
create policy "dish movements read" on public.dish_movements for select to authenticated using (
  exists (select 1 from public.dish_lots l where l.id = lot_id and public.can_kitchen(l.kitchen_id) and (
    public.has_permission('points.manage') or public.has_permission('points.sell') or public.has_permission('kitchen.prepare')
    or public.has_permission('reports.view') or public.has_permission('counter.sell') or public.has_permission('orders.view')
  ))
);

-- Existencias por lote y ubicación (con permisos de quien consulta).
create view public.dish_stock with (security_invoker = true) as
select m.lot_id, l.kitchen_id, l.product_id, m.location, m.point_id, l.produced_at, l.expires_at, l.unit_cost, l.load_id,
       sum(m.quantity)::integer as quantity
from public.dish_movements m join public.dish_lots l on l.id = m.lot_id
group by m.lot_id, l.kitchen_id, l.product_id, m.location, m.point_id, l.produced_at, l.expires_at, l.unit_cost, l.load_id
having sum(m.quantity) > 0;
grant select on public.dish_stock to authenticated;

-- Costo de la comida de un pedido: tandas preparadas + platos tomados del stock.
create or replace view public.order_food_costs as
select order_id, round(sum(cost), 2) as food_cost from (
  select i.order_id, l.quantity::numeric * b.total_cost / nullif(b.quantity, 0)::numeric as cost
  from public.prep_batch_items l
  join public.prep_batches b on b.id = l.batch_id and b.status = 'listo'
  join public.order_items i on i.id = l.order_item_id
  union all
  select i.order_id, -m.quantity * dl.unit_cost
  from public.dish_movements m
  join public.dish_lots dl on dl.id = m.lot_id
  join public.order_items i on i.id = m.order_item_id
  -- La venta resta del stock; si se anula, el ajuste lo devuelve (neto cero).
  where m.kind in ('venta', 'ajuste')
) x group by order_id;

-- Saca unidades de una ubicación por lotes (los que vencen primero), solo vigentes salvo p_any.
create or replace function public.take_dishes(
  p_kitchen_id uuid, p_product_id uuid, p_location text, p_point_id uuid, p_quantity integer,
  p_kind text, p_load_id uuid default null, p_order_item_id uuid default null, p_note text default '', p_any boolean default false
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  left_qty integer := p_quantity;
  s record;
  take integer;
begin
  -- Dos ventas a la vez no se llevan la misma unidad.
  perform pg_advisory_xact_lock(hashtext('dish:' || p_kitchen_id || ':' || p_product_id));
  for s in
    select lot_id, quantity from public.dish_stock
    where kitchen_id = p_kitchen_id and product_id = p_product_id and location = p_location
      and point_id is not distinct from p_point_id and (p_any or expires_at > now())
    order by expires_at, produced_at
  loop
    exit when left_qty <= 0;
    take := least(left_qty, s.quantity);
    insert into public.dish_movements (lot_id, kind, location, point_id, quantity, load_id, order_item_id, note)
    values (s.lot_id, p_kind, p_location, p_point_id, -take, p_load_id, p_order_item_id, left(coalesce(p_note, ''), 300));
    left_qty := left_qty - take;
  end loop;
  return p_quantity - left_qty;
end;
$$;
revoke execute on function public.take_dishes(uuid, uuid, text, uuid, integer, text, uuid, uuid, text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Plan de carga
-- ---------------------------------------------------------------------------
-- Sugerencia: promedio vendido por producto en las últimas 4 cargas cerradas del mismo día de la semana.
create or replace function public.point_suggestions(p_point_id uuid, p_date date)
returns table (product_id uuid, avg_sold numeric, loads integer, kitchen_stock integer)
language sql stable security definer set search_path = public as $$
  with recent as (
    select l.id from public.point_loads l
    where l.point_id = p_point_id and l.status = 'cerrada' and l.load_date < p_date
      and extract(isodow from l.load_date) = extract(isodow from p_date)
    order by l.load_date desc limit 4
  ), sold as (
    select dl.product_id, l.id as load_id, sum(-m.quantity) as qty
    from recent l
    join public.orders o on o.point_id = p_point_id and o.channel = 'punto' and o.status = 'entregado'
      and o.delivery_date = (select load_date from public.point_loads where id = l.id)
    join public.order_items i on i.order_id = o.id
    join public.dish_movements m on m.order_item_id = i.id and m.kind = 'venta'
    join public.dish_lots dl on dl.id = m.lot_id
    group by dl.product_id, l.id
  ), k as (select kitchen_id from public.sale_points where id = p_point_id)
  select p.id,
         round(coalesce((select sum(s.qty) from sold s where s.product_id = p.id), 0) / greatest((select count(*) from recent), 1), 1),
         (select count(*) from recent)::integer,
         coalesce((select sum(ds.quantity) from public.dish_stock ds, k
                   where ds.kitchen_id = k.kitchen_id and ds.product_id = p.id and ds.location = 'cocina'
                     and ds.expires_at > now() + make_interval(hours => public.setting_int('near_expiry_hours', 8))), 0)::integer
  from public.products p
  where p.active and p.sold_at_points and public.can_point(p_point_id);
$$;

create or replace function public.save_point_plan(p_point_id uuid, p_date date, p_items jsonb, p_notes text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pt public.sale_points%rowtype;
  ld public.point_loads%rowtype;
  it jsonb;
begin
  if not public.has_permission('points.manage') then raise exception 'PERMISO' using hint = 'No tienes permiso para planear cargas.'; end if;
  select * into pt from public.sale_points where id = p_point_id;
  if not found or not public.can_kitchen(pt.kitchen_id) then raise exception 'PUNTO' using hint = 'Punto no encontrado.'; end if;
  if not pt.active then raise exception 'PUNTO' using hint = 'Ese punto está inactivo.'; end if;
  if p_date < public.today_local() then raise exception 'FECHA' using hint = 'No se pueden planear días pasados.'; end if;

  select * into ld from public.point_loads where point_id = p_point_id and load_date = p_date for update;
  if found and ld.status not in ('planeada', 'en_produccion') then
    raise exception 'ESTADO' using hint = 'Esta carga ya salió de la cocina: no se puede cambiar el plan.';
  end if;
  if not found then
    insert into public.point_loads (point_id, kitchen_id, load_date, notes) values (pt.id, pt.kitchen_id, p_date, left(coalesce(p_notes, ''), 300))
    returning * into ld;
  else
    update public.point_loads set notes = left(coalesce(p_notes, ''), 300) where id = ld.id;
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    if coalesce((it->>'planned')::integer, -1) < 0 or coalesce((it->>'to_produce')::integer, -1) < 0
       or (it->>'planned')::integer > 500 or (it->>'to_produce')::integer > 500 then
      raise exception 'CANTIDAD' using hint = 'Las cantidades deben estar entre 0 y 500.';
    end if;
    if not exists (select 1 from public.products where id = (it->>'product_id')::uuid and active and sold_at_points) then
      raise exception 'PRODUCTO' using hint = 'Un producto del plan no se vende en puntos.';
    end if;
    insert into public.point_load_items (load_id, product_id, planned, to_produce)
    values (ld.id, (it->>'product_id')::uuid, (it->>'planned')::integer, (it->>'to_produce')::integer)
    on conflict (load_id, product_id) do update set planned = excluded.planned, to_produce = greatest(excluded.to_produce, point_load_items.produced);
  end loop;
  -- Líneas en cero y sin producción: fuera.
  delete from public.point_load_items where load_id = ld.id and planned = 0 and to_produce = 0 and produced = 0;
  return ld.id;
end;
$$;

create or replace function public.send_point_load(p_load_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ld public.point_loads%rowtype;
begin
  if not public.has_permission('points.manage') then raise exception 'PERMISO' using hint = 'No tienes permiso.'; end if;
  select * into ld from public.point_loads where id = p_load_id for update;
  if not found or not public.can_kitchen(ld.kitchen_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status <> 'planeada' then raise exception 'ESTADO' using hint = 'Esta carga ya se envió a cocina.'; end if;
  if not exists (select 1 from public.point_load_items where load_id = ld.id and planned > 0) then
    raise exception 'VACIA' using hint = 'Agrega al menos un producto al plan.';
  end if;
  update public.point_loads set status = 'en_produccion', sent_at = now() where id = ld.id;
  -- Solo a quienes preparan en esa cocina.
  insert into public.notifications (user_id, kind, title, body, href)
  select distinct ur.user_id, 'info', 'Carga para ' || (select name from public.sale_points where id = ld.point_id),
         (select sum(to_produce) from public.point_load_items where load_id = ld.id) || ' platos por preparar · ' || to_char(ld.load_date, 'DD/MM'),
         '/admin/cocina?cocina=' || ld.kitchen_id
  from public.user_roles ur join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key = 'kitchen.prepare' and public.user_can_kitchen(ur.user_id, ld.kitchen_id);
end;
$$;

create or replace function public.cancel_point_load(p_load_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ld public.point_loads%rowtype;
begin
  if not public.has_permission('points.manage') then raise exception 'PERMISO' using hint = 'No tienes permiso.'; end if;
  select * into ld from public.point_loads where id = p_load_id for update;
  if not found or not public.can_kitchen(ld.kitchen_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status not in ('planeada', 'en_produccion') then raise exception 'ESTADO' using hint = 'La carga ya salió: ciérrala desde el punto.'; end if;
  if exists (select 1 from public.prep_batches where load_id = ld.id and status = 'en_preparacion') then
    raise exception 'COCINA' using hint = 'Hay platos de esta carga en preparación.';
  end if;
  -- Lo ya preparado queda en el stock de la cocina.
  update public.point_loads set status = 'cancelada' where id = ld.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cocina: preparar la carga
-- ---------------------------------------------------------------------------
create or replace function public.start_load_batch(p_load_id uuid, p_product_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  ld public.point_loads%rowtype;
  it public.point_load_items%rowtype;
  prod public.products%rowtype;
  qty integer;
  batch uuid;
begin
  if not public.has_permission('kitchen.prepare') then raise exception 'PERMISO' using hint = 'No tienes permiso para preparar.'; end if;
  perform pg_advisory_xact_lock(hashtext('load:' || p_load_id));
  select * into ld from public.point_loads where id = p_load_id;
  if not found or not public.can_kitchen(ld.kitchen_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status <> 'en_produccion' then raise exception 'ESTADO' using hint = 'Esta carga no está en producción.'; end if;
  select * into it from public.point_load_items where load_id = ld.id and product_id = p_product_id;
  select * into prod from public.products where id = p_product_id;
  qty := coalesce(it.to_produce, 0) - coalesce(it.produced, 0)
         - coalesce((select sum(quantity) from public.prep_batches where load_id = ld.id and product_id = p_product_id and status = 'en_preparacion'), 0);
  if qty <= 0 then raise exception 'VACIO' using hint = 'Ese producto ya está preparado o en preparación.'; end if;
  insert into public.prep_batches (kitchen_id, delivery_date, slot_id, product_id, name, kind, quantity, load_id)
  values (ld.kitchen_id, ld.load_date, null, prod.id, prod.name, 'lote', qty, ld.id)
  returning id into batch;
  return batch;
end;
$$;

-- Terminar una tanda: pedidos (como antes) o carga de un punto (crea el lote de platos terminados).
create or replace function public.finish_prep_batch(p_batch_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  b public.prep_batches%rowtype;
  secs integer;
  r record;
  lot uuid;
  life integer;
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

  if b.load_id is not null then
    -- Carga de un punto: la receta del plato por las unidades de la tanda.
    for r in
      select ri.ingredient_id, ri.quantity * b.quantity as qty from public.recipe_items ri
      where ri.product_id = b.product_id and ri.quantity > 0
    loop
      insert into public.inventory_movements (ingredient_id, kind, quantity, reason, note, batch_id)
      values (r.ingredient_id, 'consumo', -r.qty, 'preparacion', b.name || ' × ' || b.quantity || ' · punto ' || to_char(b.delivery_date, 'DD/MM'), b.id);
    end loop;
    update public.prep_batches pb set total_cost = coalesce((
      select round(sum(-m.quantity * coalesce(m.unit_cost, 0)), 2) from public.inventory_movements m where m.batch_id = pb.id
    ), 0) where pb.id = b.id;
    select coalesce(p.shelf_life_hours, public.setting_int('shelf_life_hours', 24)) into life from public.products p where p.id = b.product_id;
    insert into public.dish_lots (kitchen_id, product_id, batch_id, load_id, produced_at, expires_at, unit_cost)
    select b.kitchen_id, b.product_id, b.id, b.load_id, now(), now() + make_interval(hours => life),
           round(total_cost / nullif(quantity, 0), 2)
    from public.prep_batches where id = b.id
    returning id into lot;
    insert into public.dish_movements (lot_id, kind, location, quantity, load_id, note)
    values (lot, 'produccion', 'cocina', b.quantity, b.load_id, 'Preparado para punto');
    update public.point_load_items set produced = produced + b.quantity where load_id = b.load_id and product_id = b.product_id;
    return secs;
  end if;

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
    insert into public.inventory_movements (ingredient_id, kind, quantity, reason, note, batch_id)
    values (r.ingredient_id, 'consumo', -r.qty, 'preparacion', b.name || ' × ' || b.quantity || ' · ' || to_char(b.delivery_date, 'DD/MM'), b.id);
  end loop;
  update public.prep_batches pb set total_cost = coalesce((
    select round(sum(-m.quantity * coalesce(m.unit_cost, 0)), 2) from public.inventory_movements m where m.batch_id = pb.id
  ), 0) where pb.id = b.id;

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

  update public.orders o set prepared_at = now(), updated_at = now()
  where o.prepared_at is null
    and o.id in (select i.order_id from public.order_items i join public.prep_batch_items l on l.order_item_id = i.id where l.batch_id = b.id)
    and not exists (select 1 from public.order_items x where x.order_id = o.id and x.prepared_qty < x.quantity);

  return secs;
end;
$$;

-- ---------------------------------------------------------------------------
-- Despacho, recepción y transporte
-- ---------------------------------------------------------------------------
create or replace function public.dispatch_point_load(p_load_id uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  ld public.point_loads%rowtype;
  it jsonb;
  q integer;
  got integer;
  avail integer;
  pname text;
  s record;
  take integer;
begin
  if not (public.has_permission('points.manage') or public.has_permission('kitchen.prepare')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para despachar.';
  end if;
  select * into ld from public.point_loads where id = p_load_id for update;
  if not found or not public.can_kitchen(ld.kitchen_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status not in ('planeada', 'en_produccion') then raise exception 'ESTADO' using hint = 'Esta carga ya se despachó.'; end if;
  if exists (select 1 from public.prep_batches where load_id = ld.id and status = 'en_preparacion') then
    raise exception 'COCINA' using hint = 'Hay platos de esta carga en preparación: termínalos antes de despachar.';
  end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    q := coalesce((it->>'quantity')::integer, 0);
    continue when q <= 0;
    select name into pname from public.products where id = (it->>'product_id')::uuid;
    select coalesce(sum(quantity), 0) into avail from public.dish_stock
    where kitchen_id = ld.kitchen_id and product_id = (it->>'product_id')::uuid and location = 'cocina' and expires_at > now();
    if avail < q then raise exception 'STOCK' using hint = 'Solo hay ' || avail || ' de ' || coalesce(pname, 'ese plato') || ' listos en la cocina.'; end if;
    -- Sale de la cocina (vence primero, sale primero) y queda en tránsito hacia el punto.
    got := 0;
    for s in
      select lot_id, quantity from public.dish_stock
      where kitchen_id = ld.kitchen_id and product_id = (it->>'product_id')::uuid and location = 'cocina' and expires_at > now()
      order by expires_at, produced_at
    loop
      exit when got >= q;
      take := least(q - got, s.quantity);
      insert into public.dish_movements (lot_id, kind, location, quantity, load_id) values (s.lot_id, 'despacho', 'cocina', -take, ld.id);
      insert into public.dish_movements (lot_id, kind, location, point_id, quantity, load_id) values (s.lot_id, 'despacho', 'transito', ld.point_id, take, ld.id);
      got := got + take;
    end loop;
    insert into public.point_load_items (load_id, product_id, planned, to_produce, dispatched)
    values (ld.id, (it->>'product_id')::uuid, 0, 0, q)
    on conflict (load_id, product_id) do update set dispatched = excluded.dispatched;
  end loop;
  if not exists (select 1 from public.point_load_items where load_id = ld.id and dispatched > 0) then
    raise exception 'VACIA' using hint = 'Despacha al menos un plato.';
  end if;
  update public.point_loads set status = 'despachada', dispatched_at = now(), dispatched_by = auth.uid() where id = ld.id;
  insert into public.notifications (user_id, kind, title, body, href)
  select u.user_id, 'info', 'Tu carga salió de la cocina',
         (select sum(dispatched) from public.point_load_items where load_id = ld.id) || ' platos para ' || (select name from public.sale_points where id = ld.point_id),
         '/admin/punto'
  from public.sale_point_users u where u.point_id = ld.point_id;
end;
$$;

create or replace function public.receive_point_load(p_load_id uuid, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  ld public.point_loads%rowtype;
  it public.point_load_items%rowtype;
  q integer;
  got integer;
  s record;
  take integer;
  missing integer := 0;
begin
  select * into ld from public.point_loads where id = p_load_id for update;
  if not found or not public.can_point(ld.point_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status <> 'despachada' then raise exception 'ESTADO' using hint = 'Esta carga no está por recibir.'; end if;

  for it in select * from public.point_load_items where load_id = ld.id and dispatched > 0 loop
    q := coalesce((select (x->>'quantity')::integer from jsonb_array_elements(coalesce(p_items, '[]')) x where (x->>'product_id')::uuid = it.product_id), it.dispatched);
    if q < 0 or q > it.dispatched then raise exception 'CANTIDAD' using hint = 'No puedes recibir más de lo despachado.'; end if;
    got := 0;
    for s in
      select m.lot_id, sum(m.quantity)::integer as quantity
      from public.dish_movements m join public.dish_lots dl on dl.id = m.lot_id
      where m.load_id = ld.id and m.location = 'transito' and dl.product_id = it.product_id
      group by m.lot_id having sum(m.quantity) > 0
      order by min(dl.expires_at)
    loop
      take := least(greatest(q - got, 0), s.quantity);
      if take > 0 then
        insert into public.dish_movements (lot_id, kind, location, point_id, quantity, load_id) values (s.lot_id, 'recepcion', 'transito', ld.point_id, -take, ld.id);
        insert into public.dish_movements (lot_id, kind, location, point_id, quantity, load_id) values (s.lot_id, 'recepcion', 'punto', ld.point_id, take, ld.id);
        got := got + take;
      end if;
      if s.quantity - take > 0 then
        insert into public.dish_movements (lot_id, kind, location, point_id, quantity, load_id, note)
        values (s.lot_id, 'faltante', 'transito', ld.point_id, -(s.quantity - take), ld.id, 'No llegó al punto');
        missing := missing + (s.quantity - take);
      end if;
    end loop;
    update public.point_load_items set received = got where load_id = ld.id and product_id = it.product_id;
  end loop;
  update public.point_loads set status = 'en_venta', received_at = now(), received_by = auth.uid() where id = ld.id;
  return missing;
end;
$$;

-- Transporte del despacho: gasto de la cocina; si se pagó con efectivo de la venta, sale de la caja.
create or replace function public.set_point_transport(p_load_id uuid, p_amount integer, p_from_cash boolean, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  ld public.point_loads%rowtype;
  pname text;
  sid uuid;
  entry uuid;
begin
  select * into ld from public.point_loads where id = p_load_id for update;
  if not found or not public.can_point(ld.point_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status not in ('despachada', 'en_venta') then raise exception 'ESTADO' using hint = 'El transporte se registra mientras la carga está en el punto.'; end if;
  if coalesce(p_amount, -1) < 0 or p_amount > 1000000 then raise exception 'VALOR' using hint = 'Escribe un valor válido.'; end if;
  select name into pname from public.sale_points where id = ld.point_id;

  -- Caja: se devuelve lo que se había sacado antes y se saca lo nuevo.
  if ld.transport_from_cash or p_from_cash then
    select id into sid from public.cash_sessions where user_id = auth.uid() and point_id = ld.point_id and closed_at is null;
    if p_from_cash and sid is null then raise exception 'CAJA' using hint = 'Abre la caja del punto para pagar el transporte con la venta.'; end if;
    if sid is not null then
      update public.cash_sessions set cash_out = greatest(0, cash_out - case when ld.transport_from_cash then ld.transport_cost else 0 end
                                                          + case when p_from_cash then p_amount else 0 end)
      where id = sid;
    end if;
  end if;

  if p_amount = 0 then
    if ld.transport_entry_id is not null then delete from public.finance_entries where id = ld.transport_entry_id; end if;
    entry := null;
  elsif ld.transport_entry_id is not null then
    update public.finance_entries set amount = p_amount, updated_at = now(),
      description = left('Transporte a ' || pname || ' (' || to_char(ld.load_date, 'DD/MM') || ')' || coalesce(nullif(' · ' || trim(p_note), ' · '), ''), 200)
    where id = ld.transport_entry_id returning id into entry;
  end if;
  if p_amount > 0 and entry is null then
    insert into public.finance_entries (kitchen_id, kind, category, description, amount, entry_date, recurring, created_by)
    values (ld.kitchen_id, 'egreso', 'transporte',
            left('Transporte a ' || pname || ' (' || to_char(ld.load_date, 'DD/MM') || ')' || coalesce(nullif(' · ' || trim(p_note), ' · '), ''), 200),
            p_amount, ld.load_date, false, auth.uid())
    returning id into entry;
  end if;
  update public.point_loads set transport_cost = p_amount, transport_from_cash = p_from_cash and p_amount > 0, transport_entry_id = entry where id = ld.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Caja del punto y venta
-- ---------------------------------------------------------------------------
-- La caja de mostrador es la que no tiene punto.
create or replace function public.my_open_cash_session(p_kitchen_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.cash_sessions where user_id = auth.uid() and kitchen_id = p_kitchen_id and point_id is null and closed_at is null;
$$;

create or replace function public.open_point_cash(p_point_id uuid, p_opening integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pt public.sale_points%rowtype;
  sid uuid;
begin
  if not public.has_permission('points.sell') or not public.can_point(p_point_id) then
    raise exception 'PERMISO' using hint = 'No vendes en ese punto.';
  end if;
  select * into pt from public.sale_points where id = p_point_id;
  if coalesce(p_opening, -1) < 0 then raise exception 'BASE' using hint = 'Escribe la base con la que abres la caja.'; end if;
  if exists (select 1 from public.cash_sessions where user_id = auth.uid() and closed_at is null) then
    raise exception 'ABIERTA' using hint = 'Ya tienes una caja abierta. Ciérrala antes de abrir otra.';
  end if;
  insert into public.cash_sessions (kitchen_id, point_id, user_id, opening_amount) values (pt.kitchen_id, pt.id, auth.uid(), p_opening)
  returning id into sid;
  return sid;
end;
$$;

-- Cierre de caja: base + efectivo neto − salidas (p. ej. transporte pagado con la venta).
create or replace function public.close_cash_session(p_session_id uuid, p_counted integer, p_note text default '')
returns integer language plpgsql security definer set search_path = public as $$
declare
  s public.cash_sessions%rowtype;
  t jsonb;
  expected integer;
begin
  select * into s from public.cash_sessions where id = p_session_id for update;
  if not found or s.closed_at is not null then raise exception 'CAJA' using hint = 'Esta caja ya está cerrada.'; end if;
  if s.user_id <> auth.uid() and not (public.has_permission('finance.manage') and public.can_kitchen(s.kitchen_id)) then
    raise exception 'PERMISO' using hint = 'Solo quien abrió la caja (o el administrador) puede cerrarla.';
  end if;
  if coalesce(p_counted, -1) < 0 then raise exception 'CONTEO' using hint = 'Escribe el efectivo que contaste en el cajón.'; end if;
  if s.point_id is null and exists (
    select 1 from public.orders where cash_session_id = s.id and status in ('confirmado', 'en_preparacion')
  ) and coalesce(p_note, '') = '' then
    raise exception 'PENDIENTES' using hint = 'Hay pedidos cobrados sin entregar. Entrégalos o escribe una nota antes de cerrar.';
  end if;

  t := public.cash_session_totals(s.id);
  select s.opening_amount - s.cash_out + coalesce(sum((e->>'net')::integer), 0) into expected
  from jsonb_array_elements(t) e where e->>'kind' = 'efectivo';

  update public.cash_sessions set
    closed_at = now(), closed_by = auth.uid(), counted_cash = p_counted, expected_cash = expected,
    difference = p_counted - expected, totals = t, note = left(coalesce(p_note, ''), 300)
  where id = s.id;
  return p_counted - expected;
end;
$$;

create or replace function public.point_sell(p_point_id uuid, p_items jsonb, p_method_id uuid, p_received integer default null, p_reference text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  pt public.sale_points%rowtype;
  m public.payment_methods%rowtype;
  sid uuid;
  it jsonb;
  prod public.products%rowtype;
  q integer;
  unit integer;
  v_total integer := 0;
  received integer;
  new_id uuid;
  new_code text;
  line uuid;
  avail integer;
begin
  if not public.has_permission('points.sell') or not public.can_point(p_point_id) then
    raise exception 'PERMISO' using hint = 'No vendes en ese punto.';
  end if;
  select * into pt from public.sale_points where id = p_point_id;
  select id into sid from public.cash_sessions where user_id = auth.uid() and point_id = pt.id and closed_at is null;
  if sid is null then raise exception 'CAJA' using hint = 'Abre la caja del punto antes de vender.'; end if;
  select * into m from public.payment_methods where id = p_method_id and active;
  if not found then raise exception 'METODO' using hint = 'Elige un método de pago.'; end if;
  if m.needs_reference and length(trim(coalesce(p_reference, ''))) < 3 then
    raise exception 'REFERENCIA' using hint = 'Escribe la referencia o el número de la transacción.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'VACIO' using hint = 'Elige al menos un plato.'; end if;

  insert into public.orders (channel, source, kitchen_id, point_id, delivery_date, slot_label, subtotal, total, created_by, status)
  values ('punto', 'caja', pt.kitchen_id, pt.id, public.today_local(), '', 0, 0, auth.uid(), 'pendiente_pago')
  returning id, code into new_id, new_code;

  for it in select * from jsonb_array_elements(p_items) loop
    q := coalesce((it->>'quantity')::integer, 0);
    if q < 1 or q > 50 then raise exception 'CANTIDAD' using hint = 'La cantidad debe estar entre 1 y 50.'; end if;
    select * into prod from public.products where id = (it->>'product_id')::uuid;
    if not found then raise exception 'PRODUCTO' using hint = 'Producto no encontrado.'; end if;
    select coalesce(sum(quantity), 0) into avail from public.dish_stock
    where product_id = prod.id and location = 'punto' and point_id = pt.id and expires_at > now();
    if avail < q then raise exception 'STOCK' using hint = 'Solo quedan ' || avail || ' de ' || prod.name || ' vigentes en el punto.'; end if;
    unit := public.channel_price(prod.id, 'punto');
    insert into public.order_items (order_id, product_id, name, options, unit_price, quantity, line_total, prepared_qty, prepared_at)
    values (new_id, prod.id, prod.name, '[]', unit, q, unit * q, q, now())
    returning id into line;
    perform public.take_dishes(pt.kitchen_id, prod.id, 'punto', pt.id, q, 'venta', null, line);
    v_total := v_total + unit * q;
  end loop;

  received := case when m.kind = 'efectivo' then coalesce(p_received, v_total) else v_total end;
  if received < v_total then raise exception 'RECIBIDO' using hint = 'El efectivo recibido es menor que el total.'; end if;

  update public.orders set subtotal = v_total, total = v_total, status = 'entregado', payment_status = 'aprobado',
    paid_at = now(), prepared_at = now(), delivered_at = now(), delivered_by = auth.uid(), cash_session_id = sid, updated_at = now()
  where id = new_id;
  insert into public.payments (order_id, provider, amount, status, reference, method_id, method_name, received_amount, change_amount, cash_session_id, created_by)
  values (new_id, 'punto', v_total, 'aprobado', coalesce(nullif(trim(p_reference), ''), 'PTO-' || upper(substr(md5(random()::text), 1, 8))),
          m.id, m.name, received, received - v_total, sid, auth.uid());
  insert into public.order_events (order_id, status, note) values
    (new_id, 'entregado', 'Vendido en ' || pt.name || ' · ' || m.name);
  return new_code;
end;
$$;

-- Anular una venta del punto (error al registrar): vuelve el stock y se devuelve el dinero desde la caja.
create or replace function public.point_cancel_sale(p_order_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  pay public.payments%rowtype;
  sid uuid;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.channel <> 'punto' or not public.can_point(o.point_id) then raise exception 'PEDIDO' using hint = 'Venta no encontrada.'; end if;
  if o.status <> 'entregado' or o.payment_status <> 'aprobado' then raise exception 'ESTADO' using hint = 'Esta venta ya se anuló.'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'MOTIVO' using hint = 'Escribe el motivo.'; end if;
  select id into sid from public.cash_sessions where user_id = auth.uid() and point_id = o.point_id and closed_at is null;
  if sid is null or sid <> o.cash_session_id then raise exception 'CAJA' using hint = 'Solo se anula con la misma caja abierta en la que se vendió.'; end if;

  insert into public.dish_movements (lot_id, kind, location, point_id, quantity, order_item_id, note)
  select m.lot_id, 'ajuste', 'punto', o.point_id, -m.quantity, m.order_item_id, 'Venta anulada'
  from public.dish_movements m join public.order_items i on i.id = m.order_item_id
  where i.order_id = o.id and m.kind = 'venta';
  select * into pay from public.payments where order_id = o.id and status = 'aprobado' order by created_at desc limit 1;
  insert into public.payments (order_id, provider, amount, status, reference, method_id, method_name, cash_session_id, created_by)
  values (o.id, 'punto', o.total, 'reembolsado', 'DEV-' || upper(substr(md5(random()::text), 1, 8)), pay.method_id, pay.method_name, sid, auth.uid());
  update public.orders set status = 'cancelado', payment_status = 'reembolsado', cancelled_at = now(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', 'Venta anulada: ' || left(trim(p_note), 250));
end;
$$;

-- ---------------------------------------------------------------------------
-- Cierre del punto: lo que quedó
-- ---------------------------------------------------------------------------
-- p_items: [{product_id, returned, staff, donated, lost}]; lo que falte contra lo que debería haber es faltante.
create or replace function public.close_point_load(p_load_id uuid, p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  ld public.point_loads%rowtype;
  it jsonb;
  pid uuid;
  ret integer; staff integer; don integer; lost integer;
  expected integer;
  eligible integer;
  near integer := public.setting_int('near_expiry_hours', 8);
  s record;
  take integer;
  need integer;
  missing integer := 0;
  pname text;
begin
  select * into ld from public.point_loads where id = p_load_id for update;
  if not found or not public.can_point(ld.point_id) then raise exception 'CARGA' using hint = 'Carga no encontrada.'; end if;
  if ld.status <> 'en_venta' then raise exception 'ESTADO' using hint = 'Esta carga no está en venta.'; end if;

  for pid in select distinct product_id from public.dish_stock where location = 'punto' and point_id = ld.point_id loop
    it := null;
    select x into it from jsonb_array_elements(coalesce(p_items, '[]')) x where (x->>'product_id')::uuid = pid;
    ret := coalesce((it->>'returned')::integer, 0);
    staff := coalesce((it->>'staff')::integer, 0);
    don := coalesce((it->>'donated')::integer, 0);
    lost := coalesce((it->>'lost')::integer, 0);
    select name into pname from public.products where id = pid;
    if least(ret, staff, don, lost) < 0 then raise exception 'CANTIDAD' using hint = 'Las cantidades no pueden ser negativas.'; end if;
    select coalesce(sum(quantity), 0) into expected from public.dish_stock where location = 'punto' and point_id = ld.point_id and product_id = pid;
    if ret + staff + don + lost > expected then
      raise exception 'CONTEO' using hint = 'De ' || pname || ' solo deberían quedar ' || expected || '.';
    end if;
    select coalesce(sum(quantity), 0) into eligible from public.dish_stock
    where location = 'punto' and point_id = ld.point_id and product_id = pid and expires_at > now() + make_interval(hours => near);
    if ret > eligible then
      raise exception 'VENCE' using hint = 'Solo ' || eligible || ' de ' || pname || ' pueden volver a cocina: los demás vencen en menos de ' || near || ' horas.';
    end if;

    -- Vuelven a cocina los más frescos.
    need := ret;
    for s in select lot_id, quantity from public.dish_stock
             where location = 'punto' and point_id = ld.point_id and product_id = pid and expires_at > now() + make_interval(hours => near)
             order by expires_at desc
    loop
      exit when need <= 0;
      take := least(need, s.quantity);
      insert into public.dish_movements (lot_id, kind, location, point_id, quantity, load_id) values (s.lot_id, 'devolucion', 'punto', ld.point_id, -take, ld.id);
      insert into public.dish_movements (lot_id, kind, location, quantity, load_id, note) values (s.lot_id, 'devolucion', 'cocina', take, ld.id, 'Volvió de ' || (select name from public.sale_points where id = ld.point_id));
      need := need - take;
    end loop;
    -- Equipo, donación y pérdida salen de los más viejos; lo que no se contó es faltante.
    perform public.take_dishes(ld.kitchen_id, pid, 'punto', ld.point_id, staff, 'equipo', ld.id, null, '', true);
    perform public.take_dishes(ld.kitchen_id, pid, 'punto', ld.point_id, don, 'donacion', ld.id, null, '', true);
    perform public.take_dishes(ld.kitchen_id, pid, 'punto', ld.point_id, lost, 'perdida', ld.id, null, '', true);
    need := expected - ret - staff - don - lost;
    if need > 0 then
      perform public.take_dishes(ld.kitchen_id, pid, 'punto', ld.point_id, need, 'faltante', ld.id, null, 'No apareció en el conteo', true);
      missing := missing + need;
    end if;
  end loop;

  update public.point_loads set status = 'cerrada', closed_at = now(), closed_by = auth.uid() where id = ld.id;
  return missing;
end;
$$;

-- Merma de platos guardados en la cocina (vencidos o próximos a vencer).
create or replace function public.write_off_kitchen_dishes(p_lot_id uuid, p_kind text, p_quantity integer, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  l public.dish_lots%rowtype;
  avail integer;
begin
  if not (public.has_permission('points.manage') or public.has_permission('kitchen.prepare') or public.has_permission('inventory.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso.';
  end if;
  select * into l from public.dish_lots where id = p_lot_id;
  if not found or not public.can_kitchen(l.kitchen_id) then raise exception 'LOTE' using hint = 'Lote no encontrado.'; end if;
  if p_kind not in ('equipo', 'donacion', 'perdida') then raise exception 'TIPO' using hint = 'Elige el destino.'; end if;
  select coalesce(sum(quantity), 0) into avail from public.dish_stock where lot_id = l.id and location = 'cocina';
  if coalesce(p_quantity, 0) < 1 or p_quantity > avail then raise exception 'CANTIDAD' using hint = 'Hay ' || avail || ' unidades de este lote en la cocina.'; end if;
  insert into public.dish_movements (lot_id, kind, location, quantity, note) values (l.id, p_kind, 'cocina', -p_quantity, left(coalesce(p_note, ''), 300));
end;
$$;

-- ---------------------------------------------------------------------------
-- Mostrador: vender de la vitrina (platos ya preparados en la cocina)
-- ---------------------------------------------------------------------------
create or replace function public.add_order_lines(p_order_id uuid, p_items jsonb, p_channel text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  prod public.products%rowtype;
  qty integer;
  opts jsonb;
  opt_ids uuid[];
  unit integer;
  base integer;
  v_subtotal integer := 0;
  limits jsonb := '{"base": [1, 1], "vegetables": [0, 5], "proteins": [0, 2], "toppings": [0, 3], "sauce": [0, 1]}';
  step_count record;
  line uuid;
  k uuid;
  got integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VACIO' using hint = 'El pedido está vacío.';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'DEMASIADOS' using hint = 'Máximo 30 productos distintos por pedido.';
  end if;
  select kitchen_id into k from public.orders where id = p_order_id;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((item->>'quantity')::integer, 0);
    if qty < 1 or qty > 50 then raise exception 'CANTIDAD' using hint = 'La cantidad de cada producto debe estar entre 1 y 50.'; end if;

    select * into prod from public.products where slug = item->>'slug' and active;
    if not found then raise exception 'PRODUCTO' using hint = 'Un producto del pedido ya no está disponible.'; end if;

    opts := '[]'::jsonb;
    base := case when p_channel = 'domicilio' then prod.price else public.channel_price(prod.id, p_channel) end;
    unit := base;

    if prod.kind = 'builder' then
      select coalesce(array_agg(x::uuid), '{}') into opt_ids from jsonb_array_elements_text(coalesce(item->'options', '[]')) x;
      select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'step', b.step, 'name', b.name, 'price', b.price) order by b.step, b.sort), '[]'),
             coalesce(sum(b.price), 0)::integer + base
        into opts, unit
        from public.builder_options b where b.id = any (opt_ids) and b.active;
      if jsonb_array_length(opts) <> coalesce(array_length(opt_ids, 1), 0) then
        raise exception 'OPCIONES' using hint = 'Alguna opción del bowl ya no está disponible. Ármalo de nuevo.';
      end if;
      for step_count in
        select s.key as step, (select count(*) from jsonb_array_elements(opts) o where o->>'step' = s.key) as n,
               (s.value->>0)::int as min_n, (s.value->>1)::int as max_n
        from jsonb_each(limits) s
      loop
        if step_count.n < step_count.min_n or step_count.n > step_count.max_n then
          raise exception 'OPCIONES' using hint = 'El bowl armado no cumple las reglas (elige una base y respeta los máximos).';
        end if;
      end loop;
    elsif jsonb_array_length(coalesce(item->'options', '[]')) > 0 then
      raise exception 'OPCIONES' using hint = 'Este producto no admite opciones.';
    end if;

    insert into public.order_items (order_id, product_id, name, options, unit_price, quantity, line_total)
    values (p_order_id, prod.id, prod.name, opts, unit, qty, unit * qty)
    returning id into line;

    -- De la vitrina: ya está preparado; sale del stock de platos de la cocina.
    if p_channel = 'mostrador' and coalesce((item->>'stock')::boolean, false) then
      if prod.kind = 'builder' then raise exception 'VITRINA' using hint = 'Los bowls armados se preparan al momento.'; end if;
      got := public.take_dishes(k, prod.id, 'cocina', null, qty, 'venta', null, line);
      if got < qty then
        raise exception 'STOCK' using hint = 'En vitrina solo hay ' || got || ' de ' || prod.name || '.';
      end if;
      update public.order_items set prepared_qty = qty, prepared_at = now() where id = line;
    end if;
    v_subtotal := v_subtotal + unit * qty;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + delivery_fee where id = p_order_id;
  return v_subtotal;
end;
$$;
revoke execute on function public.add_order_lines(uuid, jsonb, text) from public, anon, authenticated;

-- Al cobrar: si todo salió de la vitrina, el pedido ya está listo para entregar.
create or replace function public.counter_charge(p_order_id uuid, p_method_id uuid, p_received integer default null, p_reference text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  m public.payment_methods%rowtype;
  sid uuid;
  received integer;
begin
  if not public.has_permission('counter.sell') then raise exception 'PERMISO' using hint = 'No tienes permiso para cobrar.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.channel <> 'mostrador' or not public.can_kitchen(o.kitchen_id) then
    raise exception 'PEDIDO' using hint = 'Pedido no encontrado.';
  end if;
  if o.status <> 'pendiente_pago' then raise exception 'ESTADO' using hint = 'Este pedido ya está pagado o cancelado.'; end if;
  sid := public.my_open_cash_session(o.kitchen_id);
  if sid is null then raise exception 'CAJA' using hint = 'Abre la caja antes de cobrar.'; end if;
  select * into m from public.payment_methods where id = p_method_id and active;
  if not found then raise exception 'METODO' using hint = 'Elige un método de pago.'; end if;
  if m.needs_reference and length(trim(coalesce(p_reference, ''))) < 3 then
    raise exception 'REFERENCIA' using hint = 'Escribe la referencia o el número de la transacción.';
  end if;

  received := case when m.kind = 'efectivo' then coalesce(p_received, o.total) else o.total end;
  if received < o.total then raise exception 'RECIBIDO' using hint = 'El efectivo recibido es menor que el total.'; end if;

  insert into public.payments (order_id, provider, amount, status, reference, method_id, method_name, received_amount, change_amount, cash_session_id, created_by)
  values (o.id, 'mostrador', o.total, 'aprobado',
          coalesce(nullif(trim(p_reference), ''), 'MOS-' || upper(substr(md5(random()::text), 1, 8))),
          m.id, m.name, received, received - o.total, sid, auth.uid());

  update public.orders set status = 'confirmado', payment_status = 'aprobado', paid_at = now(), updated_at = now(), cash_session_id = sid,
    prepared_at = case when not exists (select 1 from public.order_items i where i.order_id = o.id and i.prepared_qty < i.quantity) then now() else prepared_at end
  where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'confirmado', 'Pagado en caja · ' || m.name);
  return o.code;
end;
$$;

-- Anular en caja: lo que salió de la vitrina vuelve a la vitrina.
create or replace function public.counter_cancel(p_order_id uuid, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  pay public.payments%rowtype;
  sid uuid;
begin
  if not public.has_permission('counter.sell') then raise exception 'PERMISO' using hint = 'No tienes permiso para anular ventas.'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.channel <> 'mostrador' or not public.can_kitchen(o.kitchen_id) then
    raise exception 'PEDIDO' using hint = 'Pedido no encontrado.';
  end if;

  if o.status <> 'pendiente_pago' then
    if o.status <> 'confirmado' or exists (
      select 1 from public.prep_batch_items l join public.order_items i on i.id = l.order_item_id
      join public.prep_batches b on b.id = l.batch_id
      where i.order_id = o.id and b.status <> 'cancelado'
    ) then
      raise exception 'COCINA' using hint = 'La cocina ya empezó este pedido: no se puede anular desde caja.';
    end if;
    if o.delivered_at is not null then raise exception 'ENTREGADO' using hint = 'Este pedido ya se entregó.'; end if;
    if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'MOTIVO' using hint = 'Escribe el motivo de la devolución.'; end if;
    sid := public.my_open_cash_session(o.kitchen_id);
    if sid is null then raise exception 'CAJA' using hint = 'Abre la caja para hacer la devolución.'; end if;
  end if;

  -- Platos de la vitrina: vuelven a la cocina.
  insert into public.dish_movements (lot_id, kind, location, quantity, order_item_id, note)
  select m.lot_id, 'ajuste', 'cocina', -m.quantity, m.order_item_id, 'Pedido anulado: vuelve a vitrina'
  from public.dish_movements m join public.order_items i on i.id = m.order_item_id
  where i.order_id = o.id and m.kind = 'venta';

  if o.status = 'pendiente_pago' then
    update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', coalesce(nullif(trim(p_note), ''), 'Anulado en caja sin pagar'));
    return;
  end if;

  select * into pay from public.payments where order_id = o.id and status = 'aprobado' order by created_at desc limit 1;
  insert into public.payments (order_id, provider, amount, status, reference, method_id, method_name, cash_session_id, created_by)
  values (o.id, 'mostrador', o.total, 'reembolsado', 'DEV-' || upper(substr(md5(random()::text), 1, 8)), pay.method_id, pay.method_name, sid, auth.uid());
  update public.orders set status = 'cancelado', payment_status = 'reembolsado', cancelled_at = now(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', 'Devolución en caja: ' || left(trim(p_note), 250));
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS de pedidos: el vendedor ve las ventas de sus puntos
-- ---------------------------------------------------------------------------
create or replace function public.can_see_order(p_user_id uuid, p_kitchen_id uuid, p_channel text)
returns boolean language sql stable security definer set search_path = public as $$
  select (p_user_id is not null and p_user_id = auth.uid())
    or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver')
         or (p_channel = 'mostrador' and public.has_permission('counter.sell'))
         or (p_channel = 'punto' and (public.has_permission('points.sell') or public.has_permission('points.manage'))))
        and public.can_kitchen(p_kitchen_id));
$$;
drop policy "payments read" on public.payments;
create policy "payments read" on public.payments for select using (
  exists (select 1 from public.orders o where o.id = payments.order_id and (
    (o.user_id is not null and o.user_id = auth.uid())
    or ((public.has_permission('orders.view')
         or (o.channel = 'mostrador' and public.has_permission('counter.sell'))
         or (o.channel = 'punto' and (public.has_permission('points.sell') or public.has_permission('points.manage'))))
        and public.can_kitchen(o.kitchen_id))
  ))
);

grant execute on function public.point_suggestions(uuid, date) to authenticated;
grant execute on function public.save_point_plan(uuid, date, jsonb, text) to authenticated;
grant execute on function public.send_point_load(uuid) to authenticated;
grant execute on function public.cancel_point_load(uuid) to authenticated;
grant execute on function public.start_load_batch(uuid, uuid) to authenticated;
grant execute on function public.dispatch_point_load(uuid, jsonb) to authenticated;
grant execute on function public.receive_point_load(uuid, jsonb) to authenticated;
grant execute on function public.set_point_transport(uuid, integer, boolean, text) to authenticated;
grant execute on function public.open_point_cash(uuid, integer) to authenticated;
grant execute on function public.point_sell(uuid, jsonb, uuid, integer, text) to authenticated;
grant execute on function public.point_cancel_sale(uuid, text) to authenticated;
grant execute on function public.close_point_load(uuid, jsonb) to authenticated;
grant execute on function public.write_off_kitchen_dishes(uuid, text, integer, text) to authenticated;
grant execute on function public.can_point(uuid) to authenticated;
grant execute on function public.setting_int(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Ejemplo de prueba: un punto de Cocina Fontibón (o la primera cocina)
-- ---------------------------------------------------------------------------
insert into public.sale_points (kitchen_id, name, address, schedule)
select coalesce((select id from public.kitchens where name = 'Cocina Fontibón' limit 1), (select id from public.kitchens order by created_at limit 1)),
       'Punto de prueba · Torre Empresarial', 'Cra. 7 # 71-21, lobby (ejemplo)', 'Lunes a viernes · 11:30 a. m. – 2:30 p. m.'
where exists (select 1 from public.kitchens) and not exists (select 1 from public.sale_points);

notify pgrst, 'reload schema';
