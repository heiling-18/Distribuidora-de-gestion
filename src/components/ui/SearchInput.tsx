import React from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';
import { campoBase } from './Field';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  /** Ocupa todo el ancho disponible (por defecto máximo 420 px) */
  anchoCompleto?: boolean;
  /** Campo más alto y letra más grande */
  grande?: boolean;
}

// Sin alto ni tamaño de letra fijos: se ponen abajo según "grande" (dos clases de alto chocarían)
const baseBusqueda = campoBase.replace('h-[52px] ', '').replace('text-base ', '');

/** Campo de búsqueda con lupa; la etiqueta queda para lectores de pantalla */
export function SearchInput({ etiqueta, valor, onCambiar, anchoCompleto, grande, className, ...rest }: SearchInputProps) {
  return (
    <label className={cn('relative block w-full', anchoCompleto ? 'max-w-none' : 'max-w-[420px]', className)}>
      <span className="sr-only">{etiqueta}</span>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-tenue" aria-hidden="true" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className={cn(baseBusqueda, 'pl-12', grande ? 'h-14 text-[17px]' : 'h-12 text-base')}
        {...rest}
      />
    </label>
  );
}
