-- FRESKO · Hora de corte a las 8:00 a. m. (sigue siendo editable por zona en Panel → Cobertura).
alter table public.zones alter column cutoff_time set default '08:00';
update public.zones set cutoff_time = '08:00', updated_at = now() where cutoff_time = '07:00';

-- Textos de beneficios de los planes que mencionaban la hora anterior.
update public.subscription_plans
set benefits = array(select replace(b, '7:00 a. m.', '8:00 a. m.') from unnest(benefits) as b),
    updated_at = now()
where exists (select 1 from unnest(benefits) b where b like '%7:00 a. m.%');
