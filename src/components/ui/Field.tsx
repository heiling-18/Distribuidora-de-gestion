import React, { useId } from 'react';
import { cn } from './cn';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Contenido a la derecha dentro del campo (p. ej. botón "Mostrar") */
  accesorio?: React.ReactNode;
  /**
   * Campo de pesos: muestra "118.000" mientras se escribe y entrega a onChange solo los dígitos ("118000").
   * En Colombia el punto separa miles; un campo numérico normal leería "118.000" como 118.
   */
  moneda?: boolean;
}

export const campoBase =
  'h-[52px] w-full rounded-campo border-[1.5px] border-borde bg-superficie px-4 text-base font-medium text-tinta ' +
  'placeholder:text-tinta-tenue transition-[border-color,box-shadow] duration-200 ' +
  'focus:border-rojo focus:outline-none focus:ring-4 focus:ring-rojo/15 disabled:opacity-60';

const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/**
 * "118000" o 118000 → "118.000"; vacío se queda vacío.
 * Un número con decimales que viene del código ("1500.5") se redondea a pesos en vez de leerse
 * como "15005": el punto de un número de JavaScript es decimal, no separador de miles.
 */
export function conMiles(valor: React.InputHTMLAttributes<HTMLInputElement>['value']): string {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  if (typeof valor === 'number' || /^\d+\.\d+$/.test(texto)) return miles.format(Math.round(Number(texto)));
  const digitos = texto.replace(/\D/g, '');
  return digitos ? miles.format(Number(digitos)) : '';
}

export function Field({ etiqueta, ayuda, error, accesorio, moneda, id, className, value, onChange, ...rest }: FieldProps) {
  const autoId = useId();
  const campoId = id ?? autoId;
  const ayudaId = ayuda ? `${campoId}-ayuda` : undefined;
  const errorId = error ? `${campoId}-error` : undefined;

  const propsValor = moneda
    ? {
        type: 'text',
        inputMode: 'numeric' as const,
        autoComplete: 'off',
        value: conMiles(value),
        // Se entrega el mismo evento, pero con el valor sin puntos ni símbolos.
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const digitos = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
          onChange?.({ ...e, target: { ...e.target, value: digitos } } as React.ChangeEvent<HTMLInputElement>);
        },
      }
    : { value, onChange };

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
          className={cn(campoBase, accesorio ? 'pr-24' : undefined, error && 'border-rojo', moneda && 'tabular', className)}
          {...rest}
          {...propsValor}
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
