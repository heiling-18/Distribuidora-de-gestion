import type { Producto, TipoPrecio } from '@/types/api';

/** Línea del carrito. Los precios ya incluyen IVA (igual que en el servidor). */
export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  tipoPrecio: TipoPrecio;
  precioUnitario: number;
  /** Valor sin IVA */
  subtotal: number;
  ivaMonto: number;
  /** Lo que paga el cliente */
  total: number;
}

const aCentavos = (n: number) => Math.round(n * 100) / 100;

/** Igual que el servidor: si no hay precio por mayor configurado, detal − 5 %. */
export function precioDe(p: Producto, tipo: TipoPrecio): number {
  if (tipo === 'detal') return p.precioVenta;
  return p.precioMayorista > 0 ? p.precioMayorista : aCentavos(p.precioVenta * 0.95);
}

export function armarItem(producto: Producto, tipoPrecio: TipoPrecio, cantidad: number): ItemCarrito {
  const precioUnitario = precioDe(producto, tipoPrecio);
  const total = aCentavos(cantidad * precioUnitario);
  const ivaMonto = aCentavos(total - total / (1 + producto.ivaPorcentaje / 100));
  return { producto, cantidad, tipoPrecio, precioUnitario, subtotal: aCentavos(total - ivaMonto), ivaMonto, total };
}

/** Unidades del mismo producto ya en el carrito (sin contar una línea). */
export function enCarrito(carrito: ItemCarrito[], productoId: number, excepto?: number): number {
  return carrito.filter((it, i) => i !== excepto && it.producto.id === productoId).reduce((s, it) => s + it.cantidad, 0);
}

export function totalesDe(carrito: ItemCarrito[]) {
  return {
    subtotal: aCentavos(carrito.reduce((a, i) => a + i.subtotal, 0)),
    iva: aCentavos(carrito.reduce((a, i) => a + i.ivaMonto, 0)),
    total: aCentavos(carrito.reduce((a, i) => a + i.total, 0)),
  };
}
