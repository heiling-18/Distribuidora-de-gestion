// Categorías de producto: la plataforma es solo para purinas y concentrados
export const CATEGORIA_PRINCIPAL = 'Purinas y Concentrados';

export const CATEGORIAS_PRODUCTO = [CATEGORIA_PRINCIPAL, 'Otros'] as const;

// Categorías retiradas; los productos que aún las tengan se muestran como "Otros"
const CATEGORIAS_RETIRADAS = ['Pollos y Aves', 'Huevos'];

export function normalizarCategoria(categoria?: string | null): string {
  if (!categoria) return CATEGORIA_PRINCIPAL;
  return CATEGORIAS_RETIRADAS.includes(categoria) ? 'Otros' : categoria;
}

export const UNIDADES_MEDIDA = [
  { valor: 'bulto', texto: 'Bulto (saco)' },
  { valor: 'unidad', texto: 'Unidad' },
  { valor: 'kilo', texto: 'Kilo' },
] as const;
