import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';
type Tamano = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
  anchoCompleto?: boolean;
}

const variantes: Record<Variante, string> = {
  primario: 'bg-rojo text-white hover:bg-rojo-hover',
  secundario: 'bg-neutro text-tinta hover:bg-neutro-hover',
  fantasma: 'bg-transparent text-tinta hover:bg-neutro',
  peligro: 'bg-transparent text-rojo-oscuro hover:bg-error-fondo',
};

const tamanos: Record<Tamano, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-6 text-[17px]',
};

export function Button({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  anchoCompleto = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-bold transition-[background-color,transform] duration-150',
        'active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
        'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        variantes[variante],
        tamanos[tamano],
        anchoCompleto && 'w-full',
        className
      )}
      {...rest}
    >
      {cargando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
