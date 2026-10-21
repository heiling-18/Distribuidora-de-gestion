'use client';

import React, { useState } from 'react';
import { LogOut, MoreHorizontal, X } from 'lucide-react';
import { DymsMark } from '@/components/brand/DymsMark';
import { cn } from '@/components/ui';
import { MODULOS_BARRA_MOVIL, modulosVisibles, type Modulo } from '@/lib/modulos';
import type { UsuarioShell } from './Sidebar';

interface MobileNavProps {
  moduloActivo: Modulo;
  onCambiar: (m: Modulo) => void;
  usuario: UsuarioShell;
  onSalir: () => void;
  stockBajo: number;
  cajaAbierta: boolean;
}

/** Barra superior + navegación inferior para celular y tablet (< lg) */
export function MobileNav({ moduloActivo, onCambiar, usuario, onSalir, stockBajo, cajaAbierta }: MobileNavProps) {
  const [masAbierto, setMasAbierto] = useState(false);
  const modulos = modulosVisibles(usuario.rol === 'admin');
  const fijos = modulos.filter((m) => MODULOS_BARRA_MOVIL.includes(m.id));
  const resto = modulos.filter((m) => !MODULOS_BARRA_MOVIL.includes(m.id));
  const activoEnMas = resto.some((m) => m.id === moduloActivo);

  const ir = (m: Modulo) => {
    onCambiar(m);
    setMasAbierto(false);
  };

  return (
    <>
      {/* Barra superior */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between bg-noche px-4 text-crema lg:hidden">
        <DymsMark tamano={28} className="[&>span:last-child]:text-xl" />
        <span
          className={cn(
            'rounded-lg px-2.5 py-1 text-[13px] font-bold',
            cajaAbierta ? 'bg-[#23402F] text-[#BFE6CC]' : 'bg-rojo text-white'
          )}
        >
          {cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}
        </span>
      </header>

      {/* Barra inferior */}
      <nav
        aria-label="Principal"
        className="no-print fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-5 bg-superficie pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(23,19,15,0.25)] lg:hidden"
      >
        {fijos.map((m) => {
          const activo = moduloActivo === m.id;
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
              {m.id === 'inventario' && stockBajo > 0 && (
                <span className="absolute right-[calc(50%-20px)] top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-maiz px-1 text-[11px] font-bold text-noche">
                  {stockBajo}
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
                <span className="text-sm text-tinta-suave">{usuario.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span>
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
