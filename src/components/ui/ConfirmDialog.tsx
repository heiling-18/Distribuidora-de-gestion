'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  titulo: string;
  children: React.ReactNode;
  textoConfirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando?: boolean;
}

/** Confirmación de una acción que borra o revierte algo */
export function ConfirmDialog({ titulo, children, textoConfirmar, onConfirmar, onCancelar, cargando }: ConfirmDialogProps) {
  return (
    <Modal titulo={titulo} onCerrar={onCancelar}>
      <div className="flex flex-col gap-3 text-[15px] leading-normal text-tinta">{children}</div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variante="secundario" onClick={onCancelar}>Cancelar</Button>
        <Button
          onClick={onConfirmar}
          cargando={cargando}
          className="bg-rojo-oscuro hover:bg-error-texto"
        >
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
