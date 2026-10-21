// ==========================================
// MODELOS Y TIPOS DE DATOS DYM'S
// ==========================================
export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: 'admin' | 'vendedor';
}

export interface Producto {
  id: number;
  codigo?: string;
  nombre: string;
  categoria: string;
  precio_compra: number;
  precio_venta: number; // Precio Detal
  precio_mayorista: number;
  iva_porcentaje: number;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
}

export interface Cliente {
  id: number;
  documento: string;
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  tipo_precio: 'detal' | 'mayorista';
  precio_aplicado: number;
  subtotal: number;
  iva_monto: number;
  total: number;
}

export interface Venta {
  id: number;
  producto_id?: number;
  cliente_documento?: string;
  cliente_nombre: string;
  nombre_producto: string;
  categoria_producto?: string;
  cantidad: number;
  tipo_precio?: string;
  precio_unitario: number;
  costo_unitario: number;
  subtotal?: number;
  iva_total?: number;
  total_venta: number;
  ganancia_bruta: number;
  metodo_pago: string;
  estado_pago?: string;
  vendedor: string;
  fecha: string;
  estado?: 'completada' | 'anulada';
  motivo_anulacion?: string;
}

export interface Gasto {
  id: number;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

export interface SesionCaja {
  id: number;
  fecha: string;
  monto_inicial: number;
  monto_cierre?: number;
  dinero_esperado?: number;
  diferencia?: number;
  estado: 'abierta' | 'cerrada';
  usuario_apertura?: string;
  created_at?: string;
}

export interface NotificacionVisual {
  id: number;
  tipo: 'exito' | 'error' | 'advertencia' | 'info';
  mensaje: string;
}
