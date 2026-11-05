-- FRESKO · Información nutricional y alérgenos.
-- Cada ingrediente tiene su nutrición (por 100 g/ml, o por unidad) y sus alérgenos.
-- La nutrición de productos y opciones del armador se calcula sola desde la receta;
-- un producto puede usar valores manuales (nutrition_mode = 'manual').

alter table public.ingredients
  add column kcal numeric(7, 2) not null default 0 check (kcal >= 0),
  add column protein numeric(6, 2) not null default 0 check (protein >= 0),
  add column carbs numeric(6, 2) not null default 0 check (carbs >= 0),
  add column fat numeric(6, 2) not null default 0 check (fat >= 0),
  add column fiber numeric(6, 2) not null default 0 check (fiber >= 0),
  add column allergens text[] not null default '{}'
    check (allergens <@ array['gluten', 'lacteos', 'huevo', 'pescado', 'mariscos', 'frutos_secos', 'mani', 'soya', 'sesamo']);

alter table public.products
  add column nutrition_mode text not null default 'auto' check (nutrition_mode in ('auto', 'manual')),
  -- Calculada desde la receta: { kcal, protein, carbs, fat, fiber, weight }
  add column nutrition jsonb not null default '{}'::jsonb,
  -- Valores escritos a mano (se usan si nutrition_mode = 'manual')
  add column nutrition_manual jsonb not null default '{}'::jsonb,
  add column allergens text[] not null default '{}',
  add column dietary_tags text[] not null default '{}'
    check (dietary_tags <@ array['vegetariano', 'vegano', 'sin_gluten', 'sin_lacteos', 'alto_proteina', 'bajo_carbohidratos', 'keto', 'bajo_calorias']);

alter table public.builder_options
  add column nutrition jsonb not null default '{}'::jsonb,
  add column allergens text[] not null default '{}';

-- Recalcula la nutrición de todos los productos y opciones del armador (catálogo pequeño).
create or replace function public.recompute_nutrition()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set nutrition = coalesce(calc.n, '{}'::jsonb),
      allergens = coalesce(calc.a, '{}')
  from (
    select pr.id,
      (select jsonb_build_object(
          'kcal', round(sum(i.kcal * f.factor)),
          'protein', round(sum(i.protein * f.factor), 1),
          'carbs', round(sum(i.carbs * f.factor), 1),
          'fat', round(sum(i.fat * f.factor), 1),
          'fiber', round(sum(i.fiber * f.factor), 1),
          'weight', round(sum(case when i.unit in ('g', 'ml') then ri.quantity else 0 end))
        )
        from public.recipe_items ri
        join public.ingredients i on i.id = ri.ingredient_id
        cross join lateral (select case when i.unit = 'un' then ri.quantity else ri.quantity / 100.0 end as factor) f
        where ri.product_id = pr.id
        having count(*) > 0) as n,
      (select array_agg(distinct al order by al)
        from public.recipe_items ri
        join public.ingredients i on i.id = ri.ingredient_id
        cross join unnest(i.allergens) al
        where ri.product_id = pr.id) as a
    from public.products pr
  ) calc
  where p.id = calc.id;

  update public.builder_options b
  set nutrition = case when i.id is null then '{}'::jsonb else jsonb_build_object(
        'kcal', round(i.kcal * f.factor),
        'protein', round(i.protein * f.factor, 1),
        'carbs', round(i.carbs * f.factor, 1),
        'fat', round(i.fat * f.factor, 1),
        'fiber', round(i.fiber * f.factor, 1),
        'weight', round(case when i.unit in ('g', 'ml') then b.quantity else 0 end)
      ) end,
      allergens = coalesce(i.allergens, '{}')
  from public.builder_options b2
  left join public.ingredients i on i.id = b2.ingredient_id
  cross join lateral (select case when i.unit = 'un' then b2.quantity else b2.quantity / 100.0 end as factor) f
  where b.id = b2.id;
end;
$$;

create or replace function public.trigger_recompute_nutrition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_nutrition();
  return null;
end;
$$;

create trigger recompute_nutrition_recipes
after insert or update or delete on public.recipe_items
for each statement execute function public.trigger_recompute_nutrition();

create trigger recompute_nutrition_ingredients
after update of kcal, protein, carbs, fat, fiber, allergens, unit on public.ingredients
for each statement execute function public.trigger_recompute_nutrition();

create trigger recompute_nutrition_builder
after insert or update of ingredient_id, quantity on public.builder_options
for each statement execute function public.trigger_recompute_nutrition();

-- Valores de referencia aproximados (por 100 g o 100 ml; el huevo y el empaque por unidad).
update public.ingredients i set kcal = v.kcal, protein = v.p, carbs = v.c, fat = v.f, fiber = v.fi, allergens = v.al
from (values
  ('Lechuga crespa',     15,  1.4, 2.9, 0.2, 1.3, '{}'::text[]),
  ('Espinaca baby',      23,  2.9, 3.6, 0.4, 2.2, '{}'),
  ('Mix verde FRESKO',   20,  1.8, 3.5, 0.3, 1.8, '{}'),
  ('Arroz cocido',      130,  2.7, 28,  0.3, 0.4, '{}'),
  ('Tomate',             18,  0.9, 3.9, 0.2, 1.2, '{}'),
  ('Pepino',             15,  0.7, 3.6, 0.1, 0.5, '{}'),
  ('Zanahoria',          41,  0.9, 9.6, 0.2, 2.8, '{}'),
  ('Brócoli',            34,  2.8, 6.6, 0.4, 2.6, '{}'),
  ('Maíz tierno',        86,  3.3, 19,  1.4, 2.0, '{}'),
  ('Repollo morado',     31,  1.4, 7.4, 0.2, 2.1, '{}'),
  ('Aceitunas',         115,  0.8, 6.3, 10.7, 3.2, '{}'),
  ('Edamame',           121, 11.9, 8.9, 5.2, 5.2, '{soya}'),
  ('Aguacate',          160,  2.0, 8.5, 14.7, 6.7, '{}'),
  ('Mango',              60,  0.8, 15,  0.4, 1.6, '{}'),
  ('Coco rallado',      660,  6.9, 24,  64,  16,  '{}'),
  ('Pechuga de pollo',  165,  31,  0,   3.6, 0,   '{}'),
  ('Salmón',            208,  20,  0,   13,  0,   '{pescado}'),
  ('Camarón',            99,  24,  0.2, 0.3, 0,   '{mariscos}'),
  ('Atún',              132,  28,  0,   1.3, 0,   '{pescado}'),
  ('Tofu',               76,  8,   1.9, 4.8, 0.3, '{soya}'),
  ('Huevo',              72,  6.3, 0.4, 4.8, 0,   '{huevo}'),
  ('Jamón serrano',     241,  31,  0,   13,  0,   '{}'),
  ('Hummus',            166,  7.9, 14.3, 9.6, 6,  '{sesamo}'),
  ('Queso fresco',      264,  18,  3,   20,  0,   '{lacteos}'),
  ('Queso feta',        264,  14,  4,   21,  0,   '{lacteos}'),
  ('Mix de semillas',   560,  22,  20,  46,  10,  '{sesamo}'),
  ('Nueces',            654,  15,  14,  65,  6.7, '{frutos_secos}'),
  ('Croutons',          407,  12,  74,  7,   5,   '{gluten}'),
  ('Aderezo de limón',  180,  0.2, 4,   18,  0,   '{}'),
  ('Vinagreta',         230,  0.2, 5,   23,  0,   '{}'),
  ('Salsa ranch',       320,  1,   6,   33,  0,   '{lacteos,huevo}'),
  ('Salsa de soya',      53,  8,   4.9, 0.6, 0.8, '{soya,gluten}'),
  ('Aderezo de yogurt',  90,  4,   6,   5,   0,   '{lacteos}'),
  ('Empaque bowl',        0,  0,   0,   0,   0,   '{}')
) as v(name, kcal, p, c, f, fi, al)
where i.name = v.name;

-- Etiquetas de dieta iniciales (editables en cada producto).
update public.products set dietary_tags = '{vegetariano,vegano,sin_gluten,sin_lacteos,bajo_calorias}' where slug in ('fresko-clasico', 'fresko-verde', 'fresko-tropical');
update public.products set dietary_tags = '{vegetariano}' where slug = 'fresko-mediterraneo';
update public.products set dietary_tags = '{sin_gluten,alto_proteina}' where slug = 'fresko-pollo';
update public.products set dietary_tags = '{alto_proteina}' where slug in ('fresko-salmon', 'fresko-camaron');
update public.products set dietary_tags = '{sin_gluten,bajo_carbohidratos}' where slug = 'fresko-jamon';

select public.recompute_nutrition();
