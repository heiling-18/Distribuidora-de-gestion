-- =====================================================================
-- DYM'S — Dejar en cero las ventas y la caja (inventario intacto)
-- =====================================================================
-- Ejecutar a mano en Supabase → SQL Editor. NO se puede deshacer:
-- antes, descarga una copia de cada tabla (Table Editor → Export → CSV).
--
-- Borra:   ventas, caja, cierres_caja, gastos
-- NO toca: productos (inventario y existencias), clientes, usuarios
--
-- Sin CASCADE a propósito: si alguna otra tabla dependiera de estas,
-- Postgres se detiene con un error en lugar de borrar más de la cuenta.
-- Las existencias de productos quedan como están ahora (no se devuelven
-- las unidades de las ventas borradas).
-- =====================================================================

begin;

truncate table public.ventas, public.cierres_caja, public.caja, public.gastos restart identity;

commit;

-- Opcional: si también quieres borrar los clientes, quita los dos guiones
-- de la línea siguiente y ejecútala aparte.
-- truncate table public.clientes restart identity;
