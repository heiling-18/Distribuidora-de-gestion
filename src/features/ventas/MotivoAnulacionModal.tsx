'use client';

import React from 'react';
import { Button, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { textoItems } from '@/lib/ventas';
import type { Venta } from '@/types/api';

export function MotivoAnulacionModal({ venta, onCerrar }: { venta: Venta; onCerrar: () => void }) {
  const filas: [string, React.ReactNode][] = [
    ['Productos', textoItems(venta) || '—'],
    ['Total anulado', <span key="t" className="tabular">{formatoMoneda(venta.total)}</span>],
    ['Cliente', venta.clienteNombre],
    ['Vendedor', venta.vendedorNombre],
    ['Anulada el', venta.anuladaEn ? new Date(venta.anuladaEn).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'],
  ];

  return (
    <Modal titulo={`Venta anulada #${venta.numero}`} onCerrar={onCerrar}>
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
          {venta.motivoAnulacion || 'Sin motivo especificado'}
        </blockquote>
      </figure>
      <Button variante="secundario" anchoCompleto onClick={onCerrar}>Cerrar</Button>
    </Modal>
  );
}
