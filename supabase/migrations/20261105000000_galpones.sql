-- =====================================================================
-- DYM'S — Sección GALPONES (producción de huevos)
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor.
--
-- Datos 100 % separados de la Distribuidora de purina:
--   • Tablas propias con prefijo gal_ (no toca productos, ventas, gastos,
--     caja ni clientes).
--   • Nuevo rol 'galponero': solo ve Galpones. El 'vendedor' solo ve la
--     Distribuidora. El 'admin' ve las dos.
--
-- Para dar acceso a quien trabaja en los galpones (ej. Santiago):
--   1. Authentication → Users → crear su correo y contraseña.
--   2. insert into public.usuarios (email, nombre, rol)
--      values ('santiago@dyms.com', 'Santiago', 'galponero');
-- =====================================================================

-- Si existía una restricción que solo aceptaba admin/vendedor, se quita
alter table public.usuarios drop constraint if exists usuarios_rol_check;

-- ¿El usuario actual puede entrar a Galpones? (admin o galponero)
create or replace function public.es_galpones()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() in ('admin', 'galponero'), false);
$$;

revoke all on function public.es_galpones() from public, anon;
grant execute on function public.es_galpones() to authenticated;

-- Fecha de hoy en Colombia (el servidor de Supabase está en UTC)
create or replace function public.hoy_colombia()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Bogota')::date;
$$;

-- ---------------------------------------------------------------------
-- Galpones
-- ---------------------------------------------------------------------
create table if not exists public.gal_galpones (
  id                   bigint generated always as identity primary key,
  nombre               text    not null,
  aves_iniciales       integer not null check (aves_iniciales >= 0),
  fecha_llegada        date    not null default public.hoy_colombia(),
  edad_semanas_llegada integer not null default 0 check (edad_semanas_llegada >= 0),
  -- Alimento por ave al día. Gallinas en postura ≈ 115 g; pollitas mucho menos.
  gramos_ave_dia       numeric(6,1) not null default 115 check (gramos_ave_dia > 0),
  activo               boolean not null default true,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Registro diario por galpón (uno por día)
-- ---------------------------------------------------------------------
create table if not exists public.gal_registros (
  id             bigint generated always as identity primary key,
  galpon_id      bigint  not null references public.gal_galpones(id) on delete restrict,
  fecha          date    not null default public.hoy_colombia(),
  huevos         integer not null default 0 check (huevos >= 0),
  muertas        integer not null default 0 check (muertas >= 0),
  alimento_kg    numeric(8,2) not null default 0 check (alimento_kg >= 0),
  notas          text,
  registrado_por text,
  created_at     timestamptz not null default now(),
  unique (galpon_id, fecha)
);

create index if not exists gal_registros_fecha_idx on public.gal_registros (fecha desc);

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- ---------------------------------------------------------------------
alter table public.gal_galpones  enable row level security;
alter table public.gal_registros enable row level security;
revoke all on public.gal_galpones  from anon;
revoke all on public.gal_registros from anon;

drop policy if exists gal_galpones_select on public.gal_galpones;
drop policy if exists gal_galpones_insert on public.gal_galpones;
drop policy if exists gal_galpones_update on public.gal_galpones;
drop policy if exists gal_registros_select on public.gal_registros;
drop policy if exists gal_registros_insert on public.gal_registros;
drop policy if exists gal_registros_update on public.gal_registros;
drop policy if exists gal_registros_delete on public.gal_registros;

-- Galpones: admin y galponero los ven; solo el admin los crea o cambia.
create policy gal_galpones_select on public.gal_galpones
  for select to authenticated using (public.es_galpones());
create policy gal_galpones_insert on public.gal_galpones
  for insert to authenticated with check (public.es_admin());
create policy gal_galpones_update on public.gal_galpones
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Registros: el galponero anota y corrige solo el día de hoy;
-- el admin puede corregir o borrar cualquier día.
create policy gal_registros_select on public.gal_registros
  for select to authenticated using (public.es_galpones());
create policy gal_registros_insert on public.gal_registros
  for insert to authenticated
  with check (public.es_admin() or (public.es_galpones() and fecha = public.hoy_colombia()));
create policy gal_registros_update on public.gal_registros
  for update to authenticated
  using (public.es_admin() or (public.es_galpones() and fecha = public.hoy_colombia()))
  with check (public.es_admin() or (public.es_galpones() and fecha = public.hoy_colombia()));
create policy gal_registros_delete on public.gal_registros
  for delete to authenticated using (public.es_admin());
