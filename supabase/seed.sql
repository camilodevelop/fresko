-- Usuarios de prueba (solo desarrollo local). Contraseña de todos: fresko123
do $$
declare
  u record;
  uid uuid;
begin
  for u in
    select * from (values
      ('admin@fresko.test',        'Admin FRESKO',       'admin'),
      ('cocina@fresko.test',       'Cocinero FRESKO',    'cocinero'),
      ('domicilios@fresko.test',   'Domiciliario FRESKO','domiciliario'),
      ('cliente@fresko.test',      'Cliente Demo',       null)
    ) t(email, full_name, role_key)
  loop
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      u.email, extensions.crypt('fresko123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
    if u.role_key is not null then
      insert into public.user_roles (user_id, role_id)
      select uid, id from public.roles where key = u.role_key;
    end if;
  end loop;
end $$;

-- Notificaciones de ejemplo para el personal (además de la bienvenida automática).
insert into public.notifications (user_id, kind, title, body, href, created_at)
select p.id, n.kind, n.title, n.body, n.href, now() - n.ago
from public.profiles p
join (values
  ('admin@fresko.test', 'alert',   'Stock bajo: aguacate',        'Quedan 12 unidades, por debajo del mínimo (20).', '/admin',            interval '25 minutes'),
  ('admin@fresko.test', 'info',    'Nuevo cliente registrado',    'Cliente Demo creó su cuenta.',                     '/admin/usuarios',   interval '3 hours'),
  ('admin@fresko.test', 'warning', 'Zona sin franjas el domingo', 'Revisa la configuración de Kennedy.',              '/admin/zonas',      interval '1 day'),
  ('cocina@fresko.test', 'info',   'Producción de mañana lista',  '18 bowls y 9 ensaladas para el jueves.',           '/admin',            interval '40 minutes'),
  ('cliente@fresko.test', 'success', 'Tu pedido va en camino',    'Llega hoy entre 11:00 y 13:00.',                   '/cuenta/entregas',  interval '10 minutes')
) as n(email, kind, title, body, href, ago) on n.email = p.email;
