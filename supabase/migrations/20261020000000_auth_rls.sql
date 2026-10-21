-- =====================================================================
-- DYM'S — Seguridad: Supabase Auth + Row Level Security (RLS)
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor DESPUÉS de crear los usuarios en
-- Authentication → Users (mismo correo que en la tabla public.usuarios).
--
-- Modelo de roles (columna public.usuarios.rol):
--   admin    → todo
--   vendedor → POS, caja, clientes; solo lectura de productos y gastos
-- Un usuario autenticado sin fila en public.usuarios no ve nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Rol del usuario actual (por correo del JWT de Supabase Auth)
-- ---------------------------------------------------------------------
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.rol
  from public.usuarios u
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() = 'admin', false);
$$;

create or replace function public.es_personal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() in ('admin', 'vendedor'), false);
$$;

revoke all on function public.rol_actual()  from public, anon;
revoke all on function public.es_admin()    from public, anon;
revoke all on function public.es_personal() from public, anon;
grant execute on function public.rol_actual()  to authenticated;
grant execute on function public.es_admin()    to authenticated;
grant execute on function public.es_personal() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Activar RLS en todas las tablas y borrar políticas anteriores
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['usuarios','productos','ventas','gastos','clientes','caja','cierres_caja'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    -- La clave pública (anon) no tiene acceso a nada
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Políticas
-- ---------------------------------------------------------------------

-- usuarios: cada quien ve su propia fila; el admin ve todas.
-- Altas y cambios de usuarios se hacen desde el panel de Supabase.
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.es_admin());

-- productos: todo el personal lee; solo admin crea/edita/elimina.
-- El stock de una venta se descuenta en registrar_venta().
create policy productos_select on public.productos
  for select to authenticated using (public.es_personal());
create policy productos_insert on public.productos
  for insert to authenticated with check (public.es_admin());
create policy productos_update on public.productos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy productos_delete on public.productos
  for delete to authenticated using (public.es_admin());

-- ventas: todo el personal lee. Crear y anular solo vía funciones
-- registrar_venta() y anular_venta(); no hay insert/update/delete directo.
create policy ventas_select on public.ventas
  for select to authenticated using (public.es_personal());

-- gastos: todo el personal lee (cálculo de caja); solo admin escribe.
create policy gastos_select on public.gastos
  for select to authenticated using (public.es_personal());
create policy gastos_insert on public.gastos
  for insert to authenticated with check (public.es_admin());
create policy gastos_update on public.gastos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy gastos_delete on public.gastos
  for delete to authenticated using (public.es_admin());

-- clientes: el personal lee, crea y edita; solo admin elimina.
create policy clientes_select on public.clientes
  for select to authenticated using (public.es_personal());
create policy clientes_insert on public.clientes
  for insert to authenticated with check (public.es_personal());
create policy clientes_update on public.clientes
  for update to authenticated using (public.es_personal()) with check (public.es_personal());
create policy clientes_delete on public.clientes
  for delete to authenticated using (public.es_admin());

-- caja: el personal abre y cierra caja; nadie la borra.
create policy caja_select on public.caja
  for select to authenticated using (public.es_personal());
create policy caja_insert on public.caja
  for insert to authenticated with check (public.es_personal());
create policy caja_update on public.caja
  for update to authenticated using (public.es_personal()) with check (public.es_personal());

-- cierres_caja: el personal registra cierres; nadie los edita ni borra.
create policy cierres_select on public.cierres_caja
  for select to authenticated using (public.es_personal());
create policy cierres_insert on public.cierres_caja
  for insert to authenticated with check (public.es_personal());

-- ---------------------------------------------------------------------
-- 4. Venta atómica: inserta las líneas y descuenta stock en una sola
--    transacción. Precios, costos e IVA salen de la tabla productos,
--    no del navegador.
--    p_items: [{"producto_id": 4, "cantidad": 2, "tipo_precio": "detal"}, ...]
-- ---------------------------------------------------------------------
create or replace function public.registrar_venta(
  p_items jsonb,
  p_metodo_pago text,
  p_cliente_nombre text default 'Cliente General'
)
returns setof public.ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item     jsonb;
  v_prod     public.productos%rowtype;
  v_cantidad numeric;
  v_tipo     text;
  v_precio   numeric;
  v_subtotal numeric;
  v_total    numeric;
  v_vendedor text;
  v_venta    public.ventas%rowtype;
begin
  if not public.es_personal() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  if p_metodo_pago not in ('efectivo', 'transferencia') then
    raise exception 'Método de pago inválido: %', p_metodo_pago;
  end if;

  select coalesce(nullif(u.nombre, ''), 'Vendedor') into v_vendedor
  from public.usuarios u
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_tipo := coalesce(v_item ->> 'tipo_precio', 'detal');

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida';
    end if;
    if v_tipo not in ('detal', 'mayorista') then
      raise exception 'Tipo de precio inválido: %', v_tipo;
    end if;

    -- Bloquea la fila para que dos ventas simultáneas no se pisen el stock
    select * into v_prod
    from public.productos
    where id = (v_item ->> 'producto_id')::bigint
    for update;

    if not found then
      raise exception 'Producto % no existe', v_item ->> 'producto_id';
    end if;
    if v_prod.stock < v_cantidad then
      raise exception 'Stock insuficiente para %: quedan %', v_prod.nombre, v_prod.stock;
    end if;

    v_precio := case
      when v_tipo = 'mayorista' then coalesce(nullif(v_prod.precio_mayorista, 0), v_prod.precio_venta * 0.95)
      else v_prod.precio_venta
    end;
    v_subtotal := v_cantidad * v_precio;
    v_total := v_subtotal + v_subtotal * coalesce(v_prod.iva_porcentaje, 0) / 100;

    insert into public.ventas (
      producto_id, nombre_producto, cantidad, precio_unitario, costo_unitario,
      total_venta, ganancia_bruta, metodo_pago, estado_pago, cliente_nombre, vendedor
    ) values (
      v_prod.id, v_prod.nombre, v_cantidad, v_precio, v_prod.precio_compra,
      v_total, v_total - v_cantidad * v_prod.precio_compra, p_metodo_pago,
      case when v_tipo = 'mayorista' then 'pagado (mayorista)' else 'pagado (detal)' end,
      coalesce(nullif(trim(p_cliente_nombre), ''), 'Cliente General'),
      v_vendedor
    )
    returning * into v_venta;

    update public.productos set stock = stock - v_cantidad where id = v_prod.id;

    return next v_venta;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Anulación atómica: marca la venta y devuelve el stock.
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

revoke all on function public.registrar_venta(jsonb, text, text) from public, anon;
revoke all on function public.anular_venta(bigint, text)        from public, anon;
grant execute on function public.registrar_venta(jsonb, text, text) to authenticated;
grant execute on function public.anular_venta(bigint, text)        to authenticated;

-- ---------------------------------------------------------------------
-- 6. Contraseñas en texto plano
-- ---------------------------------------------------------------------
-- La app ya no usa public.usuarios.password: las contraseñas viven en
-- Supabase Auth. Cuando hayas comprobado que todos pueden entrar,
-- elimina la columna (no se puede deshacer):
--
--   alter table public.usuarios drop column password;
