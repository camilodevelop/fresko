-- Rendimiento: las reglas de acceso (RLS) preguntan "¿tiene este permiso?" y "¿puede ver esta cocina?"
-- en cada fila. Antes cada pregunta hacía una consulta con joins; ahora los permisos y las cocinas del
-- usuario se calculan una vez por transacción (cada request de la API es una transacción) y se reutilizan.

-- Permisos del usuario actual (en caché dentro de la transacción; se recalcula si cambia el usuario).
create or replace function public.my_perm_list()
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cached text := current_setting('fresko.perm_cache', true);
  result text[];
begin
  if uid is null then return '{}'; end if;
  if cached is not null and cached <> '' and split_part(cached, '|', 1) = uid::text then
    return split_part(cached, '|', 2)::text[];
  end if;
  select coalesce(array_agg(distinct rp.permission_key), '{}') into result
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.profiles p on p.id = ur.user_id and p.active
  where ur.user_id = uid;
  perform set_config('fresko.perm_cache', uid::text || '|' || result::text, true);
  return result;
end;
$$;

-- Cocinas asignadas al usuario actual (en caché igual que los permisos).
create or replace function public.my_kitchen_list()
returns uuid[] language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cached text := current_setting('fresko.kitchen_cache', true);
  result uuid[];
begin
  if uid is null then return '{}'; end if;
  if cached is not null and cached <> '' and split_part(cached, '|', 1) = uid::text then
    return split_part(cached, '|', 2)::uuid[];
  end if;
  select coalesce(array_agg(uk.kitchen_id), '{}') into result
  from public.user_kitchens uk
  join public.profiles p on p.id = uk.user_id and p.active
  where uk.user_id = uid;
  perform set_config('fresko.kitchen_cache', uid::text || '|' || result::text, true);
  return result;
end;
$$;

create or replace function public.has_permission(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  -- coalesce: un permiso nulo o desconocido es siempre "no" (nunca nulo).
  select coalesce(perm = any (public.my_perm_list()), false);
$$;

create or replace function public.can_kitchen(k uuid)
returns boolean language sql stable security definer set search_path = public as $$
  -- coalesce: una cocina nula es siempre "no" (un nulo dentro de un "not" dejaría pasar).
  select coalesce('kitchens.all' = any (public.my_perm_list()) or k = any (public.my_kitchen_list()), false);
$$;

-- Cambios de roles o cocinas dentro de la misma transacción: se borra la caché.
create or replace function public.clear_permission_cache()
returns trigger language plpgsql as $$
begin
  perform set_config('fresko.perm_cache', '', true);
  perform set_config('fresko.kitchen_cache', '', true);
  return null;
end;
$$;
create trigger zz_clear_perm_cache_roles after insert or update or delete on public.user_roles
for each statement execute function public.clear_permission_cache();
create trigger zz_clear_perm_cache_role_perms after insert or update or delete on public.role_permissions
for each statement execute function public.clear_permission_cache();
create trigger zz_clear_perm_cache_kitchens after insert or update or delete on public.user_kitchens
for each statement execute function public.clear_permission_cache();
create trigger zz_clear_perm_cache_profiles after update of active on public.profiles
for each statement execute function public.clear_permission_cache();

grant execute on function public.my_perm_list() to authenticated, anon;
grant execute on function public.my_kitchen_list() to authenticated, anon;

-- Índices para las búsquedas más frecuentes del panel.
create index if not exists orders_delivery_date on public.orders (delivery_date);
create index if not exists orders_kitchen_date on public.orders (kitchen_id, delivery_date);
create index if not exists orders_paid_at on public.orders (paid_at) where paid_at is not null;
create index if not exists order_items_order on public.order_items (order_id);
create index if not exists order_events_order on public.order_events (order_id);
create index if not exists payments_order on public.payments (order_id);
create index if not exists prep_batch_items_item on public.prep_batch_items (order_item_id);
create index if not exists prep_batches_kitchen_date on public.prep_batches (kitchen_id, delivery_date);
create index if not exists prep_batches_finished on public.prep_batches (finished_at) where status = 'listo';
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists user_roles_user on public.user_roles (user_id);
create index if not exists user_kitchens_user on public.user_kitchens (user_id);
create index if not exists inventory_movements_batch on public.inventory_movements (batch_id) where batch_id is not null;
create index if not exists inventory_movements_created on public.inventory_movements (created_at);
create index if not exists route_stops_order on public.route_stops (order_id);
create index if not exists order_incidents_order on public.order_incidents (order_id);
create index if not exists dish_movements_point on public.dish_movements (point_id, location) where point_id is not null;
create index if not exists dish_movements_order_item on public.dish_movements (order_item_id) where order_item_id is not null;
