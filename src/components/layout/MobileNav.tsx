'use client';

import React, { useState } from 'react';
import { LogOut, MoreHorizontal, X } from 'lucide-react';
import { DymsMark } from '@/components/brand/DymsMark';
import { cn } from '@/components/ui';
import { textoRol, type CambioSeccion, type ModuloNav } from '@/lib/modulos';
import type { UsuarioShell } from './Sidebar';

interface MobileNavProps<T extends string> {
  /** Módulos ya filtrados según el rol */
  modulos: ModuloNav<T>[];
  /** Módulos fijos en la barra inferior; el resto va en "Más" */
  barraMovil: T[];
  moduloActivo: T;
  onCambiar: (m: T) => void;
  usuario: UsuarioShell;
  onSalir: () => void;
  avisos?: Partial<Record<T, number>>;
  /** Indicador a la derecha de la barra superior (p. ej. estado de la caja) */
  estado?: React.ReactNode;
  seccion?: string;
  /** Botones para pasar a las otras secciones a las que tiene acceso */
  cambiosSeccion?: CambioSeccion[];
}

/** Barra superior + navegación inferior para celular y tablet (< lg) */
export function MobileNav<T extends string>({ modulos, barraMovil, moduloActivo, onCambiar, usuario, onSalir, avisos, estado, seccion, cambiosSeccion = [] }: MobileNavProps<T>) {
  const [masAbierto, setMasAbierto] = useState(false);
  const fijos = modulos.filter((m) => barraMovil.includes(m.id));
  const resto = modulos.filter((m) => !barraMovil.includes(m.id));
  const activoEnMas = resto.some((m) => m.id === moduloActivo);

  const ir = (m: T) => {
    onCambiar(m);
    setMasAbierto(false);
  };

  return (
    <>
      {/* Barra superior */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-noche px-4 text-crema lg:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <DymsMark tamano={36} className="[&>span:last-child]:text-xl" />
          {seccion && <span className="truncate text-[13px] font-semibold uppercase tracking-wider text-maiz">{seccion}</span>}
        </span>
        {estado}
      </header>

      {/* Barra inferior */}
      <nav
        aria-label="Principal"
        style={{ gridTemplateColumns: `repeat(${fijos.length + 1}, minmax(0, 1fr))` }}
        className="no-print fixed inset-x-0 bottom-0 z-30 grid h-[68px] bg-superficie pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(23,19,15,0.25)] lg:hidden"
      >
        {fijos.map((m) => {
          const activo = moduloActivo === m.id;
          const aviso = avisos?.[m.id] ?? 0;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => ir(m.id)}
              aria-current={activo ? 'page' : undefined}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center gap-1 text-xs',
                activo ? 'font-bold text-rojo' : 'font-semibold text-tinta-suave'
              )}
            >
              <m.Icono className="h-[22px] w-[22px]" aria-hidden="true" />
              {m.corto}
              {aviso > 0 && (
                <span className="absolute right-[calc(50%-20px)] top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-maiz px-1 text-[11px] font-bold text-noche">
                  {aviso}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          aria-expanded={masAbierto}
          aria-haspopup="dialog"
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1 text-xs',
            activoEnMas ? 'font-bold text-rojo' : 'font-semibold text-tinta-suave'
          )}
        >
          <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
          Más
        </button>
      </nav>

      {/* Hoja "Más" */}
      {masAbierto && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button type="button" aria-label="Cerrar" onClick={() => setMasAbierto(false)} className="absolute inset-0 bg-noche/60" />
          <div className="animate-subir absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-[24px] bg-superficie p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex flex-col">
                <strong className="text-base text-tinta">{usuario.nombre}</strong>
                <span className="text-sm text-tinta-suave">{textoRol(usuario.rol)}</span>
              </span>
              <button type="button" onClick={() => setMasAbierto(false)} aria-label="Cerrar" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-control hover:bg-neutro">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {resto.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => ir(m.id)}
                aria-current={moduloActivo === m.id ? 'page' : undefined}
                className={cn(
                  'flex h-12 cursor-pointer items-center gap-3 rounded-control px-3 text-base font-semibold',
                  moduloActivo === m.id ? 'bg-rojo-fondo text-rojo' : 'text-tinta hover:bg-neutro'
                )}
              >
                <m.Icono className="h-5 w-5" aria-hidden="true" />
                {m.etiqueta}
              </button>
            ))}
            {cambiosSeccion.map((cambioSeccion) => (
              <button
                key={cambioSeccion.etiqueta}
                type="button"
                onClick={() => {
                  setMasAbierto(false);
                  cambioSeccion.onClick();
                }}
                className="mt-1 flex h-12 cursor-pointer items-center gap-3 rounded-control bg-noche px-3 text-base font-semibold text-crema hover:bg-carbon"
              >
                <cambioSeccion.Icono className="h-5 w-5" aria-hidden="true" />
                {cambioSeccion.etiqueta}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMasAbierto(false);
                onSalir();
              }}
              className="mt-1 flex h-12 cursor-pointer items-center gap-3 rounded-control px-3 text-base font-semibold text-rojo-oscuro hover:bg-error-fondo"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
