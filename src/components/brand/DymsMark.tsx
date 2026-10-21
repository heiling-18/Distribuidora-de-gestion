import React from 'react';

/** Logotipo DYM'S: marca + nombre */
export function DymsMark({ tamano = 40, conNombre = true, className }: { tamano?: number; conNombre?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      <svg width={tamano} height={tamano} viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#D23A1E" />
        <path d="M12 25c0-6 4-10 9-10 4 0 7 3 7 7 0 5-4 8-9 8-4 0-7-2-7-5z" fill="#FBF7EF" />
        <path d="M22 11c1-3 4-3 4 0 1-2 4-1 3 2z" fill="#F2B33D" />
      </svg>
      {conNombre && <span className="font-display text-[26px] font-extrabold tracking-[-0.02em]">DYM’S</span>}
    </span>
  );
}
