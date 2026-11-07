-- ---------------------------------------------------------------------------
-- Cada cocina como un establecimiento: equipo, inventario y cuentas propios.
--  · Superadministrador (dueño, permiso kitchens.all): ve y opera todas las cocinas.
--  · Administrador de cocina: todo lo de su(s) cocina(s); gestiona su equipo (cocineros y domiciliarios).
--  · El personal queda asignado a una o varias cocinas (user_kitchens) y solo ve esas cocinas.
--  · Inventario por cocina: el ingrediente es uno solo (nombre, unidad, nutrición); stock, mínimo y
--    costo promedio son de cada cocina. Traslados entre cocinas con su costo.
--  · El alcance se aplica en la base de datos (RLS + guardas en escrituras), no solo en pantalla.
-- ---------------------------------------------------------------------------

-- ===== Permiso y roles =====
insert into public.permissions (key, module, description)
values ('kitchens.all', 'General', 'Ver y operar todas las cocinas (superadministrador)')
on conflict (key) do nothing;
insert into public.role_permissions (role_id, permission_key)
select id, 'kitchens.all' from public.roles where key = 'admin'
on conflict do nothing;
update public.roles set name = 'Superadministrador', description = 'Dueño: acceso a todas las cocinas, el catálogo y la configuración'
where key = 'admin';

-- Roles que un administrador de cocina puede dar a su equipo.
alter table public.roles add column if not exists kitchen_assignable boolean not null default false;
update public.roles set kitchen_assignable = true where key in ('cocinero', 'domiciliario');

insert into public.roles (key, name, description, is_system)
values ('admin_cocina', 'Administrador de cocina', 'Opera su cocina: pedidos, cocina, alistamiento, inventario, cuentas y su equipo', true)
on conflict (key) do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r
cross join (values ('admin.access'), ('orders.view'), ('orders.manage'), ('kitchen.prepare'), ('inventory.view'),
                   ('inventory.manage'), ('reports.view'), ('finance.manage'), ('users.manage')) p(key)
where r.key = 'admin_cocina'
on conflict do nothing;

-- ===== Personal por cocina =====
create table if not exists public.user_kitchens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kitchen_id uuid not null references public.kitchens (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, kitchen_id)
);
create index if not exists user_kitchens_kitchen_idx on public.user_kitchens (kitchen_id);
alter table public.user_kitchens enable row level security;

/** ¿El usuario actual puede ver/operar esta cocina? */
create or replace function public.can_kitchen(k uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('kitchens.all')
      or exists (select 1 from public.user_kitchens uk join public.profiles p on p.id = uk.user_id and p.active
                 where uk.user_id = auth.uid() and uk.kitchen_id = k);
$$;

/** Igual, para otro usuario (destinatarios de notificaciones). */
create or replace function public.user_can_kitchen(p_user uuid, k uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id = ur.role_id
                 where ur.user_id = p_user and rp.permission_key = 'kitchens.all')
      or exists (select 1 from public.user_kitchens where user_id = p_user and kitchen_id = k);
$$;

/** ¿El usuario actual administra a esta persona? (superadmin, o comparte una de sus cocinas). */
create or replace function public.manages_user(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('users.manage') and (
    public.has_permission('kitchens.all')
    or exists (select 1 from public.user_kitchens uk where uk.user_id = p_user and public.can_kitchen(uk.kitchen_id))
  );
$$;

/** Roles de personal que solo el superadministrador puede tocar. */
create or replace function public.has_restricted_role(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                 where ur.user_id = p_user and r.key <> 'cliente' and not r.kitchen_assignable);
$$;

/** Cocinas que ve el usuario actual (para la sesión). */
create or replace function public.my_kitchens()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select k.id from public.kitchens k where public.can_kitchen(k.id);
$$;

drop policy if exists "user kitchens read" on public.user_kitchens;
create policy "user kitchens read" on public.user_kitchens for select
  using (user_id = auth.uid() or public.manages_user(user_id) or (public.has_permission('admin.access') and public.can_kitchen(kitchen_id)));

-- Personal actual: cada quien queda en las cocinas donde ya trabajó (tandas, canastas, zonas asignadas).
insert into public.user_kitchens (user_id, kitchen_id)
select distinct x.user_id, x.kitchen_id from (
  select b.started_by as user_id, b.kitchen_id from public.prep_batches b where b.started_by is not null
  union select r.courier_id, r.kitchen_id from public.delivery_routes r where r.courier_id is not null
  union select ca.user_id, z.kitchen_id from public.courier_assignments ca join public.zones z on z.id = ca.zone_id
) x
join public.user_roles ur on ur.user_id = x.user_id
join public.role_permissions rp on rp.role_id = ur.role_id and rp.permission_key = 'admin.access'
where x.kitchen_id is not null
  and not exists (select 1 from public.user_roles u2 join public.role_permissions p2 on p2.role_id = u2.role_id
                  where u2.user_id = x.user_id and p2.permission_key = 'kitchens.all')
on conflict do nothing;

-- ===== Pedidos: cocina que los atiende (por la zona) =====
alter table public.orders add column if not exists kitchen_id uuid references public.kitchens (id) on delete set null;
update public.orders o set kitchen_id = z.kitchen_id from public.zones z where z.id = o.zone_id and o.kitchen_id is distinct from z.kitchen_id;
create index if not exists orders_kitchen_idx on public.orders (kitchen_id, delivery_date);

create or replace function public.orders_set_kitchen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.zone_id is distinct from old.zone_id or new.kitchen_id is null then
    select kitchen_id into new.kitchen_id from public.zones where id = new.zone_id;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_set_kitchen on public.orders;
create trigger orders_set_kitchen before insert or update of zone_id, kitchen_id on public.orders
for each row execute function public.orders_set_kitchen();

-- Si una zona cambia de cocina, sus pedidos futuros se van con ella.
create or replace function public.zones_move_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kitchen_id is distinct from old.kitchen_id then
    update public.orders set kitchen_id = new.kitchen_id
    where zone_id = new.id and delivery_date >= public.today_local() and status in ('pendiente_pago', 'confirmado');
  end if;
  return new;
end;
$$;
drop trigger if exists zones_move_orders on public.zones;
create trigger zones_move_orders after update of kitchen_id on public.zones
for each row execute function public.zones_move_orders();

-- ===== Lecturas con alcance por cocina =====
drop policy if exists "kitchens read" on public.kitchens;
create policy "kitchens read" on public.kitchens for select using (public.has_permission('admin.access') and public.can_kitchen(id));

drop policy if exists "couriers read" on public.courier_assignments;
create policy "couriers read" on public.courier_assignments for select
  using (public.has_permission('admin.access') and exists (select 1 from public.zones z where z.id = zone_id and public.can_kitchen(z.kitchen_id)));

drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select
  using (user_id = auth.uid()
         or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver'))
             and public.can_kitchen(kitchen_id)));

drop policy if exists "order items read" on public.order_items;
create policy "order items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and (o.user_id = auth.uid()
         or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver'))
             and public.can_kitchen(o.kitchen_id)))));

drop policy if exists "order events read" on public.order_events;
create policy "order events read" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_events.order_id and (o.user_id = auth.uid()
         or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver'))
             and public.can_kitchen(o.kitchen_id)))));

drop policy if exists "payments read" on public.payments;
create policy "payments read" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = payments.order_id and (o.user_id = auth.uid()
         or (public.has_permission('orders.view') and public.can_kitchen(o.kitchen_id)))));

drop policy if exists "incidents read" on public.order_incidents;
create policy "incidents read" on public.order_incidents for select
  using ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare'))
         and exists (select 1 from public.orders o where o.id = order_incidents.order_id and public.can_kitchen(o.kitchen_id)));

drop policy if exists "prep batches read" on public.prep_batches;
create policy "prep batches read" on public.prep_batches for select
  using ((public.has_permission('kitchen.prepare') or public.has_permission('orders.view')) and public.can_kitchen(kitchen_id));

drop policy if exists "batch items read" on public.prep_batch_items;
create policy "batch items read" on public.prep_batch_items for select
  using ((public.has_permission('kitchen.prepare') or public.has_permission('orders.view'))
         and exists (select 1 from public.prep_batches b where b.id = prep_batch_items.batch_id and public.can_kitchen(b.kitchen_id)));

drop policy if exists "routes read" on public.delivery_routes;
create policy "routes read" on public.delivery_routes for select
  using (courier_id = auth.uid()
         or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare')) and public.can_kitchen(kitchen_id)));

drop policy if exists "route stops read" on public.route_stops;
create policy "route stops read" on public.route_stops for select
  using (exists (select 1 from public.delivery_routes r where r.id = route_stops.route_id and (r.courier_id = auth.uid()
         or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare')) and public.can_kitchen(r.kitchen_id)))));

-- Planes: el equipo de una cocina ve los planes con entregas en su cocina.
drop policy if exists "subscriptions read" on public.subscriptions;
create policy "subscriptions read" on public.subscriptions for select
  using (user_id = auth.uid()
         or (public.has_permission('orders.view') and (public.has_permission('kitchens.all')
             or exists (select 1 from public.orders o where o.subscription_id = subscriptions.id and public.can_kitchen(o.kitchen_id)))));

drop policy if exists "subscription payments read" on public.subscription_payments;
create policy "subscription payments read" on public.subscription_payments for select
  using (exists (select 1 from public.subscriptions s where s.id = subscription_payments.subscription_id and (s.user_id = auth.uid()
         or (public.has_permission('orders.view') and (public.has_permission('kitchens.all')
             or exists (select 1 from public.orders o where o.subscription_id = s.id and public.can_kitchen(o.kitchen_id)))))));

drop policy if exists "addresses own read" on public.addresses;
create policy "addresses own read" on public.addresses for select
  using (user_id = auth.uid()
         or (public.has_permission('orders.view') and (public.has_permission('kitchens.all')
             or exists (select 1 from public.orders o where o.address_id = addresses.id and public.can_kitchen(o.kitchen_id)))));

-- Usuarios: el superadmin ve a todos; el admin de cocina, a su equipo y a los clientes de sus pedidos.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.manages_user(id));
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update
  using (id = auth.uid() or (public.manages_user(id) and (public.has_permission('kitchens.all') or not public.has_restricted_role(id))))
  with check (id = auth.uid() or (public.manages_user(id) and (public.has_permission('kitchens.all') or not public.has_restricted_role(id))));
drop policy if exists "customers visible to orders" on public.profiles;
create policy "customers visible to orders" on public.profiles for select
  using (public.has_permission('orders.view')
         and exists (select 1 from public.orders o where o.user_id = profiles.id and public.can_kitchen(o.kitchen_id)));
drop policy if exists "team visible to operations" on public.profiles;
create policy "team visible to operations" on public.profiles for select
  using (public.has_permission('admin.access')
         and exists (select 1 from public.user_kitchens uk where uk.user_id = profiles.id and public.can_kitchen(uk.kitchen_id)));

drop policy if exists "user_roles read" on public.user_roles;
create policy "user_roles read" on public.user_roles for select
  using (user_id = auth.uid() or public.manages_user(user_id));
drop policy if exists "user_roles write" on public.user_roles;
create policy "user_roles write" on public.user_roles for all
  using (public.has_permission('users.manage') and (public.has_permission('kitchens.all')
         or (public.manages_user(user_id) and not public.has_restricted_role(user_id)
             and exists (select 1 from public.roles r where r.id = role_id and (r.kitchen_assignable or r.key = 'cliente')))))
  with check (public.has_permission('users.manage') and (public.has_permission('kitchens.all')
         or (public.manages_user(user_id) and not public.has_restricted_role(user_id)
             and exists (select 1 from public.roles r where r.id = role_id and (r.kitchen_assignable or r.key = 'cliente')))));

drop policy if exists "consents read" on public.user_consents;
create policy "consents read" on public.user_consents for select using (user_id = auth.uid() or public.manages_user(user_id));
drop policy if exists "status events read" on public.user_status_events;
create policy "status events read" on public.user_status_events for select using (public.manages_user(user_id));

-- Cuentas: lo "general" (sin cocina) es solo del superadministrador.
drop policy if exists "finance read" on public.finance_entries;
create policy "finance read" on public.finance_entries for select
  using ((public.has_permission('reports.view') or public.has_permission('finance.manage'))
         and (case when kitchen_id is null then public.has_permission('kitchens.all') else public.can_kitchen(kitchen_id) end));
drop policy if exists "finance write" on public.finance_entries;
create policy "finance write" on public.finance_entries for all
  using (public.has_permission('finance.manage') and (case when kitchen_id is null then public.has_permission('kitchens.all') else public.can_kitchen(kitchen_id) end))
  with check (public.has_permission('finance.manage') and (case when kitchen_id is null then public.has_permission('kitchens.all') else public.can_kitchen(kitchen_id) end));

drop policy if exists "pay read" on public.employee_pay;
create policy "pay read" on public.employee_pay for select
  using ((public.has_permission('reports.view') or public.has_permission('finance.manage'))
         and (case when kitchen_id is null then public.has_permission('kitchens.all') else public.can_kitchen(kitchen_id) end));
drop policy if exists "pay write" on public.employee_pay;
create policy "pay write" on public.employee_pay for all
  using (public.has_permission('finance.manage') and (case when kitchen_id is null then public.has_permission('kitchens.all') else public.can_kitchen(kitchen_id) end))
  with check (public.has_permission('finance.manage') and (case when kitchen_id is null then public.has_permission('kitchens.all') else public.can_kitchen(kitchen_id) end));

-- El ingrediente (nombre, unidad, costo de referencia) es del catálogo central.
drop policy if exists "ingredients write" on public.ingredients;
create policy "ingredients write" on public.ingredients for all
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

-- ===== Guardas de escritura: ninguna función puede tocar datos de otra cocina =====
-- Deja pasar la entrada en destino de un traslado (la salida ya se validó en transfer_stock).
/** Guarda: quien no es superadmin solo escribe en sus cocinas (los procesos del sistema, sin usuario, pasan). */
create or replace function public.guard_kitchen_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record := coalesce(new, old);
  k uuid;
begin
  if auth.uid() is null or public.has_permission('kitchens.all') then return coalesce(new, old); end if;
  if tg_table_name = 'orders' then
    if r.user_id = auth.uid() then return coalesce(new, old); end if;
    k := r.kitchen_id;
  elsif tg_table_name = 'inventory_movements' then
    if r.kind = 'traslado' and r.quantity > 0 and exists (
      select 1 from public.inventory_movements m where m.transfer_id = r.transfer_id and m.kitchen_id = r.counterpart_kitchen_id and m.quantity < 0
    ) then return new; end if;
    k := r.kitchen_id;
  elsif tg_table_name in ('prep_batches', 'delivery_routes') then
    k := r.kitchen_id;
  elsif tg_table_name = 'route_stops' then
    select kitchen_id into k from public.delivery_routes where id = r.route_id;
    if k is null then return coalesce(new, old); end if;
  elsif tg_table_name = 'order_incidents' then
    select kitchen_id into k from public.orders where id = r.order_id;
  end if;
  if k is null or not public.can_kitchen(k) then
    raise exception 'COCINA' using hint = 'No tienes acceso a esa cocina.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists guard_kitchen_orders on public.orders;
create trigger guard_kitchen_orders before update or delete on public.orders
for each row execute function public.guard_kitchen_write();
drop trigger if exists guard_kitchen_batches on public.prep_batches;
create trigger guard_kitchen_batches before insert or update or delete on public.prep_batches
for each row execute function public.guard_kitchen_write();
drop trigger if exists guard_kitchen_routes on public.delivery_routes;
create trigger guard_kitchen_routes before insert or update or delete on public.delivery_routes
for each row execute function public.guard_kitchen_write();
drop trigger if exists guard_kitchen_stops on public.route_stops;
create trigger guard_kitchen_stops before insert or update or delete on public.route_stops
for each row execute function public.guard_kitchen_write();
drop trigger if exists guard_kitchen_incidents on public.order_incidents;
create trigger guard_kitchen_incidents before insert or update on public.order_incidents
for each row execute function public.guard_kitchen_write();

-- Las lecturas de cocina por franja también respetan el alcance.
create or replace function public.kitchen_orders(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns setof public.orders
language sql
stable
security definer
set search_path = public
as $$
  select o.* from public.orders o
  where o.kitchen_id = p_kitchen_id and o.delivery_date = p_date and o.slot_id = p_slot_id
    and o.status in ('confirmado', 'en_preparacion') and not o.on_hold
    and (auth.uid() is null or public.can_kitchen(p_kitchen_id));
$$;

-- Avisos de un pedido: solo a quien ve la cocina de ese pedido.
create or replace function public.notifications_kitchen_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k uuid;
begin
  if new.href like '/admin/pedidos/%' then
    select kitchen_id into k from public.orders where code = split_part(substr(new.href, 16), '?', 1);
    if k is not null and not public.user_can_kitchen(new.user_id, k) then return null; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists notifications_kitchen_scope on public.notifications;
create trigger notifications_kitchen_scope before insert on public.notifications
for each row execute function public.notifications_kitchen_scope();

-- ===== Inventario por cocina =====
create table if not exists public.kitchen_stock (
  kitchen_id uuid not null references public.kitchens (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  stock numeric(12, 2) not null default 0,
  min_stock numeric(12, 2) not null default 0 check (min_stock >= 0),
  cost_per_unit numeric(12, 4) not null default 0 check (cost_per_unit >= 0),
  updated_at timestamptz not null default now(),
  primary key (kitchen_id, ingredient_id)
);
alter table public.kitchen_stock enable row level security;
drop policy if exists "kitchen stock read" on public.kitchen_stock;
create policy "kitchen stock read" on public.kitchen_stock for select
  using ((public.has_permission('inventory.view') or public.has_permission('inventory.manage') or public.has_permission('kitchen.prepare')
          or public.has_permission('reports.view')) and public.can_kitchen(kitchen_id));

-- Stock actual → Cocina Fontibón (decisión del dueño); las demás arrancan en cero.
insert into public.kitchen_stock (kitchen_id, ingredient_id, stock, min_stock, cost_per_unit)
select k.id, i.id, case when k.name = 'Cocina Fontibón' then i.stock else 0 end, i.min_stock, i.cost_per_unit
from public.kitchens k cross join public.ingredients i
on conflict do nothing;

alter table public.inventory_movements add column if not exists kitchen_id uuid references public.kitchens (id) on delete cascade;
alter table public.inventory_movements add column if not exists transfer_id uuid;
alter table public.inventory_movements add column if not exists counterpart_kitchen_id uuid references public.kitchens (id) on delete set null;
update public.inventory_movements m set kitchen_id = b.kitchen_id from public.prep_batches b where b.id = m.batch_id and m.kitchen_id is null;
update public.inventory_movements set kitchen_id = (select id from public.kitchens where name = 'Cocina Fontibón' limit 1) where kitchen_id is null;
alter table public.inventory_movements alter column kitchen_id set not null;
create index if not exists inventory_movements_kitchen_idx on public.inventory_movements (kitchen_id, created_at desc);

alter table public.inventory_movements drop constraint if exists inventory_movements_kind_check;
alter table public.inventory_movements add constraint inventory_movements_kind_check
  check (kind in ('entrada', 'perdida', 'ajuste', 'consumo', 'traslado'));

drop policy if exists "movements read" on public.inventory_movements;
create policy "movements read" on public.inventory_movements for select
  using ((public.has_permission('inventory.view') or public.has_permission('inventory.manage') or public.has_permission('reports.view'))
         and public.can_kitchen(kitchen_id));
drop policy if exists "movements insert" on public.inventory_movements;
create policy "movements insert" on public.inventory_movements for insert
  with check (public.has_permission('inventory.manage') and kind in ('entrada', 'perdida', 'ajuste') and public.can_kitchen(kitchen_id));

-- Movimiento sin cocina: la toma de su tanda (consumo al preparar). Costo: el de esa cocina.
create or replace function public.inventory_movements_snapshot_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kitchen_id is null and new.batch_id is not null then
    select kitchen_id into new.kitchen_id from public.prep_batches where id = new.batch_id;
  end if;
  if new.kitchen_id is null then raise exception 'COCINA' using hint = 'Elige la cocina del movimiento.'; end if;
  if new.unit_cost is null then
    select nullif(ks.cost_per_unit, 0) into new.unit_cost from public.kitchen_stock ks
    where ks.kitchen_id = new.kitchen_id and ks.ingredient_id = new.ingredient_id;
    if new.unit_cost is null then
      select cost_per_unit into new.unit_cost from public.ingredients where id = new.ingredient_id;
    end if;
  end if;
  return new;
end;
$$;

-- Orden de los triggers (alfabético): primero se completa cocina y costo, luego la guarda.
drop trigger if exists inventory_movements_snapshot_cost on public.inventory_movements;
drop trigger if exists a_inventory_movements_snapshot_cost on public.inventory_movements;
drop trigger if exists b_guard_kitchen_movements on public.inventory_movements;
create trigger a_inventory_movements_snapshot_cost before insert on public.inventory_movements
for each row execute function public.inventory_movements_snapshot_cost();
create trigger b_guard_kitchen_movements before insert on public.inventory_movements
for each row execute function public.guard_kitchen_write();

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ing public.ingredients%rowtype;
  ks public.kitchen_stock%rowtype;
begin
  select * into ing from public.ingredients where id = new.ingredient_id for update;
  insert into public.kitchen_stock (kitchen_id, ingredient_id, min_stock, cost_per_unit)
  values (new.kitchen_id, new.ingredient_id, ing.min_stock, ing.cost_per_unit)
  on conflict do nothing;
  select * into ks from public.kitchen_stock where kitchen_id = new.kitchen_id and ingredient_id = new.ingredient_id for update;

  -- Costo promedio ponderado de la cocina en cada compra o traslado recibido con costo.
  if new.kind in ('entrada', 'traslado') and new.quantity > 0 and new.unit_cost is not null then
    update public.kitchen_stock
    set cost_per_unit = case
          when greatest(ks.stock, 0) + new.quantity > 0 then
            round(((greatest(ks.stock, 0) * ks.cost_per_unit) + (new.quantity * new.unit_cost)) / (greatest(ks.stock, 0) + new.quantity), 4)
          else new.unit_cost end
    where kitchen_id = ks.kitchen_id and ingredient_id = ks.ingredient_id;
  end if;
  update public.kitchen_stock set stock = stock + new.quantity, updated_at = now()
  where kitchen_id = ks.kitchen_id and ingredient_id = ks.ingredient_id;

  -- Referencia del catálogo: costo promedio de compras de todas las cocinas y stock total.
  if new.kind = 'entrada' and new.unit_cost is not null then
    update public.ingredients
    set cost_per_unit = case
          when greatest(ing.stock, 0) + new.quantity > 0 then
            round(((greatest(ing.stock, 0) * ing.cost_per_unit) + (new.quantity * new.unit_cost)) / (greatest(ing.stock, 0) + new.quantity), 4)
          else new.unit_cost end
    where id = ing.id;
  end if;
  update public.ingredients set stock = stock + new.quantity, updated_at = now() where id = ing.id;
  return new;
end;
$$;

-- Alertas de stock: por cocina, a su equipo.
drop trigger if exists notify_low_stock on public.ingredients;
create or replace function public.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ing public.ingredients%rowtype;
  kname text;
  unit_label text;
  crossed_min boolean := new.min_stock > 0 and new.stock < new.min_stock and old.stock >= old.min_stock;
  ran_out boolean := new.stock <= 0 and old.stock > 0;
begin
  if not (crossed_min or ran_out) then return new; end if;
  select * into ing from public.ingredients where id = new.ingredient_id;
  if not ing.active then return new; end if;
  select replace(name, 'Cocina ', '') into kname from public.kitchens where id = new.kitchen_id;
  unit_label := case ing.unit when 'g' then 'g' when 'ml' then 'ml' else 'un' end;
  insert into public.notifications (user_id, kind, title, body, href)
  select distinct ur.user_id,
         case when new.stock <= 0 then 'alert' else 'warning' end,
         case when new.stock <= 0 then 'Sin stock: ' else 'Stock bajo: ' end || ing.name || ' · ' || kname,
         case when new.stock < 0
           then 'Faltan ' || replace(to_char(round(-new.stock), 'FM999,999,990'), ',', '.') || ' ' || unit_label || ' según lo preparado. Registra la compra o un ajuste.'
           else 'Quedan ' || replace(to_char(round(greatest(new.stock, 0)), 'FM999,999,990'), ',', '.') || ' ' || unit_label
                || ' (mínimo ' || replace(to_char(round(new.min_stock), 'FM999,999,990'), ',', '.') || ' ' || unit_label || ').' end,
         '/admin/inventario?cocina=' || new.kitchen_id
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key = 'inventory.view' and public.user_can_kitchen(ur.user_id, new.kitchen_id);
  return new;
end;
$$;
drop trigger if exists notify_low_stock on public.kitchen_stock;
create trigger notify_low_stock after update of stock, min_stock on public.kitchen_stock
for each row execute function public.notify_low_stock();

-- Ingrediente o cocina nuevos: su fila de stock.
create or replace function public.kitchen_stock_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'ingredients' then
    insert into public.kitchen_stock (kitchen_id, ingredient_id, min_stock, cost_per_unit)
    select k.id, new.id, new.min_stock, new.cost_per_unit from public.kitchens k on conflict do nothing;
  else
    insert into public.kitchen_stock (kitchen_id, ingredient_id, min_stock, cost_per_unit)
    select new.id, i.id, i.min_stock, i.cost_per_unit from public.ingredients i on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists kitchen_stock_seed on public.ingredients;
create trigger kitchen_stock_seed after insert on public.ingredients for each row execute function public.kitchen_stock_seed();
drop trigger if exists kitchen_stock_seed on public.kitchens;
create trigger kitchen_stock_seed after insert on public.kitchens for each row execute function public.kitchen_stock_seed();

/** Mínimo de un ingrediente en una cocina. */
create or replace function public.set_kitchen_min_stock(p_kitchen_id uuid, p_ingredient_id uuid, p_min numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.has_permission('inventory.manage') and public.can_kitchen(p_kitchen_id)) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para el inventario de esta cocina.';
  end if;
  if p_min is null or p_min < 0 then raise exception 'MINIMO' using hint = 'El mínimo no puede ser negativo.'; end if;
  update public.kitchen_stock set min_stock = round(p_min, 2), updated_at = now()
  where kitchen_id = p_kitchen_id and ingredient_id = p_ingredient_id;
end;
$$;

/** Traslado entre cocinas: sale de una con su costo y entra a la otra. Lo registra quien envía. */
create or replace function public.transfer_stock(p_from uuid, p_to uuid, p_ingredient_id uuid, p_quantity numeric, p_note text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ks public.kitchen_stock%rowtype;
  t uuid := gen_random_uuid();
  note text := left(trim(coalesce(p_note, '')), 300);
begin
  if not (public.has_permission('inventory.manage') and public.can_kitchen(p_from)) then
    raise exception 'PERMISO' using hint = 'Solo puedes trasladar desde una cocina tuya.';
  end if;
  if p_from = p_to then raise exception 'DESTINO' using hint = 'Elige otra cocina de destino.'; end if;
  if not exists (select 1 from public.kitchens where id = p_to and active) then raise exception 'DESTINO' using hint = 'Cocina de destino inválida.'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'CANTIDAD' using hint = 'Escribe una cantidad válida.'; end if;
  select * into ks from public.kitchen_stock where kitchen_id = p_from and ingredient_id = p_ingredient_id for update;
  if not found or ks.stock < p_quantity then raise exception 'STOCK' using hint = 'No hay suficiente stock para trasladar.'; end if;

  insert into public.inventory_movements (kitchen_id, ingredient_id, kind, quantity, unit_cost, note, transfer_id, counterpart_kitchen_id)
  values (p_from, p_ingredient_id, 'traslado', -round(p_quantity, 2), ks.cost_per_unit, note, t, p_to);
  -- La entrada en destino la hace el sistema (quien envía no necesariamente ve la otra cocina).
  insert into public.inventory_movements (kitchen_id, ingredient_id, kind, quantity, unit_cost, note, transfer_id, counterpart_kitchen_id)
  select p_to, p_ingredient_id, 'traslado', round(p_quantity, 2), ks.cost_per_unit, note, t, p_from;
  return t;
end;
$$;


-- ===== Equipo por cocina =====
/** Cocinas de una persona. El admin de cocina solo cambia las suyas y no toca administradores. */
create or replace function public.set_user_kitchens(p_user_id uuid, p_kitchen_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super boolean := public.has_permission('kitchens.all');
begin
  if not public.has_permission('users.manage') then raise exception 'PERMISO' using hint = 'No tienes permiso para administrar el equipo.'; end if;
  if not is_super then
    if public.has_restricted_role(p_user_id) then raise exception 'PERMISO' using hint = 'Solo el superadministrador cambia a otros administradores.'; end if;
    if exists (select 1 from unnest(coalesce(p_kitchen_ids, '{}')) k where not public.can_kitchen(k)) then
      raise exception 'COCINA' using hint = 'Solo puedes asignar tus cocinas.';
    end if;
  end if;
  -- Solo se quitan las cocinas que el usuario actual administra; las demás se conservan.
  delete from public.user_kitchens uk
  where uk.user_id = p_user_id and public.can_kitchen(uk.kitchen_id) and not (uk.kitchen_id = any (coalesce(p_kitchen_ids, '{}')));
  insert into public.user_kitchens (user_id, kitchen_id)
  select p_user_id, k from unnest(coalesce(p_kitchen_ids, '{}')) k on conflict do nothing;
end;
$$;

/** Sumar una persona (ya registrada) al equipo de una cocina con un rol. */
create or replace function public.add_team_member(p_email text, p_role_id uuid, p_kitchen_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  ro public.roles%rowtype;
  is_super boolean := public.has_permission('kitchens.all');
begin
  if not (public.has_permission('users.manage') and public.can_kitchen(p_kitchen_id)) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para el equipo de esta cocina.';
  end if;
  select * into ro from public.roles where id = p_role_id;
  if not found or ro.key = 'cliente' or not (ro.kitchen_assignable or is_super) then
    raise exception 'ROL' using hint = 'Ese rol no lo puedes asignar.';
  end if;
  select id into uid from public.profiles where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'CORREO' using hint = 'No hay una cuenta con ese correo. Pídele que se registre primero.'; end if;
  if not is_super and public.has_restricted_role(uid) then
    raise exception 'PERMISO' using hint = 'Esa persona es administradora; solo el superadministrador la cambia.';
  end if;
  insert into public.user_kitchens (user_id, kitchen_id) values (uid, p_kitchen_id) on conflict do nothing;
  insert into public.user_roles (user_id, role_id) values (uid, p_role_id) on conflict do nothing;
  return uid;
end;
$$;

-- Activar/inactivar: el admin de cocina solo a su equipo (no a administradores).
create or replace function public.set_user_active(p_user_id uuid, p_active boolean, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pr public.profiles%rowtype;
begin
  if not public.manages_user(p_user_id) or (not public.has_permission('kitchens.all') and public.has_restricted_role(p_user_id)) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para administrar este usuario.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'PROPIO' using hint = 'No puedes inactivar tu propia cuenta.';
  end if;
  select * into pr from public.profiles where id = p_user_id for update;
  if not found then raise exception 'USUARIO' using hint = 'Usuario no encontrado.'; end if;
  if pr.active = p_active then return; end if;
  if not p_active and length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'MOTIVO' using hint = 'Escribe el motivo de la inactivación.';
  end if;
  if not p_active and exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = p_user_id and r.key = 'admin')
     and not exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id join public.profiles p on p.id = ur.user_id
                     where r.key = 'admin' and p.active and ur.user_id <> p_user_id) then
    raise exception 'ADMIN' using hint = 'Es el único superadministrador activo.';
  end if;

  update public.profiles
  set active = p_active,
      deactivated_at = case when p_active then null else now() end,
      deactivated_by = case when p_active then null else auth.uid() end,
      deactivation_reason = case when p_active then null else trim(p_reason) end,
      updated_at = now()
  where id = p_user_id;
  update auth.users set banned_until = case when p_active then null else '2999-12-31 00:00:00+00'::timestamptz end where id = p_user_id;
  if not p_active then
    delete from auth.sessions where user_id = p_user_id;
  end if;
  insert into public.user_status_events (user_id, active, reason) values (p_user_id, p_active, trim(coalesce(p_reason, '')));
end;
$$;

create or replace function public.admin_user_auth(p_user_id uuid)
returns table (last_sign_in_at timestamptz, email_confirmed_at timestamptz, providers text[])
language sql
stable
security definer
set search_path = public
as $$
  select u.last_sign_in_at, u.email_confirmed_at,
         coalesce((select array_agg(distinct i.provider) from auth.identities i where i.user_id = u.id), '{}')
  from auth.users u
  where u.id = p_user_id and public.manages_user(p_user_id);
$$;

revoke execute on function public.can_kitchen(uuid) from public, anon;
revoke execute on function public.user_can_kitchen(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.manages_user(uuid) from public, anon;
revoke execute on function public.has_restricted_role(uuid) from public, anon;
revoke execute on function public.my_kitchens() from public, anon;
revoke execute on function public.set_kitchen_min_stock(uuid, uuid, numeric) from public, anon;
revoke execute on function public.transfer_stock(uuid, uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.set_user_kitchens(uuid, uuid[]) from public, anon;
revoke execute on function public.add_team_member(text, uuid, uuid) from public, anon;
grant execute on function public.can_kitchen(uuid) to authenticated;
grant execute on function public.manages_user(uuid) to authenticated;
grant execute on function public.has_restricted_role(uuid) to authenticated;
grant execute on function public.my_kitchens() to authenticated;
grant execute on function public.set_kitchen_min_stock(uuid, uuid, numeric) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, uuid, numeric, text) to authenticated;
grant execute on function public.set_user_kitchens(uuid, uuid[]) to authenticated;
grant execute on function public.add_team_member(text, uuid, uuid) to authenticated;

/** Cocinas a las que se puede trasladar (solo nombre): quien no las ve igual puede enviarles. */
create or replace function public.transfer_targets()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select k.id, k.name from public.kitchens k
  where k.active and public.has_permission('inventory.manage')
  order by k.name;
$$;
revoke execute on function public.transfer_targets() from public, anon;
grant execute on function public.transfer_targets() to authenticated;

notify pgrst, 'reload schema';
