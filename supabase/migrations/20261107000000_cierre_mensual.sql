-- =====================================================================
-- DYM'S — Cierre de mes
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor.
--
-- • El saldo del mes arranca en 0 solo: la app muestra las ventas del
--   mes en curso. No se borra ninguna venta.
-- • El administrador "cierra" un mes que ya terminó: queda guardado un
--   resumen fijo (acta) con quién y cuándo lo cerró.
-- • Un mes cerrado no se puede modificar: no se anulan sus ventas ni se
--   crean, editan o borran sus gastos.
-- =====================================================================

-- Primer día del mes de una fecha, en hora de Colombia
create or replace function public.mes_colombia(p_fecha timestamptz)
returns date
language sql
immutable
as $$
  select date_trunc('month', p_fecha at time zone 'America/Bogota')::date;
$$;

-- ---------------------------------------------------------------------
-- Tabla de cierres
-- ---------------------------------------------------------------------
create table if not exists public.cierres_mensuales (
  id                   bigint generated always as identity primary key,
  mes                  date    not null unique check (extract(day from mes) = 1),
  total_ventas         numeric not null default 0,
  ventas_efectivo      numeric not null default 0,
  ventas_transferencia numeric not null default 0,
  ganancia_bruta       numeric not null default 0,
  total_gastos         numeric not null default 0,
  utilidad_neta        numeric not null default 0,
  num_ventas           integer not null default 0,
  num_anuladas         integer not null default 0,
  unidades_vendidas    numeric not null default 0,
  cerrado_por          text    not null,
  cerrado_en           timestamptz not null default now()
);

alter table public.cierres_mensuales enable row level security;
revoke all on public.cierres_mensuales from anon;

-- Solo el admin los ve. Se crean únicamente con cerrar_mes(); nadie
-- los edita ni los borra.
drop policy if exists cierres_mensuales_select on public.cierres_mensuales;
create policy cierres_mensuales_select on public.cierres_mensuales
  for select to authenticated using (public.es_admin());

-- ¿Ese mes ya está cerrado?
create or replace function public.mes_cerrado(p_fecha timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.cierres_mensuales where mes = public.mes_colombia(p_fecha));
$$;

-- ---------------------------------------------------------------------
-- Cerrar un mes (solo admin, solo meses que ya terminaron)
-- ---------------------------------------------------------------------
create or replace function public.cerrar_mes(p_mes date)
returns public.cierres_mensuales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes    date := date_trunc('month', p_mes)::date;
  v_nombre text;
  v_cierre public.cierres_mensuales%rowtype;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede cerrar el mes' using errcode = '42501';
  end if;
  if v_mes >= public.mes_colombia(now()) then
    raise exception 'Solo se pueden cerrar meses que ya terminaron';
  end if;
  if exists (select 1 from public.cierres_mensuales where mes = v_mes) then
    raise exception 'Ese mes ya está cerrado';
  end if;

  select coalesce(nullif(u.nombre, ''), 'Administrador') into v_nombre
  from public.usuarios u
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1;

  with v as (
    select *, lower(coalesce(estado_pago, '')) like 'anulada%' as anulada
    from public.ventas
    where public.mes_colombia(fecha::text::timestamptz) = v_mes
  ),
  g as (
    select coalesce(sum(monto), 0) as total
    from public.gastos
    where public.mes_colombia(fecha::text::timestamptz) = v_mes
  )
  insert into public.cierres_mensuales (
    mes, total_ventas, ventas_efectivo, ventas_transferencia, ganancia_bruta,
    total_gastos, utilidad_neta, num_ventas, num_anuladas, unidades_vendidas, cerrado_por
  )
  select
    v_mes,
    coalesce(sum(v.total_venta) filter (where not v.anulada), 0),
    coalesce(sum(v.total_venta) filter (where not v.anulada and v.metodo_pago = 'efectivo'), 0),
    coalesce(sum(v.total_venta) filter (where not v.anulada and v.metodo_pago = 'transferencia'), 0),
    coalesce(sum(v.ganancia_bruta) filter (where not v.anulada), 0),
    (select total from g),
    coalesce(sum(v.ganancia_bruta) filter (where not v.anulada), 0) - (select total from g),
    count(*) filter (where not v.anulada),
    count(*) filter (where v.anulada),
    coalesce(sum(v.cantidad) filter (where not v.anulada), 0),
    coalesce(v_nombre, 'Administrador')
  from v
  returning * into v_cierre;

  return v_cierre;
end;
$$;

revoke all on function public.mes_cerrado(timestamptz) from public, anon;
revoke all on function public.cerrar_mes(date)          from public, anon;
grant execute on function public.mes_cerrado(timestamptz) to authenticated;
grant execute on function public.cerrar_mes(date)          to authenticated;

-- ---------------------------------------------------------------------
-- Anular venta: igual que antes, pero no deja anular en un mes cerrado
-- ---------------------------------------------------------------------
create or replace function public.anular_venta(
  p_venta_id bigint,
  p_motivo text
)
returns public.ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta  public.ventas%rowtype;
  v_motivo text := left(trim(coalesce(p_motivo, '')), 40);
begin
  if not public.es_personal() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_motivo = '' then
    raise exception 'El motivo de anulación es obligatorio';
  end if;

  select * into v_venta from public.ventas where id = p_venta_id for update;
  if not found then
    raise exception 'Venta % no existe', p_venta_id;
  end if;
  if lower(coalesce(v_venta.estado_pago, '')) like 'anulada%' then
    raise exception 'La venta % ya está anulada', p_venta_id;
  end if;
  if public.mes_cerrado(v_venta.fecha::text::timestamptz) then
    raise exception 'El mes de esta venta ya está cerrado; no se puede anular';
  end if;

  update public.productos
  set stock = stock + v_venta.cantidad
  where id = v_venta.producto_id
     or (v_venta.producto_id is null and nombre = v_venta.nombre_producto);

  update public.ventas
  set estado_pago = 'anulada: ' || v_motivo
  where id = p_venta_id
  returning * into v_venta;

  return v_venta;
end;
$$;

-- ---------------------------------------------------------------------
-- Gastos: no se crean, editan ni borran en un mes cerrado
-- ---------------------------------------------------------------------
create or replace function public.gastos_bloquear_mes_cerrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and public.mes_cerrado(old.fecha::text::timestamptz) then
    raise exception 'Ese gasto pertenece a un mes cerrado; no se puede modificar';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.mes_cerrado(new.fecha::text::timestamptz) then
    raise exception 'No se pueden registrar gastos en un mes cerrado';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists gastos_mes_cerrado on public.gastos;
create trigger gastos_mes_cerrado
  before insert or update or delete on public.gastos
  for each row execute function public.gastos_bloquear_mes_cerrado();
