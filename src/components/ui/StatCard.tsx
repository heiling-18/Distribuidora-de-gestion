import React from 'react';
import { cn } from './cn';

type TonoStat = 'claro' | 'oscuro' | 'aviso';

const tonos: Record<TonoStat, { caja: string; etiqueta: string }> = {
  claro: { caja: 'bg-superficie text-tinta', etiqueta: 'text-tinta-suave' },
  oscuro: { caja: 'bg-noche text-crema', etiqueta: 'text-crema-suave' },
  aviso: { caja: 'bg-aviso-fondo text-tinta', etiqueta: 'text-aviso-texto' },
};

interface StatCardProps {
  etiqueta: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  tono?: TonoStat;
  className?: string;
}

/** Cifra principal de un resumen (ventas del día, dinero en caja…) */
export function StatCard({ etiqueta, valor, detalle, tono = 'claro', className }: StatCardProps) {
  const t = tonos[tono];
  return (
    <div className={cn('flex flex-col gap-2.5 p-6', t.caja, className)}>
      <span className={cn('text-[15px]', t.etiqueta)}>{etiqueta}</span>
      <strong className="font-display text-[38px] font-extrabold leading-none tracking-[-0.03em] tabular">{valor}</strong>
      {detalle && <span className={cn('text-sm tabular', t.etiqueta)}>{detalle}</span>}
    </div>
  );
}
