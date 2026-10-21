import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/components/ui';

export interface Notificacion {
  id: number;
  tipo: 'exito' | 'error' | 'advertencia' | 'info';
  mensaje: string;
}

const estilos: Record<Notificacion['tipo'], { caja: string; icono: string; Icono: typeof Info }> = {
  exito: { caja: 'bg-noche text-crema', icono: 'text-[#7FD3A0]', Icono: CheckCircle2 },
  error: { caja: 'bg-rojo text-white', icono: '', Icono: AlertCircle },
  advertencia: { caja: 'bg-maiz text-noche', icono: '', Icono: TriangleAlert },
  info: { caja: 'bg-noche text-crema', icono: 'text-maiz', Icono: Info },
};

/** Notificaciones flotantes; quedan por encima de modales y de la barra inferior del celular */
export function Toasts({ notificaciones, onCerrar }: { notificaciones: Notificacion[]; onCerrar: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-4 bottom-[84px] z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 lg:bottom-5"
    >
      {notificaciones.map((n) => {
        const { caja, icono, Icono } = estilos[n.tipo];
        return (
          <div
            key={n.id}
            role={n.tipo === 'error' ? 'alert' : 'status'}
            className={cn(
              'animate-subir pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-campo px-4 py-3 text-sm font-semibold leading-snug shadow-[0_18px_40px_-16px_rgba(23,19,15,0.6)]',
              caja
            )}
          >
            <Icono className={cn('mt-px h-5 w-5 shrink-0', icono)} aria-hidden="true" />
            <span className="flex-1">{n.mensaje}</span>
            <button
              type="button"
              onClick={() => onCerrar(n.id)}
              aria-label="Cerrar notificación"
              className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
