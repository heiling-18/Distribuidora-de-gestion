import React from 'react';
import { cn } from './cn';

/** Bloque para listas o tablas sin datos */
export function EmptyState({ titulo, descripcion, accion, className }: { titulo: string; descripcion?: string; accion?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-campo bg-hundido px-6 py-10 text-center', className)}>
      <strong className="text-base text-tinta">{titulo}</strong>
      {descripcion && <p className="max-w-sm text-sm text-tinta-suave">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
