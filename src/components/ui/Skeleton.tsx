import React from 'react';
import { cn } from './cn';

/** Bloque gris que late mientras llegan los datos */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-neutro-hover', className)} />;
}

/** Esqueleto de un módulo: encabezado, franja de cifras y tabla */
export function CargandoModulo() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-7">
      <span className="sr-only">Cargando datos…</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 bg-superficie p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-3.5 w-52 max-w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-tarjeta bg-superficie p-6">
        <Skeleton className="h-6 w-44" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
