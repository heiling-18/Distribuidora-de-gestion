'use client';

import React from 'react';
import { Button, Field, Modal, Select } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { CATEGORIAS_GASTO } from '@/lib/gastos';

interface GastoFormModalProps {
  editando: boolean;
  categoria: string;
  descripcion: string;
  monto: string;
  disponibleEnCaja: number;
  procesando: boolean;
  onCategoria: (v: string) => void;
  onDescripcion: (v: string) => void;
  onMonto: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCerrar: () => void;
}

export function GastoFormModal(p: GastoFormModalProps) {
  return (
    <Modal
      titulo={p.editando ? 'Editar gasto' : 'Registrar gasto'}
      descripcion="El monto se descuenta del dinero disponible en caja."
      onCerrar={p.onCerrar}
    >
      <form onSubmit={p.onSubmit} className="flex flex-col gap-4">
        <Select
          etiqueta="Categoría"
          value={p.categoria}
          onChange={(e) => p.onCategoria(e.target.value)}
          opciones={CATEGORIAS_GASTO}
        />
        <Field
          etiqueta="Descripción"
          required
          placeholder="Ej.: recibo de energía de octubre"
          value={p.descripcion}
          onChange={(e) => p.onDescripcion(e.target.value)}
        />
        <Field
          etiqueta="Monto"
          type="number"
          inputMode="numeric"
          required
          min="1"
          placeholder="50000"
          value={p.monto}
          onChange={(e) => p.onMonto(e.target.value)}
          ayuda={`Disponible en caja: ${formatoMoneda(p.disponibleEnCaja)}`}
          className="tabular"
        />
        <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando} className="mt-1">
          {p.editando ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </form>
    </Modal>
  );
}
