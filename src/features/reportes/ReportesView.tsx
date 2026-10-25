import React, { useMemo } from 'react';
import { Download, Receipt } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoFecha, formatoMoneda } from '@/lib/formato';
import type { Venta } from '@/types';

interface ReportesViewProps {
  ventas: Venta[];
  tipoPrecio: (v: Venta) => 'detal' | 'mayorista';
  onExportar: () => void;
  onVerTicket: (v: Venta) => void;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

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

  // Ventas de los últimos 12 meses (sin anuladas), el mes actual al final
  const mensual = useMemo(() => {
    const hoy = new Date();
    const meses = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 11 + i, 1);
      return { anio: d.getFullYear(), mes: d.getMonth(), total: 0, actual: i === 11 };
    });
    for (const v of ventas) {
      if (v.estado === 'anulada') continue;
      const f = new Date(v.fecha);
      const m = meses.find((x) => x.anio === f.getFullYear() && x.mes === f.getMonth());
      if (m) m.total += Number(v.total_venta) || 0;
    }
    const actual = meses[11].total;
    const anterior = meses[10].total;
    return {
      meses,
      max: Math.max(1, ...meses.map((m) => m.total)),
      total: meses.reduce((a, m) => a + m.total, 0),
      actual,
      variacion: anterior > 0 ? ((actual - anterior) / anterior) * 100 : null,
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

      {/* Gráfica de ventas por mes */}
      <Panel className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-tinta">Ventas por mes</h2>
            <p className="text-[15px] text-tinta-suave tabular">
              <span className="capitalize">{MESES_LARGOS[mensual.meses[11].mes]}</span>: {formatoMoneda(mensual.actual)}
              {mensual.variacion === null ? (
                ' · sin ventas el mes anterior para comparar'
              ) : (
                <>
                  {' · '}
                  <span className={cn('font-semibold', mensual.variacion >= 0 ? 'text-exito-texto' : 'text-rojo-oscuro')}>
                    {mensual.variacion >= 0 ? '+' : '−'}
                    {Math.abs(mensual.variacion).toFixed(1).replace('.', ',')} %
                  </span>{' '}
                  frente a {MESES_LARGOS[mensual.meses[10].mes]}
                </>
              )}
            </p>
          </div>
          <span className="text-[15px] text-tinta-suave tabular">Últimos 12 meses: {formatoMoneda(mensual.total)}</span>
        </div>

        <div className="grid h-[260px] grid-cols-12 items-end gap-1.5 pt-8 sm:gap-3">
          {mensual.meses.map((m, i) => {
            const etiqueta = `${MESES_LARGOS[m.mes]} ${m.anio}: ${formatoMoneda(m.total)}`;
            return (
              <div
                key={`${m.anio}-${m.mes}`}
                tabIndex={0}
                aria-label={etiqueta}
                className="group relative flex h-full flex-col items-center justify-end gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maiz"
              >
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-noche px-2 py-1 text-xs font-semibold capitalize text-crema opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100 tabular">
                  {etiqueta}
                </span>
                <div
                  className={cn('barra-crecer w-full rounded-[6px_6px_3px_3px]', m.actual ? 'bg-rojo' : 'bg-neutro-hover group-hover:bg-[#D6CFC2]')}
                  style={{ height: `${Math.max(2, (m.total / mensual.max) * 100)}%`, animationDelay: `${i * 40}ms` }}
                />
                <span className={cn('text-[12px] sm:text-[13px]', m.actual ? 'font-bold text-tinta' : 'text-tinta-suave')}>{MESES[m.mes]}</span>
              </div>
            );
          })}
        </div>
      </Panel>

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
