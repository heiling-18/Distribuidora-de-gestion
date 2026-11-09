import type { Producto, Venta } from '@/types/api';

const celda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function descargar(filas: string[], nombre: string) {
  const csv = '﻿' + filas.join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombre}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Inventario a CSV. El costo solo aparece si viene (administrador). */
export function exportarInventarioCsv(productos: Producto[], nombre: string): void {
  const conCosto = productos.some((p) => p.precioCompra !== undefined);
  const encabezados = ['Código', 'Producto', 'Categoría', 'Unidad', ...(conCosto ? ['Costo'] : []), 'Precio detal', 'Precio mayor', 'IVA %', 'Stock', 'Stock mínimo'];
  const filas = productos.map((p) =>
    [p.codigo ?? '', p.nombre, p.categoria, p.unidadMedida, ...(conCosto ? [p.precioCompra ?? ''] : []), p.precioVenta, p.precioMayorista, p.ivaPorcentaje, p.stock, p.stockMinimo]
      .map(celda)
      .join(';'),
  );
  descargar([encabezados.join(';'), ...filas], nombre);
}

/** Descarga un CSV (abre en Excel) con una fila por producto vendido. */
export function exportarVentasCsv(ventas: Venta[], nombre: string): void {
  const encabezados = [
    'Ticket', 'Fecha', 'Hora', 'Vendedor', 'Cliente', 'Documento', 'Producto', 'Modalidad',
    'Cantidad', 'Precio unitario', 'IVA', 'Total línea', 'Total venta', 'Método de pago', 'Estado', 'Motivo anulación',
  ];

  const filas = ventas.flatMap((v) => {
    const d = new Date(v.fecha);
    const comunes = [v.numero, d.toLocaleDateString('es-CO'), d.toLocaleTimeString('es-CO'), v.vendedorNombre, v.clienteNombre, v.clienteDocumento ?? ''];
    const finales = [v.total, v.metodoPago, v.estado, v.motivoAnulacion ?? ''];
    const items = v.items?.length ? v.items : [null];
    return items.map((i) =>
      [
        ...comunes,
        i?.productoNombre ?? '',
        i ? (i.tipoPrecio === 'mayorista' ? 'Al por mayor' : 'Al detal') : '',
        i?.cantidad ?? '',
        i?.precioUnitario ?? '',
        i?.ivaMonto ?? '',
        i?.total ?? '',
        ...finales,
      ]
        .map(celda)
        .join(';'),
    );
  });

  descargar([encabezados.join(';'), ...filas], nombre);
}
