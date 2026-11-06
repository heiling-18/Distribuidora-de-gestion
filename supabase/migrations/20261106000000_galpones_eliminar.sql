-- =====================================================================
-- DYM'S — Galpones: permitir eliminar un galpón (solo administrador)
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261105000000_galpones.sql.
--
-- Solo se puede eliminar un galpón SIN registros diarios: la llave
-- gal_registros.galpon_id → gal_galpones.id es "on delete restrict",
-- así que la base de datos rechaza borrar uno que tenga historial.
-- Para esos, se desactiva (columna activo) y el historial se conserva.
-- =====================================================================

drop policy if exists gal_galpones_delete on public.gal_galpones;

create policy gal_galpones_delete on public.gal_galpones
  for delete to authenticated using (public.es_admin());
