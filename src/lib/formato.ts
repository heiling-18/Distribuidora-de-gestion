// Formato Moneda Colombiana
export const formatoMoneda = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(val || 0);
};

// Fecha corta en español de Colombia: "20 oct 2026"
/**
 * Una fecha sola ("2026-11-08") se toma como día calendario: new Date("2026-11-08") la lee como
 * medianoche UTC y en Colombia la mostraría como el día anterior.
 */
export const formatoFecha = (fecha: string) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00` : fecha).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
