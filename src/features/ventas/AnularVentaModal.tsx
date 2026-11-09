'use client';

import React from 'react';
import { Button, Field, Modal } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { textoItems } from '@/lib/ventas';
import type { Venta } from '@/types/api';

interface AnularVentaModalProps {
  venta: Venta;
  motivo: string;
  procesando: boolean;
  onMotivo: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const MAX_MOTIVO = 120;

export function AnularVentaModal({ venta, motivo, procesando, onMotivo, onConfirmar, onCancelar }: AnularVentaModalProps) {
  return (
    <Modal
      titulo={`Anular venta #${venta.numero}`}
      descripcion={
        <>
          Se devolverá al inventario <strong className="text-tinta">{textoItems(venta) || 'lo vendido'}</strong> y la venta de{' '}
          <strong className="text-tinta tabular">{formatoMoneda(venta.total)}</strong> dejará de contar en la caja y en los reportes.
        </>
      }
      onCerrar={onCancelar}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (motivo.trim().length >= 3) onConfirmar();
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
          <Button type="submit" disabled={motivo.trim().length < 3} cargando={procesando} className="bg-rojo-oscuro hover:bg-error-texto">
            Anular venta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
