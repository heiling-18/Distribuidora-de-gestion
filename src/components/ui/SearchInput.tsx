import React from 'react';
import { Search } from 'lucide-react';
import { cn } from './cn';
import { campoBase } from './Field';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
}

/** Campo de búsqueda con lupa; la etiqueta queda para lectores de pantalla */
export function SearchInput({ etiqueta, valor, onCambiar, className, ...rest }: SearchInputProps) {
  return (
    <label className={cn('relative block w-full max-w-[420px]', className)}>
      <span className="sr-only">{etiqueta}</span>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-tenue" aria-hidden="true" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className={cn(campoBase, 'h-12 pl-12')}
        {...rest}
      />
    </label>
  );
}
