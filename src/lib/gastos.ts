// Categorías de gasto (el valor se guarda en gastos.categoria)
export const CATEGORIAS_GASTO = [
  { valor: 'arriendo', texto: 'Arriendo del local' },
  { valor: 'compra_inventario', texto: 'Compra de bultos' },
  { valor: 'servicios', texto: 'Servicios públicos' },
  { valor: 'nomina', texto: 'Nómina y pagos a empleados' },
  { valor: 'transporte', texto: 'Fletes y transporte' },
  { valor: 'otros', texto: 'Otros gastos' },
];

export const textoCategoriaGasto = (valor: string) =>
  CATEGORIAS_GASTO.find((c) => c.valor === valor)?.texto ?? valor;
