import React, { useMemo } from 'react';
import { Download, Receipt } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, StatCard, Tabla, Td, Th } from '@/components/ui';
import { formatoFecha, formatoMoneda } from '@/lib/formato';
import type { Venta } from '@/types';

interface ReportesViewProps {
  ventas: Venta[];
  tipoPrecio: (v: Venta) => 'detal' | 'mayorista';
  onExportar: () => void;
  onVerTicket: (v: Venta) => void;
}

export function ReportesView({ ventas, tipoPrecio, onExportar, onVerTicket }: ReportesViewProps) {
  const resumen = useMemo(() => {
    const validas = ventas.filter((v) => v.estado !== 'anulada');
    return {
      total: validas.reduce((acc, v) => acc + (Number(v.total_venta) || 0), 0),
      ganancia: validas.reduce((acc, v) => acc + (Number(v.ganancia_bruta) || 0), 0),
      cantidad: validas.length,
      anuladas: ventas.length - validas.length,
    };
  }, [ventas]);

  const ultimas = ventas.slice(0, 50);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Reportes"
        descripcion="Rentabilidad del negocio, reimpresión de tickets y exportación de ventas"
        acciones={
          <Button variante="secundario" onClick={onExportar}>
            <Download className="h-5 w-5" aria-hidden="true" />
            Descargar ventas (Excel)
          </Button>
        }
      />

      <section aria-label="Resumen histórico" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-3">
        <StatCard tono="oscuro" etiqueta="Ventas registradas" valor={formatoMoneda(resumen.total)} detalle={`${resumen.cantidad} ventas · ${resumen.anuladas} anuladas`} />
        <StatCard etiqueta="Ganancia bruta" valor={formatoMoneda(resumen.ganancia)} detalle="Precio de venta menos costo" />
        <StatCard
          etiqueta="Margen promedio"
          valor={resumen.total > 0 ? `${((resumen.ganancia / resumen.total) * 100).toFixed(1).replace('.', ',')} %` : '—'}
          detalle="Sobre el total vendido"
        />
      </section>

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold text-tinta">Últimas ventas</h2>
          <span className="text-sm text-tinta-suave">Abre una venta para ver o imprimir su ticket</span>
        </div>
        {ultimas.length === 0 ? (
          <EmptyState className="m-6" titulo="Todavía no hay ventas" descripcion="Las ventas del punto de venta aparecerán aquí." />
        ) : (
          <Tabla minAncho={980} className="max-h-[560px] overflow-y-auto">
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Cliente</Th>
                <Th>Producto</Th>
                <Th alinear="der">Cant.</Th>
                <Th alinear="der">Total</Th>
                <Th alinear="der">Ganancia</Th>
                <Th>Pago</Th>
                <Th>Vendedor</Th>
                <Th alinear="der"><span className="sr-only">Ticket</span></Th>
              </tr>
            </thead>
            <tbody>
              {ultimas.map((v) => {
                const anulada = v.estado === 'anulada';
                const mayor = tipoPrecio(v) === 'mayorista';
                return (
                  <Fila key={v.id} className={anulada ? 'text-tinta-tenue' : undefined}>
                    <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoFecha(v.fecha)}</Td>
                    <Td className="font-semibold">{v.cliente_nombre}</Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <span className={anulada ? 'line-through' : 'font-semibold'}>{v.nombre_producto}</span>
                        {anulada ? <Badge tono="error">Anulada</Badge> : <Badge tono={mayor ? 'mayor' : 'neutro'}>{mayor ? 'Por mayor' : 'Detal'}</Badge>}
                      </div>
                    </Td>
                    <Td alinear="der" className="font-semibold tabular">{v.cantidad}</Td>
                    <Td alinear="der" className="whitespace-nowrap font-bold tabular">{formatoMoneda(v.total_venta)}</Td>
                    <Td alinear="der" className="whitespace-nowrap font-semibold text-exito-texto tabular">
                      {anulada ? '—' : `+${formatoMoneda(v.ganancia_bruta)}`}
                    </Td>
                    <Td className="capitalize">{v.metodo_pago}</Td>
                    <Td className="text-tinta-suave">{v.vendedor}</Td>
                    <Td alinear="der">
                      <Button variante="fantasma" tamano="sm" onClick={() => onVerTicket(v)}>
                        <Receipt className="h-4 w-4" aria-hidden="true" />
                        Ticket
                      </Button>
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
