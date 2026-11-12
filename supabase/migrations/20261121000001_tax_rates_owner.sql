-- Las tasas de impuesto son una regla general del negocio (todas las cocinas):
-- solo las cambia quien administra las cuentas de todas las cocinas (superadministrador).
drop policy "taxes write" on public.tax_rates;
create policy "taxes write" on public.tax_rates for all to authenticated
  using (public.has_permission('finance.manage') and public.has_permission('kitchens.all'))
  with check (public.has_permission('finance.manage') and public.has_permission('kitchens.all'));
