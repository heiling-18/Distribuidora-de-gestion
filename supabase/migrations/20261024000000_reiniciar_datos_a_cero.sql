-- =====================================================================
-- DYM'S — Reinicio de datos a cero y políticas de borrado para Admin
-- =====================================================================

-- 1. Políticas para que el administrador pueda eliminar registros de ventas y caja
create policy if not exists ventas_delete on public.ventas
  for delete to authenticated using (public.es_admin());

create policy if not exists caja_delete on public.caja
  for delete to authenticated using (public.es_admin());

create policy if not exists cierres_delete on public.cierres_caja
  for delete to authenticated using (public.es_admin());

-- 2. Vaciar tablas de prueba para dejar todo en 0
truncate table public.ventas restart identity cascade;
truncate table public.caja restart identity cascade;
truncate table public.cierres_caja restart identity cascade;
truncate table public.gastos restart identity cascade;
truncate table public.clientes restart identity cascade;
truncate table public.productos restart identity cascade;
