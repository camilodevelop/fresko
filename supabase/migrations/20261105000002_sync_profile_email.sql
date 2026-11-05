-- Mantiene profiles.email igual al correo confirmado en auth.users.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email, updated_at = now() where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_profile_email();
