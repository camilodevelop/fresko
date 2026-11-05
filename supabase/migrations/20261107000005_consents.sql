-- FRESKO · Aceptación de términos y autorización de tratamiento de datos (Ley 1581 de 2012).
-- Cada aceptación queda como prueba: documento, versión, fecha, método, IP y navegador.
-- No se edita ni se borra: un cambio (p. ej. revocar comunicaciones) es un registro nuevo.

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- terminos: Términos y condiciones · privacidad: Política de tratamiento de datos
  -- comunicaciones: autorización opcional para mensajes comerciales
  document text not null check (document in ('terminos', 'privacidad', 'comunicaciones')),
  version text not null,
  accepted boolean not null default true,
  method text not null check (method in ('registro', 'aceptacion', 'perfil')),
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index user_consents_user_idx on public.user_consents (user_id, document, created_at desc);

alter table public.user_consents enable row level security;
create policy "consents read" on public.user_consents for select
  using (user_id = auth.uid() or public.has_permission('users.manage'));
create policy "consents insert own" on public.user_consents for insert
  with check (user_id = auth.uid());
-- Sin update ni delete: es el historial de autorizaciones.

alter table public.profiles add column marketing_opt_in boolean not null default false;

-- Mantiene profiles.marketing_opt_in con la última decisión del usuario.
create or replace function public.sync_marketing_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.document = 'comunicaciones' then
    update public.profiles set marketing_opt_in = new.accepted, updated_at = now() where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger sync_marketing_consent
after insert on public.user_consents
for each row execute function public.sync_marketing_consent();

-- Registro con correo: las aceptaciones llegan en los metadatos del alta.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  meta_phone text := meta->>'phone';
  ua text := left(meta->>'user_agent', 300);
begin
  insert into public.profiles (id, full_name, email, avatar_url, phone)
  values (
    new.id,
    coalesce(meta->>'full_name', meta->>'name', ''),
    new.email,
    meta->>'avatar_url',
    case when meta_phone ~ '^\+[1-9]\d{7,14}$' then meta_phone else null end
  );
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r where r.key = 'cliente';

  if coalesce(meta->>'terms_version', '') <> '' and coalesce(meta->>'privacy_version', '') <> '' then
    insert into public.user_consents (user_id, document, version, accepted, method, user_agent) values
      (new.id, 'terminos', meta->>'terms_version', true, 'registro', ua),
      (new.id, 'privacidad', meta->>'privacy_version', true, 'registro', ua),
      -- Comunicaciones comerciales: refleja lo que el usuario marcó (puede ser "no").
      (new.id, 'comunicaciones', meta->>'privacy_version', coalesce((meta->>'marketing')::boolean, false), 'registro', ua);
  end if;
  return new;
end;
$$;
