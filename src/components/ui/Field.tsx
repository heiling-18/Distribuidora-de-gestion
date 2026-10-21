import React, { useId } from 'react';
import { cn } from './cn';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Contenido a la derecha dentro del campo (p. ej. botón "Mostrar") */
  accesorio?: React.ReactNode;
}

export const campoBase =
  'h-[52px] w-full rounded-campo border-[1.5px] border-borde bg-superficie px-4 text-base font-medium text-tinta ' +
  'placeholder:text-tinta-tenue transition-[border-color,box-shadow] duration-200 ' +
  'focus:border-rojo focus:outline-none focus:ring-4 focus:ring-rojo/15 disabled:opacity-60';

export function Field({ etiqueta, ayuda, error, accesorio, id, className, ...rest }: FieldProps) {
  const autoId = useId();
  const campoId = id ?? autoId;
  const ayudaId = ayuda ? `${campoId}-ayuda` : undefined;
  const errorId = error ? `${campoId}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={campoId} className="text-[15px] font-semibold text-tinta">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={campoId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[ayudaId, errorId].filter(Boolean).join(' ') || undefined}
          className={cn(campoBase, accesorio ? 'pr-24' : undefined, error && 'border-rojo', className)}
          {...rest}
        />
        {accesorio && <div className="absolute right-1.5 top-1.5">{accesorio}</div>}
      </div>
      {ayuda && !error && (
        <p id={ayudaId} className="text-sm text-tinta-suave">{ayuda}</p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-error-texto">{error}</p>
      )}
    </div>
  );
}
