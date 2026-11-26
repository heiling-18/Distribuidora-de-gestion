import { ClipboardList, House, PackagePlus, ShoppingBasket, Tags, Wallet, type LucideIcon } from 'lucide-react';
import { HUEVOS_POR_CARTON } from './galpones';

// ==========================================
// HUEVOS — inventario y venta por tamaño (tablas hue_*)
// Los huevos son de producción propia: se cargan al inventario (como los bultos)
// y se venden al precio de venta de cada tamaño.
// ==========================================

export interface TipoHuevo {
  id: number;
  nombre: string;
  /** Precio de venta del cartón de 30 */
  precio_venta: number;
  orden: number;
  activo: boolean;
}

/** entrada: se agregan al inventario · venta · perdida: rotos */
export type ClaseMovimiento = 'entrada' | 'venta' | 'perdida';

export interface MovimientoHuevo {
  id: number;
  fecha: string; // YYYY-MM-DD
  tipo_id: number;
  clase: ClaseMovimiento;
  huevos: number;
  /** venta: a cuánto se vendió el cartón (equivalente) · entrada y rotos: 0 */
  precio_carton: number;
  /** Ya no se usa (era el costo cuando los huevos se compraban); se conserva por compatibilidad */
  costo_carton: number | null;
  /** venta: cliente · entrada: galpón de donde salieron (opcional) */
  tercero: string | null;
  metodo_pago: 'efectivo' | 'transferencia' | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
}

/** Lo que se puede cambiar de un tamaño ya creado */
export type CambiosTipo = Partial<Pick<TipoHuevo, 'nombre' | 'precio_venta' | 'activo'>>;

/** Lo que se envía al guardar un ingreso, una venta o unos rotos */
export type NuevoMovimiento = Omit<MovimientoHuevo, 'id' | 'created_at' | 'registrado_por'>;

/** Plata que se saca de lo vendido en huevos (cuenta aparte de la purina) */
export interface RetiroHuevos {
  id: number;
  fecha: string; // YYYY-MM-DD
  monto: number;
  motivo: string;
  registrado_por: string | null;
  created_at: string;
}

export type ModuloHuevos = 'hue-inicio' | 'hue-vender' | 'hue-inventario' | 'hue-plata' | 'hue-historial' | 'hue-tipos';

export const MODULOS_HUEVOS: { id: ModuloHuevos; etiqueta: string; corto: string; Icono: LucideIcon; soloAdmin?: boolean }[] = [
  { id: 'hue-inicio', etiqueta: 'Inicio', corto: 'Inicio', Icono: House },
  { id: 'hue-vender', etiqueta: 'Vender', corto: 'Vender', Icono: ShoppingBasket },
  // Cargar huevos al inventario es solo del administrador; el vendedor solo vende
  { id: 'hue-inventario', etiqueta: 'Inventario', corto: 'Inventario', Icono: PackagePlus, soloAdmin: true },
  { id: 'hue-plata', etiqueta: 'Plata de huevos', corto: 'Plata', Icono: Wallet, soloAdmin: true },
  { id: 'hue-historial', etiqueta: 'Historial', corto: 'Historial', Icono: ClipboardList },
  { id: 'hue-tipos', etiqueta: 'Tipos y precios', corto: 'Tipos', Icono: Tags, soloAdmin: true },
];

export const NOMBRE_CLASE: Record<ClaseMovimiento, string> = { entrada: 'Ingreso', venta: 'Venta', perdida: 'Rotos' };

/** Valor de una cantidad de huevos a un precio por cartón de 30 */
export const valorHuevos = (huevos: number, precioCarton: number) => Math.round((huevos / HUEVOS_POR_CARTON) * precioCarton);

/** Huevos que quedan de cada tamaño: ingresos − ventas − rotos */
export function saldoPorTipo(movimientos: MovimientoHuevo[]) {
  const saldo = new Map<number, number>();
  for (const m of movimientos) saldo.set(m.tipo_id, (saldo.get(m.tipo_id) ?? 0) + (m.clase === 'entrada' ? m.huevos : -m.huevos));
  return saldo;
}

/** Huevos en bodega de un tamaño (nunca negativo) */
export const enBodega = (saldo: Map<number, number>, tipoId: number) => Math.max(0, saldo.get(tipoId) ?? 0);

/** Totales de un conjunto de movimientos (un día, un mes…) */
export function totalesMovimientos(movs: MovimientoHuevo[]) {
  const t = { vendido: 0, huevosVendidos: 0, huevosIngresados: 0, huevosRotos: 0 };
  for (const m of movs) {
    if (m.clase === 'entrada') t.huevosIngresados += m.huevos;
    else if (m.clase === 'venta') {
      t.vendido += valorHuevos(m.huevos, m.precio_carton);
      t.huevosVendidos += m.huevos;
    } else t.huevosRotos += m.huevos;
  }
  return t;
}

/** Lo vendido en huevos (en pesos) de un conjunto de movimientos */
export const vendidoEnPesos = (movs: MovimientoHuevo[]) =>
  movs.reduce((acc, m) => acc + (m.clase === 'venta' ? valorHuevos(m.huevos, m.precio_carton) : 0), 0);

/** Suma de los retiros */
export const totalRetirado = (retiros: RetiroHuevos[]) => retiros.reduce((acc, r) => acc + r.monto, 0);

/** Plata de huevos: todo lo vendido − todo lo retirado (cuenta acumulada, aparte de la purina) */
export const plataDeHuevos = (movs: MovimientoHuevo[], retiros: RetiroHuevos[]) => vendidoEnPesos(movs) - totalRetirado(retiros);
