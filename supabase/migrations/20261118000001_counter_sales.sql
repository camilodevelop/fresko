-- Fase 8: venta en mostrador.
--   · Canal de venta en cada pedido (domicilio, mostrador; "punto" queda listo para la fase 9).
--   · Métodos de pago presenciales parametrizables (efectivo, Bre-B, Nequi, Daviplata…).
--   · Caja: apertura, cobros, devoluciones y cierre con cuadre por cajero y cocina.
--   · Precio por canal opcional (si no se define, se usa el precio de la web).
--   · Roles Cajero y Pantalla de autoservicio (asignables por el administrador de cocina).

-- ---------------------------------------------------------------------------
-- Permisos y roles
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, description) values
  ('counter.sell', 'Mostrador', 'Vender en mostrador: caja, cobros y entregas'),
  ('counter.kiosk', 'Mostrador', 'Pantalla de autoservicio: el cliente arma su pedido y paga en caja')
on conflict (key) do nothing;

insert into public.roles (key, name, description, is_system, kitchen_assignable) values
  ('cajero', 'Cajero', 'Vende en el mostrador de su cocina: cobra, abre y cierra caja y entrega', true, true),
  ('autoservicio', 'Pantalla de autoservicio', 'Cuenta para la pantalla del mostrador donde el cliente arma su pedido', true, true)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r
cross join (values ('counter.sell'), ('counter.kiosk')) p(key)
where r.key = 'admin'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, 'counter.sell' from public.roles r where r.key = 'admin_cocina'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join (values ('admin.access'), ('counter.sell')) p(key)
where r.key = 'cajero'
on conflict do nothing;
insert into public.role_permissions (role_id, permission_key)
select r.id, 'counter.kiosk' from public.roles r where r.key = 'autoservicio'
on conflict do nothing;

-- La pantalla de autoservicio es una cuenta del equipo (no un cliente), aunque no entre al panel.
create or replace function public.is_staff_role(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.role_permissions
    where role_id = rid and permission_key in ('admin.access', 'counter.kiosk')
  );
$$;

-- ---------------------------------------------------------------------------
-- Métodos de pago
-- ---------------------------------------------------------------------------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 40),
  -- "efectivo" entra al cajón (cuenta en el cuadre); "digital" llega a una cuenta.
  kind text not null default 'digital' check (kind in ('efectivo', 'digital')),
  needs_reference boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.payment_methods enable row level security;
create policy "payment methods read" on public.payment_methods for select to authenticated using (true);
create policy "payment methods write" on public.payment_methods for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

insert into public.payment_methods (name, kind, needs_reference, sort) values
  ('Efectivo', 'efectivo', false, 1),
  ('Bre-B', 'digital', false, 2),
  ('Nequi', 'digital', false, 3),
  ('Daviplata', 'digital', false, 4);

-- ---------------------------------------------------------------------------
-- Precio por canal (opcional)
-- ---------------------------------------------------------------------------
create table public.product_channel_prices (
  product_id uuid not null references public.products(id) on delete cascade,
  channel text not null check (channel in ('mostrador', 'punto')),
  price integer not null check (price > 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, channel)
);
alter table public.product_channel_prices enable row level security;
create policy "channel prices read" on public.product_channel_prices for select using (true);
create policy "channel prices write" on public.product_channel_prices for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

create or replace function public.channel_price(p_product_id uuid, p_channel text)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select cp.price from public.product_channel_prices cp where cp.product_id = p_product_id and cp.channel = p_channel),
    (select p.price from public.products p where p.id = p_product_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Caja
-- ---------------------------------------------------------------------------
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens(id),
  user_id uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  opening_amount integer not null default 0 check (opening_amount >= 0),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  counted_cash integer check (counted_cash >= 0),
  expected_cash integer,
  difference integer,
  -- Resumen al cierre: [{method, kind, sales, refunds, net, count}]
  totals jsonb,
  note text not null default '' check (length(note) <= 300)
);
create unique index cash_sessions_one_open on public.cash_sessions (user_id) where closed_at is null;
create index cash_sessions_kitchen on public.cash_sessions (kitchen_id, opened_at desc);
alter table public.cash_sessions enable row level security;
create policy "cash sessions read" on public.cash_sessions for select to authenticated
  using (user_id = auth.uid() or ((public.has_permission('reports.view') or public.has_permission('finance.manage')) and public.can_kitchen(kitchen_id)));

-- ---------------------------------------------------------------------------
-- Pedidos: canal, origen y campos de domicilio opcionales fuera del domicilio
-- ---------------------------------------------------------------------------
alter table public.orders
  add column channel text not null default 'domicilio' check (channel in ('domicilio', 'mostrador', 'punto')),
  add column source text not null default 'web' check (source in ('web', 'caja', 'autoservicio')),
  add column created_by uuid references public.profiles(id),
  add column cash_session_id uuid references public.cash_sessions(id);
alter table public.orders
  alter column user_id drop not null,
  alter column zone_id drop not null,
  alter column slot_id drop not null,
  alter column address_snapshot drop not null,
  alter column slot_label set default '';
alter table public.orders add constraint orders_delivery_fields check (
  channel <> 'domicilio' or (user_id is not null and zone_id is not null and slot_id is not null and address_snapshot is not null)
);
alter table public.orders add constraint orders_counter_kitchen check (channel = 'domicilio' or kitchen_id is not null);
create index orders_counter_today on public.orders (kitchen_id, delivery_date) where channel = 'mostrador';

alter table public.prep_batches alter column slot_id drop not null;

-- La cocina sale de la zona solo en domicilio; en mostrador viene dada.
create or replace function public.orders_set_kitchen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.zone_id is not null and (tg_op = 'INSERT' or new.zone_id is distinct from old.zone_id or new.kitchen_id is null) then
    select kitchen_id into new.kitchen_id from public.zones where id = new.zone_id;
  end if;
  return new;
end;
$$;

-- Pagos presenciales
alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('aprobado', 'rechazado', 'reembolsado'));
alter table public.payments
  add column method_id uuid references public.payment_methods(id),
  add column method_name text,
  add column received_amount integer,
  add column change_amount integer,
  add column cash_session_id uuid references public.cash_sessions(id),
  add column created_by uuid references public.profiles(id);
create index payments_cash_session on public.payments (cash_session_id) where cash_session_id is not null;

-- Las ventas de mostrador no tienen cliente con cuenta: no hay a quién notificar.
create or replace function public.notifications_skip_anonymous()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then return null; end if;
  return new;
end;
$$;
create trigger a_notifications_skip_anonymous before insert on public.notifications
for each row execute function public.notifications_skip_anonymous();

-- ---------------------------------------------------------------------------
-- RLS: el cajero ve los pedidos de mostrador de su cocina
-- ---------------------------------------------------------------------------
create or replace function public.can_see_order(p_user_id uuid, p_kitchen_id uuid, p_channel text)
returns boolean language sql stable security definer set search_path = public as $$
  select (p_user_id is not null and p_user_id = auth.uid())
    or ((public.has_permission('orders.view') or public.has_permission('kitchen.prepare') or public.has_permission('delivery.deliver')
         or (p_channel = 'mostrador' and public.has_permission('counter.sell')))
        and public.can_kitchen(p_kitchen_id));
$$;

drop policy "orders read" on public.orders;
create policy "orders read" on public.orders for select using (public.can_see_order(user_id, kitchen_id, channel));
drop policy "order items read" on public.order_items;
create policy "order items read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_items.order_id and public.can_see_order(o.user_id, o.kitchen_id, o.channel))
);
drop policy "order events read" on public.order_events;
create policy "order events read" on public.order_events for select using (
  exists (select 1 from public.orders o where o.id = order_events.order_id and public.can_see_order(o.user_id, o.kitchen_id, o.channel))
);
drop policy "payments read" on public.payments;
create policy "payments read" on public.payments for select using (
  exists (select 1 from public.orders o where o.id = payments.order_id and (
    (o.user_id is not null and o.user_id = auth.uid())
    or ((public.has_permission('orders.view') or (o.channel = 'mostrador' and public.has_permission('counter.sell'))) and public.can_kitchen(o.kitchen_id))
  ))
);

-- La pantalla de autoservicio ve el nombre de su cocina.
drop policy "kitchens read" on public.kitchens;
create policy "kitchens read" on public.kitchens for select
  using ((public.has_permission('admin.access') or public.has_permission('counter.kiosk')) and public.can_kitchen(id));

-- ---------------------------------------------------------------------------
-- Líneas del pedido (compartido por la web y el mostrador)
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
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VACIO' using hint = 'El pedido está vacío.';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'DEMASIADOS' using hint = 'Máximo 30 productos distintos por pedido.';
  end if;

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
    values (p_order_id, prod.id, prod.name, opts, unit, qty, unit * qty);
    v_subtotal := v_subtotal + unit * qty;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + delivery_fee where id = p_order_id;
  return v_subtotal;
end;
$$;
revoke execute on function public.add_order_lines(uuid, jsonb, text) from public, anon, authenticated;

-- La web usa la misma función de líneas (mismo comportamiento que antes).
create or replace function public.place_order(p_address_id uuid, p_date date, p_slot_id uuid, p_items jsonb, p_notes text default '')
returns table(order_id uuid, order_code text) language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  addr public.addresses%rowtype;
  slot public.delivery_slots%rowtype;
  prof public.profiles%rowtype;
  new_id uuid;
  new_code text;
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

  perform public.add_order_lines(new_id, p_items, 'domicilio');
  insert into public.order_events (order_id, status, note) values (new_id, 'pendiente_pago', 'Pedido creado');

  return query select new_id, new_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mostrador: crear, cobrar, entregar y anular
-- ---------------------------------------------------------------------------
create or replace function public.my_open_cash_session(p_kitchen_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.cash_sessions where user_id = auth.uid() and kitchen_id = p_kitchen_id and closed_at is null;
$$;

create or replace function public.counter_create_order(
  p_kitchen_id uuid, p_items jsonb, p_name text default '', p_phone text default '', p_notes text default '', p_source text default 'caja'
)
returns table(order_id uuid, order_code text) language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  new_code text;
  phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if p_source = 'caja' and not public.has_permission('counter.sell') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para vender en mostrador.';
  end if;
  if p_source = 'autoservicio' and not (public.has_permission('counter.kiosk') or public.has_permission('counter.sell')) then
    raise exception 'PERMISO' using hint = 'Esta pantalla no está habilitada para pedidos.';
  end if;
  if p_source not in ('caja', 'autoservicio') then raise exception 'ORIGEN' using hint = 'Origen inválido.'; end if;
  if not exists (select 1 from public.kitchens where id = p_kitchen_id and active) or not public.can_kitchen(p_kitchen_id) then
    raise exception 'COCINA' using hint = 'No tienes acceso a esa cocina.';
  end if;
  if length(phone) > 0 and length(phone) not between 7 and 15 then
    raise exception 'CELULAR' using hint = 'Ese celular no es válido.';
  end if;

  insert into public.orders (
    channel, source, kitchen_id, delivery_date, slot_label, contact_name, contact_phone, notes, subtotal, total, created_by
  ) values (
    'mostrador', p_source, p_kitchen_id, public.today_local(), '',
    left(trim(coalesce(p_name, '')), 60), phone, left(coalesce(p_notes, ''), 300), 0, 0, auth.uid()
  )
  returning id, code into new_id, new_code;

  perform public.add_order_lines(new_id, p_items, 'mostrador');
  insert into public.order_events (order_id, status, note)
  values (new_id, 'pendiente_pago', case when p_source = 'autoservicio' then 'Pedido en la pantalla de autoservicio' else 'Pedido en caja' end);

  return query select new_id, new_code;
end;
$$;

create or replace function public.open_cash_session(p_kitchen_id uuid, p_opening integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  if not public.has_permission('counter.sell') then raise exception 'PERMISO' using hint = 'No tienes permiso para abrir caja.'; end if;
  if not public.can_kitchen(p_kitchen_id) then raise exception 'COCINA' using hint = 'No tienes acceso a esa cocina.'; end if;
  if coalesce(p_opening, -1) < 0 then raise exception 'BASE' using hint = 'Escribe la base con la que abres la caja.'; end if;
  if exists (select 1 from public.cash_sessions where user_id = auth.uid() and closed_at is null) then
    raise exception 'ABIERTA' using hint = 'Ya tienes una caja abierta. Ciérrala antes de abrir otra.';
  end if;
  insert into public.cash_sessions (kitchen_id, user_id, opening_amount) values (p_kitchen_id, auth.uid(), p_opening)
  returning id into sid;
  return sid;
end;
$$;

-- Resumen de una caja por método de pago (ventas, devoluciones y neto).
create or replace function public.cash_session_totals(p_session_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'method', x.method, 'kind', x.kind, 'sales', x.sales, 'refunds', x.refunds, 'net', x.sales - x.refunds, 'count', x.n
  ) order by x.sort, x.method), '[]')
  from (
    select coalesce(m.name, p.method_name, 'Otro') as method, coalesce(m.kind, 'digital') as kind, coalesce(min(m.sort), 99) as sort,
           coalesce(sum(p.amount) filter (where p.status = 'aprobado'), 0)::integer as sales,
           coalesce(sum(p.amount) filter (where p.status = 'reembolsado'), 0)::integer as refunds,
           count(*) filter (where p.status = 'aprobado')::integer as n
    from public.payments p
    left join public.payment_methods m on m.id = p.method_id
    where p.cash_session_id = p_session_id
      and exists (
        select 1 from public.cash_sessions s where s.id = p_session_id and (
          auth.uid() is null or s.user_id = auth.uid()
          or ((public.has_permission('reports.view') or public.has_permission('finance.manage')) and public.can_kitchen(s.kitchen_id))
        )
      )
    group by 1, 2
  ) x;
$$;

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
  if (s.closed_at is null) and exists (
    select 1 from public.orders where cash_session_id = s.id and status in ('confirmado', 'en_preparacion')
  ) and coalesce(p_note, '') = '' then
    raise exception 'PENDIENTES' using hint = 'Hay pedidos cobrados sin entregar. Entrégalos o escribe una nota antes de cerrar.';
  end if;

  t := public.cash_session_totals(s.id);
  select s.opening_amount + coalesce(sum((e->>'net')::integer), 0) into expected
  from jsonb_array_elements(t) e where e->>'kind' = 'efectivo';

  update public.cash_sessions set
    closed_at = now(), closed_by = auth.uid(), counted_cash = p_counted, expected_cash = expected,
    difference = p_counted - expected, totals = t, note = left(coalesce(p_note, ''), 300)
  where id = s.id;
  return p_counted - expected;
end;
$$;

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

  update public.orders set status = 'confirmado', payment_status = 'aprobado', paid_at = now(), updated_at = now(), cash_session_id = sid
  where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'confirmado', 'Pagado en caja · ' || m.name);
  return o.code;
end;
$$;

create or replace function public.counter_deliver(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
begin
  if not (public.has_permission('counter.sell') or public.has_permission('orders.manage')) then
    raise exception 'PERMISO' using hint = 'No tienes permiso para entregar pedidos de mostrador.';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.channel <> 'mostrador' or not public.can_kitchen(o.kitchen_id) then
    raise exception 'PEDIDO' using hint = 'Pedido no encontrado.';
  end if;
  if o.status not in ('confirmado', 'en_preparacion') then raise exception 'ESTADO' using hint = 'Este pedido no está pendiente de entrega.'; end if;
  if o.prepared_at is null then raise exception 'COCINA' using hint = 'La cocina todavía no lo ha terminado.'; end if;
  update public.orders set status = 'entregado', delivered_at = now(), delivered_by = auth.uid(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'entregado', 'Entregado en mostrador');
end;
$$;

-- Anular: sin pagar se cancela; pagado y aún sin entrar a cocina se devuelve el dinero desde la caja abierta.
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

  if o.status = 'pendiente_pago' then
    update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now() where id = o.id;
    insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', coalesce(nullif(trim(p_note), ''), 'Anulado en caja sin pagar'));
    return;
  end if;
  if o.status <> 'confirmado' or exists (
    select 1 from public.prep_batch_items l join public.order_items i on i.id = l.order_item_id
    join public.prep_batches b on b.id = l.batch_id
    where i.order_id = o.id and b.status <> 'cancelado'
  ) then
    raise exception 'COCINA' using hint = 'La cocina ya empezó este pedido: no se puede anular desde caja.';
  end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'MOTIVO' using hint = 'Escribe el motivo de la devolución.'; end if;
  sid := public.my_open_cash_session(o.kitchen_id);
  if sid is null then raise exception 'CAJA' using hint = 'Abre la caja para hacer la devolución.'; end if;

  select * into pay from public.payments where order_id = o.id and status = 'aprobado' order by created_at desc limit 1;
  insert into public.payments (order_id, provider, amount, status, reference, method_id, method_name, cash_session_id, created_by)
  values (o.id, 'mostrador', o.total, 'reembolsado', 'DEV-' || upper(substr(md5(random()::text), 1, 8)), pay.method_id, pay.method_name, sid, auth.uid());
  update public.orders set status = 'cancelado', payment_status = 'reembolsado', cancelled_at = now(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', 'Devolución en caja: ' || left(trim(p_note), 250));
end;
$$;

-- ---------------------------------------------------------------------------
-- Cocina: los pedidos de mostrador no tienen franja (slot nulo = "Mostrador")
-- ---------------------------------------------------------------------------
create or replace function public.kitchen_orders(p_kitchen_id uuid, p_date date, p_slot_id uuid)
returns setof public.orders language sql stable security definer set search_path = public as $$
  select o.* from public.orders o
  where o.kitchen_id = p_kitchen_id and o.delivery_date = p_date and o.slot_id is not distinct from p_slot_id
    and (p_slot_id is not null or o.channel = 'mostrador')
    and o.status in ('confirmado', 'en_preparacion') and not o.on_hold
    and (auth.uid() is null or public.can_kitchen(p_kitchen_id));
$$;

create or replace function public.start_prep_batch(p_kitchen_id uuid, p_date date, p_slot_id uuid, p_product_id uuid, p_order_item_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
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
  perform pg_advisory_xact_lock(hashtext('prep:' || p_kitchen_id || ':' || p_date || ':' || coalesce(p_slot_id::text, 'mostrador')));

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

-- Un pedido de mostrador listo avisa a la caja de esa cocina.
create or replace function public.notify_counter_ready()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.channel = 'mostrador' and new.prepared_at is not null and old.prepared_at is null and new.cash_session_id is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    select s.user_id, 'success', 'Pedido ' || new.code || ' listo',
           coalesce(nullif(new.contact_name, ''), 'Cliente') || ' · entrégalo en el mostrador', '/admin/mostrador?cocina=' || new.kitchen_id
    from public.cash_sessions s where s.id = new.cash_session_id;
  end if;
  return new;
end;
$$;
create trigger orders_notify_counter_ready after update of prepared_at on public.orders
for each row execute function public.notify_counter_ready();

grant execute on function public.counter_create_order(uuid, jsonb, text, text, text, text) to authenticated;
grant execute on function public.counter_charge(uuid, uuid, integer, text) to authenticated;
grant execute on function public.counter_deliver(uuid) to authenticated;
grant execute on function public.counter_cancel(uuid, text) to authenticated;
grant execute on function public.open_cash_session(uuid, integer) to authenticated;
grant execute on function public.close_cash_session(uuid, integer, text) to authenticated;
grant execute on function public.cash_session_totals(uuid) to authenticated;
grant execute on function public.my_open_cash_session(uuid) to authenticated;

notify pgrst, 'reload schema';
