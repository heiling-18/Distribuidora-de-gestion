import { BarChart3, DollarSign, House, Layers, Receipt, ShoppingCart, Users, Wallet, type LucideIcon } from 'lucide-react';

export type Modulo = 'dashboard' | 'pos' | 'ventas' | 'inventario' | 'caja' | 'clientes' | 'gastos' | 'reportes';

/** Entrada del menú de cualquier sección (Distribuidora o Galpones) */
export interface ModuloNav<T extends string = string> {
  id: T;
  etiqueta: string;
  corto: string;
  Icono: LucideIcon;
  soloAdmin?: boolean;
}

/** Botón del menú para pasar a la otra sección (solo el administrador) */
export interface CambioSeccion {
  etiqueta: string;
  Icono: LucideIcon;
  onClick: () => void;
}

export const textoRol = (rol: string) =>
  rol === 'admin' ? 'Administrador' : rol === 'galponero' ? 'Galpones' : 'Vendedor';

export interface ModuloInfo {
  id: Modulo;
  etiqueta: string;
  /** Nombre corto para la barra inferior del celular */
  corto: string;
  Icono: LucideIcon;
  soloAdmin?: boolean;
}

export const MODULOS: ModuloInfo[] = [
  { id: 'dashboard', etiqueta: 'Inicio', corto: 'Inicio', Icono: House },
  { id: 'pos', etiqueta: 'Venta POS', corto: 'Vender', Icono: ShoppingCart },
  { id: 'ventas', etiqueta: 'Ventas', corto: 'Ventas', Icono: Receipt },
  { id: 'inventario', etiqueta: 'Inventario', corto: 'Inventario', Icono: Layers },
  { id: 'caja', etiqueta: 'Caja', corto: 'Caja', Icono: Wallet },
  { id: 'clientes', etiqueta: 'Clientes', corto: 'Clientes', Icono: Users },
  { id: 'gastos', etiqueta: 'Gastos', corto: 'Gastos', Icono: DollarSign, soloAdmin: true },
  { id: 'reportes', etiqueta: 'Reportes', corto: 'Reportes', Icono: BarChart3, soloAdmin: true },
];

/** Módulos fijos en la barra inferior del celular; el resto va en "Más" */
export const MODULOS_BARRA_MOVIL: Modulo[] = ['dashboard', 'pos', 'inventario', 'caja'];

export function modulosVisibles(esAdmin: boolean) {
  return MODULOS.filter((m) => esAdmin || !m.soloAdmin);
}
