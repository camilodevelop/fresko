-- ---------------------------------------------------------------------------
-- Usuarios activos / inactivos.
-- Un usuario inactivo no puede iniciar sesión (bloqueado en Auth), se le cierran las
-- sesiones abiertas y pierde todos sus permisos aunque conserve sus roles; al
-- reactivarlo recupera lo que tenía. No se borra nada: pedidos e historial quedan.
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists deactivated_at timestamptz;
alter table public.profiles add column if not exists deactivated_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists deactivation_reason text;

-- Historial de activaciones e inactivaciones.
create table if not exists public.user_status_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  active boolean not null,
  reason text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists user_status_events_user_idx on public.user_status_events (user_id, created_at desc);
alter table public.user_status_events enable row level security;
drop policy if exists "status events read" on public.user_status_events;
create policy "status events read" on public.user_status_events for select using (public.has_permission('users.manage'));

-- Sin permisos mientras esté inactivo (aunque su sesión siga viva unos minutos).
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
    join public.profiles p on p.id = ur.user_id and p.active
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
  join public.profiles p on p.id = ur.user_id and p.active
  where ur.user_id = auth.uid();
$$;

/** Activa o inactiva un usuario. Inactivar exige motivo, bloquea el ingreso y cierra sus sesiones. */
create or replace function public.set_user_active(p_user_id uuid, p_active boolean, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pr public.profiles%rowtype;
begin
  if not public.has_permission('users.manage') then
    raise exception 'PERMISO' using hint = 'No tienes permiso para administrar usuarios.';
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
  -- Debe quedar al menos un administrador activo.
  if not p_active and exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = p_user_id and r.key = 'admin')
     and not exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id join public.profiles p on p.id = ur.user_id
                     where r.key = 'admin' and p.active and ur.user_id <> p_user_id) then
    raise exception 'ADMIN' using hint = 'Es el único administrador activo.';
  end if;

  update public.profiles
  set active = p_active,
      deactivated_at = case when p_active then null else now() end,
      deactivated_by = case when p_active then null else auth.uid() end,
      deactivation_reason = case when p_active then null else trim(p_reason) end,
      updated_at = now()
  where id = p_user_id;

  -- Auth: bloquea el ingreso y cierra las sesiones abiertas (o lo desbloquea).
  update auth.users set banned_until = case when p_active then null else '2999-12-31 00:00:00+00'::timestamptz end where id = p_user_id;
  if not p_active then
    delete from auth.sessions where user_id = p_user_id;
  end if;

  insert into public.user_status_events (user_id, active, reason) values (p_user_id, p_active, trim(coalesce(p_reason, '')));
end;
$$;

/** Datos de Auth que el panel muestra en la ficha (último ingreso, métodos, confirmación). */
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
  where u.id = p_user_id and public.has_permission('users.manage');
$$;

revoke execute on function public.set_user_active(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_user_auth(uuid) from public, anon;
grant execute on function public.set_user_active(uuid, boolean, text) to authenticated;
grant execute on function public.admin_user_auth(uuid) to authenticated;

-- Domiciliarios inactivos no reciben canastas.
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
    if not exists (select 1 from public.profiles where id = p_courier_id and active) then
      raise exception 'DOMICILIARIO' using hint = 'Ese domiciliario está inactivo.';
    end if;
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
  update public.route_stops set verified_at = null where route_id = rt.id;
  return rt.packing_started_at is not null;
end;
$$;
