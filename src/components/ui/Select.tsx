'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { campoBase } from './Field';

interface Opcion {
  valor: string;
  texto: string;
}

interface SelectProps {
  etiqueta: string;
  opciones: readonly Opcion[];
  value: string;
  /** Recibe un objeto con la misma forma que el evento de un <select> nativo: e.target.value */
  onChange: (e: { target: { value: string } }) => void;
  /** Oculta la etiqueta a la vista (sigue disponible para lectores de pantalla) */
  etiquetaOculta?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Lista desplegable con el estilo de la app (el <select> nativo muestra el menú del sistema operativo).
 * Teclado: flechas, Inicio/Fin, Enter o espacio para elegir, Esc para cerrar, y una letra para saltar.
 */
export function Select({ etiqueta, opciones, value, onChange, etiquetaOculta, id, className, disabled }: SelectProps) {
  const autoId = useId();
  const campoId = id ?? autoId;
  const listaId = `${campoId}-lista`;
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [activo, setActivo] = useState(0);

  const indiceActual = Math.max(0, opciones.findIndex((o) => o.valor === value));
  const seleccionada = opciones[indiceActual];

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    if (!abierta) return;
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierta(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierta]);

  const abrir = () => {
    setActivo(indiceActual);
    setAbierta(true);
  };

  const elegir = (i: number) => {
    const o = opciones[i];
    if (o && o.valor !== value) onChange({ target: { value: o.valor } });
    setAbierta(false);
    boton.current?.focus();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const ultimo = opciones.length - 1;
    if (!abierta) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActivo((i) => Math.min(ultimo, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActivo(0);
        break;
      case 'End':
        e.preventDefault();
        setActivo(ultimo);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        elegir(activo);
        break;
      case 'Escape':
      case 'Tab':
        setAbierta(false);
        break;
      default:
        // Saltar a la primera opción que empiece con la letra escrita.
        if (e.key.length === 1) {
          const letra = e.key.toLowerCase();
          const i = opciones.findIndex((o) => o.texto.toLowerCase().startsWith(letra));
          if (i >= 0) setActivo(i);
        }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label id={`${campoId}-etiqueta`} htmlFor={campoId} className={cn('text-[15px] font-semibold text-tinta', etiquetaOculta && 'sr-only')}>
        {etiqueta}
      </label>
      <div ref={contenedor} className="relative">
        <button
          ref={boton}
          id={campoId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={abierta}
          aria-controls={listaId}
          aria-labelledby={`${campoId}-etiqueta ${campoId}`}
          onClick={() => (abierta ? setAbierta(false) : abrir())}
          onKeyDown={alTeclear}
          className={cn(
            campoBase,
            'flex cursor-pointer items-center justify-between gap-3 text-left font-semibold',
            abierta && 'border-rojo ring-4 ring-rojo/15',
            className,
          )}
        >
          <span className="truncate">{seleccionada?.texto ?? 'Elegir…'}</span>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-tinta-suave transition-transform duration-200', abierta && 'rotate-180 text-rojo')}
            aria-hidden="true"
          />
        </button>

        {abierta && (
          <ul
            id={listaId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${campoId}-etiqueta`}
            aria-activedescendant={`${campoId}-op-${activo}`}
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-campo border border-linea bg-superficie p-1.5 shadow-[0_12px_32px_-8px_rgba(23,19,15,0.25)]"
          >
            {opciones.map((o, i) => {
              const elegida = o.valor === value;
              return (
                <li
                  key={o.valor}
                  id={`${campoId}-op-${i}`}
                  role="option"
                  aria-selected={elegida}
                  onMouseEnter={() => setActivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-[15px]',
                    i === activo && 'bg-hundido',
                    elegida ? 'font-bold text-rojo' : 'font-medium text-tinta',
                  )}
                >
                  <span className="truncate">{o.texto}</span>
                  {elegida && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
