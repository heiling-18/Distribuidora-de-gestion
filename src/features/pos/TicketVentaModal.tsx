'use client';

import React from 'react';
import { BellRing, MessageCircle, Printer } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';

export interface TicketVenta {
  numero: number;
  fecha: string;
  cliente: string;
  documento: string;
  telefono: string;
  esClienteRegistrado: boolean;
  items: Array<{ cantidad: number; producto: { nombre: string }; tipo_precio: string; total: number }>;
  subtotal: number;
  iva: number;
  total: number;
  metodo: string;
  vendedor: string;
}

interface TicketVentaModalProps {
  ticket: TicketVenta;
  linkWhatsAppCliente: string;
  linkWhatsAppDueno: string;
  telefonoDueno: string;
  onCerrar: () => void;
}

const enlace =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-control px-4 text-[15px] font-bold transition-colors';

/** Ticket de la venta; el bloque #ticket-imprimible es lo único que sale en la impresora (ver globals.css) */
export function TicketVentaModal({ ticket, linkWhatsAppCliente, linkWhatsAppDueno, telefonoDueno, onCerrar }: TicketVentaModalProps) {
  const conCliente = ticket.esClienteRegistrado && ticket.cliente !== 'Cliente General';

  return (
    <Modal titulo="Venta registrada" descripcion={`Ticket #${ticket.numero} · ${formatoMoneda(ticket.total)}`} onCerrar={onCerrar}>
      <div id="ticket-imprimible" className="flex flex-col gap-3 rounded-campo bg-hundido p-4 font-mono text-[13px] text-tinta">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <strong className="text-base">DYM’S</strong>
          <span>Nutrición y producción agropecuaria</span>
          <span>NIT: 901.458.712-4</span>
          <span>Ticket #{ticket.numero}</span>
          <span>{ticket.fecha}</span>
          <span>Atendió: {ticket.vendedor}</span>
          {conCliente && <span className="font-bold">Cliente: {ticket.cliente} ({ticket.documento})</span>}
        </div>

        <div className="flex flex-col gap-1 border-y border-dashed border-tinta-tenue py-2">
          {ticket.items.map((it, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span>
                {it.cantidad} × {it.producto.nombre} <span className="text-[11px]">({it.tipo_precio === 'mayorista' ? 'mayor' : 'detal'})</span>
              </span>
              <span className="whitespace-nowrap font-bold">{formatoMoneda(it.total)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatoMoneda(ticket.subtotal)}</span></div>
          {ticket.iva > 0 && <div className="flex justify-between"><span>IVA</span><span>{formatoMoneda(ticket.iva)}</span></div>}
          <div className="flex justify-between text-[15px] font-bold"><span>Total</span><span>{formatoMoneda(ticket.total)}</span></div>
          <div className="flex justify-between capitalize"><span>Pago</span><span>{ticket.metodo}</span></div>
        </div>

        <p className="text-center">Gracias por su compra</p>
      </div>

      <div className="no-print flex flex-col gap-2">
        <Button tamano="lg" anchoCompleto onClick={() => window.print()}>
          <Printer className="h-5 w-5" aria-hidden="true" />
          Imprimir ticket
        </Button>
        {conCliente && (
          <a href={linkWhatsAppCliente} target="_blank" rel="noopener noreferrer" className={`${enlace} bg-exito-fondo text-exito-texto hover:bg-[#D3E9DB]`}>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Enviar ticket al cliente por WhatsApp
          </a>
        )}
        <a href={linkWhatsAppDueno} target="_blank" rel="noopener noreferrer" className={`${enlace} bg-neutro text-tinta hover:bg-neutro-hover`}>
          <BellRing className="h-5 w-5" aria-hidden="true" />
          Avisar al dueño (+57 {telefonoDueno})
        </a>
        <Button variante="fantasma" anchoCompleto onClick={onCerrar}>Cerrar</Button>
      </div>
    </Modal>
  );
}
