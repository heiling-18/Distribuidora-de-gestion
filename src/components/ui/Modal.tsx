'use client';

import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

interface ModalProps {
  titulo: string;
  descripcion?: React.ReactNode;
  onCerrar: () => void;
  children: React.ReactNode;
  /** Ancho máximo del panel */
  ancho?: 'sm' | 'md' | 'lg';
  className?: string;
}

const anchos = { sm: 'max-w-[420px]', md: 'max-w-[520px]', lg: 'max-w-[720px]' };

/** Ventana emergente accesible: cierra con Escape o tocando fuera */
export function Modal({ titulo, descripcion, onCerrar, children, ancho = 'sm', className }: ModalProps) {
  const tituloId = useId();

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={onCerrar} className="fixed inset-0 cursor-default bg-noche/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={cn(
          'animate-subir relative flex w-full flex-col gap-5 rounded-t-[24px] bg-superficie p-6 shadow-[0_30px_80px_-24px_rgba(23,19,15,0.55)] sm:my-8 sm:rounded-tarjeta sm:p-7',
          anchos[ancho],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={tituloId} className="font-display text-2xl font-extrabold tracking-[-0.02em] text-tinta">{titulo}</h2>
            {descripcion && <div className="text-[15px] leading-normal text-tinta-suave">{descripcion}</div>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar ventana"
            className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control text-tinta-suave hover:bg-neutro hover:text-tinta"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
