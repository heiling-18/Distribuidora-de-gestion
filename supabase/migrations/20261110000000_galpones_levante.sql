-- =====================================================================
-- DYM'S — Galpones de levante (pollitas, sin huevos) y precio del alimento
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261105000000_galpones.sql.
--
-- • tipo: 'postura' (gallinas que ponen, como hasta ahora) o 'levante'
--   (pollitas desde chiquitas: solo alimento y aves muertas, sin huevos).
-- • precio_bulto: lo que vale el bulto de 40 kg de purina de ese galpón.
-- • Cada registro diario guarda el precio del bulto de ese día, para que
--   el gasto de días pasados no cambie si después sube el precio.
-- Los galpones que ya existen quedan como 'postura' y con precio 0.
-- =====================================================================

alter table public.gal_galpones
  add column if not exists tipo text not null default 'postura',
  add column if not exists precio_bulto numeric(12,2) not null default 0;

alter table public.gal_galpones drop constraint if exists gal_galpones_tipo_check;
alter table public.gal_galpones
  add constraint gal_galpones_tipo_check check (tipo in ('postura', 'levante'));

alter table public.gal_galpones drop constraint if exists gal_galpones_precio_bulto_check;
alter table public.gal_galpones
  add constraint gal_galpones_precio_bulto_check check (precio_bulto >= 0);

alter table public.gal_registros
  add column if not exists precio_bulto numeric(12,2);

alter table public.gal_registros drop constraint if exists gal_registros_precio_bulto_check;
alter table public.gal_registros
  add constraint gal_registros_precio_bulto_check check (precio_bulto is null or precio_bulto >= 0);
