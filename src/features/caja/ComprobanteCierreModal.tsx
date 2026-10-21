'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { CierreCaja } from '@/types';

/** Comprobante del arqueo; el bloque #ticket-imprimible es lo único que sale en la impresora (ver globals.css) */
export function ComprobanteCierreModal({ cierre, onCerrar }: { cierre: CierreCaja; onCerrar: () => void }) {
  const filas: [string, string, boolean?][] = [
    ['Base de apertura', formatoMoneda(cierre.monto_inicial)],
    ['Ventas en efectivo', `+${formatoMoneda(cierre.ventas_efectivo)}`],
    ['Ventas por transferencia', `+${formatoMoneda(cierre.ventas_transferencia)}`],
    ['Gastos pagados', `-${formatoMoneda(cierre.total_gastos)}`],
    ['Efectivo esperado', formatoMoneda(cierre.dinero_esperado), true],
    ['Efectivo contado', formatoMoneda(cierre.dinero_real), true],
    ['Diferencia', formatoMoneda(cierre.diferencia), true],
  ];

  return (
    <Modal titulo="Comprobante de cierre" onCerrar={onCerrar}>
      <div id="ticket-imprimible" className="flex flex-col gap-3 rounded-campo bg-hundido p-4 font-mono text-[13px] text-tinta">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <strong className="text-base">DYM’S</strong>
          <span>Comprobante de cierre de caja</span>
          <span>{new Date(cierre.hora_cierre).toLocaleString('es-CO')}</span>
          <span>Responsable: {cierre.responsable}</span>
        </div>
        <div className="flex flex-col gap-1 border-y border-dashed border-tinta-tenue py-2">
          {filas.map(([etiqueta, valor, fuerte]) => (
            <div key={etiqueta} className={`flex justify-between gap-3 ${fuerte ? 'font-bold' : ''}`}>
              <span>{etiqueta}</span>
              <span>{valor}</span>
            </div>
          ))}
        </div>
        {cierre.observaciones && <p className="text-center italic">“{cierre.observaciones}”</p>}
      </div>

      <div className="no-print grid grid-cols-2 gap-2.5">
        <Button variante="secundario" onClick={onCerrar}>Cerrar</Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-5 w-5" aria-hidden="true" />
          Imprimir
        </Button>
      </div>
    </Modal>
  );
}
