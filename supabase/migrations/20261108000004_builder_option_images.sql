-- La tabla de ingredientes es privada (tiene costos). El armador público necesita solo la foto,
-- así que se copia a builder_options y se mantiene sincronizada.
alter table public.builder_options add column image_url text;

create or replace function public.sync_builder_option_images()
returns void
language sql
security definer
set search_path = public
as $$
  update public.builder_options b
  set image_url = i.image_url
  from public.builder_options b2
  left join public.ingredients i on i.id = b2.ingredient_id
  where b.id = b2.id and b.image_url is distinct from i.image_url;
$$;

create or replace function public.trigger_sync_builder_option_images()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_builder_option_images();
  return null;
end;
$$;

create trigger sync_builder_images_ingredients
after update of image_url on public.ingredients
for each statement execute function public.trigger_sync_builder_option_images();

create trigger sync_builder_images_options
after insert or update of ingredient_id on public.builder_options
for each statement execute function public.trigger_sync_builder_option_images();

select public.sync_builder_option_images();
