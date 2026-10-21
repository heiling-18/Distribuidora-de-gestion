import React, { useId } from 'react';
import { cn } from './cn';
import { campoBase } from './Field';

interface Opcion {
  valor: string;
  texto: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  opciones: Opcion[];
  /** Oculta la etiqueta a la vista (sigue disponible para lectores de pantalla) */
  etiquetaOculta?: boolean;
}

export function Select({ etiqueta, opciones, etiquetaOculta, id, className, ...rest }: SelectProps) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={campoId} className={cn('text-[15px] font-semibold text-tinta', etiquetaOculta && 'sr-only')}>
        {etiqueta}
      </label>
      <select id={campoId} className={cn(campoBase, 'cursor-pointer pr-10 font-semibold', className)} {...rest}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </div>
  );
}
