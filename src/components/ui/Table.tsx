import React from 'react';
import { cn } from './cn';

/** Tarjeta blanca que contiene una tabla o un bloque de contenido */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('overflow-hidden rounded-tarjeta bg-superficie', className)}>{children}</section>;
}

/** Tabla con desplazamiento horizontal en pantallas pequeñas */
export function Tabla({ minAncho = 720, className, children }: { minAncho?: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[15px]" style={{ minWidth: minAncho }}>
        {children}
      </table>
    </div>
  );
}

type Alineacion = 'izq' | 'der' | 'centro';
const alineaciones: Record<Alineacion, string> = { izq: 'text-left', der: 'text-right', centro: 'text-center' };

export function Th({ alinear = 'izq', className, children }: { alinear?: Alineacion; className?: string; children?: React.ReactNode }) {
  return (
    <th scope="col" className={cn('sticky top-0 bg-superficie px-4 py-3 text-sm font-semibold text-tinta-suave first:pl-6 last:pr-6', alineaciones[alinear], className)}>
      {children}
    </th>
  );
}

export function Td({ alinear = 'izq', className, children }: { alinear?: Alineacion; className?: string; children?: React.ReactNode }) {
  return <td className={cn('px-4 py-3.5 align-middle first:pl-6 last:pr-6', alineaciones[alinear], className)}>{children}</td>;
}

export function Fila({ className, children }: { className?: string; children: React.ReactNode }) {
  return <tr className={cn('border-t border-linea transition-colors hover:bg-[#FAF8F4]', className)}>{children}</tr>;
}
