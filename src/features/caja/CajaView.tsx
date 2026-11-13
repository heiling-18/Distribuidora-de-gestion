'use client';

import React, { useState } from 'react';
import { Lock, PencilLine, Receipt, Wallet } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Fila, Modal, PageHeader, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { CierreCaja, SesionCaja } from '@/types';

interface CajaViewProps {
  caja: SesionCaja | null;
  esAdmin: boolean;
  /** La caja se abre sola con la base del cierre anterior (migración aplicada) */
  automatica: boolean;
  /** Mensaje cuando está cerrada (cuándo se abre o quién la abre) */
  textoCerrada: string;
  /** Sigue abierta la caja de un día anterior */
  deOtroDia: boolean;
  /** Base sugerida para abrir a mano: lo que se dejó en el último cierre */
  sugerenciaBase: number | null;
  onAjustarBase: (monto: number, motivo: string) => Promise<boolean>;
  totales: {
    efectivoHoy: number;
    transferenciaHoy: number;
    gastosHoy: number;
    efectivoEnCaja: number;
    disponible: number;
  };
  historial: CierreCaja[];
  montoApertura: string;
  onMontoApertura: (v: string) => void;
  onAbrir: (e: React.FormEvent) => void;
  procesando: boolean;
  onCerrarCaja: () => void;
  onVerComprobante: (c: CierreCaja) => void;
}

export function CajaView(p: CajaViewProps) {
  const abierta = p.caja?.estado === 'abierta';
  // Con la caja automática, solo el administrador abre a mano; sin la migración, cualquiera (como antes)
  const puedeAbrirAMano = !p.automatica || p.esAdmin;
  const [ajustando, setAjustando] = useState(false);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        titulo="Caja"
        descripcion={abierta && p.caja ? `Caja abierta con ${formatoMoneda(p.caja.monto_inicial)}` : 'La caja está cerrada'}
        acciones={
          abierta ? (
            <div className="flex flex-wrap gap-2.5">
              {p.esAdmin && p.automatica && (
                <Button variante="secundario" onClick={() => setAjustando(true)}>
                  <PencilLine className="h-5 w-5" aria-hidden="true" />
                  Ajustar base
                </Button>
              )}
              <Button onClick={p.onCerrarCaja}>
                <Lock className="h-5 w-5" aria-hidden="true" />
                Cerrar caja
              </Button>
            </div>
          ) : undefined
        }
      />

      {abierta && p.deOtroDia && (
        <Alert tono="aviso">Esta caja es del {p.caja?.fecha.slice(0, 10)} y no se cerró. Ciérrala para que la de hoy se abra sola.</Alert>
      )}
      {abierta && p.caja?.ajustada_por && (
        <Alert tono="info">
          Base cambiada por {p.caja.ajustada_por}
          {p.caja.base_original != null && ` (antes ${formatoMoneda(p.caja.base_original)})`}
          {p.caja.ajuste_motivo && `: ${p.caja.ajuste_motivo}`}
        </Alert>
      )}

      {!abierta || !p.caja ? (
        <Panel className="flex flex-col items-center gap-5 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-tarjeta bg-aviso-fondo text-aviso-texto">
            <Wallet className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em]">{puedeAbrirAMano ? 'Abrir la caja' : 'Caja cerrada'}</h2>
            <p className="text-[15px] text-tinta-suave">{p.textoCerrada}</p>
          </div>
          {puedeAbrirAMano && (
            <form onSubmit={p.onAbrir} className="flex w-full max-w-sm flex-col gap-4 text-left">
              <Field
                etiqueta="Base en efectivo"
                type="number"
                inputMode="numeric"
                required
                min="0"
                placeholder={p.sugerenciaBase != null ? String(p.sugerenciaBase) : '300000'}
                value={p.montoApertura}
                onChange={(e) => p.onMontoApertura(e.target.value)}
                ayuda={p.sugerenciaBase != null ? `En el último cierre se dejaron ${formatoMoneda(p.sugerenciaBase)}` : undefined}
                className="text-center text-lg font-bold tabular"
              />
              <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando}>Abrir caja</Button>
            </form>
          )}
        </Panel>
      ) : (
        <>
          <section aria-label="Dinero en caja" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-3">
            <StatCard tono="oscuro" etiqueta="Efectivo en la gaveta" valor={formatoMoneda(p.totales.efectivoEnCaja)} detalle="Base + ventas en efectivo − gastos" />
            <StatCard etiqueta="Transferencias de hoy" valor={formatoMoneda(p.totales.transferenciaHoy)} detalle="En el banco, no en la gaveta" />
            <StatCard etiqueta="Total disponible" valor={formatoMoneda(p.totales.disponible)} detalle="Efectivo + transferencias" />
          </section>

          <Panel className="p-6">
            <h2 className="mb-4 text-xl font-bold">Cómo se calcula el efectivo</h2>
            <dl className="flex max-w-xl flex-col text-[15px]">
              {[
                ['Base de apertura', formatoMoneda(p.caja.monto_inicial), ''],
                ['Ventas en efectivo', `+ ${formatoMoneda(p.totales.efectivoHoy)}`, 'text-exito-texto'],
                ['Gastos del día', `− ${formatoMoneda(p.totales.gastosHoy)}`, 'text-rojo-oscuro'],
              ].map(([etiqueta, valor, color]) => (
                <div key={etiqueta} className="flex justify-between gap-4 border-b border-linea py-2.5">
                  <dt className="text-tinta-suave">{etiqueta}</dt>
                  <dd className={cn('font-semibold tabular', color)}>{valor}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 pt-3">
                <dt className="font-bold">Debe haber en la gaveta</dt>
                <dd className={cn('font-display text-2xl font-extrabold tabular', p.totales.efectivoEnCaja < 0 && 'text-rojo-oscuro')}>
                  {formatoMoneda(p.totales.efectivoEnCaja)}
                </dd>
              </div>
            </dl>
          </Panel>
        </>
      )}

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold">Cierres anteriores</h2>
          <span className="text-sm text-tinta-suave">{p.historial.length} {p.historial.length === 1 ? 'cierre registrado' : 'cierres registrados'}</span>
        </div>
        {p.historial.length === 0 ? (
          <EmptyState className="m-6" titulo="Todavía no hay cierres" descripcion="Cuando cierres la caja, el comprobante del arqueo quedará guardado aquí." />
        ) : (
          <Tabla minAncho={1000}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Responsable</Th>
                <Th alinear="der">Base</Th>
                <Th alinear="der">Efectivo</Th>
                <Th alinear="der">Transferencia</Th>
                <Th alinear="der">Gastos</Th>
                <Th alinear="der">Esperado</Th>
                <Th alinear="der">Contado</Th>
                <Th alinear="der">Diferencia</Th>
                <Th alinear="der"><span className="sr-only">Comprobante</span></Th>
              </tr>
            </thead>
            <tbody>
              {p.historial.map((c, i) => (
                <Fila key={`${c.hora_cierre}-${i}`}>
                  <Td className="whitespace-nowrap text-tinta-suave tabular">
                    {new Date(c.hora_cierre).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </Td>
                  <Td className="font-semibold">{c.responsable}</Td>
                  <Td alinear="der" className="tabular">{formatoMoneda(c.monto_inicial)}</Td>
                  <Td alinear="der" className="text-exito-texto tabular">+{formatoMoneda(c.ventas_efectivo)}</Td>
                  <Td alinear="der" className="text-mayor tabular">+{formatoMoneda(c.ventas_transferencia)}</Td>
                  <Td alinear="der" className="text-rojo-oscuro tabular">−{formatoMoneda(c.total_gastos)}</Td>
                  <Td alinear="der" className="tabular">{formatoMoneda(c.dinero_esperado)}</Td>
                  <Td alinear="der" className="font-bold tabular">{formatoMoneda(c.dinero_real)}</Td>
                  <Td
                    alinear="der"
                    className={cn('font-bold tabular', c.diferencia < 0 ? 'text-rojo-oscuro' : c.diferencia > 0 ? 'text-exito-texto' : 'text-tinta-suave')}
                  >
                    {c.diferencia === 0 ? 'Cuadra' : formatoMoneda(c.diferencia)}
                  </Td>
                  <Td alinear="der">
                    <Button variante="fantasma" tamano="sm" onClick={() => p.onVerComprobante(c)}>
                      <Receipt className="h-4 w-4" aria-hidden="true" />
                      Comprobante
                    </Button>
                  </Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>

      {ajustando && p.caja && (
        <AjustarBaseModal
          baseActual={p.caja.monto_inicial}
          procesando={p.procesando}
          onGuardar={async (monto, motivo) => {
            if (await p.onAjustarBase(monto, motivo)) setAjustando(false);
          }}
          onCerrar={() => setAjustando(false)}
        />
      )}
    </div>
  );
}

/** El administrador cambia la base de la caja abierta, con un motivo que queda guardado */
function AjustarBaseModal({
  baseActual,
  procesando,
  onGuardar,
  onCerrar,
}: {
  baseActual: number;
  procesando: boolean;
  onGuardar: (monto: number, motivo: string) => void;
  onCerrar: () => void;
}) {
  const [monto, setMonto] = useState(String(baseActual));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const n = Number(monto);
    if (monto.trim() === '' || !(n >= 0)) return setError('Escribe la base en pesos, sin puntos.');
    if (!motivo.trim()) return setError('Escribe por qué cambias la base.');
    onGuardar(Math.round(n), motivo.trim());
  };

  return (
    <Modal titulo="Ajustar base" descripcion={`La caja se abrió con ${formatoMoneda(baseActual)}.`} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Field
          etiqueta="Nueva base en efectivo"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="text-lg font-bold tabular"
        />
        <Field etiqueta="Motivo" required placeholder="Ej.: metí plata para cambio" maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        {error && <Alert tono="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variante="secundario" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" cargando={procesando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
