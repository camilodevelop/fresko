-- FRESKO · Fase 4: suscripciones.
--
-- Un plan se compra con N porciones y una vigencia (días). Cada entrega programada es un
-- pedido normal (orders.kind = 'suscripcion') ligado a la suscripción, así cocina y
-- domicilios ven todo junto. Reglas:
--   · Precio = Σ máx(precio del plato, valor base) × (1 − descuento), redondeado a $100. Las porciones que no
--     se programan al comprar se cobran al valor base.
--   · Una entrega por día por suscripción, con uno o varios platos. Corte: hora de la zona.
--   · Cambiar a un plato más caro paga la diferencia (con descuento); más barato no reembolsa.
--   · Desprogramar antes del corte devuelve las porciones al plan (sin reembolso).
--   · Al vencer la vigencia, las porciones sin usar se pierden. Sin pausas ni cancelación.

create sequence public.subscription_number_seq start 101;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('SU-' || nextval('public.subscription_number_seq')),
  user_id uuid not null references public.profiles (id) on delete restrict,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  -- Copia del plan al comprar (si el plan cambia después, la suscripción no cambia)
  plan_name text not null,
  portions integer not null check (portions > 0),
  discount numeric(4, 3) not null check (discount >= 0 and discount < 1),
  base_value integer not null check (base_value >= 0),
  validity_days integer not null check (validity_days > 0),
  status text not null default 'pendiente_pago' check (status in ('pendiente_pago', 'activa', 'cancelada')),
  payment_status text not null default 'pendiente' check (payment_status in ('pendiente', 'aprobado', 'rechazado')),
  total integer not null check (total >= 0),
  starts_on date not null,
  expires_on date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

alter table public.orders add column subscription_id uuid references public.subscriptions (id) on delete cascade;
create index orders_subscription_idx on public.orders (subscription_id);
-- Una entrega por día por suscripción
create unique index orders_subscription_day_idx on public.orders (subscription_id, delivery_date)
  where subscription_id is not null and status <> 'cancelado';

-- Valor del plato dentro del plan: máx(precio, valor base). Sirve para calcular diferencias.
alter table public.order_items add column plan_value integer check (plan_value >= 0);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  kind text not null check (kind in ('compra', 'diferencia')),
  provider text not null default 'simulado',
  amount integer not null check (amount >= 0),
  status text not null check (status in ('aprobado', 'rechazado')),
  reference text not null default ('SIM-' || upper(substr(md5(random()::text), 1, 10))),
  created_at timestamptz not null default now()
);

create index subscription_payments_sub_idx on public.subscription_payments (subscription_id, created_at);

alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

create policy "subscriptions read" on public.subscriptions for select
  using (user_id = auth.uid() or public.has_permission('orders.view'));
create policy "subscription payments read" on public.subscription_payments for select
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id
                 and (s.user_id = auth.uid() or public.has_permission('orders.view'))));

-- Porciones usadas (entregas no canceladas)
create or replace view public.subscription_usage
with (security_invoker = true)
as
select s.id as subscription_id,
       coalesce(sum(i.quantity) filter (where o.status <> 'cancelado'), 0)::integer as used_portions,
       coalesce(sum(i.quantity) filter (where o.status = 'entregado'), 0)::integer as delivered_portions,
       count(distinct o.id) filter (where o.status <> 'cancelado')::integer as deliveries
from public.subscriptions s
left join public.orders o on o.subscription_id = s.id
left join public.order_items i on i.order_id = o.id
group by s.id;

-- ---------------------------------------------------------------------------
-- Ayudas internas
-- ---------------------------------------------------------------------------

/** Día de entrega abierto: zona activa, día de reparto y antes de la hora de corte (sin tope de días). */
create or replace function public.delivery_date_open(p_zone_id uuid, p_date date)
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
       and (p_date > (now() at time zone c.timezone)::date or (now() at time zone c.timezone)::time < z.cutoff_time)
    from public.zones z
    join public.cities c on c.id = z.city_id
    where z.id = p_zone_id
  ), false);
$$;

/** Fecha de hoy en Bogotá (las vigencias se cuentan en hora local). */
create or replace function public.today_local()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Bogota')::date $$;

/**
 * Valida los platos y calcula precios con los datos de la base.
 *   p_items: [{ "slug": "...", "quantity": 1, "options": ["<uuid>", ...] }]
 * plan_value = máx(precio, valor base) por unidad.
 */
create or replace function public.resolve_plan_items(p_items jsonb, p_base integer)
returns table (product_id uuid, name text, options jsonb, unit_price integer, plan_value integer, quantity integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  item jsonb;
  prod public.products%rowtype;
  qty integer;
  opts jsonb;
  opt_ids uuid[];
  unit integer;
  limits jsonb := '{"base": [1, 1], "vegetables": [0, 5], "proteins": [0, 2], "toppings": [0, 3], "sauce": [0, 1]}';
  step_count record;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VACIO' using hint = 'Agrega al menos un plato a la entrega.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'DEMASIADOS' using hint = 'Máximo 20 platos distintos por entrega.';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((item->>'quantity')::integer, 0);
    if qty < 1 or qty > 20 then raise exception 'CANTIDAD' using hint = 'La cantidad de cada plato debe estar entre 1 y 20.'; end if;

    select * into prod from public.products p where p.slug = item->>'slug' and p.active;
    if not found then raise exception 'PRODUCTO' using hint = 'Un plato elegido ya no está disponible.'; end if;

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
      raise exception 'OPCIONES' using hint = 'Este plato no admite opciones.';
    end if;

    product_id := prod.id;
    name := prod.name;
    options := opts;
    unit_price := unit;
    plan_value := greatest(unit, p_base);
    quantity := qty;
    return next;
  end loop;
end;
$$;

/**
 * Valida dirección, franja y fecha de una entrega del plan y devuelve los datos del pedido.
 *   p_delivery: { "date": "2026-11-10", "slot_id": "...", "address_id": "...", "notes": "", "items": [...] }
 */
create or replace function public.resolve_plan_delivery(p_delivery jsonb, p_uid uuid, p_last_day date)
returns table (zone_id uuid, delivery_date date, slot_id uuid, slot_label text, address_id uuid, address_snapshot jsonb, notes text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  addr public.addresses%rowtype;
  slot public.delivery_slots%rowtype;
  d date;
begin
  begin
    d := (p_delivery->>'date')::date;
  exception when others then
    raise exception 'FECHA' using hint = 'Fecha de entrega inválida.';
  end;
  if d is null then raise exception 'FECHA' using hint = 'Elige la fecha de entrega.'; end if;

  select * into addr from public.addresses a where a.id = (p_delivery->>'address_id')::uuid and a.user_id = p_uid;
  if not found then raise exception 'DIRECCION' using hint = 'Elige una dirección de entrega.'; end if;
  if addr.zone_id is null then raise exception 'FUERA_DE_COBERTURA' using hint = 'La dirección está fuera de cobertura.'; end if;

  select * into slot from public.delivery_slots s where s.id = (p_delivery->>'slot_id')::uuid and s.zone_id = addr.zone_id and s.active;
  if not found then raise exception 'FRANJA' using hint = 'Elige una franja de entrega disponible para tu zona.'; end if;

  if d > p_last_day then
    raise exception 'VIGENCIA' using hint = 'Esa fecha queda por fuera de la vigencia del plan (hasta el ' || to_char(p_last_day, 'DD/MM') || ').';
  end if;
  if not public.delivery_date_open(addr.zone_id, d) then
    raise exception 'FECHA' using hint = 'El ' || to_char(d, 'DD/MM') || ' ya no está disponible (no hay reparto o pasó la hora de corte).';
  end if;

  zone_id := addr.zone_id;
  delivery_date := d;
  slot_id := slot.id;
  slot_label := to_char(slot.start_time, 'HH24:MI') || ' – ' || to_char(slot.end_time, 'HH24:MI');
  address_id := addr.id;
  address_snapshot := jsonb_build_object('label', addr.label, 'address', addr.address, 'details', addr.details, 'lat', addr.lat, 'lng', addr.lng);
  notes := left(coalesce(p_delivery->>'notes', ''), 300);
  return next;
end;
$$;

/** Crea el pedido de una entrega del plan con sus platos. Devuelve id, porciones y valor (antes del descuento). */
create or replace function public.create_plan_order(
  p_sub public.subscriptions,
  p_delivery jsonb,
  p_status text,
  p_payment_status text
)
returns table (order_id uuid, order_code text, portions integer, value_sum integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  h record;
  prof public.profiles%rowtype;
  new_id uuid;
  new_code text;
  v_total integer := 0;
  v_portions integer := 0;
  v_value integer := 0;
  it record;
  charged integer;
begin
  select * into h from public.resolve_plan_delivery(p_delivery, p_sub.user_id, p_sub.expires_on);
  select * into prof from public.profiles where id = p_sub.user_id;

  insert into public.orders (
    user_id, kind, subscription_id, status, payment_status, zone_id, delivery_date, slot_id, slot_label,
    address_id, address_snapshot, contact_name, contact_phone, notes, subtotal, total, paid_at
  ) values (
    p_sub.user_id, 'suscripcion', p_sub.id, p_status, p_payment_status, h.zone_id, h.delivery_date, h.slot_id, h.slot_label,
    h.address_id, h.address_snapshot, coalesce(prof.full_name, ''), coalesce(prof.phone, ''), h.notes, 0, 0,
    case when p_payment_status = 'aprobado' then now() end
  )
  returning id, code into new_id, new_code;

  for it in select * from public.resolve_plan_items(p_delivery->'items', p_sub.base_value) loop
    charged := round(it.plan_value * (1 - p_sub.discount));
    insert into public.order_items (order_id, product_id, name, options, unit_price, plan_value, quantity, line_total)
    values (new_id, it.product_id, it.name, it.options, charged, it.plan_value, it.quantity, charged * it.quantity);
    v_total := v_total + charged * it.quantity;
    v_portions := v_portions + it.quantity;
    v_value := v_value + it.plan_value * it.quantity;
  end loop;

  update public.orders set subtotal = v_total, total = v_total where id = new_id;
  insert into public.order_events (order_id, status, note) values (new_id, p_status, 'Entrega del plan ' || p_sub.code);

  order_id := new_id;
  order_code := new_code;
  portions := v_portions;
  value_sum := v_value;
  return next;
end;
$$;

/** Porciones del plan ya programadas o entregadas. */
create or replace function public.subscription_used_portions(p_subscription_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(i.quantity), 0)::integer
  from public.orders o
  join public.order_items i on i.order_id = o.id
  where o.subscription_id = p_subscription_id and o.status <> 'cancelado';
$$;

-- ---------------------------------------------------------------------------
-- Comprar un plan
--   p_deliveries: [{ date, slot_id, address_id, notes, items: [...] }]  (puede ir vacío)
-- ---------------------------------------------------------------------------

create or replace function public.purchase_subscription(p_plan_id uuid, p_deliveries jsonb)
returns table (subscription_id uuid, subscription_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  plan public.subscription_plans%rowtype;
  base integer;
  sub public.subscriptions%rowtype;
  d jsonb;
  r record;
  v_portions integer := 0;
  v_value integer := 0;
  v_total integer;
begin
  if uid is null then raise exception 'NO_AUTH' using hint = 'Inicia sesión para comprar el plan.'; end if;
  select * into plan from public.subscription_plans where id = p_plan_id and active;
  if not found then raise exception 'PLAN' using hint = 'Este plan ya no está disponible.'; end if;
  select coalesce((value #>> '{}')::integer, 0) into base from public.settings where key = 'plan_base_value';
  base := coalesce(base, 0);

  if jsonb_typeof(coalesce(p_deliveries, '[]')) <> 'array' then
    raise exception 'ENTREGAS' using hint = 'Calendario inválido.';
  end if;
  if (select count(distinct x->>'date') from jsonb_array_elements(coalesce(p_deliveries, '[]')) x) <> jsonb_array_length(coalesce(p_deliveries, '[]')) then
    raise exception 'DIA_REPETIDO' using hint = 'Hay dos entregas el mismo día. Junta los platos en una sola entrega.';
  end if;

  insert into public.subscriptions (user_id, plan_id, plan_name, portions, discount, base_value, validity_days, total, starts_on, expires_on)
  values (uid, plan.id, plan.name, plan.portions, plan.discount, base, plan.validity_days, 0,
          public.today_local(), public.today_local() + plan.validity_days)
  returning * into sub;

  for d in select * from jsonb_array_elements(coalesce(p_deliveries, '[]')) loop
    select * into r from public.create_plan_order(sub, d, 'pendiente_pago', 'pendiente');
    v_portions := v_portions + r.portions;
    v_value := v_value + r.value_sum;
  end loop;

  if v_portions > plan.portions then
    raise exception 'PORCIONES' using hint = 'Programaste ' || v_portions || ' platos y el plan tiene ' || plan.portions || '.';
  end if;

  -- Las porciones sin programar se cobran al valor base.
  v_total := round((v_value + (plan.portions - v_portions) * base) * (1 - plan.discount) / 100) * 100;
  update public.subscriptions set total = v_total where id = sub.id;

  return query select sub.id, sub.code;
end;
$$;

create or replace function public.pay_subscription_simulated(p_subscription_id uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.subscriptions%rowtype;
  o record;
  n integer;
begin
  select * into sub from public.subscriptions where id = p_subscription_id and user_id = auth.uid() for update;
  if not found then raise exception 'SUSCRIPCION' using hint = 'Suscripción no encontrada.'; end if;
  if sub.status <> 'pendiente_pago' then raise exception 'ESTADO' using hint = 'Esta suscripción ya no está pendiente de pago.'; end if;

  for o in select * from public.orders where subscription_id = sub.id and status = 'pendiente_pago' loop
    if not public.delivery_date_open(o.zone_id, o.delivery_date) or o.delivery_date > public.today_local() + sub.validity_days then
      raise exception 'FECHA' using hint = 'La entrega del ' || to_char(o.delivery_date, 'DD/MM') || ' ya pasó la hora de corte. Arma el plan de nuevo.';
    end if;
  end loop;

  insert into public.subscription_payments (subscription_id, kind, amount, status)
  values (sub.id, 'compra', sub.total, case when p_approve then 'aprobado' else 'rechazado' end);

  if not p_approve then
    update public.subscriptions set payment_status = 'rechazado', updated_at = now() where id = sub.id;
    return 'rechazado';
  end if;

  -- La vigencia corre desde el pago.
  update public.subscriptions
  set status = 'activa', payment_status = 'aprobado', paid_at = now(),
      starts_on = public.today_local(), expires_on = public.today_local() + sub.validity_days, updated_at = now()
  where id = sub.id;

  update public.orders set status = 'confirmado', payment_status = 'aprobado', paid_at = now(), updated_at = now()
  where subscription_id = sub.id and status = 'pendiente_pago';
  insert into public.order_events (order_id, status, note)
  select id, 'confirmado', 'Plan ' || sub.code || ' pagado' from public.orders where subscription_id = sub.id and status = 'confirmado';
  get diagnostics n = row_count;

  insert into public.notifications (user_id, kind, title, body, href)
  values (sub.user_id, 'success', '¡Tu ' || sub.plan_name || ' está activo!',
          case when n > 0 then n || ' entregas programadas. ' else '' end || 'Tienes hasta el ' || to_char(public.today_local() + sub.validity_days, 'DD/MM') || ' para usar tus platos.',
          '/cuenta/suscripcion/' || sub.code);
  perform public.notify_permission('orders.view', 'info', 'Nueva suscripción ' || sub.code,
          sub.plan_name || ' · ' || n || ' entregas · $' || replace(to_char(sub.total, 'FM999,999,999'), ',', '.'),
          '/admin/suscripciones/' || sub.code);
  return 'aprobado';
end;
$$;

-- El cliente puede descartar una compra que no pagó.
create or replace function public.cancel_my_subscription(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.subscriptions%rowtype;
begin
  select * into sub from public.subscriptions where id = p_subscription_id and user_id = auth.uid() for update;
  if not found then raise exception 'SUSCRIPCION' using hint = 'Suscripción no encontrada.'; end if;
  if sub.status <> 'pendiente_pago' then raise exception 'ESTADO' using hint = 'Un plan pagado no se puede cancelar.'; end if;
  update public.subscriptions set status = 'cancelada', updated_at = now() where id = sub.id;
  update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now()
  where subscription_id = sub.id and status = 'pendiente_pago';
end;
$$;

-- ---------------------------------------------------------------------------
-- Programar y cambiar entregas de un plan activo
-- ---------------------------------------------------------------------------

/** Suscripción activa y vigente del usuario (bloqueada para escribir). */
create or replace function public.my_active_subscription(p_subscription_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.subscriptions%rowtype;
begin
  select * into sub from public.subscriptions where id = p_subscription_id and user_id = auth.uid() for update;
  if not found then raise exception 'SUSCRIPCION' using hint = 'Suscripción no encontrada.'; end if;
  if sub.status <> 'activa' then raise exception 'ESTADO' using hint = 'Esta suscripción no está activa.'; end if;
  if sub.expires_on < public.today_local() then
    raise exception 'VENCIDA' using hint = 'La vigencia de este plan terminó el ' || to_char(sub.expires_on, 'DD/MM') || '.';
  end if;
  return sub;
end;
$$;

/**
 * Cuánto paga el cliente por una entrega nueva (p_order_id null) o por cambiar una existente.
 * Las porciones libres ya se pagaron al valor base: solo se cobra lo que exceda.
 */
create or replace function public.subscription_change_quote(p_subscription_id uuid, p_order_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.subscriptions%rowtype;
  new_value integer;
  new_count integer;
  old_value integer := 0;
  old_count integer := 0;
  credit integer;
  available integer;
begin
  select * into sub from public.subscriptions where id = p_subscription_id and (user_id = auth.uid() or public.has_permission('orders.view'));
  if not found then raise exception 'SUSCRIPCION' using hint = 'Suscripción no encontrada.'; end if;

  select coalesce(sum(r.plan_value * r.quantity), 0), coalesce(sum(r.quantity), 0)
    into new_value, new_count
    from public.resolve_plan_items(p_items, sub.base_value) r;

  if p_order_id is not null then
    select coalesce(sum(coalesce(i.plan_value, sub.base_value) * i.quantity), 0), coalesce(sum(i.quantity), 0)
      into old_value, old_count
      from public.order_items i
      join public.orders o on o.id = i.order_id
      where o.id = p_order_id and o.subscription_id = sub.id and o.status <> 'cancelado';
  end if;

  available := sub.portions - public.subscription_used_portions(sub.id) + old_count;
  if new_count > available then
    raise exception 'PORCIONES' using hint = 'Te quedan ' || available || ' platos en este plan.';
  end if;

  credit := old_value + (new_count - old_count) * sub.base_value;
  -- Redondeo a $100, igual que los precios que ve el cliente.
  return greatest(0, round((new_value - credit) * (1 - sub.discount) / 100) * 100)::integer;
end;
$$;

create or replace function public.schedule_subscription_delivery(p_subscription_id uuid, p_delivery jsonb, p_pay boolean default false)
returns table (order_id uuid, order_code text, charged integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  sub public.subscriptions%rowtype;
  charge integer;
  r record;
begin
  sub := public.my_active_subscription(p_subscription_id);
  charge := public.subscription_change_quote(sub.id, null, p_delivery->'items');
  if charge > 0 and not p_pay then
    raise exception 'PAGO_REQUERIDO' using hint = 'Esta entrega tiene un valor adicional de $' || replace(to_char(charge, 'FM999,999,999'), ',', '.') || '.';
  end if;
  if exists (select 1 from public.orders o where o.subscription_id = sub.id and o.delivery_date = (p_delivery->>'date')::date and o.status <> 'cancelado') then
    raise exception 'DIA_REPETIDO' using hint = 'Ya tienes una entrega de este plan ese día. Edítala para agregar platos.';
  end if;

  select * into r from public.create_plan_order(sub, p_delivery, 'confirmado', 'aprobado');
  if charge > 0 then
    insert into public.subscription_payments (subscription_id, order_id, kind, amount, status) values (sub.id, r.order_id, 'diferencia', charge, 'aprobado');
  end if;
  perform public.notify_permission('orders.view', 'info', 'Nueva entrega ' || r.order_code,
          'Plan ' || sub.code || ' · ' || to_char((p_delivery->>'date')::date, 'DD/MM'), '/admin/pedidos/' || r.order_code);
  return query select r.order_id, r.order_code, charge;
end;
$$;

create or replace function public.update_subscription_delivery(p_order_id uuid, p_delivery jsonb, p_pay boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  sub public.subscriptions%rowtype;
  h record;
  it record;
  charge integer;
  charged integer;
  v_total integer := 0;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() and kind = 'suscripcion' for update;
  if not found then raise exception 'PEDIDO' using hint = 'Entrega no encontrada.'; end if;
  sub := public.my_active_subscription(o.subscription_id);
  if o.status <> 'confirmado' or not public.delivery_date_open(o.zone_id, o.delivery_date) then
    raise exception 'CORTE' using hint = 'Esta entrega ya no se puede cambiar: pasó la hora de corte o ya está en preparación.';
  end if;

  select * into h from public.resolve_plan_delivery(p_delivery, o.user_id, sub.expires_on);
  if h.delivery_date <> o.delivery_date and exists (
    select 1 from public.orders x where x.subscription_id = sub.id and x.delivery_date = h.delivery_date and x.status <> 'cancelado' and x.id <> o.id
  ) then
    raise exception 'DIA_REPETIDO' using hint = 'Ya tienes otra entrega de este plan ese día.';
  end if;

  charge := public.subscription_change_quote(sub.id, o.id, p_delivery->'items');
  if charge > 0 and not p_pay then
    raise exception 'PAGO_REQUERIDO' using hint = 'Este cambio tiene un valor adicional de $' || replace(to_char(charge, 'FM999,999,999'), ',', '.') || '.';
  end if;

  delete from public.order_items where order_id = o.id;
  for it in select * from public.resolve_plan_items(p_delivery->'items', sub.base_value) loop
    charged := round(it.plan_value * (1 - sub.discount));
    insert into public.order_items (order_id, product_id, name, options, unit_price, plan_value, quantity, line_total)
    values (o.id, it.product_id, it.name, it.options, charged, it.plan_value, it.quantity, charged * it.quantity);
    v_total := v_total + charged * it.quantity;
  end loop;

  update public.orders
  set zone_id = h.zone_id, delivery_date = h.delivery_date, slot_id = h.slot_id, slot_label = h.slot_label,
      address_id = h.address_id, address_snapshot = h.address_snapshot, notes = h.notes,
      subtotal = v_total, total = v_total, updated_at = now()
  where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'confirmado', 'Entrega modificada por el cliente');
  if charge > 0 then
    insert into public.subscription_payments (subscription_id, order_id, kind, amount, status) values (sub.id, o.id, 'diferencia', charge, 'aprobado');
  end if;
  return charge;
end;
$$;

-- Desprogramar: los platos vuelven al plan (sin reembolso de diferencias pagadas).
create or replace function public.cancel_subscription_delivery(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id and user_id = auth.uid() and kind = 'suscripcion' for update;
  if not found then raise exception 'PEDIDO' using hint = 'Entrega no encontrada.'; end if;
  perform public.my_active_subscription(o.subscription_id);
  if o.status <> 'confirmado' or not public.delivery_date_open(o.zone_id, o.delivery_date) then
    raise exception 'CORTE' using hint = 'Esta entrega ya no se puede quitar: pasó la hora de corte o ya está en preparación.';
  end if;
  update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', 'Desprogramada por el cliente: los platos vuelven al plan');
end;
$$;

-- Funciones internas: solo las usan otras funciones.
revoke execute on function public.resolve_plan_items(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.resolve_plan_delivery(jsonb, uuid, date) from public, anon, authenticated;
revoke execute on function public.create_plan_order(public.subscriptions, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.my_active_subscription(uuid) from public, anon, authenticated;
revoke execute on function public.subscription_used_portions(uuid) from public, anon, authenticated;

revoke execute on function public.purchase_subscription(uuid, jsonb) from public, anon;
revoke execute on function public.pay_subscription_simulated(uuid, boolean) from public, anon;
revoke execute on function public.cancel_my_subscription(uuid) from public, anon;
revoke execute on function public.subscription_change_quote(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.schedule_subscription_delivery(uuid, jsonb, boolean) from public, anon;
revoke execute on function public.update_subscription_delivery(uuid, jsonb, boolean) from public, anon;
revoke execute on function public.cancel_subscription_delivery(uuid) from public, anon;
grant execute on function public.purchase_subscription(uuid, jsonb) to authenticated;
grant execute on function public.pay_subscription_simulated(uuid, boolean) to authenticated;
grant execute on function public.cancel_my_subscription(uuid) to authenticated;
grant execute on function public.subscription_change_quote(uuid, uuid, jsonb) to authenticated;
grant execute on function public.schedule_subscription_delivery(uuid, jsonb, boolean) to authenticated;
grant execute on function public.update_subscription_delivery(uuid, jsonb, boolean) to authenticated;
grant execute on function public.cancel_subscription_delivery(uuid) to authenticated;
grant execute on function public.delivery_date_open(uuid, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Las entregas de un plan se pagan y cancelan desde la suscripción, no como pedido suelto.
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
  if o.kind = 'suscripcion' then raise exception 'PLAN' using hint = 'Esta entrega es de un plan: se paga desde la suscripción.'; end if;
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
  if o.kind = 'suscripcion' then raise exception 'PLAN' using hint = 'Esta entrega es de un plan: quítala desde tu suscripción.'; end if;
  if o.status <> 'pendiente_pago' then
    raise exception 'ESTADO' using hint = 'Un pedido pagado solo lo puede cancelar el equipo. Escríbenos por WhatsApp.';
  end if;
  update public.orders set status = 'cancelado', cancelled_at = now(), updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, note) values (o.id, 'cancelado', 'Cancelado por el cliente');
end;
$$;
