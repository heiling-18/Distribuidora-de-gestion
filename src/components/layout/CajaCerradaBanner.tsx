import React from 'react';
import { Lock } from 'lucide-react';

/** Aviso fijo mientras la caja del día no esté abierta */
export function CajaCerradaBanner({ texto, onVerCaja }: { texto: string; onVerCaja: () => void }) {
  return (
    <div role="status" className="no-print bg-aviso-fondo text-aviso-texto">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <p className="flex items-center gap-2.5 text-sm font-semibold">
          <Lock className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {texto}
        </p>
        <button
          type="button"
          onClick={onVerCaja}
          className="h-9 cursor-pointer rounded-control bg-noche px-4 text-sm font-bold text-white transition-colors hover:bg-carbon-claro"
        >
          Ver caja
        </button>
      </div>
    </div>
  );
}
