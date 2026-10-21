'use client';

import React from 'react';
import { Button, Field, Modal } from '@/components/ui';

interface ClienteFormModalProps {
  editando: boolean;
  documento: string;
  nombre: string;
  telefono: string;
  direccion: string;
  procesando: boolean;
  onDocumento: (v: string) => void;
  onNombre: (v: string) => void;
  onTelefono: (v: string) => void;
  onDireccion: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCerrar: () => void;
}

export function ClienteFormModal(p: ClienteFormModalProps) {
  return (
    <Modal titulo={p.editando ? 'Editar cliente' : 'Nuevo cliente'} onCerrar={p.onCerrar}>
      <form onSubmit={p.onSubmit} className="flex flex-col gap-4">
        <Field
          etiqueta="Cédula o NIT"
          required
          inputMode="numeric"
          placeholder="Ej.: 1098765432"
          value={p.documento}
          onChange={(e) => p.onDocumento(e.target.value)}
          className="tabular"
        />
        <Field
          etiqueta="Nombre completo"
          required
          autoComplete="name"
          placeholder="Ej.: Carlos Gómez"
          value={p.nombre}
          onChange={(e) => p.onNombre(e.target.value)}
        />
        <Field
          etiqueta="WhatsApp o teléfono"
          type="tel"
          inputMode="tel"
          placeholder="Ej.: 3101234567"
          value={p.telefono}
          onChange={(e) => p.onTelefono(e.target.value)}
          ayuda="Opcional. Se usa para enviar el ticket por WhatsApp."
          className="tabular"
        />
        <Field
          etiqueta="Dirección o finca"
          placeholder="Ej.: Vereda El Salitre"
          value={p.direccion}
          onChange={(e) => p.onDireccion(e.target.value)}
        />
        <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando} className="mt-1">
          {p.editando ? 'Guardar cambios' : 'Registrar cliente'}
        </Button>
      </form>
    </Modal>
  );
}
