'use client';

import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, SearchInput, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { Venta } from '@/types';

interface VentasViewProps {
  ventas: Venta[];
  esDeHoy: (fecha: string) => boolean;
  tipoPrecio: (v: Venta) => 'detal' | 'mayorista';
  procesandoAnulacion: boolean;
  onExportar: (soloHoy: boolean) => void;
  onAnular: (v: Venta) => void;
  onVerMotivo: (v: Venta) => void;
}

export function VentasView({ ventas, esDeHoy, tipoPrecio, procesandoAnulacion, onExportar, onAnular, onVerMotivo }: VentasViewProps) {
  const [periodo, setPeriodo] = useState<'hoy' | 'todas'>('hoy');
  const [busqueda, setBusqueda] = useState('');

  const deHoy = useMemo(() => ventas.filter((v) => esDeHoy(v.fecha)), [ventas, esDeHoy]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (periodo === 'hoy' ? deHoy : ventas).filter(
      (v) => !q || v.nombre_producto.toLowerCase().includes(q) || v.cliente_nombre.toLowerCase().includes(q)
    );
  }, [ventas, deHoy, periodo, busqueda]);

  const totalValido = filtradas.filter((v) => v.estado !== 'anulada').reduce((a, v) => a + (Number(v.total_venta) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Ventas"
        descripcion={`${filtradas.length} ${filtradas.length === 1 ? 'venta' : 'ventas'} · ${formatoMoneda(totalValido)} vendidos${periodo === 'hoy' ? ' hoy' : ''}`}
        acciones={
          <Button variante="secundario" onClick={() => onExportar(periodo === 'hoy')}>
            <Download className="h-5 w-5" aria-hidden="true" />
            Exportar a Excel
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput etiqueta="Buscar venta" placeholder="Buscar por cliente o producto" valor={busqueda} onCambiar={setBusqueda} />
        <div role="group" aria-label="Periodo" className="flex rounded-control bg-neutro p-1">
          {([
            ['hoy', `Hoy (${deHoy.length})`],
            ['todas', `Todo el historial (${ventas.length})`],
          ] as const).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={periodo === valor}
              onClick={() => setPeriodo(valor)}
              className={cn(
                'h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors',
                periodo === valor ? 'bg-superficie text-tinta shadow-[0_1px_2px_rgba(23,19,15,0.12)]' : 'text-tinta-suave hover:text-tinta'
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      <Panel>
        {filtradas.length === 0 ? (
          <EmptyState
            className="m-6"
            titulo={periodo === 'hoy' && !busqueda ? 'Aún no hay ventas hoy' : 'Ninguna venta coincide'}
            descripcion={periodo === 'hoy' && !busqueda ? 'Las ventas del punto de venta aparecerán aquí.' : 'Prueba con otro nombre o mira todo el historial.'}
          />
        ) : (
          <Tabla minAncho={1060} className="max-h-[640px] overflow-y-auto">
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Producto</Th>
                <Th alinear="der">Cant.</Th>
                <Th alinear="der">Precio unit.</Th>
                <Th alinear="der">Total</Th>
                <Th>Pago</Th>
                <Th>Vendedor</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((v) => {
                const anulada = v.estado === 'anulada';
                const mayor = tipoPrecio(v) === 'mayorista';
                const fecha = new Date(v.fecha);
                return (
                  <Fila key={v.id} className={anulada ? 'text-tinta-tenue' : undefined}>
                    <Td className="whitespace-nowrap text-tinta-suave tabular">
                      {fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      <span className="block text-[13px]">{fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</span>
                    </Td>
                    <Td className="font-semibold">{v.cliente_nombre}</Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <span className={anulada ? 'line-through' : 'font-semibold'}>{v.nombre_producto}</span>
                        {anulada ? <Badge tono="error">Anulada</Badge> : <Badge tono={mayor ? 'mayor' : 'neutro'}>{mayor ? 'Por mayor' : 'Detal'}</Badge>}
                      </div>
                    </Td>
                    <Td alinear="der" className="font-semibold tabular">{v.cantidad}</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">{formatoMoneda(v.precio_unitario)}</Td>
                    <Td alinear="der" className={cn('whitespace-nowrap font-bold tabular', anulada && 'line-through')}>{formatoMoneda(v.total_venta)}</Td>
                    <Td className="capitalize">{v.metodo_pago}</Td>
                    <Td className="text-tinta-suave">{v.vendedor}</Td>
                    <Td alinear="der">
                      {anulada ? (
                        <Button variante="fantasma" tamano="sm" onClick={() => onVerMotivo(v)}>Ver motivo</Button>
                      ) : (
                        <Button variante="peligro" tamano="sm" disabled={procesandoAnulacion} onClick={() => onAnular(v)}>Anular</Button>
                      )}
                    </Td>
                  </Fila>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  );
}
