-- Fotos iniciales de productos y categorías (Unsplash, ver public/images/productos/CREDITOS.md).
-- Solo se asignan donde todavía no hay imagen, para no pisar fotos subidas desde el panel.
update public.products p set image_url = '/images/productos/' || p.slug || '.webp'
where p.image_url is null
  and p.slug in ('fresko-clasico', 'fresko-verde', 'fresko-tropical', 'fresko-mediterraneo', 'fresko-jamon',
                 'fresko-pollo', 'fresko-salmon', 'fresko-camaron', 'arma-tu-bowl', 'arma-tu-ensalada');

update public.product_categories c set image_url = '/images/productos/categoria-' || c.slug || '.webp'
where (c.image_url is null or c.image_url = '/images/bowl.png') and c.slug in ('ensaladas', 'bowls');
