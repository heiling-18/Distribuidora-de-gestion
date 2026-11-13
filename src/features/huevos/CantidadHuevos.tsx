import React from 'react';
import { Field } from '@/components/ui';
import { HUEVOS_POR_CARTON } from '@/lib/galpones';

/** Cartones + huevos sueltos, lado a lado (también en el celular) */
export function CantidadHuevos({
  cartones,
  sueltos,
  onCartones,
  onSueltos,
  ayuda,
}: {
  cartones: string;
  sueltos: string;
  onCartones: (v: string) => void;
  onSueltos: (v: string) => void;
  ayuda?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field
        etiqueta="Cartones"
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        placeholder="0"
        value={cartones}
        onChange={(e) => onCartones(e.target.value)}
        ayuda={ayuda}
        className="tabular"
      />
      <Field
        etiqueta="Huevos sueltos"
        type="number"
        inputMode="numeric"
        min="0"
        max={HUEVOS_POR_CARTON - 1}
        step="1"
        placeholder="0"
        value={sueltos}
        onChange={(e) => onSueltos(e.target.value)}
        ayuda={`De 0 a ${HUEVOS_POR_CARTON - 1}`}
        className="tabular"
      />
    </div>
  );
}

/** Valida cartones y sueltos escritos; devuelve el total de huevos o un mensaje de error */
export function leerCantidad(cartones: string, sueltos: string): { huevos: number } | { error: string } {
  const c = cartones.trim() || '0';
  const s = sueltos.trim() || '0';
  if (!/^\d+$/.test(c) || !/^\d+$/.test(s)) return { error: 'Cartones y huevos sueltos deben ser números enteros.' };
  if (Number(s) >= HUEVOS_POR_CARTON) return { error: `Los huevos sueltos van de 0 a ${HUEVOS_POR_CARTON - 1}; si son más, súmalos como cartones.` };
  const huevos = Number(c) * HUEVOS_POR_CARTON + Number(s);
  if (huevos <= 0) return { error: 'Escribe cuántos cartones o huevos son.' };
  return { huevos };
}
