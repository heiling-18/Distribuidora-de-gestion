-- =====================================================================
-- DYM'S — Sección HUEVOS (compra y venta de huevos por tamaño)
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261105000000_galpones.sql
-- (usa la función hoy_colombia() de esa migración).
--
-- Datos aparte de la Distribuidora y de Galpones (tablas hue_*):
--   • hue_tipos: tamaños de huevo (AAA, AA, A, B…) con su precio de venta.
--   • hue_movimientos: cada llegada (entrada), venta o pérdida (rotos),
--     con su propio precio. El precio cambia de un día a otro, por eso
--     se guarda en cada movimiento y no en el tipo.
-- El inventario de cada tipo = entradas − ventas − pérdidas (en huevos).
-- Acceso: administrador y vendedor. Solo el administrador crea tipos,
-- corrige días anteriores y borra movimientos.
-- =====================================================================

-- ¿El usuario actual puede entrar a Huevos? (admin o vendedor)
create or replace function public.es_huevos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() in ('admin', 'vendedor'), false);
$$;

revoke all on function public.es_huevos() from public, anon;
grant execute on function public.es_huevos() to authenticated;

-- ---------------------------------------------------------------------
-- Tipos (tamaños) de huevo
-- ---------------------------------------------------------------------
create table if not exists public.hue_tipos (
  id           bigint generated always as identity primary key,
  nombre       text    not null unique,
  -- Precio de venta actual del cartón de 30; se puede cambiar cada día
  precio_venta numeric(12,2) not null default 0 check (precio_venta >= 0),
  orden        integer not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

insert into public.hue_tipos (nombre, orden) values
  ('AAA', 1), ('AA', 2), ('A', 3), ('B', 4)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- Movimientos: llegadas, ventas y pérdidas
-- ---------------------------------------------------------------------
create table if not exists public.hue_movimientos (
  id             bigint generated always as identity primary key,
  fecha          date    not null default public.hoy_colombia(),
  tipo_id        bigint  not null references public.hue_tipos(id) on delete restrict,
  clase          text    not null check (clase in ('entrada', 'venta', 'perdida')),
  huevos         integer not null check (huevos > 0),
  -- entrada: lo que se pagó por cartón · venta: a cuánto se vendió · pérdida: 0
  precio_carton  numeric(12,2) not null default 0 check (precio_carton >= 0),
  -- venta y pérdida: costo promedio del cartón en ese momento (para la ganancia)
  costo_carton   numeric(12,2) check (costo_carton is null or costo_carton >= 0),
  -- proveedor (entrada) o cliente (venta)
  tercero        text,
  metodo_pago    text check (metodo_pago is null or metodo_pago in ('efectivo', 'transferencia')),
  notas          text,
  registrado_por text,
  created_at     timestamptz not null default now()
);

create index if not exists hue_movimientos_fecha_idx on public.hue_movimientos (fecha desc, id desc);
create index if not exists hue_movimientos_tipo_idx on public.hue_movimientos (tipo_id);

-- No se puede vender ni dar de baja más huevos de los que hay de ese tipo.
-- El bloqueo por tipo evita que dos ventas al mismo tiempo dejen el inventario negativo.
create or replace function public.hue_validar_existencias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hay integer;
begin
  if new.clase = 'entrada' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('hue_tipo_' || new.tipo_id));
  select coalesce(sum(case when clase = 'entrada' then huevos else -huevos end), 0)
    into v_hay
  from public.hue_movimientos
  where tipo_id = new.tipo_id
    and (tg_op = 'INSERT' or id <> new.id);
  if new.huevos > v_hay then
    raise exception 'No hay suficientes huevos de ese tipo: quedan %', v_hay;
  end if;
  return new;
end;
$$;

drop trigger if exists hue_movimientos_existencias on public.hue_movimientos;
create trigger hue_movimientos_existencias
  before insert or update on public.hue_movimientos
  for each row execute function public.hue_validar_existencias();

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- ---------------------------------------------------------------------
alter table public.hue_tipos       enable row level security;
alter table public.hue_movimientos enable row level security;
revoke all on public.hue_tipos       from anon;
revoke all on public.hue_movimientos from anon;

drop policy if exists hue_tipos_select on public.hue_tipos;
drop policy if exists hue_tipos_insert on public.hue_tipos;
drop policy if exists hue_tipos_update on public.hue_tipos;
drop policy if exists hue_tipos_delete on public.hue_tipos;
drop policy if exists hue_mov_select on public.hue_movimientos;
drop policy if exists hue_mov_insert on public.hue_movimientos;
drop policy if exists hue_mov_update on public.hue_movimientos;
drop policy if exists hue_mov_delete on public.hue_movimientos;

-- Tipos: admin y vendedor los ven; el admin los crea, cambia y borra.
-- El vendedor puede actualizar el precio de venta del día.
create policy hue_tipos_select on public.hue_tipos
  for select to authenticated using (public.es_huevos());
create policy hue_tipos_insert on public.hue_tipos
  for insert to authenticated with check (public.es_admin());
create policy hue_tipos_update on public.hue_tipos
  for update to authenticated using (public.es_huevos()) with check (public.es_huevos());
create policy hue_tipos_delete on public.hue_tipos
  for delete to authenticated using (public.es_admin());

-- Movimientos: el vendedor anota los de hoy; el admin cualquier día,
-- y solo el admin corrige o borra.
create policy hue_mov_select on public.hue_movimientos
  for select to authenticated using (public.es_huevos());
create policy hue_mov_insert on public.hue_movimientos
  for insert to authenticated
  with check (public.es_admin() or (public.es_huevos() and fecha = public.hoy_colombia()));
create policy hue_mov_update on public.hue_movimientos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy hue_mov_delete on public.hue_movimientos
  for delete to authenticated using (public.es_admin());
