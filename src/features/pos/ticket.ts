import type { Venta } from '@/types/api';
import type { TicketVenta } from './TicketVentaModal';

/** Ticket a partir de una venta guardada (POS y reimpresión desde Reportes). */
export function ticketDeVenta(v: Venta, telefonoCliente = ''): TicketVenta {
  return {
    numero: v.numero,
    fecha: new Date(v.fecha).toLocaleString('es-CO'),
    cliente: v.clienteNombre,
    documento: v.clienteDocumento ?? '',
    telefono: telefonoCliente,
    esClienteRegistrado: v.clienteId !== null,
    items: (v.items ?? []).map((i) => ({ cantidad: i.cantidad, producto: { nombre: i.productoNombre }, tipoPrecio: i.tipoPrecio, total: i.total })),
    subtotal: v.subtotal,
    iva: v.ivaTotal,
    total: v.total,
    metodo: v.metodoPago,
    vendedor: v.vendedorNombre,
  };
}
