-- FRESKO · Fase 3: direcciones, pedidos sueltos, pago (simulado) y estados.

insert into public.permissions (key, module, description) values
  ('orders.manage', 'Pedidos', 'Cambiar el estado de los pedidos y cancelarlos');
insert into public.role_permissions (role_id, permission_key)
select id, 'orders.manage' from public.roles where key = 'admin';

-- ---------------------------------------------------------------------------
-- Utilidad: notificar a todos los que tengan un permiso
-- ---------------------------------------------------------------------------

create or replace function public.notify_permission(perm text, p_kind text, p_title text, p_body text, p_href text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, kind, title, body, href)
  select distinct ur.user_id, p_kind, p_title, p_body, p_href
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key = perm;
$$;
revoke execute on function public.notify_permission(text, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Direcciones del cliente (la zona se asigna sola y debe tener cobertura)
-- ---------------------------------------------------------------------------

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null default 'Casa',
  address text not null,
  details text not null default '',
  lat float8 not null,
  lng float8 not null,
  zone_id uuid references public.zones (id) on delete set null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(address)) >= 5),
  check (lat between -90 and 90 and lng between -180 and 180)
);

create index addresses_user_idx on public.addresses (user_id);

alter table public.addresses enable row level security;
create policy "addresses own read" on public.addresses for select
  using (user_id = auth.uid() or public.has_permission('orders.view'));
create policy "addresses own insert" on public.addresses for insert
  with check (user_id = auth.uid());
create policy "addresses own update" on public.addresses for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses own delete" on public.addresses for delete
  using (user_id = auth.uid());

create or replace function public.addresses_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  found_zone uuid;
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng then
    select zone_id into found_zone from public.zone_for_point(new.lat, new.lng);
    if found_zone is null then
      raise exception 'FUERA_DE_COBERTURA' using hint = 'La dirección está fuera de nuestras zonas de cobertura.';
    end if;
    new.zone_id := found_zone;
  end if;
  -- La primera dirección de cada cliente queda como principal.
  if tg_op = 'INSERT' and not exists (select 1 from public.addresses where user_id = new.user_id) then
    new.is_default := true;
  end if;
  return new;
end;
$$;

create trigger addresses_before_write
before insert or update on public.addresses
for each row execute function public.addresses_before_write();

-- Solo una dirección principal por cliente.
create or replace function public.addresses_single_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return null;
end;
$$;

create trigger addresses_single_default
after insert or update of is_default on public.addresses
for each row execute function public.addresses_single_default();

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('FR-' || nextval('public.order_number_seq')),
  user_id uuid not null references public.profiles (id) on delete restrict,
  kind text not null default 'pedido' check (kind in ('pedido', 'suscripcion')),
  status text not null default 'pendiente_pago'
    check (status in ('pendiente_pago', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado')),
  payment_status text not null default 'pendiente'
    check (payment_status in ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  zone_id uuid not null references public.zones (id) on delete restrict,
  delivery_date date not null,
  slot_id uuid not null references public.delivery_slots (id) on delete restrict,
  slot_label text not null,
  address_id uuid references public.addresses (id) on delete set null,
  -- Copia de la dirección al momento del pedido (no cambia si el cliente la edita después)
  address_snapshot jsonb not null,
  contact_name text not null default '',
  contact_phone text not null default '',
  notes text not null default '' check (length(notes) <= 300),
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_delivery_idx on public.orders (delivery_date, slot_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  -- Opciones del armador elegidas: [{ id, step, name, price }]
  options jsonb not null default '[]'::jsonb,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total integer not null check (line_total >= 0)
);

create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'simulado',
  amount integer not null,
  status text not null check (status in ('aprobado', 'rechazado')),
  reference text not null default ('SIM-' || upper(substr(md5(random()::text), 1, 10))),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payments enable row level security;

-- Lectura: el dueño o quien vea pedidos. Escritura solo por funciones (abajo).
create policy "orders read" on public.orders for select
  using (user_id = auth.uid() or public.has_permission('orders.view'));
create policy "order items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('orders.view'))));
create policy "order events read" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('orders.view'))));
create policy "payments read" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('orders.view'))));

-- ---------------------------------------------------------------------------
-- Reglas de entrega
-- ---------------------------------------------------------------------------

/** ¿Se puede entregar en esa zona ese día? (días de entrega, hora de corte y máx. 30 días). */
create or replace function public.delivery_date_allowed(p_zone_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select z.active
       and extract(isodow from p_date)::smallint = any (z.delivery_days)
       and p_date >= (now() at time zone c.timezone)::date
       and p_date <= (now() at time zone c.timezone)::date + 30
       and (p_date > (now() at time zone c.timezone)::date or (now() at time zone c.timezone)::time < z.cutoff_time)
    from public.zones z
    join public.cities c on c.id = z.city_id
    where z.id = p_zone_id
  ), false);
$$;

-- ---------------------------------------------------------------------------
-- Crear pedido: valida todo y calcula precios con los datos de la base
--   p_items: [{ "slug": "fresko-pollo", "quantity": 2, "options": ["<uuid>", ...] }]
-- ---------------------------------------------------------------------------

create or replace function public.place_order(
  p_address_id uuid,
  p_date date,
  p_slot_id uuid,
  p_items jsonb,
  p_notes text default ''
)
returns table (order_id uuid, order_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  addr public.addresses%rowtype;
  slot public.delivery_slots%rowtype;
  prof public.profiles%rowtype;
  item jsonb;
  prod public.products%rowtype;
  qty integer;
  opts jsonb;
  opt_ids uuid[];
  unit integer;
  v_subtotal integer := 0;
  new_id uuid;
  new_code text;
  limits jsonb := '{"base": [1, 1], "vegetables": [0, 5], "proteins": [0, 2], "toppings": [0, 3], "sauce": [0, 1]}';
  step_count record;
begin
  if uid is null then raise exception 'NO_AUTH' using hint = 'Inicia sesión para hacer el pedido.'; end if;

  select * into addr from public.addresses where id = p_address_id and user_id = uid;
  if not found then raise exception 'DIRECCION' using hint = 'Elige una dirección de entrega.'; end if;
  if addr.zone_id is null then raise exception 'FUERA_DE_COBERTURA' using hint = 'La dirección está fuera de cobertura.'; end if;

  select * into slot from public.delivery_slots where id = p_slot_id and zone_id = addr.zone_id and active;
  if not found then raise exception 'FRANJA' using hint = 'Elige una franja de entrega disponible para tu zona.'; end if;

  if not public.delivery_date_allowed(addr.zone_id, p_date) then
    raise exception 'FECHA' using hint = 'Esa fecha ya no está disponible. Elige otra.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VACIO' using hint = 'Tu carrito está vacío.';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'DEMASIADOS' using hint = 'Máximo 30 productos distintos por pedido.';
  end if;

  select * into prof from public.profiles where id = uid;

  insert into public.orders (
    user_id, zone_id, delivery_date, slot_id, slot_label, address_id, address_snapshot,
    contact_name, contact_phone, notes, subtotal, total
  ) values (
    uid, addr.zone_id, p_date, slot.id,
    to_char(slot.start_time, 'HH24:MI') || ' – ' || to_char(slot.end_time, 'HH24:MI'),
    addr.id,
    jsonb_build_object('label', addr.label, 'address', addr.address, 'details', addr.details, 'lat', addr.lat, 'lng', addr.lng),
    coalesce(prof.full_name, ''), coalesce(prof.phone, ''), left(coalesce(p_notes, ''), 300), 0, 0
  )
  returning id, code into new_id, new_code;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((item->>'quantity')::integer, 0);
    if qty < 1 or qty > 50 then raise exception 'CANTIDAD' using hint = 'La cantidad de cada producto debe estar entre 1 y 50.'; end if;

    select * into prod from public.products where slug = item->>'slug' and active;
    if not found then raise exception 'PRODUCTO' using hint = 'Un producto del carrito ya no está disponible.'; end if;

    opts := '[]'::jsonb;
    unit := prod.price;

    if prod.kind = 'builder' then
      select coalesce(array_agg(x::uuid), '{}') into opt_ids from jsonb_array_elements_text(coalesce(item->'options', '[]')) x;
      select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'step', b.step, 'name', b.name, 'price', b.price) order by b.step, b.sort), '[]'),
             coalesce(sum(b.price), 0)::integer + prod.price
        into opts, unit
        from public.builder_options b where b.id = any (opt_ids) and b.active;
      if jsonb_array_length(opts) <> coalesce(array_length(opt_ids, 1), 0) then
        raise exception 'OPCIONES' using hint = 'Alguna opción de tu bowl ya no está disponible. Ármalo de nuevo.';
      end if;
      for step_count in
        select s.key as step, (select count(*) from jsonb_array_elements(opts) o where o->>'step' = s.key) as n,
               (s.value->>0)::int as min_n, (s.value->>1)::int as max_n
        from jsonb_each(limits) s
      loop
        if step_count.n < step_count.min_n or step_count.n > step_count.max_n then
          raise exception 'OPCIONES' using hint = 'Tu bowl armado no cumple las reglas (elige una base y respeta los máximos).';
        end if;
      end loop;
    elsif jsonb_array_length(coalesce(item->'options', '[]')) > 0 then
      raise exception 'OPCIONES' using hint = 'Este producto no admite opciones.';
    end if;

    insert into public.order_items (order_id, product_id, name, options, unit_price, quantity, line_total)
    values (new_id, prod.id, prod.name, opts, unit, qty, unit * qty);
    v_subtotal := v_subtotal + unit * qty;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = new_id;
  insert into public.order_events (order_id, status, note) values (new_id, 'pendiente_pago', 'Pedido creado');

  return query select new_id, new_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pago simulado (se reemplazará por la pasarela real con su webhook)
-- ---------------------------------------------------------------------------

create or replace function public.pay_order_simulated(p_order_id uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  if o.status <> 'pendiente_pago' then raise exception 'ESTADO' using hint = 'Este pedido ya no está pendiente de pago.'; end if;
  if not public.delivery_date_allowed(o.zone_id, o.delivery_date) then
    raise exception 'FECHA' using hint = 'La fecha de entrega ya pasó la hora de corte. Haz el pedido de nuevo con otra fecha.';
  end if;

  insert into public.payments (order_id, amount, status) values (o.id, o.total, case when p_approve then 'aprobado' else 'rechazado' end);

  if p_approve then
    update public.orders set status = 'confirmado', payment_status = 'aprobado', paid_at = now(), updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'confirmado', 'Pago aprobado');
    insert into public.notifications (user_id, kind, title, body, href)
    values (o.user_id, 'success', 'Pedido ' || o.code || ' confirmado',
            'Lo entregamos el ' || to_char(o.delivery_date, 'DD/MM') || ' entre ' || o.slot_label || '.', '/cuenta/pedidos/' || o.code);
    perform public.notify_permission('orders.view', 'info', 'Nuevo pedido ' || o.code,
            'Entrega ' || to_char(o.delivery_date, 'DD/MM') || ' · ' || o.slot_label || ' · $' || replace(to_char(o.total, 'FM999,999,999'), ',', '.'),
            '/admin/pedidos/' || o.code);
    return 'aprobado';
  end if;

  update public.orders set payment_status = 'rechazado', updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'pendiente_pago', 'Pago rechazado');
  return 'rechazado';
end;
$$;

-- El cliente puede cancelar un pedido que aún no ha pagado.
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'PEDIDO' using hint = 'Pedido no encontrado.'; end if;
  if o.status <> 'pendiente_pago' then
    raise exception 'ESTADO' using hint = 'Un pedido pagado solo lo puede cancelar el equipo. Escríbenos por WhatsApp.';
  end if;
  update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', 'Cancelado por el cliente');
end;
$$;

-- ---------------------------------------------------------------------------
-- Cambio de estado por el equipo
-- ---------------------------------------------------------------------------

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

revoke execute on function public.place_order(uuid, date, uuid, jsonb, text) from public, anon;
revoke execute on function public.pay_order_simulated(uuid, boolean) from public, anon;
revoke execute on function public.cancel_my_order(uuid) from public, anon;
revoke execute on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.place_order(uuid, date, uuid, jsonb, text) to authenticated;
grant execute on function public.pay_order_simulated(uuid, boolean) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;

-- Tiempo real para que el cliente vea los cambios de estado
alter publication supabase_realtime add table public.orders;
