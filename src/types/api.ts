// Tipos de las respuestas de la API (Distribuidora-de-gestion-backend).

export type Rol = 'admin' | 'vendedor' | 'galponero';
export type MetodoPago = 'efectivo' | 'transferencia';
export type TipoPrecio = 'detal' | 'mayorista';
export type UnidadMedida = 'bulto' | 'unidad' | 'kilo';
export type CategoriaGasto = 'arriendo' | 'compra_inventario' | 'servicios' | 'nomina' | 'transporte' | 'otros';

export interface Pagina<T> {
  datos: T[];
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
}

export interface Producto {
  id: number;
  codigo: string | null;
  nombre: string;
  categoria: string;
  unidadMedida: UnidadMedida;
  /** Solo lo recibe el administrador. */
  precioCompra?: number;
  precioVenta: number;
  precioMayorista: number;
  ivaPorcentaje: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
}

export interface MovimientoInventario {
  id: number;
  tipo: 'inicial' | 'compra' | 'venta' | 'anulacion' | 'ajuste';
  cantidad: number;
  stockResultante: number;
  ventaId: number | null;
  motivo: string | null;
  usuario: string | null;
  creadoEn: string;
}

export interface Cliente {
  id: number;
  documento: string | null;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface VentaItem {
  id: number;
  productoId: number | null;
  productoNombre: string;
  categoria: string | null;
  unidadMedida: UnidadMedida | null;
  cantidad: number;
  tipoPrecio: TipoPrecio;
  precioUnitario: number;
  costoUnitario: number;
  ivaPorcentaje: number;
  subtotal: number;
  ivaMonto: number;
  total: number;
}

export interface Venta {
  id: number;
  numero: number;
  fecha: string;
  cajaId: number | null;
  clienteId: number | null;
  clienteNombre: string;
  clienteDocumento: string | null;
  vendedorId: number | null;
  vendedorNombre: string;
  metodoPago: MetodoPago;
  subtotal: number;
  ivaTotal: number;
  total: number;
  costoTotal: number;
  gananciaBruta: number;
  estado: 'completada' | 'anulada';
  motivoAnulacion: string | null;
  anuladaPor: number | null;
  anuladaEn: string | null;
  items?: VentaItem[];
}

export interface Caja {
  id: number;
  fecha: string;
  estado: 'abierta' | 'cerrada';
  montoInicial: number;
  abiertaEn: string;
  abiertaPor: string | null;
  cerradaEn: string | null;
  cerradaPor: string | null;
  esDeOtroDia: boolean;
}

export interface ResumenCaja {
  cajaId: number;
  fecha: string;
  montoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  numVentas: number;
  numAnuladas: number;
  gastosEfectivo: number;
  totalVentas: number;
  dineroEsperado: number;
}

export interface CierreCaja {
  id: number;
  cajaId: number;
  fecha: string;
  montoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  gastosEfectivo: number;
  dineroEsperado: number;
  dineroReal: number;
  diferencia: number;
  observaciones: string | null;
  responsable: string;
  cerradoEn: string;
}

export interface Gasto {
  id: number;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  metodoPago: MetodoPago;
  cajaId: number | null;
  registradoPor: string | null;
  creadoEn: string;
}

export interface TotalesPeriodo {
  totalVentas: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ivaTotal: number;
  numVentas: number;
  numAnuladas: number;
  unidadesVendidas: number;
  totalGastos: number;
  /** Solo para el administrador. */
  gananciaBruta?: number;
  utilidadNeta?: number;
}

export interface Dashboard {
  fecha: string;
  hoy: TotalesPeriodo;
  caja: { id: number; estado: 'abierta' | 'cerrada'; abiertaPor: string | null; esDeOtroDia: boolean } | null;
  stockBajo: {
    total: number;
    productos: { id: number; nombre: string; stock: number; stockMinimo: number; unidadMedida: UnidadMedida }[];
  };
  ultimasVentas: Pick<Venta, 'id' | 'numero' | 'fecha' | 'clienteNombre' | 'vendedorNombre' | 'metodoPago' | 'total' | 'estado'>[];
  /** Últimos 7 días, hoy al final. */
  semana: { dia: string; total: number }[];
  inventario: { valorVenta: number; unidades: number; referencias: number; /** Solo admin. */ inversion?: number };
}

export interface CierreMensual {
  id: number;
  mes: string;
  totalVentas: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  gananciaBruta: number;
  totalGastos: number;
  utilidadNeta: number;
  numVentas: number;
  numAnuladas: number;
  unidadesVendidas: number;
  cerradoPorNombre: string;
  cerradoEn: string;
}

export interface ReporteMes extends Required<TotalesPeriodo> {
  mes: string;
  margen: number;
  ventasPorDia: { dia: string; total: number; numVentas: number }[];
  topProductos: { productoId: number | null; producto: string; cantidad: number; total: number }[];
  gastosPorCategoria: { categoria: CategoriaGasto; total: number; cantidad: number }[];
  cierre: CierreMensual | null;
}

export interface Historico extends Required<TotalesPeriodo> {
  margen: number;
  porMes: { mes: string; totalVentas: number; gananciaBruta: number; numVentas: number; totalGastos: number; utilidadNeta: number }[];
}

export interface Galpon {
  id: number;
  nombre: string;
  avesIniciales: number;
  fechaLlegada: string;
  edadSemanasLlegada: number;
  gramosAveDia: number;
  activo: boolean;
  avesVivas: number;
  muertasTotales: number;
  edadSemanas: number;
  alimentoSugeridoKg: number;
  alimentoSugeridoBultos: number;
  registradoHoy: boolean;
}

export interface RegistroGalpon {
  id: number;
  galponId: number;
  galpon: string;
  fecha: string;
  huevos: number;
  muertas: number;
  alimentoKg: number;
  notas: string | null;
  registradoPorNombre: string | null;
}
