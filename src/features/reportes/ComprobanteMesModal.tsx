'use client';

import React from 'react';
import { MessageCircle, Printer } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { CierreMensual } from '@/types';
import { nombreMes } from './meses';

/** Acta del cierre de mes; el bloque #ticket-imprimible es lo único que sale en la impresora (ver globals.css) */
export function ComprobanteMesModal({ cierre, telefonoDueno, onCerrar }: { cierre: CierreMensual; telefonoDueno: string; onCerrar: () => void }) {
  const titulo = nombreMes(cierre.mes);
  const filas: [string, string, boolean?][] = [
    ['Ventas en efectivo', formatoMoneda(cierre.ventas_efectivo)],
    ['Ventas por transferencia', formatoMoneda(cierre.ventas_transferencia)],
    ['Total vendido', formatoMoneda(cierre.total_ventas), true],
    ['Ganancia bruta', formatoMoneda(cierre.ganancia_bruta)],
    ['Gastos del mes', `-${formatoMoneda(cierre.total_gastos)}`],
    ['Utilidad del mes', formatoMoneda(cierre.utilidad_neta), true],
    ['Ventas registradas', String(cierre.num_ventas)],
    ['Unidades vendidas', String(Number(cierre.unidades_vendidas))],
    ['Ventas anuladas', String(cierre.num_anuladas)],
  ];
  const cerradoEn = new Date(cierre.cerrado_en).toLocaleString('es-CO');

  const texto = [
    `*DYM’S · Cierre de ${titulo}*`,
    ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
    `Cerrado por ${cierre.cerrado_por} el ${cerradoEn}`,
  ].join('\n');
  const numero = telefonoDueno.replace(/[^0-9]/g, '');
  const linkWhatsApp = `https://wa.me/57${numero}?text=${encodeURIComponent(texto)}`;

  return (
    <Modal titulo={`Cierre de ${titulo}`} onCerrar={onCerrar}>
      <div id="ticket-imprimible" className="flex flex-col gap-3 rounded-campo bg-hundido p-4 font-mono text-[13px] text-tinta">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <strong className="text-base">DYM’S</strong>
          <span>Cierre de mes</span>
          <span className="capitalize">{titulo}</span>
        </div>
        <div className="flex flex-col gap-1 border-y border-dashed border-tinta-tenue py-2">
          {filas.map(([etiqueta, valor, fuerte]) => (
            <div key={etiqueta} className={`flex justify-between gap-3 ${fuerte ? 'font-bold' : ''}`}>
              <span>{etiqueta}</span>
              <span>{valor}</span>
            </div>
          ))}
        </div>
        <p className="text-center">Cerrado por {cierre.cerrado_por}<br />{cerradoEn}</p>
      </div>

      <div className="no-print flex flex-col gap-2.5">
        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-control bg-exito-fondo px-4 text-[15px] font-semibold text-exito-texto hover:bg-[#D3E9DB]"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Enviar al dueño por WhatsApp
        </a>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variante="secundario" onClick={onCerrar}>Cerrar</Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-5 w-5" aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      </div>
    </Modal>
  );
}
