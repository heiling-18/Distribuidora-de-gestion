'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, SearchInput, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { esPorMayor, textoItems } from '@/lib/ventas';
import type { Pagina, Venta } from '@/types/api';

export type Periodo = 'hoy' | 'todas';

interface VentasViewProps {
  pagina: Pagina<Venta>;
  periodo: Periodo;
  busqueda: string;
  cargando: boolean;
  esAdmin: boolean;
  procesandoAnulacion: boolean;
  onPeriodo: (p: Periodo) => void;
  onBusqueda: (q: string) => void;
  onPagina: (n: number) => void;
  onExportar: () => void;
  onAnular: (v: Venta) => void;
  onVerMotivo: (v: Venta) => void;
}

/** Historial de ventas. La búsqueda, el filtro y la paginación los hace la API. */
export function VentasView(p: VentasViewProps) {
  const { datos, total, pagina, totalPaginas } = p.pagina;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Ventas"
        descripcion={`${total} ${total === 1 ? 'venta' : 'ventas'}${p.periodo === 'hoy' ? ' hoy' : ' en el historial'}`}
        acciones={
          <Button variante="secundario" onClick={p.onExportar}>
            <Download className="h-5 w-5" aria-hidden="true" />
            Exportar a Excel
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput etiqueta="Buscar venta" placeholder="Buscar por cliente o número de ticket" valor={p.busqueda} onCambiar={p.onBusqueda} />
        <div role="group" aria-label="Periodo" className="flex rounded-control bg-neutro p-1">
          {([
            ['hoy', 'Hoy'],
            ['todas', 'Todo el historial'],
          ] as const).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={p.periodo === valor}
              onClick={() => p.onPeriodo(valor)}
              className={cn(
                'h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors',
                p.periodo === valor ? 'bg-white text-tinta shadow-sm' : 'text-tinta-suave hover:text-tinta',
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      <Panel className={cn(p.cargando && 'opacity-60 transition-opacity')}>
        {datos.length === 0 ? (
          <EmptyState
            className="m-6"
            titulo={p.busqueda ? 'Sin resultados' : 'No hay ventas'}
            descripcion={p.busqueda ? 'Prueba con otro nombre o número de ticket.' : 'Las ventas del punto de venta aparecerán aquí.'}
          />
        ) : (
          <Tabla minAncho={900}>
            <thead>
              <tr>
                <Th>Ticket</Th>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Productos</Th>
                <Th>Precio</Th>
                <Th>Pago</Th>
                <Th>Vendedor</Th>
                <Th alinear="der">Total</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {datos.map((v) => {
                const anulada = v.estado === 'anulada';
                const mayor = esPorMayor(v);
                return (
                  <Fila key={v.id} className={anulada ? 'text-tinta-tenue' : undefined}>
                    <Td className="tabular">#{v.numero}</Td>
                    <Td className="whitespace-nowrap text-tinta-suave tabular">
                      {new Date(v.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </Td>
                    <Td className="font-semibold">{v.clienteNombre}</Td>
                    <Td className={anulada ? 'line-through' : undefined}>{textoItems(v)}</Td>
                    <Td>{anulada ? <Badge tono="error">Anulada</Badge> : <Badge tono={mayor ? 'mayor' : 'neutro'}>{mayor ? 'Por mayor' : 'Detal'}</Badge>}</Td>
                    <Td className="capitalize">{v.metodoPago}</Td>
                    <Td className="text-tinta-suave">{v.vendedorNombre}</Td>
                    <Td alinear="der" className={cn('whitespace-nowrap font-bold tabular', anulada && 'line-through')}>{formatoMoneda(v.total)}</Td>
                    <Td alinear="der">
                      {anulada ? (
                        <Button variante="fantasma" tamano="sm" onClick={() => p.onVerMotivo(v)}>Ver motivo</Button>
                      ) : (
                        p.esAdmin && (
                          <Button variante="peligro" tamano="sm" disabled={p.procesandoAnulacion} onClick={() => p.onAnular(v)}>Anular</Button>
                        )
                      )}
                    </Td>
                  </Fila>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </Panel>

      {totalPaginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
          <Button variante="secundario" tamano="sm" disabled={pagina <= 1} onClick={() => p.onPagina(pagina - 1)} aria-label="Página anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="text-sm text-tinta-suave tabular">
            Página {pagina} de {totalPaginas}
          </span>
          <Button variante="secundario" tamano="sm" disabled={pagina >= totalPaginas} onClick={() => p.onPagina(pagina + 1)} aria-label="Página siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
