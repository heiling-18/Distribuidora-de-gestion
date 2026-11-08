export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Mes de una fecha en hora local, como el primer día: "2026-10-01" (igual que cierres_mensuales.mes) */
export function claveMes(fecha: string | Date) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** "2026-10-01" → "octubre 2026" (se lee a mano para no correr el día por la zona horaria) */
export function nombreMes(clave: string) {
  const [anio, mes] = clave.split('-').map(Number);
  return `${MESES_LARGOS[mes - 1]} ${anio}`;
}
