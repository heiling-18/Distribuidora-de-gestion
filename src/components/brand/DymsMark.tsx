import React from 'react';
import Image from 'next/image';

/** Logotipo DYM'S (gallina con trigo y huevos) + nombre opcional al lado */
export function DymsMark({ tamano = 40, conNombre = true, className }: { tamano?: number; conNombre?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      <Image
        src="/logo-dyms.webp"
        width={tamano}
        height={tamano}
        // Si el nombre va al lado, la imagen es decorativa; si va sola, la nombra
        alt={conNombre ? '' : 'DYM’S'}
        priority
        className="shrink-0 rounded-[22%]"
        style={{ width: tamano, height: tamano }}
      />
      {conNombre && <span className="font-display text-[26px] font-extrabold tracking-[-0.02em]">DYM’S</span>}
    </span>
  );
}
