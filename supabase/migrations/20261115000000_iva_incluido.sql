-- =====================================================================
-- DYM'S — El precio de venta ya incluye el IVA
-- =====================================================================
-- Ejecutar en Supabase → SQL Editor.
--
-- El formulario de producto calcula el precio de venta CON el IVA incluido,
-- pero registrar_venta() le volvía a sumar el IVA: a un producto con IVA
-- se le cobraba el impuesto dos veces. Ahora el total es cantidad × precio.
-- La ganancia sigue siendo total − costo, igual que antes.
-- No cambia las ventas ya hechas.
-- =====================================================================

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
    -- El precio ya trae el IVA incluido: no se le suma otra vez
    v_total := round(v_cantidad * v_precio);

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

revoke all on function public.registrar_venta(jsonb, text, text) from public, anon;
grant execute on function public.registrar_venta(jsonb, text, text) to authenticated;
