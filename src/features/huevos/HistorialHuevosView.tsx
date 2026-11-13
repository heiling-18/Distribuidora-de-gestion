'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { formatoDia, textoCartones } from '@/lib/galpones';
import { NOMBRE_CLASE, gananciaVenta, totalesMovimientos, valorHuevos, type ClaseMovimiento, type MovimientoHuevo, type TipoHuevo } from '@/lib/huevos';
import { claveMes, mesDesplazado, nombreMes } from '@/features/reportes/meses';

interface HistorialHuevosViewProps {
  esAdmin: boolean;
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  onEditar: (m: MovimientoHuevo) => void;
  onEliminar: (m: MovimientoHuevo) => void;
}

const TONO_CLASE = { entrada: 'mayor', venta: 'exito', perdida: 'error' } as const;

/** Todo lo que pasó con los huevos, mes por mes, con lo comprado, vendido y ganado */
export function HistorialHuevosView(p: HistorialHuevosViewProps) {
  const mesActual = claveMes(new Date());
  const [mes, setMes] = useState(mesActual);
  const [filtro, setFiltro] = useState<ClaseMovimiento | 'todos'>('todos');

  // fecha es "YYYY-MM-DD": el mes son los primeros 7 caracteres
  const mesDe = (fecha: string) => `${fecha.slice(0, 7)}-01`;
  const primerMes = useMemo(
    () => p.movimientos.reduce((min, m) => (mesDe(m.fecha) < min ? mesDe(m.fecha) : min), mesActual),
    [p.movimientos, mesActual]
  );
  const delMes = p.movimientos.filter((m) => mesDe(m.fecha) === mes);
  const tot = totalesMovimientos(delMes);
  const lista = delMes.filter((m) => filtro === 'todos' || m.clase === filtro);
  const nombreTipo = (id: number) => p.tipos.find((t) => t.id === id)?.nombre ?? '—';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Historial de huevos" descripcion="Llegadas, ventas y huevos rotos, con su precio de cada día." />

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

      <section aria-label="Resumen del mes" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tono="oscuro" etiqueta="Vendido" valor={formatoMoneda(tot.vendido)} detalle={textoCartones(tot.huevosVendidos)} />
        <StatCard etiqueta="Ganancia" valor={formatoMoneda(tot.ganancia - tot.perdido)} detalle={tot.perdido > 0 ? `Ya descontados ${formatoMoneda(tot.perdido)} de rotos` : 'Venta menos lo que costaron'} />
        <StatCard etiqueta="Comprado" valor={formatoMoneda(tot.comprado)} detalle={textoCartones(tot.huevosComprados)} />
        <StatCard etiqueta="Rotos" valor={textoCartones(tot.huevosPerdidos)} detalle={tot.perdido > 0 ? `Costaron ${formatoMoneda(tot.perdido)}` : 'Sin pérdidas'} />
      </section>

      <Panel>
        <div className="flex flex-wrap gap-2 px-6 pt-5">
          {(['todos', 'entrada', 'venta', 'perdida'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFiltro(c)}
              aria-pressed={filtro === c}
              className={cn(
                'h-9 cursor-pointer rounded-control px-3 text-sm font-bold',
                filtro === c ? 'bg-noche text-crema' : 'bg-neutro text-tinta hover:bg-neutro-hover'
              )}
            >
              {c === 'todos' ? 'Todo' : c === 'entrada' ? 'Llegadas' : c === 'venta' ? 'Ventas' : 'Rotos'}
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <EmptyState className="m-6" titulo="No hay movimientos" descripcion="En este mes no hay nada anotado con ese filtro." />
        ) : (
          <Tabla minAncho={860} className="mt-4">
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Qué</Th>
                <Th>Tamaño</Th>
                <Th>Cantidad</Th>
                <Th alinear="der">Precio cartón</Th>
                <Th alinear="der">Total</Th>
                <Th alinear="der">Ganancia</Th>
                <Th>Quién</Th>
                {p.esAdmin && <Th alinear="der"><span className="sr-only">Acciones</span></Th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <Fila key={m.id}>
                  <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoDia(m.fecha)}</Td>
                  <Td><Badge tono={TONO_CLASE[m.clase]}>{NOMBRE_CLASE[m.clase]}</Badge></Td>
                  <Td className="font-semibold">{nombreTipo(m.tipo_id)}</Td>
                  <Td className="whitespace-nowrap tabular">{textoCartones(m.huevos)}</Td>
                  <Td alinear="der" className="whitespace-nowrap tabular">{m.clase === 'perdida' ? '—' : formatoMoneda(m.precio_carton)}</Td>
                  <Td alinear="der" className="whitespace-nowrap font-bold tabular">
                    {m.clase === 'perdida' ? '—' : formatoMoneda(valorHuevos(m.huevos, m.precio_carton))}
                  </Td>
                  <Td alinear="der" className="whitespace-nowrap tabular">
                    {m.clase === 'venta' ? formatoMoneda(gananciaVenta(m)) : m.clase === 'perdida' ? <span className="text-rojo-oscuro">−{formatoMoneda(valorHuevos(m.huevos, m.costo_carton ?? 0))}</span> : '—'}
                  </Td>
                  <Td className="text-tinta-suave">{[m.tercero, m.registrado_por && `anotó ${m.registrado_por}`].filter(Boolean).join(' · ') || '—'}</Td>
                  {p.esAdmin && (
                    <Td alinear="der" className="whitespace-nowrap">
                      <Button variante="fantasma" tamano="sm" onClick={() => p.onEditar(m)} aria-label={`Corregir ${NOMBRE_CLASE[m.clase].toLowerCase()} del ${formatoDia(m.fecha)}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Corregir
                      </Button>
                      <Button variante="peligro" tamano="sm" onClick={() => p.onEliminar(m)} aria-label={`Eliminar ${NOMBRE_CLASE[m.clase].toLowerCase()} del ${formatoDia(m.fecha)}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Td>
                  )}
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  );
}
