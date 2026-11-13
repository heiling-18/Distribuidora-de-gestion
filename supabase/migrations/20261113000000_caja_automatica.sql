-- =====================================================================
-- DYM'S — Caja que se abre sola con lo que se dejó en la gaveta
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261105000000_galpones.sql
-- (usa la función hoy_colombia() de esa migración).
--
-- • Al cerrar la caja se anota cuánto se deja en la gaveta para el día
--   siguiente (base_siguiente) y cuánto se retiró.
-- • abrir_caja_automatica(): abre la caja del día con esa base. No abre si
--   ya hay una abierta, si la última se abrió hoy o si nunca se ha cerrado
--   una con base para mañana (la primera vez la abre el administrador).
-- • ajustar_base_caja(): el administrador cambia la base de la caja
--   abierta, con un motivo; queda la base original y quién la cambió.
-- =====================================================================

alter table public.caja
  add column if not exists base_siguiente      numeric(14,2),
  add column if not exists apertura_automatica boolean not null default false,
  add column if not exists base_original       numeric(14,2),
  add column if not exists ajuste_motivo       text,
  add column if not exists ajustada_por        text;

alter table public.cierres_caja
  add column if not exists base_siguiente numeric(14,2),
  add column if not exists retirado       numeric(14,2);

-- Solo una caja abierta a la vez (si hoy ya hubiera dos abiertas, no se
-- crea el índice para no fallar: ciérrelas y vuelva a correr este archivo).
do $$
begin
  if (select count(*) from public.caja where estado = 'abierta') <= 1 then
    create unique index if not exists caja_una_abierta on public.caja ((true)) where estado = 'abierta';
  else
    raise notice 'Hay más de una caja abierta: ciérrelas y vuelva a ejecutar este archivo para crear caja_una_abierta';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Apertura automática
-- ---------------------------------------------------------------------
create or replace function public.abrir_caja_automatica()
returns public.caja
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caja   public.caja%rowtype;
  v_ultima public.caja%rowtype;
begin
  if not public.es_personal() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- Dos personas entrando al tiempo no abren dos cajas
  perform pg_advisory_xact_lock(hashtext('abrir_caja_automatica'));

  select * into v_caja from public.caja where estado = 'abierta' order by id desc limit 1;
  if found then
    return v_caja;
  end if;

  select * into v_ultima from public.caja order by id desc limit 1;
  -- Nunca se ha cerrado una caja con base para mañana: la primera la abre el administrador
  if not found or v_ultima.base_siguiente is null then
    return null;
  end if;
  -- La última caja es de hoy (ya se cerró hoy): la siguiente se abre mañana
  if v_ultima.fecha::text::date >= public.hoy_colombia() then
    return null;
  end if;

  insert into public.caja (fecha, monto_inicial, estado, apertura_automatica)
  values (public.hoy_colombia(), v_ultima.base_siguiente, 'abierta', true)
  returning * into v_caja;
  return v_caja;
end;
$$;

-- ---------------------------------------------------------------------
-- Ajuste de la base por el administrador
-- ---------------------------------------------------------------------
create or replace function public.ajustar_base_caja(p_monto numeric, p_motivo text)
returns public.caja
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caja   public.caja%rowtype;
  v_nombre text;
  v_motivo text := left(trim(coalesce(p_motivo, '')), 120);
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede cambiar la base de la caja' using errcode = '42501';
  end if;
  if p_monto is null or p_monto < 0 then
    raise exception 'La base debe ser un valor mayor o igual a 0';
  end if;
  if v_motivo = '' then
    raise exception 'Escribe por qué cambias la base';
  end if;

  select coalesce(nullif(u.nombre, ''), 'Administrador') into v_nombre
  from public.usuarios u
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1;

  update public.caja
  set base_original = coalesce(base_original, monto_inicial),
      monto_inicial = p_monto,
      ajuste_motivo = v_motivo,
      ajustada_por  = coalesce(v_nombre, 'Administrador')
  where estado = 'abierta'
  returning * into v_caja;

  if not found then
    raise exception 'No hay una caja abierta';
  end if;
  return v_caja;
end;
$$;

revoke all on function public.abrir_caja_automatica()            from public, anon;
revoke all on function public.ajustar_base_caja(numeric, text)   from public, anon;
grant execute on function public.abrir_caja_automatica()          to authenticated;
grant execute on function public.ajustar_base_caja(numeric, text) to authenticated;

-- Abrir la caja a mano queda solo para el administrador (la primera vez,
-- o para abrir de nuevo el mismo día). Cerrarla sigue siendo del personal.
drop policy if exists caja_insert on public.caja;
create policy caja_insert on public.caja
  for insert to authenticated with check (public.es_admin());
