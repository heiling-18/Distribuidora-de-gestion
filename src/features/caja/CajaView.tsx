'use client';

import React from 'react';
import { Lock, Receipt, Wallet } from 'lucide-react';
import { Button, EmptyState, Field, Fila, PageHeader, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { CierreCaja, SesionCaja } from '@/types';

interface CajaViewProps {
  caja: SesionCaja | null;
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

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        titulo="Caja"
        descripcion={abierta ? 'Caja abierta · el arqueo se actualiza con cada venta y gasto' : 'La caja está cerrada'}
        acciones={
          abierta ? (
            <Button onClick={p.onCerrarCaja}>
              <Lock className="h-5 w-5" aria-hidden="true" />
              Cerrar caja
            </Button>
          ) : undefined
        }
      />

      {!abierta || !p.caja ? (
        <Panel className="flex flex-col items-center gap-5 px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-tarjeta bg-aviso-fondo text-aviso-texto">
            <Wallet className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em]">Abre la caja del día</h2>
            <p className="text-[15px] text-tinta-suave">Escribe con cuánto efectivo empiezas para dar vueltas. Después podrás vender y registrar gastos.</p>
          </div>
          <form onSubmit={p.onAbrir} className="flex w-full max-w-sm flex-col gap-4 text-left">
            <Field
              etiqueta="Base en efectivo"
              type="number"
              inputMode="numeric"
              required
              min="0"
              placeholder="300000"
              value={p.montoApertura}
              onChange={(e) => p.onMontoApertura(e.target.value)}
              className="text-center text-lg font-bold tabular"
            />
            <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando}>Abrir caja</Button>
          </form>
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
    </div>
  );
}
