-- FRESKO · Celular del cliente en formato internacional (E.164, p. ej. +573001234567).

-- Números antiguos de 10 dígitos colombianos → +57…
update public.profiles
set phone = '+57' || regexp_replace(phone, '\D', '', 'g')
where phone is not null and phone !~ '^\+' and regexp_replace(phone, '\D', '', 'g') ~ '^3\d{9}$';

update public.profiles set phone = null where phone is not null and phone !~ '^\+[1-9]\d{7,14}$';

alter table public.profiles
  add constraint profiles_phone_e164 check (phone is null or phone ~ '^\+[1-9]\d{7,14}$');

-- El registro guarda también el celular que el cliente escribe.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_phone text := new.raw_user_meta_data->>'phone';
begin
  insert into public.profiles (id, full_name, email, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    case when meta_phone ~ '^\+[1-9]\d{7,14}$' then meta_phone else null end
  );
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r where r.key = 'cliente';
  return new;
end;
$$;
