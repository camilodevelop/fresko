-- QR de cada punto: página pública con los platos disponibles hoy en ese punto.

-- Código corto y difícil de adivinar para el enlace del QR (no se expone el id interno).
alter table public.sale_points
  add column public_code text not null unique default lower(substr(md5(gen_random_uuid()::text), 1, 8));

-- Lo que ve el cliente al escanear: el punto y cuántos platos vigentes hay de cada uno.
create or replace function public.public_point_menu(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when sp.id is null then null else jsonb_build_object(
    'name', sp.name,
    'address', sp.address,
    'schedule', sp.schedule,
    -- Vendiendo ahora: hay una carga recibida y sin cerrar.
    'selling', exists (select 1 from public.point_loads l where l.point_id = sp.id and l.status = 'en_venta'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('slug', p.slug, 'available', coalesce(st.qty, 0)) order by coalesce(st.qty, 0) = 0, p.sort, p.name)
      from public.products p
      left join (
        select ds.product_id, sum(ds.quantity)::integer as qty
        from public.dish_movements m
        join public.dish_lots ds_lot on ds_lot.id = m.lot_id
        cross join lateral (select ds_lot.product_id, m.quantity) ds
        where m.point_id = sp.id and m.location = 'punto' and ds_lot.expires_at > now()
        group by ds.product_id
      ) st on st.product_id = p.id
      where p.active and p.sold_at_points
    ), '[]'::jsonb)
  ) end
  from (select 1) one
  left join public.sale_points sp on sp.public_code = lower(trim(p_code)) and sp.active;
$$;
grant execute on function public.public_point_menu(text) to anon, authenticated;

notify pgrst, 'reload schema';
