'use client';

import React from 'react';
import { Button, Field, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { Venta } from '@/types';

interface AnularVentaModalProps {
  venta: Venta;
  motivo: string;
  procesando: boolean;
  onMotivo: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const MAX_MOTIVO = 40;

export function AnularVentaModal({ venta, motivo, procesando, onMotivo, onConfirmar, onCancelar }: AnularVentaModalProps) {
  return (
    <Modal
      titulo={`Anular venta #${venta.id}`}
      descripcion={
        <>
          Se devolverán <strong className="text-tinta">{venta.cantidad} {venta.cantidad === 1 ? 'unidad' : 'unidades'}</strong> de{' '}
          <strong className="text-tinta">{venta.nombre_producto}</strong> al inventario y se descontarán{' '}
          <strong className="text-tinta tabular">{formatoMoneda(venta.total_venta)}</strong> del dinero en caja.
        </>
      }
      onCerrar={onCancelar}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (motivo.trim()) onConfirmar();
        }}
      >
        <Field
          etiqueta="Motivo de la anulación"
          required
          autoFocus
          maxLength={MAX_MOTIVO}
          placeholder="Ej.: devolución del cliente"
          value={motivo}
          onChange={(e) => onMotivo(e.target.value.slice(0, MAX_MOTIVO))}
          ayuda={`${motivo.length}/${MAX_MOTIVO} caracteres`}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variante="secundario" onClick={onCancelar}>Cancelar</Button>
          <Button type="submit" disabled={!motivo.trim()} cargando={procesando} className="bg-rojo-oscuro hover:bg-error-texto">
            Anular venta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
