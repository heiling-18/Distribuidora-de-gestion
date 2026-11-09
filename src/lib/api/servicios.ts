// Funciones por módulo para llamar a la API. Los componentes usan esto, nunca fetch directo.
import type {
  Caja,
  CategoriaGasto,
  CierreCaja,
  CierreMensual,
  Cliente,
  Dashboard,
  Galpon,
  Gasto,
  Historico,
  MetodoPago,
  MovimientoInventario,
  Pagina,
  Producto,
  RegistroGalpon,
  ReporteMes,
  ResumenCaja,
  TipoPrecio,
  UnidadMedida,
  Usuario,
  Venta,
} from '@/types/api';
import { api } from './cliente';

type Paginado = { pagina?: number; limite?: number };

export const authApi = {
  login: (email: string, clave: string) =>
    api<{ usuario: Usuario }>('/auth/login', { method: 'POST', body: { email, clave }, silencioso401: true }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  yo: () => api<{ usuario: Usuario }>('/auth/me', { silencioso401: true }),
  cambiarClave: (claveActual: string, claveNueva: string) =>
    api<void>('/auth/cambiar-clave', { method: 'POST', body: { claveActual, claveNueva } }),
};

export interface DatosProducto {
  codigo?: string | null;
  nombre: string;
  categoria: string;
  unidadMedida: UnidadMedida;
  precioCompra: number;
  precioVenta: number;
  precioMayorista: number;
  ivaPorcentaje: number;
  stockMinimo: number;
}

export const productosApi = {
  listar: (f: Paginado & { q?: string; categoria?: string; activo?: 'true' | 'false' | 'todos'; stockBajo?: boolean } = {}) =>
    api<Pagina<Producto>>('/productos', { query: { ...f, stockBajo: f.stockBajo ? 'true' : undefined } }),
  /** Todos los productos activos (el catálogo es pequeño; se pide en páginas de 100). */
  async todos(): Promise<Producto[]> {
    const primera = await productosApi.listar({ limite: 100 });
    const resto = await Promise.all(
      Array.from({ length: primera.totalPaginas - 1 }, (_, i) => productosApi.listar({ limite: 100, pagina: i + 2 })),
    );
    return [primera, ...resto].flatMap((p) => p.datos);
  },
  crear: (datos: DatosProducto & { stockInicial: number }) =>
    api<{ producto: Producto }>('/productos', { method: 'POST', body: datos }),
  actualizar: (
    id: number,
    cambios: Partial<DatosProducto> & {
      activo?: boolean;
      /** Cambio de existencias que se guarda junto con los datos (todo o nada). */
      ajusteStock?: { tipo: 'compra' | 'ajuste'; cantidad: number; motivo: string };
    },
  ) =>
    api<{ producto: Producto }>(`/productos/${id}`, { method: 'PATCH', body: cambios }),
  desactivar: (id: number) => api<{ producto: Producto }>(`/productos/${id}`, { method: 'DELETE' }),
  ajustarStock: (id: number, datos: { tipo: 'compra' | 'ajuste'; cantidad: number; motivo: string }) =>
    api<{ producto: Producto }>(`/productos/${id}/ajuste-stock`, { method: 'POST', body: datos }),
  movimientos: (id: number, f: Paginado = {}) => api<Pagina<MovimientoInventario>>(`/productos/${id}/movimientos`, { query: f }),
};

export interface DatosCliente {
  documento?: string | null;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
}

export const clientesApi = {
  listar: (f: Paginado & { q?: string; activo?: 'true' | 'false' | 'todos' } = {}) => api<Pagina<Cliente>>('/clientes', { query: f }),
  /** Todos los clientes activos, en páginas de 100. */
  async todos(): Promise<Cliente[]> {
    const primera = await clientesApi.listar({ limite: 100 });
    const resto = await Promise.all(
      Array.from({ length: primera.totalPaginas - 1 }, (_, i) => clientesApi.listar({ limite: 100, pagina: i + 2 })),
    );
    return [primera, ...resto].flatMap((p) => p.datos);
  },
  crear: (datos: DatosCliente) => api<{ cliente: Cliente }>('/clientes', { method: 'POST', body: datos }),
  actualizar: (id: number, cambios: Partial<DatosCliente>) => api<{ cliente: Cliente }>(`/clientes/${id}`, { method: 'PATCH', body: cambios }),
  desactivar: (id: number) => api<{ cliente: Cliente }>(`/clientes/${id}`, { method: 'DELETE' }),
};

export interface NuevaVenta {
  idempotencyKey: string;
  metodoPago: MetodoPago;
  clienteId?: number;
  clienteNombre?: string;
  items: { productoId: number; cantidad: number; tipoPrecio: TipoPrecio }[];
}

export interface FiltroVentas extends Paginado {
  desde?: string;
  hasta?: string;
  estado?: 'completada' | 'anulada';
  metodoPago?: MetodoPago;
  cajaId?: number;
  q?: string;
  /** Traer los productos de cada venta. */
  conItems?: boolean;
}

export const ventasApi = {
  registrar: (venta: NuevaVenta) => api<{ venta: Venta; repetida: boolean }>('/ventas', { method: 'POST', body: venta }),
  listar: (f: FiltroVentas = {}) => api<Pagina<Venta>>('/ventas', { query: { ...f, conItems: f.conItems ? 'true' : undefined } }),
  obtener: (id: number) => api<{ venta: Venta }>(`/ventas/${id}`),
  anular: (id: number, motivo: string) => api<{ venta: Venta }>(`/ventas/${id}/anular`, { method: 'POST', body: { motivo } }),
};

export const cajaApi = {
  actual: () => api<{ caja: Caja | null }>('/caja/actual'),
  resumen: () => api<{ resumen: ResumenCaja }>('/caja/actual/resumen'),
  abrir: (montoInicial: number) => api<{ caja: Caja }>('/caja/abrir', { method: 'POST', body: { montoInicial } }),
  cerrar: (dineroReal: number, observaciones?: string) =>
    api<{ cierre: CierreCaja & { numVentas: number; numAnuladas: number } }>('/caja/cerrar', {
      method: 'POST',
      body: { dineroReal, ...(observaciones ? { observaciones } : {}) },
    }),
  cierres: (f: Paginado & { desde?: string; hasta?: string } = {}) => api<Pagina<CierreCaja>>('/caja/cierres', { query: f }),
};

export interface DatosGasto {
  fecha?: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  metodoPago: MetodoPago;
}

export const gastosApi = {
  listar: (f: Paginado & { desde?: string; hasta?: string; categoria?: CategoriaGasto } = {}) =>
    api<Pagina<Gasto> & { montoTotal: number }>('/gastos', { query: f }),
  crear: (datos: DatosGasto) => api<{ gasto: Gasto }>('/gastos', { method: 'POST', body: datos }),
  actualizar: (id: number, cambios: Partial<DatosGasto>) => api<{ gasto: Gasto }>(`/gastos/${id}`, { method: 'PATCH', body: cambios }),
  eliminar: (id: number) => api<void>(`/gastos/${id}`, { method: 'DELETE' }),
};

export const reportesApi = {
  dashboard: () => api<Dashboard>('/reportes/dashboard'),
  mes: (mes?: string) => api<{ reporte: ReporteMes }>('/reportes/mes', { query: { mes } }),
  historico: () => api<{ historico: Historico }>('/reportes/historico'),
  cierresMes: () => api<{ cierres: CierreMensual[] }>('/reportes/cierres-mes'),
  cerrarMes: (mes: string) => api<{ cierre: CierreMensual }>('/reportes/cierres-mes', { method: 'POST', body: { mes } }),
};

export interface Configuracion {
  nombreNegocio: string;
  /** NIT que aparece en los tickets. */
  nit: string;
  /** Celular del dueño que recibe el resumen de cada venta. */
  telefonoWhatsapp: string;
}

export const configuracionApi = {
  obtener: () => api<{ configuracion: Configuracion }>('/configuracion'),
  actualizar: (cambios: Partial<Configuracion>) => api<{ configuracion: Configuracion }>('/configuracion', { method: 'PATCH', body: cambios }),
};

export interface DatosGalpon {
  nombre: string;
  avesIniciales: number;
  fechaLlegada: string;
  edadSemanasLlegada: number;
  gramosAveDia: number;
}

export const galponesApi = {
  listar: (activo: 'true' | 'false' | 'todos' = 'true') => api<{ galpones: Galpon[] }>('/galpones', { query: { activo } }),
  crear: (datos: DatosGalpon) => api<{ galpon: Galpon }>('/galpones', { method: 'POST', body: datos }),
  actualizar: (id: number, cambios: Partial<DatosGalpon> & { activo?: boolean }) =>
    api<{ galpon: Galpon }>(`/galpones/${id}`, { method: 'PATCH', body: cambios }),
  eliminar: (id: number) => api<void>(`/galpones/${id}`, { method: 'DELETE' }),
  registros: (f: Paginado & { galponId?: number; desde?: string; hasta?: string } = {}) =>
    api<Pagina<RegistroGalpon> & { totales: { huevos: number; muertas: number; alimentoKg: number; cartones: number } }>('/galpones/registros', { query: f }),
  guardarRegistro: (galponId: number, fecha: string, datos: { huevos: number; muertas: number; alimentoKg: number; notas?: string | null }) =>
    api<{ registro: RegistroGalpon }>(`/galpones/${galponId}/registros/${fecha}`, { method: 'PUT', body: datos }),
  eliminarRegistro: (id: number) => api<void>(`/galpones/registros/${id}`, { method: 'DELETE' }),
};
