-- FRESKO · Un solo armador: "Arma tu bowl". Se desactiva "Arma tu ensalada"
-- (no se borra: se puede reactivar desde Catálogo → Productos).
update public.products
set active = false, featured = false, updated_at = now()
where slug = 'arma-tu-ensalada';
