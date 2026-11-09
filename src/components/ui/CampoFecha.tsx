'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';
import { hoyNegocio } from '@/lib/fechas';
import { campoBase } from './Field';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Las fechas se manejan como texto "YYYY-MM-DD" y se arman con la hora local para no correr el día por la zona horaria.
const aTexto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const aFecha = (t: string) => {
  const [a, m, d] = t.split('-').map(Number) as [number, number, number];
  return new Date(a, m - 1, d);
};
const hoyTexto = () => hoyNegocio();
const sumarDias = (t: string, n: number) => {
  const d = aFecha(t);
  d.setDate(d.getDate() + n);
  return aTexto(d);
};
/** Lunes = 0 … domingo = 6 */
const diaSemana = (d: Date) => (d.getDay() + 6) % 7;

/** "8 de noviembre de 2026" */
export function fechaLarga(t: string): string {
  const d = aFecha(t);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

interface CampoFechaProps {
  etiqueta: string;
  /** "YYYY-MM-DD" */
  value: string;
  /** Mismo formato que un <input type="date">: e.target.value */
  onChange: (e: { target: { value: string } }) => void;
  min?: string;
  max?: string;
  className?: string;
}

/** Selector de fecha con el estilo de la app (el <input type="date"> muestra el calendario del sistema operativo). */
export function CampoFecha({ etiqueta, value, onChange, min, max, className }: CampoFechaProps) {
  const id = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const rejilla = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  /** Día con el foco del teclado (también define el mes que se ve). */
  const [foco, setFoco] = useState(value || hoyTexto());

  const fueraDeRango = (t: string) => (min !== undefined && t < min) || (max !== undefined && t > max);

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  // Mantener el foco del teclado en el día activo.
  useEffect(() => {
    if (abierto) rejilla.current?.querySelector<HTMLButtonElement>(`[data-dia="${foco}"]`)?.focus();
  }, [abierto, foco]);

  const abrir = () => {
    setFoco(value || hoyTexto());
    setAbierto(true);
  };

  const elegir = (t: string) => {
    if (fueraDeRango(t)) return;
    if (t !== value) onChange({ target: { value: t } });
    setAbierto(false);
    boton.current?.focus();
  };

  const cambiarMes = (n: number) => {
    const d = aFecha(foco);
    const destino = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    destino.setDate(Math.min(d.getDate(), ultimoDia));
    setFoco(aTexto(destino));
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    const mover: Record<string, () => void> = {
      ArrowLeft: () => setFoco(sumarDias(foco, -1)),
      ArrowRight: () => setFoco(sumarDias(foco, 1)),
      ArrowUp: () => setFoco(sumarDias(foco, -7)),
      ArrowDown: () => setFoco(sumarDias(foco, 7)),
      PageUp: () => cambiarMes(-1),
      PageDown: () => cambiarMes(1),
      Home: () => setFoco(sumarDias(foco, -diaSemana(aFecha(foco)))),
      End: () => setFoco(sumarDias(foco, 6 - diaSemana(aFecha(foco)))),
      Escape: () => {
        setAbierto(false);
        boton.current?.focus();
      },
    };
    if (mover[e.key]) {
      e.preventDefault();
      mover[e.key]!();
    }
  };

  // Rejilla de 6 semanas que empieza el lunes anterior (o igual) al día 1 del mes.
  const visto = aFecha(foco);
  const primero = new Date(visto.getFullYear(), visto.getMonth(), 1);
  const inicio = aTexto(new Date(primero.getFullYear(), primero.getMonth(), 1 - diaSemana(primero)));
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
  const hoy = hoyTexto();
  const mesAnteriorBloqueado = min !== undefined && aTexto(new Date(visto.getFullYear(), visto.getMonth(), 0)) < min;
  const mesSiguienteBloqueado = max !== undefined && aTexto(new Date(visto.getFullYear(), visto.getMonth() + 1, 1)) > max;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-[15px] font-semibold text-tinta">
        {etiqueta}
      </label>
      <div ref={contenedor} className="relative">
        <button
          ref={boton}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          onClick={() => (abierto ? setAbierto(false) : abrir())}
          className={cn(campoBase, 'flex cursor-pointer items-center justify-between gap-3 text-left font-semibold', abierto && 'border-rojo ring-4 ring-rojo/15')}
        >
          <span className="truncate">{value ? fechaLarga(value) : 'Elegir fecha'}</span>
          <CalendarDays className={cn('h-5 w-5 shrink-0 text-tinta-suave', abierto && 'text-rojo')} aria-hidden="true" />
        </button>

        {abierto && (
          <div
            role="dialog"
            aria-label={`Elegir ${etiqueta.toLowerCase()}`}
            onKeyDown={alTeclear}
            className="absolute left-0 top-full z-30 mt-2 w-[19.5rem] rounded-tarjeta border border-linea bg-superficie p-4 shadow-[0_12px_32px_-8px_rgba(23,19,15,0.25)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                disabled={mesAnteriorBloqueado}
                aria-label="Mes anterior"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-tinta hover:bg-hundido disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="font-display text-[17px] font-bold capitalize" aria-live="polite">
                {MESES[visto.getMonth()]} {visto.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => cambiarMes(1)}
                disabled={mesSiguienteBloqueado}
                aria-label="Mes siguiente"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-tinta hover:bg-hundido disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center" aria-hidden="true">
              {DIAS.map((d) => (
                <span key={d} className="pb-1 text-xs font-bold text-tinta-suave">{d}</span>
              ))}
            </div>
            <div ref={rejilla} role="grid" className="grid grid-cols-7 gap-1">
              {dias.map((t) => {
                const d = aFecha(t);
                const delMes = d.getMonth() === visto.getMonth();
                const elegido = t === value;
                const bloqueado = fueraDeRango(t);
                return (
                  <button
                    key={t}
                    type="button"
                    data-dia={t}
                    tabIndex={t === foco ? 0 : -1}
                    disabled={bloqueado}
                    aria-pressed={elegido}
                    aria-label={`${DIAS_LARGOS[diaSemana(d)]} ${fechaLarga(t)}${t === hoy ? ', hoy' : ''}`}
                    onClick={() => elegir(t)}
                    className={cn(
                      'flex h-9 cursor-pointer items-center justify-center rounded-[10px] text-sm tabular transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rojo',
                      elegido
                        ? 'bg-rojo font-bold text-white'
                        : cn(
                            'hover:bg-hundido',
                            delMes ? 'font-semibold text-tinta' : 'text-tinta-tenue',
                            t === hoy && 'ring-1 ring-inset ring-rojo font-bold text-rojo',
                          ),
                      bloqueado && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-end border-t border-linea pt-3">
              <button
                type="button"
                onClick={() => elegir(hoy)}
                disabled={fueraDeRango(hoy)}
                className="cursor-pointer rounded-control px-3 py-1.5 text-sm font-bold text-rojo hover:bg-hundido disabled:opacity-30"
              >
                Hoy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
