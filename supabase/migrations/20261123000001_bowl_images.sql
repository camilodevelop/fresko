-- Arma tu bowl realista: cada opción del armador tiene su imagen para el bowl
-- (ingrediente recortado en 3/4 o la salsa en zigzag), aparte de la foto del botón.
alter table public.builder_options add column bowl_image text;

-- Nuevas proteínas del armador (si aún no existen): nutrición y alérgenos sacados del ingrediente
-- (valores por 100 g × gramos de la porción).
insert into public.builder_options (step, name, emoji, ingredient_id, quantity, price, sort, nutrition, allergens, image_url)
select 'proteins', o.name, o.emoji, i.id, o.qty, o.price, o.sort,
  jsonb_build_object(
    'weight', o.qty,
    'kcal', round(coalesce(i.kcal, 0) * o.qty / 100, 1), 'protein', round(coalesce(i.protein, 0) * o.qty / 100, 1),
    'carbs', round(coalesce(i.carbs, 0) * o.qty / 100, 1), 'fat', round(coalesce(i.fat, 0) * o.qty / 100, 1),
    'fiber', round(coalesce(i.fiber, 0) * o.qty / 100, 1)),
  coalesce(i.allergens, '{}'), i.image_url
from (values ('Salmón', '🍣', 'Salmón', 80, 8000, 5), ('Camarones', '🍤', 'Camarón', 80, 6500, 6))
  as o(name, emoji, ingredient, qty, price, sort)
left join public.ingredients i on i.name = o.ingredient
on conflict (step, name) do nothing;

update public.builder_options b set bowl_image = '/images/bowl/' || m.file || '.webp'
from (values
  ('base', 'Lechuga', 'lechuga'), ('base', 'Espinaca', 'espinaca'), ('base', 'Mix FRESKO', 'mix'),
  ('vegetables', 'Tomate', 'tomate'), ('vegetables', 'Pepino', 'pepino'), ('vegetables', 'Zanahoria', 'zanahoria'),
  ('vegetables', 'Aguacate', 'aguacate'), ('vegetables', 'Maíz', 'maiz'), ('vegetables', 'Repollo', 'repollo'),
  ('proteins', 'Pollo', 'pollo'), ('proteins', 'Atún', 'atun'), ('proteins', 'Tofu', 'tofu'), ('proteins', 'Huevo', 'huevo'), ('proteins', 'Salmón', 'salmon'), ('proteins', 'Camarones', 'camarones'),
  ('toppings', 'Queso', 'queso'), ('toppings', 'Nueces', 'nueces'), ('toppings', 'Semillas', 'semillas'), ('toppings', 'Croutons', 'croutons'),
  ('sauce', 'Limón', 'salsa-limon'), ('sauce', 'Vinagreta', 'salsa-vinagreta'), ('sauce', 'Yogurt', 'salsa-yogurt')
) as m(step, name, file)
where b.step = m.step and b.name = m.name and b.bowl_image is null;

-- Las opciones sin foto de botón usan su imagen del bowl.
update public.builder_options set image_url = bowl_image where image_url is null and bowl_image is not null;
