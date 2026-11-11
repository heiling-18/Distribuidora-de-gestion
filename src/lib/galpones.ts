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

/** postura: gallinas que ponen huevos · levante: pollitas desde chiquitas, sin huevos */
export type TipoGalpon = 'postura' | 'levante';

export interface Galpon {
  id: number;
  nombre: string;
  tipo: TipoGalpon;
  aves_iniciales: number;
  fecha_llegada: string; // YYYY-MM-DD
  edad_semanas_llegada: number;
  gramos_ave_dia: number;
  /** Valor del bulto de 40 kg de purina (0 = sin precio) */
  precio_bulto: number;
  activo: boolean;
}

export interface RegistroGalpon {
  id: number;
  galpon_id: number;
  fecha: string; // YYYY-MM-DD
  huevos: number;
  muertas: number;
  alimento_kg: number;
  /** Precio del bulto el día del registro (null en registros viejos: se usa el del galpón) */
  precio_bulto: number | null;
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
export const hoyLocal = () => new Date().toLocaleDateString('en-CA');

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

/** Valor de un kilo y de un gramo de purina a partir del precio del bulto */
export const precioKilo = (precioBulto: number) => precioBulto / KG_POR_BULTO;
export const precioGramo = (precioBulto: number) => precioBulto / (KG_POR_BULTO * 1000);

/** Plata gastada en alimento: kilos × precio del kilo */
export const costoAlimento = (kg: number, precioBulto: number) => Math.round(kg * precioKilo(precioBulto));

/** Precio con el que se calcula un registro: el guardado ese día o, si no tiene, el actual del galpón */
export const precioDelRegistro = (r: RegistroGalpon, g: Galpon | undefined) => r.precio_bulto ?? g?.precio_bulto ?? 0;

/** Gasto en alimento de todo el lote (todos sus días anotados) */
export const costoLote = (g: Galpon, registros: RegistroGalpon[]) =>
  registros.filter((r) => r.galpon_id === g.id).reduce((acc, r) => acc + costoAlimento(r.alimento_kg, precioDelRegistro(r, g)), 0);

/** Kilos de alimento de todo el lote */
export const kgLote = (g: Galpon, registros: RegistroGalpon[]) =>
  registros.filter((r) => r.galpon_id === g.id).reduce((acc, r) => acc + r.alimento_kg, 0);

/** Gramos que comió en promedio cada ave ese día */
export const gramosPorAve = (kg: number, aves: number) => (aves > 0 ? Math.round((kg * 1000) / aves) : 0);

export const formatoPesos = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

/** Pesos con decimales para valores pequeños (el gramo de purina vale centavos) */
export const formatoPesosFino = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n || 0);

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
