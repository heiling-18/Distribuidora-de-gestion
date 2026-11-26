'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownToLine, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Fila, Modal, PageHeader, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { formatoDia } from '@/lib/galpones';
import { totalRetirado, vendidoEnPesos, type MovimientoHuevo, type RetiroHuevos } from '@/lib/huevos';
import { claveMes, mesDesplazado, nombreMes } from '@/features/reportes/meses';

interface PlataHuevosViewProps {
  movimientos: MovimientoHuevo[];
  retiros: RetiroHuevos[];
  /** Plata que hay ahora: todo lo vendido − todo lo retirado */
  hay: number;
  procesando: boolean;
  onRetirar: (monto: number, motivo: string) => Promise<boolean>;
  onEliminar: (r: RetiroHuevos) => void;
}

// fecha es "YYYY-MM-DD": el mes son los primeros 7 caracteres
const mesDe = (fecha: string) => `${fecha.slice(0, 7)}-01`;

/** Plata de huevos: cuenta acumulada aparte de la purina, con sus retiros, mes por mes */
export function PlataHuevosView(p: PlataHuevosViewProps) {
  const mesActual = claveMes(new Date());
  const [mes, setMes] = useState(mesActual);
  const [retirando, setRetirando] = useState(false);

  const primerMes = useMemo(() => {
    const fechas = [...p.movimientos.map((m) => m.fecha), ...p.retiros.map((r) => r.fecha)];
    return fechas.reduce((min, f) => (mesDe(f) < min ? mesDe(f) : min), mesActual);
  }, [p.movimientos, p.retiros, mesActual]);

  const delMes = useMemo(() => {
    const ventas = p.movimientos.filter((m) => mesDe(m.fecha) === mes);
    const retiros = p.retiros.filter((r) => mesDe(r.fecha) === mes);
    // Lo que quedó al terminar el mes: todo lo vendido − todo lo retirado hasta ese mes
    const quedo =
      vendidoEnPesos(p.movimientos.filter((m) => mesDe(m.fecha) <= mes)) - totalRetirado(p.retiros.filter((r) => mesDe(r.fecha) <= mes));
    return { vendido: vendidoEnPesos(ventas), retirado: totalRetirado(retiros), retiros, quedo };
  }, [p.movimientos, p.retiros, mes]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Plata de huevos" descripcion="Lo vendido en huevos menos lo que se ha retirado. Va aparte de la caja de la purina." />

      <section aria-label="Plata de huevos" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-3">
        <StatCard tono="oscuro" etiqueta="Hay ahora" valor={formatoMoneda(p.hay)} detalle="Vendido − retirado" />
        <StatCard etiqueta="Vendido en total" valor={formatoMoneda(vendidoEnPesos(p.movimientos))} detalle="Desde el inicio" />
        <StatCard etiqueta="Retirado en total" valor={formatoMoneda(totalRetirado(p.retiros))} detalle={`${p.retiros.length} ${p.retiros.length === 1 ? 'retiro' : 'retiros'}`} />
      </section>

      <div>
        <Button onClick={() => setRetirando(true)} disabled={p.hay <= 0}>
          <ArrowDownToLine className="h-5 w-5" aria-hidden="true" />
          Retirar plata
        </Button>
        {p.hay <= 0 && <p className="mt-2 text-sm text-tinta-suave">No hay plata de huevos para retirar.</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold capitalize">{nombreMes(mes)}</h2>
        <div className="flex items-center gap-1.5">
          {mes !== mesActual && (
            <Button variante="fantasma" tamano="sm" onClick={() => setMes(mesActual)} className="mr-1">
              Mes actual
            </Button>
          )}
          <Button variante="secundario" tamano="sm" aria-label="Mes anterior" disabled={mes <= primerMes} onClick={() => setMes((m) => mesDesplazado(m, -1))} className="px-2.5">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button variante="secundario" tamano="sm" aria-label="Mes siguiente" disabled={mes >= mesActual} onClick={() => setMes((m) => mesDesplazado(m, 1))} className="px-2.5">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <section aria-label="Resumen del mes" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-3">
        <StatCard etiqueta="Vendido en el mes" valor={formatoMoneda(delMes.vendido)} />
        <StatCard etiqueta="Retirado en el mes" valor={formatoMoneda(delMes.retirado)} />
        <StatCard etiqueta={mes === mesActual ? 'Hay hoy' : 'Quedó al cerrar el mes'} valor={formatoMoneda(delMes.quedo)} />
      </section>

      <Panel>
        {delMes.retiros.length === 0 ? (
          <EmptyState className="m-6" titulo="Sin retiros" descripcion="En este mes no se ha sacado plata de los huevos." />
        ) : (
          <Tabla minAncho={620}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Para qué</Th>
                <Th alinear="der">Monto</Th>
                <Th>Anotó</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {delMes.retiros.map((r) => (
                <Fila key={r.id}>
                  <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoDia(r.fecha)}</Td>
                  <Td className="font-semibold">{r.motivo}</Td>
                  <Td alinear="der" className="whitespace-nowrap font-bold tabular text-rojo-oscuro">− {formatoMoneda(r.monto)}</Td>
                  <Td className="text-tinta-suave">{r.registrado_por || '—'}</Td>
                  <Td alinear="der">
                    <Button variante="peligro" tamano="sm" onClick={() => p.onEliminar(r)} aria-label={`Eliminar retiro del ${formatoDia(r.fecha)}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>

      {retirando && (
        <RetirarModal
          hay={p.hay}
          procesando={p.procesando}
          onGuardar={async (monto, motivo) => {
            if (await p.onRetirar(monto, motivo)) setRetirando(false);
          }}
          onCerrar={() => setRetirando(false)}
        />
      )}
    </div>
  );
}

function RetirarModal({
  hay,
  procesando,
  onGuardar,
  onCerrar,
}: {
  hay: number;
  procesando: boolean;
  onGuardar: (monto: number, motivo: string) => void;
  onCerrar: () => void;
}) {
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const n = Math.round(Number(monto) || 0);
  const quedan = hay - n;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!(n > 0)) return setError('Escribe cuánto vas a retirar, en pesos y sin puntos.');
    if (n > hay) return setError(`No puedes retirar más de lo que hay (${formatoMoneda(hay)}).`);
    if (!motivo.trim()) return setError('Escribe para qué es el retiro.');
    onGuardar(n, motivo.trim());
  };

  return (
    <Modal titulo="Retirar plata de huevos" descripcion={`Hay ${formatoMoneda(hay)}.`} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Field
          etiqueta="¿Cuánto retiras?"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          autoFocus
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="text-lg font-bold tabular"
        />
        <Field etiqueta="¿Para qué?" required placeholder="Ej.: pago de purina para las gallinas" maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} />

        <dl className="flex flex-col gap-2 rounded-campo bg-neutro p-4 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt className="text-tinta-suave">Hay</dt>
            <dd className="font-bold tabular">{formatoMoneda(hay)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-tinta-suave">Retiras</dt>
            <dd className="font-bold tabular text-rojo-oscuro">− {formatoMoneda(n)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-borde pt-2">
            <dt className="font-bold">Quedan</dt>
            <dd className={cn('font-display text-xl font-extrabold tabular', quedan < 0 && 'text-rojo-oscuro')}>{formatoMoneda(quedan)}</dd>
          </div>
        </dl>

        {error && <Alert tono="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variante="secundario" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" cargando={procesando}>Retirar</Button>
        </div>
      </form>
    </Modal>
  );
}
