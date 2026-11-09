import { formatoMoneda } from '@/lib/formato';
import type { TicketVenta } from './TicketVentaModal';

const enlace = (telefono: string, texto: string) => {
  const num = telefono.replace(/[^0-9]/g, '');
  return num ? `https://wa.me/57${num}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
};

const detalle = (t: TicketVenta) => t.items.map((i) => `• ${i.cantidad}x ${i.producto.nombre} = ${formatoMoneda(i.total)}`).join('\n');

/** Comprobante para el cliente. */
export function linkWhatsAppCliente(t: TicketVenta, nombreNegocio: string): string {
  const texto = `🧾 *Comprobante de compra — ${nombreNegocio}*

📋 *Factura Nro:* ${t.numero}
📅 *Fecha:* ${t.fecha}
👤 *Atendido por:* ${t.vendedor}

📦 *Detalle de Productos:*
${detalle(t)}

💵 *Subtotal:* ${formatoMoneda(t.subtotal)}
🧾 *IVA:* ${formatoMoneda(t.iva)}
💰 *TOTAL PAGADO:* ${formatoMoneda(t.total)}
💳 *Método de Pago:* ${t.metodo.toUpperCase()}

📍 *${nombreNegocio} — Nutrición y Producción Agropecuaria*
¡Esperamos atenderle de nuevo pronto! 🚜`;
  return enlace(t.telefono, texto);
}

/** Aviso de la venta para el dueño. */
export function linkWhatsAppDueno(t: TicketVenta, telefonoDueno: string, nombreNegocio: string): string {
  const texto = `🔔 *ALERTA DE VENTA — ${nombreNegocio}* 🔔

Se acaba de registrar una nueva venta en la plataforma:

👤 *Vendedor:* ${t.vendedor}
📅 *Fecha/Hora:* ${t.fecha}
🏷️ *Ticket Nro:* ${t.numero}

🛒 *Cliente:* ${t.cliente}${t.documento ? ` (Doc: ${t.documento})` : ''}
${t.telefono ? `📞 *Tel:* ${t.telefono}` : ''}

📦 *Productos Vendidos:*
${detalle(t)}

💰 *TOTAL COBRADO:* ${formatoMoneda(t.total)}
💳 *Forma de Pago:* ${t.metodo.toUpperCase()}

✅ _Inventario y caja actualizados automáticamente._`;
  return enlace(telefonoDueno, texto);
}
