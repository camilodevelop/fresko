-- FRESKO · Notificaciones por usuario (alertas de inventario, entregas, pedidos…).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- info | success | warning | alert: define el ícono y color
  kind text not null default 'info' check (kind in ('info', 'success', 'warning', 'alert')),
  title text not null,
  body text not null default '',
  -- Ruta interna a la que lleva la notificación (opcional)
  href text check (href is null or href like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications read own" on public.notifications for select
  using (user_id = auth.uid());

-- Solo se puede marcar como leída (las crea el sistema con permisos de servicio).
create policy "notifications update own" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications delete own" on public.notifications for delete
  using (user_id = auth.uid());

-- Evita que el usuario cambie algo distinto de read_at.
create or replace function public.notifications_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' and (
    new.user_id <> old.user_id or new.title <> old.title or new.body <> old.body
    or new.kind <> old.kind or new.href is distinct from old.href
  ) then
    raise exception 'Solo se puede marcar la notificación como leída';
  end if;
  return new;
end;
$$;

create trigger notifications_guard
before update on public.notifications
for each row execute function public.notifications_guard();

-- Bienvenida para cada usuario nuevo.
create or replace function public.welcome_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, kind, title, body, href)
  values (new.id, 'success', '¡Bienvenido a FRESKO!', 'Completa tu perfil para coordinar tus entregas.', '/cuenta/perfil');
  return new;
end;
$$;

create trigger on_profile_created_welcome
after insert on public.profiles
for each row execute function public.welcome_notification();

-- Tiempo real: el navegador recibe las nuevas al instante.
alter publication supabase_realtime add table public.notifications;
