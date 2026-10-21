import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from './cn';

type TonoAlerta = 'error' | 'aviso' | 'exito' | 'info';

const estilos: Record<TonoAlerta, { caja: string; Icono: typeof Info }> = {
  error: { caja: 'bg-error-fondo text-error-texto', Icono: AlertCircle },
  aviso: { caja: 'bg-aviso-fondo text-aviso-texto', Icono: TriangleAlert },
  exito: { caja: 'bg-exito-fondo text-exito-texto', Icono: CheckCircle2 },
  info: { caja: 'bg-neutro text-tinta', Icono: Info },
};

/** Mensaje en línea (sin ventanas emergentes) */
export function Alert({ tono = 'info', className, children }: { tono?: TonoAlerta; className?: string; children: React.ReactNode }) {
  const { caja, Icono } = estilos[tono];
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-campo px-4 py-3.5 text-sm leading-snug', caja, className)}>
      <Icono className="mt-px h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
