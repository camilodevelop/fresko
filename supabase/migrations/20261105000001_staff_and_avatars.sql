-- FRESKO · Personal vs. clientes y fotos de perfil.

-- ---------------------------------------------------------------------------
-- Un usuario es "personal" si alguno de sus roles tiene admin.access.
-- El personal no lleva el rol Cliente; quien se queda sin roles vuelve a Cliente.
-- ---------------------------------------------------------------------------

create or replace function public.is_staff_role(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.role_permissions
    where role_id = rid and permission_key = 'admin.access'
  );
$$;

create or replace function public.sync_client_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_id uuid := (select id from public.roles where key = 'cliente');
begin
  if tg_op = 'INSERT' and public.is_staff_role(new.role_id) then
    delete from public.user_roles where user_id = new.user_id and role_id = client_id;
  elsif tg_op = 'DELETE'
    and exists (select 1 from public.profiles where id = old.user_id)
    and not exists (select 1 from public.user_roles where user_id = old.user_id) then
    insert into public.user_roles (user_id, role_id) values (old.user_id, client_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger sync_client_role
after insert or delete on public.user_roles
for each row execute function public.sync_client_role();

-- Personal existente: quitarle el rol Cliente.
delete from public.user_roles ur
using public.roles r
where ur.role_id = r.id and r.key = 'cliente'
  and exists (
    select 1 from public.user_roles s
    where s.user_id = ur.user_id and public.is_staff_role(s.role_id)
  );

-- ---------------------------------------------------------------------------
-- Fotos de perfil: bucket público, cada usuario escribe solo en su carpeta.
-- Ruta: avatars/<user_id>/<archivo>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
