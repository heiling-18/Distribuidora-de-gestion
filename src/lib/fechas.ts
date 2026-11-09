/** Zona horaria del negocio. "Hoy" siempre es el día en Colombia, no el del computador. */
export const ZONA_NEGOCIO = 'America/Bogota';

const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_NEGOCIO, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Día del negocio, "YYYY-MM-DD" (en-CA da ese formato). */
export function hoyNegocio(instante: Date = new Date()): string {
  return formatoDia.format(instante);
}
