import React from 'react';
import { cn } from './cn';

export type TonoBadge = 'neutro' | 'exito' | 'aviso' | 'error' | 'mayor';

const tonos: Record<TonoBadge, string> = {
  neutro: 'bg-neutro text-tinta-suave',
  exito: 'bg-exito-fondo text-exito-texto',
  aviso: 'bg-aviso-fondo text-aviso-texto',
  error: 'bg-error-fondo text-error-texto',
  mayor: 'bg-mayor-fondo text-mayor',
};

export function Badge({ tono = 'neutro', className, children }: { tono?: TonoBadge; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-bold tabular', tonos[tono], className)}>
      {children}
    </span>
  );
}
