import React from 'react';
import { LogOut } from 'lucide-react';
import { DymsMark } from '@/components/brand/DymsMark';
import { cn } from '@/components/ui';
import { modulosVisibles, type Modulo } from '@/lib/modulos';

export interface UsuarioShell {
  nombre: string;
  rol: 'admin' | 'vendedor';
}

interface SidebarProps {
  moduloActivo: Modulo;
  onCambiar: (m: Modulo) => void;
  usuario: UsuarioShell;
  onSalir: () => void;
  stockBajo: number;
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'D';
}

/** Menú lateral de escritorio (≥ lg) */
export function Sidebar({ moduloActivo, onCambiar, usuario, onSalir, stockBajo }: SidebarProps) {
  const esAdmin = usuario.rol === 'admin';
  const modulos = modulosVisibles(esAdmin);
  const generales = modulos.filter((m) => !m.soloAdmin);
  const admin = modulos.filter((m) => m.soloAdmin);

  const item = (m: (typeof modulos)[number]) => {
    const activo = moduloActivo === m.id;
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => onCambiar(m.id)}
        aria-current={activo ? 'page' : undefined}
        className={cn(
          'flex h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-[15px] font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maiz',
          activo ? 'bg-rojo text-white' : 'text-crema-suave hover:bg-carbon-claro hover:text-white'
        )}
      >
        <m.Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="truncate">{m.etiqueta}</span>
        {m.id === 'inventario' && stockBajo > 0 && (
          <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-maiz px-1.5 text-xs font-bold text-noche tabular" title={`${stockBajo} productos por reponer`}>
            {stockBajo}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-7 overflow-y-auto bg-noche px-4 py-6 text-crema lg:flex">
      <DymsMark tamano={34} className="px-2 [&>span:last-child]:text-[22px]" />

      <nav aria-label="Principal" className="flex flex-col gap-7">
        <div className="flex flex-col gap-1">{generales.map(item)}</div>
        {admin.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="px-3 pb-1.5 text-[13px] text-tinta-tenue">Administración</span>
            {admin.map(item)}
          </div>
        )}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-campo bg-carbon p-3">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control bg-maiz text-sm font-bold text-noche">
          {iniciales(usuario.nombre)}
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="truncate text-sm font-semibold text-white">{usuario.nombre}</strong>
          <span className="text-[13px] text-crema-suave">{esAdmin ? 'Administrador' : 'Vendedor'}</span>
        </span>
        <button
          type="button"
          onClick={onSalir}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="ml-auto flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-crema-suave transition-colors hover:bg-rojo hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
