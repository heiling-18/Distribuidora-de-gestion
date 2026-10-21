// Formato Moneda Colombiana
export const formatoMoneda = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(val || 0);
};

// Fecha corta en español de Colombia: "20 oct 2026"
export const formatoFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
