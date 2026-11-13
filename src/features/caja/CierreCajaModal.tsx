'use client';

import React from 'react';
import { Alert, Button, Field, Modal, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';

interface CierreCajaModalProps {
  base: number;
  efectivoHoy: number;
  gastosHoy: number;
  esperado: number;
  contado: string;
  /** Caja automática: se pregunta cuánto se deja para mañana */
  automatica: boolean;
  /** Lo que se deja en la gaveta; vacío = todo lo contado */
  baseSiguiente: string;
  onBaseSiguiente: (v: string) => void;
  observaciones: string;
  procesando: boolean;
  onContado: (v: string) => void;
  onObservaciones: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Arqueo: compara el efectivo esperado con el contado antes de cerrar */
export function CierreCajaModal(p: CierreCajaModalProps) {
  const contado = Number(p.contado);
  const hayConteo = p.contado.trim() !== '' && !isNaN(contado);
  const diferencia = hayConteo ? contado - p.esperado : 0;
  const negativa = p.esperado < 0;
  const deja = p.baseSiguiente.trim() === '' ? contado : Number(p.baseSiguiente);
  const dejaValida = !isNaN(deja) && deja >= 0 && deja <= contado;

  return (
    <Modal titulo="Cerrar caja" descripcion="Cuenta el efectivo de la gaveta y compáralo con lo esperado." onCerrar={p.onCancelar} ancho="md">
      {negativa && (
        <Alert tono="error">
          El efectivo esperado es negativo ({formatoMoneda(p.esperado)}). Revisa los gastos del día antes de cerrar.
        </Alert>
      )}

      <dl className="flex flex-col rounded-campo bg-hundido px-4 py-2 text-[15px]">
        {[
          ['Base de apertura', formatoMoneda(p.base), ''],
          ['Ventas en efectivo', `+ ${formatoMoneda(p.efectivoHoy)}`, 'text-exito-texto'],
          ['Gastos del día', `− ${formatoMoneda(p.gastosHoy)}`, 'text-rojo-oscuro'],
        ].map(([etiqueta, valor, color]) => (
          <div key={etiqueta} className="flex justify-between gap-4 border-b border-linea py-2">
            <dt className="text-tinta-suave">{etiqueta}</dt>
            <dd className={cn('font-semibold tabular', color)}>{valor}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="font-bold">Efectivo esperado</dt>
          <dd className="font-display text-xl font-extrabold tabular">{formatoMoneda(p.esperado)}</dd>
        </div>
      </dl>

      <Field
        etiqueta="Efectivo contado"
        type="number"
        inputMode="numeric"
        required
        min="0"
        value={p.contado}
        onChange={(e) => p.onContado(e.target.value)}
        className="text-lg font-bold tabular"
      />

      {hayConteo && (
        <div
          role="status"
          className={cn(
            'flex items-baseline justify-between rounded-campo px-4 py-3 text-[15px] font-semibold',
            diferencia === 0 ? 'bg-exito-fondo text-exito-texto' : diferencia < 0 ? 'bg-error-fondo text-error-texto' : 'bg-aviso-fondo text-aviso-texto'
          )}
        >
          <span>{diferencia === 0 ? 'La caja cuadra' : diferencia < 0 ? 'Falta dinero' : 'Sobra dinero'}</span>
          {diferencia !== 0 && <strong className="text-lg tabular">{formatoMoneda(Math.abs(diferencia))}</strong>}
        </div>
      )}

      {p.automatica && hayConteo && (
        <Field
          etiqueta="¿Cuánto dejas en la gaveta para mañana?"
          type="number"
          inputMode="numeric"
          min="0"
          max={contado}
          placeholder={String(contado)}
          value={p.baseSiguiente}
          onChange={(e) => p.onBaseSiguiente(e.target.value)}
          error={dejaValida ? undefined : `Debe estar entre $0 y lo contado (${formatoMoneda(contado)}).`}
          ayuda={
            dejaValida
              ? `Mañana la caja se abre sola con ${formatoMoneda(deja)}${contado - deja > 0 ? ` · retiras ${formatoMoneda(contado - deja)}` : ''}`
              : undefined
          }
          className="text-lg font-bold tabular"
        />
      )}

      <Field
        etiqueta="Observaciones"
        placeholder="Novedades del día (opcional)"
        value={p.observaciones}
        onChange={(e) => p.onObservaciones(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <Button variante="secundario" onClick={p.onCancelar}>Cancelar</Button>
        <Button disabled={negativa || !hayConteo || (p.automatica && !dejaValida)} cargando={p.procesando} onClick={p.onConfirmar}>Cerrar caja</Button>
      </div>
    </Modal>
  );
}
