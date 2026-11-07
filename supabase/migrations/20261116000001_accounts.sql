-- ---------------------------------------------------------------------------
-- Fase 6: Cuentas y utilidad real.
--  · Impuestos parametrizables con historial (cada pago guarda el impuesto vigente; precios con impuesto incluido).
--  · Costo histórico: cada movimiento de inventario guarda su costo; cada tanda su costo total.
--  · Empaques en la receta (también en los productos "Arma tu…").
--  · Pérdidas valorizadas (novedades de cocina) y gastos/ingresos manuales por cocina, con recurrentes.
--  · Nómina: pago por día o mensual de cada persona del equipo, por cocina.
-- Ventas: se reconocen cuando se cobran (pedidos al pagarse; planes al pagarse el plan).
-- ---------------------------------------------------------------------------

-- Permisos: ver cuentas (reports.view, ya existe) y administrarlas.
insert into public.permissions (key, module, description)
values ('finance.manage', 'Cuentas', 'Registrar gastos, nómina e impuestos')
on conflict (key) do nothing;
update public.permissions set module = 'Cuentas', description = 'Ver cuentas: ventas, costos, pérdidas y utilidad' where key = 'reports.view';
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join (values ('finance.manage'), ('reports.view')) p(key)
where r.key = 'admin'
on conflict do nothing;

-- ===== Impuestos =====
create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 60),
  rate numeric(6,4) not null check (rate >= 0 and rate < 1),
  valid_from date not null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (valid_from)
);
alter table public.tax_rates enable row level security;
drop policy if exists "taxes read" on public.tax_rates;
create policy "taxes read" on public.tax_rates for select using (public.has_permission('reports.view') or public.has_permission('finance.manage'));
drop policy if exists "taxes write" on public.tax_rates;
create policy "taxes write" on public.tax_rates for all using (public.has_permission('finance.manage')) with check (public.has_permission('finance.manage'));
insert into public.tax_rates (name, rate, valid_from) values ('Sin impuesto', 0, '2026-01-01') on conflict (valid_from) do nothing;

/** Impuesto vigente en una fecha (el más reciente que ya empezó a regir). */
create or replace function public.tax_on(p_date date)
returns table (name text, rate numeric)
language sql
stable
security definer
set search_path = public
as $$
  select t.name, t.rate from public.tax_rates t where t.valid_from <= p_date order by t.valid_from desc limit 1;
$$;

alter table public.orders add column if not exists tax_name text;
alter table public.orders add column if not exists tax_rate numeric(6,4) not null default 0;
alter table public.orders add column if not exists tax_amount integer not null default 0;
alter table public.subscription_payments add column if not exists tax_name text;
alter table public.subscription_payments add column if not exists tax_rate numeric(6,4) not null default 0;
alter table public.subscription_payments add column if not exists tax_amount integer not null default 0;

/** Al cobrarse, el pedido guarda el impuesto vigente (precio con impuesto incluido). */
create or replace function public.orders_snapshot_tax()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare t record;
begin
  if new.paid_at is not null and (tg_op = 'INSERT' or old.paid_at is null) then
    select * into t from public.tax_on((new.paid_at at time zone 'America/Bogota')::date);
    new.tax_name := coalesce(t.name, 'Sin impuesto');
    new.tax_rate := coalesce(t.rate, 0);
    new.tax_amount := round(new.total - new.total / (1 + new.tax_rate));
  end if;
  return new;
end;
$$;
drop trigger if exists orders_snapshot_tax on public.orders;
create trigger orders_snapshot_tax before insert or update of paid_at on public.orders
for each row execute function public.orders_snapshot_tax();

create or replace function public.subscription_payments_snapshot_tax()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare t record;
begin
  if new.status = 'aprobado' and (tg_op = 'INSERT' or old.status is distinct from 'aprobado') then
    select * into t from public.tax_on((coalesce(new.created_at, now()) at time zone 'America/Bogota')::date);
    new.tax_name := coalesce(t.name, 'Sin impuesto');
    new.tax_rate := coalesce(t.rate, 0);
    new.tax_amount := round(new.amount - new.amount / (1 + new.tax_rate));
  end if;
  return new;
end;
$$;
drop trigger if exists subscription_payments_snapshot_tax on public.subscription_payments;
create trigger subscription_payments_snapshot_tax before insert or update of status on public.subscription_payments
for each row execute function public.subscription_payments_snapshot_tax();

update public.orders set tax_name = 'Sin impuesto' where paid_at is not null and tax_name is null;
update public.subscription_payments set tax_name = 'Sin impuesto' where status = 'aprobado' and tax_name is null;

-- ===== Costo histórico =====
alter table public.inventory_movements add column if not exists batch_id uuid references public.prep_batches (id) on delete set null;
create index if not exists inventory_movements_batch_idx on public.inventory_movements (batch_id);
create index if not exists inventory_movements_created_idx on public.inventory_movements (created_at);

/** Todo movimiento guarda el costo del ingrediente en ese momento (las compras, el que se pagó). */
create or replace function public.inventory_movements_snapshot_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unit_cost is null then
    select cost_per_unit into new.unit_cost from public.ingredients where id = new.ingredient_id;
  end if;
  return new;
end;
$$;
drop trigger if exists inventory_movements_snapshot_cost on public.inventory_movements;
create trigger inventory_movements_snapshot_cost before insert on public.inventory_movements
for each row execute function public.inventory_movements_snapshot_cost();

update public.inventory_movements m set unit_cost = i.cost_per_unit
from public.ingredients i where i.id = m.ingredient_id and m.unit_cost is null;

alter table public.prep_batches add column if not exists total_cost numeric(14,2) not null default 0;

-- Tandas anteriores: costo con la receta y el costo actual (mejor aproximación disponible).
update public.prep_batches b set total_cost = coalesce((
  select round(sum(c), 2) from (
    select ri.quantity * l.quantity * ing.cost_per_unit as c
    from public.prep_batch_items l
    join public.order_items i on i.id = l.order_item_id
    join public.recipe_items ri on ri.product_id = i.product_id
    join public.ingredients ing on ing.id = ri.ingredient_id
    where l.batch_id = b.id
    union all
    select bo.quantity * l.quantity * ing.cost_per_unit
    from public.prep_batch_items l
    join public.order_items i on i.id = l.order_item_id
    cross join lateral jsonb_array_elements(i.options) opt
    join public.builder_options bo on bo.id = (opt->>'id')::uuid
    join public.ingredients ing on ing.id = bo.ingredient_id
    where l.batch_id = b.id and bo.quantity > 0
  ) x
), 0)
where b.status = 'listo' and b.total_cost = 0;

/** Costo promedio por unidad de una línea de pedido según sus tandas terminadas. */
create or replace function public.item_unit_cost(p_order_item_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(l.quantity * b.total_cost / nullif(b.quantity, 0)) / nullif(sum(l.quantity), 0), 0)
  from public.prep_batch_items l join public.prep_batches b on b.id = l.batch_id
  where l.order_item_id = p_order_item_id and b.status = 'listo';
$$;

/** Costo real de la comida de cada pedido (ingredientes y empaques de sus tandas). */
create or replace view public.order_food_costs with (security_invoker = on) as
select i.order_id, round(sum(l.quantity * b.total_cost / nullif(b.quantity, 0)), 2) as food_cost
from public.prep_batch_items l
join public.prep_batches b on b.id = l.batch_id and b.status = 'listo'
join public.order_items i on i.id = l.order_item_id
group by i.order_id;

-- ===== Pérdidas por novedades de cocina =====
alter table public.order_incidents add column if not exists cost numeric(14,2) not null default 0;

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
      -- Receta fija (platos) o empaques del armador (su receta solo lleva empaques y fijos).
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
  -- Costo real de la tanda (ingredientes y empaques al costo de este momento).
  update public.prep_batches pb set total_cost = coalesce((
    select round(sum(-m.quantity * coalesce(m.unit_cost, 0)), 2) from public.inventory_movements m where m.batch_id = pb.id
  ), 0) where pb.id = b.id;

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
  lost numeric := 0;
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
    -- Esas unidades ya se habían preparado (y consumido): su costo es pérdida.
    lost := take * public.item_unit_cost(it.id);
  end if;

  update public.order_items set prepared_at = null where id = it.id and prepared_qty < quantity;
  update public.orders set prepared_at = null, updated_at = now() where id = o.id
    and exists (select 1 from public.order_items x where x.order_id = o.id and x.prepared_qty < x.quantity);

  -- Un pedido con novedad no va en canastas: sale de la canasta por salir (las paradas se renumeran solas).
  delete from public.route_stops s using public.delivery_routes r
  where s.order_id = o.id and r.id = s.route_id and r.status = 'planificada';
  insert into public.order_incidents (order_id, stage, order_item_id, item_name, quantity, reason, note, cost)
  values (o.id, 'cocina', it.id, it.name, p_quantity, p_reason, trim(p_note), round(lost, 2));
  insert into public.order_events (order_id, status, note)
  values (o.id, o.status, 'Novedad en cocina: ' || p_quantity || ' × ' || it.name || ' sin preparar. ' || public.incident_reason_label(p_reason) || '. ' || trim(p_note));
  perform public.notify_permission('orders.manage', 'warning', 'Novedad en cocina: ' || o.code,
          p_quantity || ' × ' || it.name || ' · ' || public.incident_reason_label(p_reason) || ': ' || left(trim(p_note), 100), '/admin/pedidos/' || o.code);
end;
$$;

-- ===== Gastos e ingresos manuales =====
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references public.kitchens (id) on delete set null,
  kind text not null check (kind in ('egreso', 'ingreso')),
  category text not null check (category in (
    'arriendo', 'servicios', 'internet_software', 'contador', 'publicidad', 'mantenimiento', 'transporte', 'nomina_extra',
    'impuestos_tasas', 'imprevistos', 'otros_egresos', 'otros_ingresos')),
  description text not null check (length(trim(description)) between 2 and 200),
  amount integer not null check (amount > 0),
  entry_date date not null,
  -- Recurrente: se repite cada mes desde entry_date (hasta ends_on, si tiene).
  recurring boolean not null default false,
  ends_on date,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= entry_date)
);
create index if not exists finance_entries_date_idx on public.finance_entries (entry_date);
alter table public.finance_entries enable row level security;
drop policy if exists "finance read" on public.finance_entries;
create policy "finance read" on public.finance_entries for select using (public.has_permission('reports.view') or public.has_permission('finance.manage'));
drop policy if exists "finance write" on public.finance_entries;
create policy "finance write" on public.finance_entries for all using (public.has_permission('finance.manage')) with check (public.has_permission('finance.manage'));

-- ===== Nómina =====
create table if not exists public.employee_pay (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  kitchen_id uuid references public.kitchens (id) on delete set null,
  pay_type text not null check (pay_type in ('diario', 'mensual')),
  amount integer not null check (amount > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.employee_pay enable row level security;
drop policy if exists "pay read" on public.employee_pay;
create policy "pay read" on public.employee_pay for select using (public.has_permission('reports.view') or public.has_permission('finance.manage'));
drop policy if exists "pay write" on public.employee_pay;
create policy "pay write" on public.employee_pay for all using (public.has_permission('finance.manage')) with check (public.has_permission('finance.manage'));

-- Quien ve cuentas puede ver los nombres del equipo con pago registrado.
drop policy if exists "staff with pay visible to finance" on public.profiles;
create policy "staff with pay visible to finance" on public.profiles for select
  using (public.has_permission('reports.view') and exists (select 1 from public.employee_pay e where e.user_id = profiles.id));

revoke execute on function public.tax_on(date) from public, anon;
revoke execute on function public.item_unit_cost(uuid) from public, anon;
grant execute on function public.tax_on(date) to authenticated;
grant execute on function public.item_unit_cost(uuid) to authenticated;
grant select on public.order_food_costs to authenticated;

-- Desde cuándo cuenta el pago (no se proyecta a períodos anteriores).
alter table public.employee_pay add column if not exists starts_on date not null
  default (date_trunc('month', (now() at time zone 'America/Bogota')))::date;
