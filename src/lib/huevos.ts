import { ClipboardList, House, PackagePlus, ShoppingBasket, Tags, type LucideIcon } from 'lucide-react';
import { HUEVOS_POR_CARTON } from './galpones';

// ==========================================
// HUEVOS — compra y venta por tamaño (tablas hue_*)
// El precio cambia de un día a otro: se guarda en cada movimiento.
// ==========================================

export interface TipoHuevo {
  id: number;
  nombre: string;
  /** Precio de venta actual del cartón de 30 */
  precio_venta: number;
  orden: number;
  activo: boolean;
}

export type ClaseMovimiento = 'entrada' | 'venta' | 'perdida';

export interface MovimientoHuevo {
  id: number;
  fecha: string; // YYYY-MM-DD
  tipo_id: number;
  clase: ClaseMovimiento;
  huevos: number;
  /** entrada: lo pagado por cartón · venta: a cuánto se vendió · pérdida: 0 */
  precio_carton: number;
  /** venta y pérdida: costo promedio del cartón en ese momento */
  costo_carton: number | null;
  tercero: string | null;
  metodo_pago: 'efectivo' | 'transferencia' | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
}

/** Lo que se puede cambiar de un tamaño ya creado */
export type CambiosTipo = Partial<Pick<TipoHuevo, 'nombre' | 'precio_venta' | 'activo'>>;

/** Lo que se envía al guardar una llegada, venta o pérdida */
export type NuevoMovimiento = Omit<MovimientoHuevo, 'id' | 'created_at' | 'registrado_por'>;

export type ModuloHuevos = 'hue-inicio' | 'hue-vender' | 'hue-llegadas' | 'hue-historial' | 'hue-tipos';

export const MODULOS_HUEVOS: { id: ModuloHuevos; etiqueta: string; corto: string; Icono: LucideIcon; soloAdmin?: boolean }[] = [
  { id: 'hue-inicio', etiqueta: 'Inicio', corto: 'Inicio', Icono: House },
  { id: 'hue-vender', etiqueta: 'Vender', corto: 'Vender', Icono: ShoppingBasket },
  { id: 'hue-llegadas', etiqueta: 'Llegadas', corto: 'Llegadas', Icono: PackagePlus },
  { id: 'hue-historial', etiqueta: 'Historial', corto: 'Historial', Icono: ClipboardList },
  { id: 'hue-tipos', etiqueta: 'Tipos y precios', corto: 'Tipos', Icono: Tags, soloAdmin: true },
];

export const NOMBRE_CLASE: Record<ClaseMovimiento, string> = { entrada: 'Llegada', venta: 'Venta', perdida: 'Rotos' };

/** Valor de una cantidad de huevos a un precio por cartón de 30 */
export const valorHuevos = (huevos: number, precioCarton: number) => Math.round((huevos / HUEVOS_POR_CARTON) * precioCarton);

/** Cartones enteros + huevos sueltos → huevos */
export const aHuevos = (cartones: number, sueltos: number) => cartones * HUEVOS_POR_CARTON + sueltos;

export interface ExistenciaTipo {
  /** Huevos que quedan */
  huevos: number;
  /** Costo promedio del cartón de lo que queda (promedio ponderado de las llegadas) */
  costoCarton: number;
  /** Lo que costó lo que queda */
  valorCosto: number;
}

export const SIN_EXISTENCIA: ExistenciaTipo = { huevos: 0, costoCarton: 0, valorCosto: 0 };

/** Orden en que pasaron las cosas: por día y, dentro del día, por hora de registro */
export const enOrden = (a: MovimientoHuevo, b: MovimientoHuevo) =>
  a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at) || a.id - b.id;

/**
 * Inventario y costo promedio de cada tipo, recorriendo los movimientos en orden.
 * Una llegada sube o baja el costo promedio según lo que se pagó; una venta o pérdida saca
 * huevos al costo promedio de ese momento. Así no importa a qué precio llegó cada cartón.
 */
export function calcularExistencias(movimientos: MovimientoHuevo[]): Map<number, ExistenciaTipo> {
  const porTipo = new Map<number, { huevos: number; valor: number }>();
  for (const m of [...movimientos].sort(enOrden)) {
    const e = porTipo.get(m.tipo_id) ?? { huevos: 0, valor: 0 };
    if (m.clase === 'entrada') {
      e.huevos += m.huevos;
      e.valor += (m.huevos / HUEVOS_POR_CARTON) * m.precio_carton;
    } else {
      const costoHuevo = e.huevos > 0 ? e.valor / e.huevos : 0;
      e.huevos = Math.max(0, e.huevos - m.huevos);
      e.valor = e.huevos > 0 ? Math.max(0, e.valor - costoHuevo * m.huevos) : 0;
    }
    porTipo.set(m.tipo_id, e);
  }
  const resultado = new Map<number, ExistenciaTipo>();
  for (const [id, e] of porTipo) {
    resultado.set(id, {
      huevos: e.huevos,
      costoCarton: e.huevos > 0 ? Math.round((e.valor / e.huevos) * HUEVOS_POR_CARTON) : 0,
      valorCosto: Math.round(e.valor),
    });
  }
  return resultado;
}

/**
 * Costo promedio del cartón de un tamaño justo antes de un movimiento (sin contarlo a él).
 * Al corregir una venta o unos rotos, su costo se vuelve a calcular con lo que había en ese momento.
 */
export function costoAntesDe(movimientos: MovimientoHuevo[], mov: MovimientoHuevo, tipoId: number) {
  const antes = movimientos.filter((m) => m.id !== mov.id && enOrden(m, mov) < 0);
  return (calcularExistencias(antes).get(tipoId) ?? SIN_EXISTENCIA).costoCarton;
}

/** Huevos que quedan de cada tamaño si los movimientos fueran estos (entradas − ventas − rotos), sin redondear a 0 */
export function saldoPorTipo(movimientos: MovimientoHuevo[]) {
  const saldo = new Map<number, number>();
  for (const m of movimientos) saldo.set(m.tipo_id, (saldo.get(m.tipo_id) ?? 0) + (m.clase === 'entrada' ? m.huevos : -m.huevos));
  return saldo;
}

/** Ganancia de una venta: lo cobrado menos lo que costaron esos huevos */
export const gananciaVenta = (m: MovimientoHuevo) =>
  m.clase === 'venta' ? valorHuevos(m.huevos, m.precio_carton) - valorHuevos(m.huevos, m.costo_carton ?? 0) : 0;

/** Totales de un conjunto de movimientos (un día, un mes…) */
export function totalesMovimientos(movs: MovimientoHuevo[]) {
  const t = { comprado: 0, huevosComprados: 0, vendido: 0, huevosVendidos: 0, ganancia: 0, perdido: 0, huevosPerdidos: 0 };
  for (const m of movs) {
    if (m.clase === 'entrada') {
      t.comprado += valorHuevos(m.huevos, m.precio_carton);
      t.huevosComprados += m.huevos;
    } else if (m.clase === 'venta') {
      t.vendido += valorHuevos(m.huevos, m.precio_carton);
      t.huevosVendidos += m.huevos;
      t.ganancia += gananciaVenta(m);
    } else {
      t.perdido += valorHuevos(m.huevos, m.costo_carton ?? 0);
      t.huevosPerdidos += m.huevos;
    }
  }
  return t;
}
