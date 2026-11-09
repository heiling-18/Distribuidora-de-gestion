import type { Venta } from '@/types/api';

/** "Purina Postura × 2, Bebedero × 3" */
export function textoItems(venta: Pick<Venta, 'items'>): string {
  return (venta.items ?? []).map((i) => `${i.productoNombre} × ${i.cantidad}`).join(', ');
}

/** true si al menos una línea se vendió por mayor. */
export function esPorMayor(venta: Pick<Venta, 'items'>): boolean {
  return (venta.items ?? []).some((i) => i.tipoPrecio === 'mayorista');
}

/** UUID para la clave de idempotencia de cada intento de venta. */
export function nuevaClaveVenta(): string {
  return crypto.randomUUID();
}
