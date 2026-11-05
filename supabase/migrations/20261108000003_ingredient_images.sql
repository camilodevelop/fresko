-- FRESKO · Foto por ingrediente. El armador arma el bowl con estas fotos (ya no usa colores).
alter table public.ingredients add column image_url text;

-- Fotos iniciales (Unsplash, ver public/images/ingredientes/CREDITOS.md).
update public.ingredients i set image_url = '/images/ingredientes/' || v.file || '.webp'
from (values
  ('Arroz cocido', 'arroz-cocido'), ('Espinaca baby', 'espinaca-baby'), ('Lechuga crespa', 'lechuga-crespa'),
  ('Mix verde FRESKO', 'mix-verde'), ('Aceitunas', 'aceitunas'), ('Brócoli', 'brocoli'), ('Edamame', 'edamame'),
  ('Maíz tierno', 'maiz-tierno'), ('Pepino', 'pepino'), ('Tomate', 'tomate'), ('Zanahoria', 'zanahoria'),
  ('Aguacate', 'aguacate'), ('Coco rallado', 'coco-rallado'), ('Mango', 'mango'), ('Atún', 'atun'),
  ('Camarón', 'camaron'), ('Huevo', 'huevo'), ('Hummus', 'hummus'), ('Jamón serrano', 'jamon-serrano'),
  ('Pechuga de pollo', 'pollo'), ('Salmón', 'salmon'), ('Tofu', 'tofu'), ('Queso feta', 'queso-feta'),
  ('Queso fresco', 'queso-fresco'), ('Croutons', 'croutons'), ('Mix de semillas', 'semillas'), ('Nueces', 'nueces'),
  ('Aderezo de limón', 'aderezo-limon'), ('Aderezo de yogurt', 'aderezo-yogurt')
) as v(name, file)
where i.name = v.name and i.image_url is null;

-- El color de las capas del armador ya no se usa.
update public.builder_options set layer = layer - 'color';
