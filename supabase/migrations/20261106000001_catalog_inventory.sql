-- FRESKO · Fase 2: catálogo (categorías, productos, recetas, ingredientes, armador),
-- planes de suscripción e inventario.

-- ---------------------------------------------------------------------------
-- Ajustes generales (margen objetivo, redondeo, valor base de porción en planes)
-- ---------------------------------------------------------------------------

create table public.settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
create policy "settings read" on public.settings for select using (true);
create policy "settings write" on public.settings for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

insert into public.settings (key, value, description) values
  ('target_margin', '0.65', 'Margen objetivo sobre el precio de venta (0.65 = 65%). Se usa para sugerir precios.'),
  ('price_rounding', '100', 'Redondeo de precios sugeridos (en pesos).'),
  ('plan_base_value', '9900', 'Valor mínimo que cuenta cada porción de un plan. Un plato más caro suma su precio; uno más barato cuenta este valor.');

-- ---------------------------------------------------------------------------
-- Categorías de producto (ensaladas, bowls… y las que vengan)
-- ---------------------------------------------------------------------------

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  description text not null default '',
  image_url text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_categories enable row level security;
create policy "categories read" on public.product_categories for select
  using (active or public.has_permission('catalog.manage'));
create policy "categories write" on public.product_categories for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

insert into public.product_categories (slug, name, description, image_url, sort) values
  ('ensaladas', 'Ensaladas', 'Complementa el almuerzo de tu familia con una ensalada siempre fresca y saludable.', '/images/bowl.png', 1),
  ('bowls', 'Bowls', 'Resuelve tus comidas con una receta balanceada y llena de sabor.', '/images/bowl.png', 2);

-- ---------------------------------------------------------------------------
-- Planes de suscripción (lista editable; no dependen de la categoría)
--   Total = Σ máx(precio del plato, plan_base_value) × (1 − discount)
--   "Desde" = portions × plan_base_value × (1 − discount)
-- ---------------------------------------------------------------------------

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  description text not null default '',
  portions integer not null check (portions > 0),
  -- 0.12 = 12% de descuento sobre el total del plan
  discount numeric(4, 3) not null default 0 check (discount >= 0 and discount < 1),
  -- Días para programar todas las porciones desde la compra
  validity_days integer not null default 60 check (validity_days > 0),
  benefits text[] not null default '{}',
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;
create policy "plans read" on public.subscription_plans for select
  using (active or public.has_permission('catalog.manage'));
create policy "plans write" on public.subscription_plans for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

insert into public.subscription_plans (slug, name, description, portions, discount, benefits, featured, sort) values
  ('basic', 'Plan Basic', 'Para empezar a comer fresco varias veces por semana.', 12, 0.05,
   '{"Domicilio incluido","Ensaladas y bowls a tu elección","2 meses para programar tus platos"}', false, 1),
  ('smart', 'Plan Smart', 'El favorito: casi todos los días hábiles del mes.', 20, 0.12,
   '{"Domicilio incluido","Ensaladas y bowls a tu elección","2 meses para programar tus platos","Cambia tus platos hasta las 7:00 a. m."}', true, 2),
  ('full', 'Plan Full', 'Tu comida resuelta todo el mes con el mejor precio.', 28, 0.20,
   '{"Domicilio incluido","Ensaladas, bowls y Arma tu bowl","2 meses para programar tus platos","Cambia tus platos hasta las 7:00 a. m."}', false, 3);

-- ---------------------------------------------------------------------------
-- Ingredientes y sus categorías (editables)
-- ---------------------------------------------------------------------------

create table public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ingredient_categories enable row level security;
create policy "ingredient categories read" on public.ingredient_categories for select
  using (
    public.has_permission('catalog.manage') or public.has_permission('inventory.view')
    or public.has_permission('kitchen.prepare')
  );
create policy "ingredient categories write" on public.ingredient_categories for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

insert into public.ingredient_categories (slug, name, sort) values
  ('base', 'Base', 1), ('vegetal', 'Vegetal', 2), ('fruta', 'Fruta', 3), ('proteina', 'Proteína', 4),
  ('lacteo', 'Lácteo', 5), ('topping', 'Topping', 6), ('salsa', 'Salsa', 7), ('empaque', 'Empaque', 8),
  ('otro', 'Otro', 9);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category_id uuid not null references public.ingredient_categories (id) on delete restrict,
  -- Unidad base de inventario y recetas
  unit text not null check (unit in ('g', 'ml', 'un')),
  -- Costo por unidad base (COP por gramo, mililitro o unidad)
  cost_per_unit numeric(12, 4) not null default 0 check (cost_per_unit >= 0),
  stock numeric(12, 2) not null default 0,
  min_stock numeric(12, 2) not null default 0 check (min_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;
create policy "ingredients read" on public.ingredients for select
  using (
    public.has_permission('catalog.manage') or public.has_permission('inventory.view')
    or public.has_permission('kitchen.prepare')
  );
create policy "ingredients write" on public.ingredients for all
  using (public.has_permission('catalog.manage') or public.has_permission('inventory.manage'))
  with check (public.has_permission('catalog.manage') or public.has_permission('inventory.manage'));

-- ---------------------------------------------------------------------------
-- Productos y recetas
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  category_id uuid not null references public.product_categories (id) on delete restrict,
  -- fixed: receta fija · builder: "Arma tu…" (su precio es la base y se suman las opciones del armador)
  kind text not null default 'fixed' check (kind in ('fixed', 'builder')),
  description text not null default '',
  image_url text,
  tag text,
  price integer not null default 0 check (price >= 0),
  -- Margen propio (si es null se usa settings.target_margin)
  target_margin numeric(4, 3) check (target_margin is null or (target_margin >= 0 and target_margin < 1)),
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "products read" on public.products for select
  using (active or public.has_permission('catalog.manage'));
create policy "products write" on public.products for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

create index products_category_idx on public.products (category_id, sort);

create table public.recipe_items (
  product_id uuid not null references public.products (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric(10, 2) not null check (quantity > 0),
  primary key (product_id, ingredient_id)
);

alter table public.recipe_items enable row level security;
create policy "recipe read" on public.recipe_items for select
  using (
    public.has_permission('catalog.manage') or public.has_permission('inventory.view')
    or public.has_permission('kitchen.prepare')
  );
create policy "recipe write" on public.recipe_items for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

-- Costo de cada producto según su receta (respeta RLS de quien consulta).
create view public.product_costs with (security_invoker = true) as
select p.id as product_id,
       coalesce(round(sum(ri.quantity * i.cost_per_unit)), 0)::integer as cost
from public.products p
left join public.recipe_items ri on ri.product_id = p.id
left join public.ingredients i on i.id = ri.ingredient_id
group by p.id;

-- ---------------------------------------------------------------------------
-- Armador ("Arma tu bowl / ensalada")
-- ---------------------------------------------------------------------------

create table public.builder_options (
  id uuid primary key default gen_random_uuid(),
  step text not null check (step in ('base', 'vegetables', 'proteins', 'toppings', 'sauce')),
  name text not null,
  emoji text not null default '🥗',
  ingredient_id uuid references public.ingredients (id) on delete set null,
  quantity numeric(10, 2) not null default 0 check (quantity >= 0),
  -- Valor extra que suma al precio base
  price integer not null default 0 check (price >= 0),
  -- Capa visual del preview: { type, color, size, x, y, rotate?, opacity? }
  layer jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (step, name)
);

alter table public.builder_options enable row level security;
create policy "builder read" on public.builder_options for select
  using (active or public.has_permission('catalog.manage'));
create policy "builder write" on public.builder_options for all
  using (public.has_permission('catalog.manage'))
  with check (public.has_permission('catalog.manage'));

-- ---------------------------------------------------------------------------
-- Inventario: movimientos (auditoría) que actualizan el stock
-- ---------------------------------------------------------------------------

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  -- entrada: compra · perdida: merma/caducidad · ajuste: conteo físico · consumo: preparación
  kind text not null check (kind in ('entrada', 'perdida', 'ajuste', 'consumo')),
  -- Cantidad con signo en la unidad del ingrediente (+ suma, − resta)
  quantity numeric(12, 2) not null check (quantity <> 0),
  -- Costo por unidad base de esta compra (solo entradas)
  unit_cost numeric(12, 4) check (unit_cost is null or unit_cost >= 0),
  reason text check (reason is null or reason in ('caducidad', 'dano', 'preparacion', 'otro')),
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (kind <> 'entrada' or quantity > 0),
  check (kind not in ('perdida', 'consumo') or quantity < 0)
);

create index inventory_movements_ingredient_idx on public.inventory_movements (ingredient_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

alter table public.inventory_movements enable row level security;
create policy "movements read" on public.inventory_movements for select
  using (public.has_permission('inventory.view') or public.has_permission('inventory.manage'));
create policy "movements insert" on public.inventory_movements for insert
  with check (public.has_permission('inventory.manage'));
-- Sin update/delete: el historial no se edita; los errores se corrigen con un ajuste.

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ing public.ingredients%rowtype;
begin
  select * into ing from public.ingredients where id = new.ingredient_id for update;

  -- Costo promedio ponderado en cada compra con costo informado.
  if new.kind = 'entrada' and new.unit_cost is not null then
    update public.ingredients
    set cost_per_unit = case
          when greatest(ing.stock, 0) + new.quantity > 0 then
            round(((greatest(ing.stock, 0) * ing.cost_per_unit) + (new.quantity * new.unit_cost))
                  / (greatest(ing.stock, 0) + new.quantity), 4)
          else new.unit_cost
        end
    where id = ing.id;
  end if;

  update public.ingredients
  set stock = stock + new.quantity, updated_at = now()
  where id = ing.id;
  return new;
end;
$$;

create trigger apply_inventory_movement
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

-- Alerta cuando un ingrediente baja del mínimo (avisa a quien ve el inventario).
create or replace function public.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  unit_label text := case new.unit when 'g' then 'g' when 'ml' then 'ml' else 'un' end;
begin
  if new.min_stock > 0 and new.stock < new.min_stock and old.stock >= old.min_stock then
    insert into public.notifications (user_id, kind, title, body, href)
    select distinct ur.user_id,
           case when new.stock <= 0 then 'alert' else 'warning' end,
           case when new.stock <= 0 then 'Sin stock: ' else 'Stock bajo: ' end || new.name,
           'Quedan ' || replace(to_char(round(greatest(new.stock, 0)), 'FM999,999,990'), ',', '.') || ' ' || unit_label
             || ' (mínimo ' || replace(to_char(round(new.min_stock), 'FM999,999,990'), ',', '.') || ' ' || unit_label || ').',
           '/admin/inventario'
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where rp.permission_key = 'inventory.view';
  end if;
  return new;
end;
$$;

create trigger notify_low_stock
after update of stock, min_stock on public.ingredients
for each row execute function public.notify_low_stock();

-- ---------------------------------------------------------------------------
-- Imágenes de productos (bucket público, escritura con catalog.manage)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product images read" on storage.objects for select using (bucket_id = 'products');
create policy "product images insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'products' and public.has_permission('catalog.manage'));
create policy "product images update" on storage.objects for update to authenticated
  using (bucket_id = 'products' and public.has_permission('catalog.manage'));
create policy "product images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'products' and public.has_permission('catalog.manage'));

-- ---------------------------------------------------------------------------
-- Datos iniciales (valores de ejemplo, editables en el panel)
-- ---------------------------------------------------------------------------

insert into public.ingredients (name, category_id, unit, cost_per_unit, min_stock)
select v.name, c.id, v.unit, v.cost, v.min_stock
from (values
  ('Lechuga crespa',      'base',     'g',  6,    2000),
  ('Espinaca baby',       'base',     'g',  20,   1500),
  ('Mix verde FRESKO',    'base',     'g',  18,   2000),
  ('Arroz cocido',        'base',     'g',  3,    3000),
  ('Tomate',              'vegetal',  'g',  5,    1500),
  ('Pepino',              'vegetal',  'g',  4,    1000),
  ('Zanahoria',           'vegetal',  'g',  3,    1000),
  ('Brócoli',             'vegetal',  'g',  8,    1000),
  ('Maíz tierno',         'vegetal',  'g',  10,   800),
  ('Repollo morado',      'vegetal',  'g',  4,    800),
  ('Aceitunas',           'vegetal',  'g',  40,   300),
  ('Edamame',             'vegetal',  'g',  35,   500),
  ('Aguacate',            'fruta',    'g',  12,   1500),
  ('Mango',               'fruta',    'g',  6,    800),
  ('Coco rallado',        'fruta',    'g',  30,   200),
  ('Pechuga de pollo',    'proteina', 'g',  22,   3000),
  ('Salmón',              'proteina', 'g',  90,   1000),
  ('Camarón',             'proteina', 'g',  70,   1000),
  ('Atún',                'proteina', 'g',  45,   800),
  ('Tofu',                'proteina', 'g',  25,   500),
  ('Huevo',               'proteina', 'un', 600,  30),
  ('Jamón serrano',       'proteina', 'g',  150,  300),
  ('Hummus',              'proteina', 'g',  35,   500),
  ('Queso fresco',        'lacteo',   'g',  30,   800),
  ('Queso feta',          'lacteo',   'g',  60,   300),
  ('Mix de semillas',     'topping',  'g',  40,   200),
  ('Nueces',              'topping',  'g',  60,   200),
  ('Croutons',            'topping',  'g',  25,   200),
  ('Aderezo de limón',    'salsa',    'ml', 15,   1000),
  ('Vinagreta',           'salsa',    'ml', 20,   1000),
  ('Salsa ranch',         'salsa',    'ml', 25,   800),
  ('Salsa de soya',       'salsa',    'ml', 15,   500),
  ('Aderezo de yogurt',   'salsa',    'ml', 12,   800),
  ('Empaque bowl',        'empaque',  'un', 1200, 100)
) as v(name, category, unit, cost, min_stock)
join public.ingredient_categories c on c.slug = v.category;

-- Inventario inicial (entra por movimientos para que quede en el historial).
insert into public.inventory_movements (ingredient_id, kind, quantity, note, created_by)
select id, 'entrada',
       case name
         when 'Aguacate' then 1200      -- por debajo del mínimo a propósito: genera alerta de ejemplo
         when 'Huevo' then 60
         when 'Empaque bowl' then 400
         else min_stock * 3
       end,
       'Inventario inicial', null
from public.ingredients;

insert into public.products (slug, name, category_id, kind, description, price, tag, featured, sort)
select v.slug, v.name, c.id, v.kind, v.description, v.price, v.tag, v.featured, v.sort
from (values
  ('fresko-clasico',      'FRESKO Clásico',      'ensaladas', 'fixed',   'Mix verde, tomate, pepino, zanahoria, aderezo limón',   9900,  'Más pedido', true,  1),
  ('fresko-verde',        'FRESKO Verde',        'ensaladas', 'fixed',   'Espinaca, brócoli, pepino, semillas, vinagreta',          9900,  null,         false, 2),
  ('arma-tu-ensalada',    'Arma tu ensalada',    'ensaladas', 'builder', 'Elige base, vegetales, proteína y salsa a tu gusto',      9900,  null,         false, 3),
  ('fresko-tropical',     'FRESKO Tropical',     'ensaladas', 'fixed',   'Espinaca, mango, aguacate, coco, vinagreta',              9900,  null,         true,  4),
  ('fresko-mediterraneo', 'FRESKO Mediterráneo', 'ensaladas', 'fixed',   'Mix verde, hummus, aceitunas, tomate, feta',              9900,  null,         false, 5),
  ('fresko-jamon',        'FRESKO Jamón',        'ensaladas', 'fixed',   'Mix fresko, jamón serrano, huevo, aceitunas',             9900,  null,         true,  6),
  ('fresko-pollo',        'FRESKO Pollo',        'bowls',     'fixed',   'Lechuga, pollo grillado, maíz, queso, ranch',             19900, null,         true,  7),
  ('fresko-salmon',       'FRESKO Salmón',       'bowls',     'fixed',   'Arroz, salmón, aguacate, edamame, salsa soya',            29900, 'Nuevo',      true,  8),
  ('fresko-camaron',      'FRESKO Camarón',      'bowls',     'fixed',   'Arroz, camarón, aguacate, edamame, salsa soya',           29900, 'Premium',    true,  9),
  ('arma-tu-bowl',        'Arma tu bowl',        'bowls',     'builder', 'Elige base, vegetales, proteínas, toppings y salsa',      10000, null,         false, 10)
) as v(slug, name, category, kind, description, price, tag, featured, sort)
join public.product_categories c on c.slug = v.category;

insert into public.recipe_items (product_id, ingredient_id, quantity)
select p.id, i.id, r.qty
from (values
  ('fresko-clasico', 'Mix verde FRESKO', 80), ('fresko-clasico', 'Tomate', 50), ('fresko-clasico', 'Pepino', 40),
  ('fresko-clasico', 'Zanahoria', 30), ('fresko-clasico', 'Aderezo de limón', 30), ('fresko-clasico', 'Empaque bowl', 1),
  ('fresko-verde', 'Espinaca baby', 70), ('fresko-verde', 'Brócoli', 60), ('fresko-verde', 'Pepino', 40),
  ('fresko-verde', 'Mix de semillas', 10), ('fresko-verde', 'Vinagreta', 30), ('fresko-verde', 'Empaque bowl', 1),
  ('fresko-tropical', 'Espinaca baby', 70), ('fresko-tropical', 'Mango', 60), ('fresko-tropical', 'Aguacate', 50),
  ('fresko-tropical', 'Coco rallado', 10), ('fresko-tropical', 'Vinagreta', 30), ('fresko-tropical', 'Empaque bowl', 1),
  ('fresko-mediterraneo', 'Mix verde FRESKO', 70), ('fresko-mediterraneo', 'Hummus', 40), ('fresko-mediterraneo', 'Aceitunas', 20),
  ('fresko-mediterraneo', 'Tomate', 40), ('fresko-mediterraneo', 'Queso feta', 25), ('fresko-mediterraneo', 'Empaque bowl', 1),
  ('fresko-jamon', 'Mix verde FRESKO', 70), ('fresko-jamon', 'Jamón serrano', 20), ('fresko-jamon', 'Huevo', 1),
  ('fresko-jamon', 'Aceitunas', 15), ('fresko-jamon', 'Empaque bowl', 1),
  ('fresko-pollo', 'Lechuga crespa', 80), ('fresko-pollo', 'Pechuga de pollo', 150), ('fresko-pollo', 'Maíz tierno', 40),
  ('fresko-pollo', 'Queso fresco', 30), ('fresko-pollo', 'Salsa ranch', 30), ('fresko-pollo', 'Empaque bowl', 1),
  ('fresko-salmon', 'Arroz cocido', 150), ('fresko-salmon', 'Salmón', 100), ('fresko-salmon', 'Aguacate', 60),
  ('fresko-salmon', 'Edamame', 40), ('fresko-salmon', 'Salsa de soya', 20), ('fresko-salmon', 'Empaque bowl', 1),
  ('fresko-camaron', 'Arroz cocido', 150), ('fresko-camaron', 'Camarón', 110), ('fresko-camaron', 'Aguacate', 60),
  ('fresko-camaron', 'Edamame', 40), ('fresko-camaron', 'Salsa de soya', 20), ('fresko-camaron', 'Empaque bowl', 1)
) as r(slug, ingredient, qty)
join public.products p on p.slug = r.slug
join public.ingredients i on i.name = r.ingredient;

insert into public.builder_options (step, name, emoji, ingredient_id, quantity, price, layer, sort)
select o.step, o.name, o.emoji, i.id, o.qty, o.price, o.layer::jsonb, o.sort
from (values
  ('base', 'Lechuga', '🥬', 'Lechuga crespa', 100, 0, '{"type":"base","color":"#7CB342","size":95,"x":50,"y":58,"opacity":0.85}', 1),
  ('base', 'Espinaca', '🌿', 'Espinaca baby', 80, 500, '{"type":"base","color":"#558B2F","size":92,"x":50,"y":56,"opacity":0.9}', 2),
  ('base', 'Mix FRESKO', '🥗', 'Mix verde FRESKO', 90, 1000, '{"type":"base","color":"#9CCC65","size":98,"x":50,"y":57,"opacity":0.88}', 3),
  ('vegetables', 'Tomate', '🍅', 'Tomate', 50, 800, '{"type":"veg","color":"#E53935","size":14,"x":38,"y":48,"rotate":-12}', 1),
  ('vegetables', 'Pepino', '🥒', 'Pepino', 40, 700, '{"type":"veg","color":"#43A047","size":12,"x":62,"y":50,"rotate":8}', 2),
  ('vegetables', 'Zanahoria', '🥕', 'Zanahoria', 30, 600, '{"type":"veg","color":"#FB8C00","size":11,"x":55,"y":44,"rotate":20}', 3),
  ('vegetables', 'Aguacate', '🥑', 'Aguacate', 50, 1500, '{"type":"veg","color":"#689F38","size":18,"x":45,"y":52,"rotate":-5}', 4),
  ('vegetables', 'Maíz', '🌽', 'Maíz tierno', 40, 700, '{"type":"veg","color":"#FDD835","size":10,"x":58,"y":46,"rotate":0}', 5),
  ('vegetables', 'Repollo', '🟣', 'Repollo morado', 30, 600, '{"type":"veg","color":"#8E24AA","size":13,"x":42,"y":45,"rotate":15}', 6),
  ('proteins', 'Pollo', '🍗', 'Pechuga de pollo', 120, 3500, '{"type":"protein","color":"#D4A574","size":22,"x":50,"y":46,"opacity":0.95}', 1),
  ('proteins', 'Atún', '🐟', 'Atún', 80, 4000, '{"type":"protein","color":"#FF8A65","size":20,"x":48,"y":47,"opacity":0.9}', 2),
  ('proteins', 'Tofu', '🧈', 'Tofu', 100, 3000, '{"type":"protein","color":"#FFF9C4","size":18,"x":52,"y":48,"opacity":0.92}', 3),
  ('proteins', 'Huevo', '🥚', 'Huevo', 1, 2000, '{"type":"protein","color":"#FFEB3B","size":14,"x":54,"y":44,"opacity":0.95}', 4),
  ('toppings', 'Queso', '🧀', 'Queso fresco', 30, 1200, '{"type":"topping","color":"#FFC107","size":8,"x":40,"y":42}', 1),
  ('toppings', 'Nueces', '🥜', 'Nueces', 15, 1500, '{"type":"topping","color":"#8D6E63","size":7,"x":60,"y":43}', 2),
  ('toppings', 'Semillas', '✨', 'Mix de semillas', 10, 800, '{"type":"topping","color":"#A1887F","size":6,"x":50,"y":40}', 3),
  ('toppings', 'Croutons', '🍞', 'Croutons', 15, 900, '{"type":"topping","color":"#D7CCC8","size":7,"x":46,"y":41}', 4),
  ('sauce', 'Limón', '🍋', 'Aderezo de limón', 30, 0, '{"type":"sauce","color":"#FFF59D","size":100,"x":50,"y":50,"opacity":0.25}', 1),
  ('sauce', 'Vinagreta', '🫒', 'Vinagreta', 30, 0, '{"type":"sauce","color":"#AED581","size":100,"x":50,"y":50,"opacity":0.2}', 2),
  ('sauce', 'Yogurt', '🥛', 'Aderezo de yogurt', 30, 500, '{"type":"sauce","color":"#FFFFFF","size":100,"x":50,"y":50,"opacity":0.3}', 3)
) as o(step, name, emoji, ingredient, qty, price, layer, sort)
left join public.ingredients i on i.name = o.ingredient;
