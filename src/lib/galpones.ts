import { hoyNegocio } from './fechas';
import { ClipboardPen, House, Warehouse, type LucideIcon } from 'lucide-react';

// ==========================================
// GALPONES — tipos, constantes y cálculos
// (datos separados de la Distribuidora: tablas gal_*)
// ==========================================

/** Sección de la plataforma: cada una con sus propios datos */
export type Seccion = 'distribuidora' | 'galpones';

export const HUEVOS_POR_CARTON = 30;
export const KG_POR_BULTO = 40;
/** Consumo de referencia de una gallina en postura (audio del dueño) */
export const GRAMOS_GALLINA_POSTURA = 115;

export interface Galpon {
  id: number;
  nombre: string;
  aves_iniciales: number;
  fecha_llegada: string; // YYYY-MM-DD
  edad_semanas_llegada: number;
  gramos_ave_dia: number;
  activo: boolean;
}

export interface RegistroGalpon {
  id: number;
  galpon_id: number;
  fecha: string; // YYYY-MM-DD
  huevos: number;
  muertas: number;
  alimento_kg: number;
  notas: string | null;
  registrado_por: string | null;
}

export type ModuloGalpones = 'gal-inicio' | 'gal-registro' | 'gal-galpones';

export interface ModuloGalponesInfo {
  id: ModuloGalpones;
  etiqueta: string;
  corto: string;
  Icono: LucideIcon;
  soloAdmin?: boolean;
}

export const MODULOS_GALPONES: ModuloGalponesInfo[] = [
  { id: 'gal-inicio', etiqueta: 'Inicio', corto: 'Inicio', Icono: House },
  { id: 'gal-registro', etiqueta: 'Registro diario', corto: 'Registro', Icono: ClipboardPen },
  { id: 'gal-galpones', etiqueta: 'Galpones', corto: 'Galpones', Icono: Warehouse, soloAdmin: true },
];

/** Fecha de hoy en la zona del navegador, formato YYYY-MM-DD */
/** Día de hoy en Colombia (no el del computador), 'YYYY-MM-DD'. */
export const hoyLocal = () => hoyNegocio();

/** "2026-11-05" → "5 nov 2026" sin correr el día por la zona horaria */
export const formatoDia = (fecha: string) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

const diasEntre = (desde: string, hasta: string) => {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
};

/** Edad actual del lote en semanas */
export const edadSemanas = (g: Galpon, hoy = hoyLocal()) =>
  g.edad_semanas_llegada + Math.max(0, Math.floor(diasEntre(g.fecha_llegada, hoy) / 7));

/** Aves vivas = las que llegaron − todas las muertas registradas */
export const avesVivas = (g: Galpon, registros: RegistroGalpon[]) => {
  const muertas = registros.filter((r) => r.galpon_id === g.id).reduce((acc, r) => acc + r.muertas, 0);
  return Math.max(0, g.aves_iniciales - muertas);
};

/** Kilos de alimento que tocan para el día según las aves vivas */
export const alimentoSugeridoKg = (vivas: number, gramosAveDia: number) =>
  Math.round(((vivas * gramosAveDia) / 1000) * 10) / 10;

export const kgABultos = (kg: number) => kg / KG_POR_BULTO;

/** 95 huevos → { cartones: 3, sueltos: 5 } */
export const aCartones = (huevos: number) => ({
  cartones: Math.floor(huevos / HUEVOS_POR_CARTON),
  sueltos: huevos % HUEVOS_POR_CARTON,
});

export const textoCartones = (huevos: number) => {
  const { cartones, sueltos } = aCartones(huevos);
  const c = `${cartones} ${cartones === 1 ? 'cartón' : 'cartones'}`;
  return sueltos > 0 ? `${c} y ${sueltos} ${sueltos === 1 ? 'huevo' : 'huevos'}` : c;
};

const numero1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
export const formatoKg = (kg: number) => `${numero1.format(kg)} kg`;
export const formatoBultos = (bultos: number) => {
  const texto = numero1.format(bultos);
  return `${texto} ${texto === '1' ? 'bulto' : 'bultos'}`;
};
export const formatoEntero = (n: number) => new Intl.NumberFormat('es-CO').format(n);
