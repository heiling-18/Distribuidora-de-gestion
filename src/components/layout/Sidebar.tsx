import React from 'react';
import { LogOut } from 'lucide-react';
import { DymsMark } from '@/components/brand/DymsMark';
import { cn } from '@/components/ui';
import { textoRol, type CambioSeccion, type ModuloNav } from '@/lib/modulos';

export interface UsuarioShell {
  nombre: string;
  rol: 'admin' | 'vendedor' | 'galponero';
}

interface SidebarProps<T extends string> {
  /** Módulos ya filtrados según el rol */
  modulos: ModuloNav<T>[];
  moduloActivo: T;
  onCambiar: (m: T) => void;
  usuario: UsuarioShell;
  onSalir: () => void;
  /** Número pequeño junto a un módulo (p. ej. productos por reponer) */
  avisos?: Partial<Record<T, number>>;
  /** Nombre de la sección actual: "Distribuidora" o "Galpones" */
  seccion?: string;
  cambioSeccion?: CambioSeccion;
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'D';
}

/** Menú lateral de escritorio (≥ lg) */
export function Sidebar<T extends string>({ modulos, moduloActivo, onCambiar, usuario, onSalir, avisos, seccion, cambioSeccion }: SidebarProps<T>) {
  const generales = modulos.filter((m) => !m.soloAdmin);
  const admin = modulos.filter((m) => m.soloAdmin);

  const item = (m: ModuloNav<T>) => {
    const activo = moduloActivo === m.id;
    const aviso = avisos?.[m.id] ?? 0;
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
        {aviso > 0 && (
          <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-maiz px-1.5 text-xs font-bold text-noche tabular">
            {aviso}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-7 overflow-y-auto bg-noche px-4 py-6 text-crema lg:flex">
      <div className="flex flex-col gap-2">
        <DymsMark tamano={44} className="px-2 [&>span:last-child]:text-[22px]" />
        {seccion && <span className="px-2 text-[13px] font-semibold uppercase tracking-wider text-maiz">{seccion}</span>}
      </div>

      <nav aria-label="Principal" className="flex flex-col gap-7">
        <div className="flex flex-col gap-1">{generales.map(item)}</div>
        {admin.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="px-3 pb-1.5 text-[13px] text-tinta-tenue">Administración</span>
            {admin.map(item)}
          </div>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {cambioSeccion && (
          <button
            type="button"
            onClick={cambioSeccion.onClick}
            className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-control border border-carbon-claro px-3 text-[15px] font-semibold text-crema transition-colors hover:bg-carbon-claro hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maiz"
          >
            <cambioSeccion.Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{cambioSeccion.etiqueta}</span>
          </button>
        )}

        <div className="flex items-center gap-2.5 rounded-campo bg-carbon p-3">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control bg-maiz text-sm font-bold text-noche">
            {iniciales(usuario.nombre)}
          </span>
          <span className="flex min-w-0 flex-col">
            <strong className="truncate text-sm font-semibold text-white">{usuario.nombre}</strong>
            <span className="text-[13px] text-crema-suave">{textoRol(usuario.rol)}</span>
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
      </div>
    </aside>
  );
}
