-- =====================================================================
-- DYM'S — Huevos: el vendedor solo vende
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261112000000_huevos.sql.
--
-- Cargar huevos al inventario (clase 'entrada') queda solo para el
-- administrador. El vendedor sigue anotando, solo el día de hoy, las
-- ventas y los huevos rotos. No cambia ningún dato.
-- =====================================================================

drop policy if exists hue_mov_insert on public.hue_movimientos;
create policy hue_mov_insert on public.hue_movimientos
  for insert to authenticated
  with check (
    public.es_admin()
    or (public.es_huevos() and fecha = public.hoy_colombia() and clase <> 'entrada')
  );
