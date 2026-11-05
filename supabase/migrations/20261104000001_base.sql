-- FRESKO · Fase 1: ubicaciones, zonas de cobertura, perfiles, roles y permisos.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Ubicaciones: país → ciudad → zona
-- ---------------------------------------------------------------------------

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id) on delete restrict,
  name text not null,
  timezone text not null default 'America/Bogota',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (country_id, name)
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null,
  color text not null default '#8BC34A',
  -- Vértices del polígono: [{ "lat": 4.6, "lng": -74.1 }, ...]
  polygon jsonb not null default '[]'::jsonb,
  -- Geometría derivada de `polygon` (la mantiene un trigger).
  area extensions.geometry (Polygon, 4326),
  -- Hora límite (hora local de la ciudad) para pedir o cambiar la entrega del mismo día.
  cutoff_time time not null default '07:00',
  -- Días con entregas, ISO: 1 = lunes … 7 = domingo.
  delivery_days smallint[] not null default '{1,2,3,4,5,6}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, name),
  check (delivery_days <@ '{1,2,3,4,5,6,7}'::smallint[])
);

create index zones_area_idx on public.zones using gist (area);

create table public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (zone_id, start_time)
);

create or replace function public.zones_sync_area()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  pts extensions.geometry[];
  v jsonb;
begin
  new.updated_at := now();
  if jsonb_typeof(new.polygon) <> 'array' or jsonb_array_length(new.polygon) < 3 then
    new.area := null;
    return new;
  end if;
  for v in select * from jsonb_array_elements(new.polygon) loop
    pts := pts || extensions.st_setsrid(
      extensions.st_makepoint((v->>'lng')::float8, (v->>'lat')::float8), 4326);
  end loop;
  -- Cierra el anillo repitiendo el primer vértice.
  pts := pts || pts[1];
  new.area := extensions.st_makepolygon(extensions.st_makeline(pts));
  return new;
end;
$$;

create trigger zones_sync_area
before insert or update of polygon on public.zones
for each row execute function public.zones_sync_area();

-- Zona activa que cubre un punto (o ninguna).
create or replace function public.zone_for_point(lat float8, lng float8)
returns table (zone_id uuid, zone_name text, city_name text, country_code text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select z.id, z.name, c.name, co.code
  from public.zones z
  join public.cities c on c.id = z.city_id
  join public.countries co on co.id = c.country_id
  where z.active and c.active and co.active
    and z.area is not null
    and extensions.st_contains(z.area, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326))
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles, roles y permisos
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  key text primary key,
  module text not null,
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null default '',
  -- Los roles del sistema no se pueden borrar ni renombrar su key.
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = auth.uid() and rp.permission_key = perm
  );
$$;

create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct rp.permission_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where ur.user_id = auth.uid();
$$;

-- Crea el perfil y asigna el rol "cliente" a cada usuario nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r where r.key = 'cliente';
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.zones enable row level security;
alter table public.delivery_slots enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

-- Ubicaciones: lectura pública de lo activo; gestión con zones.manage.
create policy "countries read" on public.countries for select
  using (active or public.has_permission('zones.manage'));
create policy "countries write" on public.countries for all
  using (public.has_permission('zones.manage'))
  with check (public.has_permission('zones.manage'));

create policy "cities read" on public.cities for select
  using (active or public.has_permission('zones.manage'));
create policy "cities write" on public.cities for all
  using (public.has_permission('zones.manage'))
  with check (public.has_permission('zones.manage'));

create policy "zones read" on public.zones for select
  using (active or public.has_permission('zones.manage'));
create policy "zones write" on public.zones for all
  using (public.has_permission('zones.manage'))
  with check (public.has_permission('zones.manage'));

create policy "slots read" on public.delivery_slots for select
  using (active or public.has_permission('zones.manage'));
create policy "slots write" on public.delivery_slots for all
  using (public.has_permission('zones.manage'))
  with check (public.has_permission('zones.manage'));

-- Perfiles: cada uno el suyo; users.manage ve y edita todos.
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.has_permission('users.manage'));
create policy "profiles update" on public.profiles for update
  using (id = auth.uid() or public.has_permission('users.manage'))
  with check (id = auth.uid() or public.has_permission('users.manage'));

-- Catálogo de permisos y roles: lectura para usuarios autenticados.
create policy "permissions read" on public.permissions for select
  to authenticated using (true);

create policy "roles read" on public.roles for select
  to authenticated using (true);
create policy "roles write" on public.roles for all
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

create policy "role_permissions read" on public.role_permissions for select
  to authenticated using (true);
create policy "role_permissions write" on public.role_permissions for all
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

create policy "user_roles read" on public.user_roles for select
  using (user_id = auth.uid() or public.has_permission('users.manage'));
create policy "user_roles write" on public.user_roles for all
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- Evita borrar roles del sistema o cambiar su key.
create or replace function public.protect_system_roles()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'No se puede eliminar un rol del sistema';
  end if;
  if tg_op = 'UPDATE' and old.is_system and (new.key <> old.key or not new.is_system) then
    raise exception 'No se puede cambiar la clave de un rol del sistema';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_system_roles
before update or delete on public.roles
for each row execute function public.protect_system_roles();

-- ---------------------------------------------------------------------------
-- Datos base: permisos y roles
-- ---------------------------------------------------------------------------

insert into public.permissions (key, module, description) values
  ('admin.access',     'General',    'Entrar al panel de administración'),
  ('users.manage',     'Usuarios',   'Ver usuarios y asignar roles'),
  ('roles.manage',     'Usuarios',   'Crear roles y editar sus permisos'),
  ('zones.manage',     'Cobertura',  'Gestionar países, ciudades, zonas y franjas'),
  ('catalog.manage',   'Catálogo',   'Gestionar productos, recetas e ingredientes'),
  ('inventory.view',   'Inventario', 'Ver inventario y alertas de stock'),
  ('inventory.manage', 'Inventario', 'Registrar entradas, ajustes y pérdidas'),
  ('orders.view',      'Pedidos',    'Ver todos los pedidos y suscripciones'),
  ('kitchen.prepare',  'Cocina',     'Ver la producción del día y marcar preparados'),
  ('delivery.deliver', 'Entregas',   'Ver rutas asignadas y marcar entregas'),
  ('reports.view',     'Reportes',   'Ver reportes de ventas y operación');

insert into public.roles (key, name, description, is_system) values
  ('admin',        'Administrador', 'Acceso total', true),
  ('cocinero',     'Cocinero',      'Producción diaria e inventario', true),
  ('domiciliario', 'Domiciliario',  'Rutas y entregas', true),
  ('cliente',      'Cliente',       'Compra productos y planes', true);

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p where r.key = 'admin';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array['admin.access', 'kitchen.prepare', 'inventory.view']) k
where r.key = 'cocinero';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array['admin.access', 'delivery.deliver']) k
where r.key = 'domiciliario';

-- ---------------------------------------------------------------------------
-- Datos base: Colombia → Bogotá → Kennedy (polígono aproximado, editable)
-- ---------------------------------------------------------------------------

with co as (
  insert into public.countries (code, name, currency) values ('CO', 'Colombia', 'COP')
  returning id
), bog as (
  insert into public.cities (country_id, name, timezone)
  select id, 'Bogotá', 'America/Bogota' from co
  returning id
), ken as (
  insert into public.zones (city_id, name, polygon)
  select id, 'Kennedy', '[
    {"lat": 4.6505, "lng": -74.1880},
    {"lat": 4.6440, "lng": -74.1500},
    {"lat": 4.6370, "lng": -74.1220},
    {"lat": 4.6150, "lng": -74.1180},
    {"lat": 4.6000, "lng": -74.1300},
    {"lat": 4.5960, "lng": -74.1550},
    {"lat": 4.6080, "lng": -74.1800},
    {"lat": 4.6250, "lng": -74.2050}
  ]'::jsonb from bog
  returning id
)
insert into public.delivery_slots (zone_id, start_time, end_time)
select id, s, e from ken,
  (values ('11:00'::time, '13:00'::time), ('13:00'::time, '15:00'::time)) v(s, e);
