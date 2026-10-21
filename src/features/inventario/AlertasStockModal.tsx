'use client';

import React from 'react';
import { Badge, Button, EmptyState, Modal } from '@/components/ui';
import type { Producto } from '@/types';

interface AlertasStockModalProps {
  productos: Producto[];
  esAdmin: boolean;
  onReponer: (p: Producto) => void;
  onCerrar: () => void;
}

/** Productos agotados o por debajo de su mínimo */
export function AlertasStockModal({ productos, esAdmin, onReponer, onCerrar }: AlertasStockModalProps) {
  const lista = productos.filter((p) => p.stock <= p.stock_minimo).sort((a, b) => a.stock - b.stock);

  return (
    <Modal
      titulo="Productos por reponer"
      descripcion={lista.length > 0 ? `${lista.length} ${lista.length === 1 ? 'producto está' : 'productos están'} en el mínimo o por debajo.` : undefined}
      onCerrar={onCerrar}
      ancho="md"
    >
      {lista.length === 0 ? (
        <EmptyState titulo="Todo en orden" descripcion="Todos los productos tienen existencias por encima de su mínimo." />
      ) : (
        <ul className="-mx-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-1">
          {lista.map((p) => {
            const agotado = p.stock <= 0;
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-campo bg-hundido px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="truncate font-semibold">{p.nombre}</strong>
                  <span className="text-sm text-tinta-suave tabular">Mínimo {p.stock_minimo} {p.unidad_medida}s</span>
                </div>
                <Badge tono={agotado ? 'error' : 'aviso'}>{agotado ? 'Agotado' : `Quedan ${p.stock}`}</Badge>
                {esAdmin && (
                  <Button tamano="sm" onClick={() => onReponer(p)}>Reponer</Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Button variante="secundario" anchoCompleto onClick={onCerrar}>Cerrar</Button>
    </Modal>
  );
}
