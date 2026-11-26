-- =====================================================================
-- DYM'S — Plata de huevos: saldo acumulado y retiros
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261112000000_huevos.sql.
--
-- La plata de los huevos va aparte de la caja de la purina:
--   plata de huevos = todo lo vendido en huevos − todo lo retirado.
-- Cada retiro guarda cuánto se sacó, para qué y quién lo hizo.
-- No se puede retirar más de lo que hay. Solo el administrador ve,
-- anota y borra retiros. No toca ninguna otra tabla.
-- =====================================================================

create table if not exists public.hue_retiros (
  id             bigint generated always as identity primary key,
  fecha          date    not null default public.hoy_colombia(),
  monto          numeric(14,2) not null check (monto > 0),
  motivo         text    not null check (length(trim(motivo)) > 0),
  registrado_por text,
  created_at     timestamptz not null default now()
);

create index if not exists hue_retiros_fecha_idx on public.hue_retiros (fecha desc, id desc);

-- No se puede retirar más de lo que hay. El bloqueo evita que dos retiros
-- al mismo tiempo dejen la plata en negativo.
create or replace function public.hue_validar_retiro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vendido  numeric;
  v_retirado numeric;
  v_hay      numeric;
begin
  perform pg_advisory_xact_lock(hashtext('hue_plata'));

  -- Mismo cálculo que la página: cada venta vale huevos / 30 × precio del cartón, redondeado
  select coalesce(sum(round(huevos::numeric / 30 * precio_carton)), 0)
    into v_vendido
  from public.hue_movimientos
  where clase = 'venta';

  select coalesce(sum(monto), 0)
    into v_retirado
  from public.hue_retiros
  where tg_op = 'INSERT' or id <> new.id;

  v_hay := v_vendido - v_retirado;
  if new.monto > v_hay then
    raise exception 'No hay suficiente plata de huevos: hay %', v_hay;
  end if;
  return new;
end;
$$;

drop trigger if exists hue_retiros_validar on public.hue_retiros;
create trigger hue_retiros_validar
  before insert or update on public.hue_retiros
  for each row execute function public.hue_validar_retiro();

-- ---------------------------------------------------------------------
-- Seguridad (RLS): solo el administrador
-- ---------------------------------------------------------------------
alter table public.hue_retiros enable row level security;
revoke all on public.hue_retiros from anon;

drop policy if exists hue_retiros_select on public.hue_retiros;
drop policy if exists hue_retiros_insert on public.hue_retiros;
drop policy if exists hue_retiros_update on public.hue_retiros;
drop policy if exists hue_retiros_delete on public.hue_retiros;

create policy hue_retiros_select on public.hue_retiros
  for select to authenticated using (public.es_admin());
create policy hue_retiros_insert on public.hue_retiros
  for insert to authenticated with check (public.es_admin());
create policy hue_retiros_update on public.hue_retiros
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy hue_retiros_delete on public.hue_retiros
  for delete to authenticated using (public.es_admin());
