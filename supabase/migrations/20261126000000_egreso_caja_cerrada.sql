-- =====================================================================
-- DYM'S — Egresos anotados después de cerrar la caja
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor, después de 20261113000000_caja_automatica.sql.
--
-- Si la caja de hoy ya se cerró y se paga algo con la plata de la gaveta,
-- ese egreso se descuenta de lo que quedó para mañana (base_siguiente).
-- Así la caja de mañana abre con la plata que de verdad hay.
-- p_delta > 0 descuenta (egreso nuevo o más grande); p_delta < 0 devuelve
-- (egreso borrado o más pequeño). El acta del cierre no cambia.
-- Devuelve null si no aplica (hay una caja abierta o la última no es de hoy).
-- =====================================================================

create or replace function public.egreso_con_caja_cerrada(p_delta numeric)
returns public.caja
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ultima public.caja%rowtype;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador registra egresos' using errcode = '42501';
  end if;
  if p_delta is null then
    raise exception 'Monto inválido';
  end if;

  -- El mismo bloqueo de la apertura automática: no se cruzan
  perform pg_advisory_xact_lock(hashtext('abrir_caja_automatica'));

  if exists (select 1 from public.caja where estado = 'abierta') then
    return null;
  end if;

  select * into v_ultima from public.caja order by id desc limit 1;
  if not found
     or v_ultima.estado <> 'cerrada'
     or v_ultima.base_siguiente is null
     or v_ultima.fecha::text::date <> public.hoy_colombia() then
    return null;
  end if;

  if v_ultima.base_siguiente - p_delta < 0 then
    raise exception 'No alcanza: en la gaveta quedaron %', v_ultima.base_siguiente;
  end if;

  update public.caja
  set base_siguiente = base_siguiente - p_delta
  where id = v_ultima.id
  returning * into v_ultima;
  return v_ultima;
end;
$$;

revoke all on function public.egreso_con_caja_cerrada(numeric) from public, anon;
grant execute on function public.egreso_con_caja_cerrada(numeric) to authenticated;
