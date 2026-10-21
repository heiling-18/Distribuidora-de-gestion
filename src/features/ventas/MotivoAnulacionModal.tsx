'use client';

import React from 'react';
import { Button, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { Venta } from '@/types';

export function MotivoAnulacionModal({ venta, onCerrar }: { venta: Venta; onCerrar: () => void }) {
  const filas: [string, React.ReactNode][] = [
    ['Producto', `${venta.nombre_producto} × ${venta.cantidad}`],
    ['Total anulado', <span key="t" className="tabular">{formatoMoneda(venta.total_venta)}</span>],
    ['Cliente', venta.cliente_nombre],
    ['Vendedor', venta.vendedor],
  ];

  return (
    <Modal titulo={`Venta anulada #${venta.id}`} onCerrar={onCerrar}>
      <dl className="flex flex-col gap-2.5 rounded-campo bg-hundido px-4 py-3.5 text-[15px]">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex justify-between gap-4">
            <dt className="text-tinta-suave">{etiqueta}</dt>
            <dd className="text-right font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
      <figure className="flex flex-col gap-1.5">
        <figcaption className="text-sm font-semibold text-tinta-suave">Motivo registrado</figcaption>
        <blockquote className="rounded-campo bg-error-fondo px-4 py-3 text-base font-semibold text-error-texto">
          {venta.motivo_anulacion || 'Sin motivo especificado'}
        </blockquote>
      </figure>
      <Button variante="secundario" anchoCompleto onClick={onCerrar}>Cerrar</Button>
    </Modal>
  );
}
