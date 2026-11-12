import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Lock, Receipt } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, Fila, PageHeader, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoFecha, formatoMoneda } from '@/lib/formato';
import type { CierreMensual, Gasto, Producto, Venta } from '@/types';
import { ComprobanteMesModal } from './ComprobanteMesModal';
import { MESES, MESES_LARGOS, claveMes, mesDesplazado, nombreMes } from './meses';

interface ReportesViewProps {
  ventas: Venta[];
  gastos: Gasto[];
  cierres: CierreMensual[];
  /** Para saber en qué unidad se vende cada producto (bulto, kilo o unidad) */
  productos: Producto[];
  tipoPrecio: (v: Venta) => 'detal' | 'mayorista';
  onExportar: () => void;
  onVerTicket: (v: Venta) => void;
  /** Cierra un mes ya terminado ("2026-10-01"); devuelve el acta, o null si falló */
  onCerrarMes: (mes: string) => Promise<CierreMensual | null>;
  telefonoDueno: string;
}

/** Totales de un mes con las ventas y gastos cargados (sin anuladas) */
function calcularMes(ventas: Venta[], gastos: Gasto[], clave: string) {
  const delMes = ventas.filter((v) => claveMes(v.fecha) === clave);
  const validas = delMes.filter((v) => v.estado !== 'anulada');
  const total = validas.reduce((acc, v) => acc + (Number(v.total_venta) || 0), 0);
  const ganancia = validas.reduce((acc, v) => acc + (Number(v.ganancia_bruta) || 0), 0);
  const totalGastos = gastos.filter((g) => claveMes(g.fecha) === clave).reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  return { total, ganancia, gastos: totalGastos, utilidad: ganancia - totalGastos, cantidad: validas.length, anuladas: delMes.length - validas.length };
}

/** Cantidades vendidas (sin anuladas) separadas por unidad, para no sumar kilos con bultos */
function cantidadesVendidas(ventas: Venta[], unidadDe: (v: Venta) => string) {
  const r = { bulto: 0, kilo: 0, unidad: 0 };
  for (const v of ventas) {
    if (v.estado === 'anulada') continue;
    const u = unidadDe(v);
    const clave = u === 'kilo' ? 'kilo' : u === 'unidad' ? 'unidad' : 'bulto';
    r[clave] += Number(v.cantidad) || 0;
  }
  return r;
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const textoBultos = (n: number) => `${entero.format(n)} ${n === 1 ? 'bulto' : 'bultos'}`;
/** "+ 15 kg · 3 unidades" (lo que no se vende por bulto); vacío si no hay */
function textoOtrasUnidades(c: { kilo: number; unidad: number }) {
  const partes = [c.kilo > 0 ? `${entero.format(c.kilo)} kg` : '', c.unidad > 0 ? `${entero.format(c.unidad)} ${c.unidad === 1 ? 'unidad' : 'unidades'}` : ''].filter(Boolean);
  return partes.length ? `+ ${partes.join(' · ')}` : '';
}

export function ReportesView({ ventas, gastos, cierres, productos, tipoPrecio, onExportar, onVerTicket, onCerrarMes, telefonoDueno }: ReportesViewProps) {
  const [mesACerrar, setMesACerrar] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [acta, setActa] = useState<CierreMensual | null>(null);

  // El saldo arranca en 0 cada mes: el resumen muestra el mes en curso, y con las flechas se ven los anteriores
  const mesActual = claveMes(new Date());
  const [mesVisto, setMesVisto] = useState(mesActual);
  const resumen = useMemo(() => calcularMes(ventas, gastos, mesVisto), [ventas, gastos, mesVisto]);

  // Unidad de cada venta: por el producto (id o nombre); si ya no existe, se cuenta como bulto
  const unidadDe = useMemo(() => {
    const porId = new Map(productos.map((p) => [p.id, p.unidad_medida]));
    const porNombre = new Map(productos.map((p) => [p.nombre, p.unidad_medida]));
    return (v: Venta) => (v.producto_id != null ? porId.get(v.producto_id) : undefined) ?? porNombre.get(v.nombre_producto) ?? 'bulto';
  }, [productos]);
  const vendidoMes = useMemo(
    () => cantidadesVendidas(ventas.filter((v) => claveMes(v.fecha) === mesVisto), unidadDe),
    [ventas, mesVisto, unidadDe]
  );
  const vendidoTotal = useMemo(() => cantidadesVendidas(ventas, unidadDe), [ventas, unidadDe]);
  const cierreVisto = cierres.find((c) => c.mes === mesVisto);

  // Primer mes con movimiento: hasta ahí deja retroceder la flecha
  const primerMes = useMemo(() => {
    let primero = mesActual;
    for (const v of ventas) primero = claveMes(v.fecha) < primero ? claveMes(v.fecha) : primero;
    for (const g of gastos) primero = claveMes(g.fecha) < primero ? claveMes(g.fecha) : primero;
    return primero;
  }, [ventas, gastos, mesActual]);

  // Totales desde el inicio (todos los meses, sin anuladas)
  const historico = useMemo(() => {
    const validas = ventas.filter((v) => v.estado !== 'anulada');
    const total = validas.reduce((acc, v) => acc + (Number(v.total_venta) || 0), 0);
    const ganancia = validas.reduce((acc, v) => acc + (Number(v.ganancia_bruta) || 0), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
    return { total, ganancia, gastos: totalGastos, utilidad: ganancia - totalGastos, cantidad: validas.length, anuladas: ventas.length - validas.length };
  }, [ventas, gastos]);

  // Meses desde el primero con movimiento hasta el actual (incluidos), para el promedio de bultos
  const mesesConDatos = useMemo(() => {
    const [a1, m1] = primerMes.split('-').map(Number);
    const [a2, m2] = mesActual.split('-').map(Number);
    return Math.max(1, (a2 - a1) * 12 + (m2 - m1) + 1);
  }, [primerMes, mesActual]);

  const margen = (ganancia: number, total: number) =>
    total > 0 ? `${((ganancia / total) * 100).toFixed(1).replace('.', ',')} %` : '—';

  // Meses que ya terminaron y tuvieron movimiento, cerrados o por cerrar (el más reciente primero)
  const mesesCierre = useMemo(() => {
    const claves = new Set<string>(cierres.map((c) => c.mes));
    for (const v of ventas) claves.add(claveMes(v.fecha));
    for (const g of gastos) claves.add(claveMes(g.fecha));
    return [...claves]
      .filter((c) => c < mesActual)
      .sort((a, b) => b.localeCompare(a))
      .map((clave) => ({ clave, cierre: cierres.find((c) => c.mes === clave) ?? null, calculado: calcularMes(ventas, gastos, clave) }));
  }, [ventas, gastos, cierres, mesActual]);

  const previa = mesACerrar ? calcularMes(ventas, gastos, mesACerrar) : null;

  const confirmarCierre = async () => {
    if (!mesACerrar || cerrando) return;
    setCerrando(true);
    const nueva = await onCerrarMes(mesACerrar);
    setCerrando(false);
    if (nueva) {
      setMesACerrar(null);
      setActa(nueva);
    }
  };

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

      {/* Resumen de un mes, con flechas para ir a los anteriores */}
      <section aria-labelledby="titulo-resumen-mes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-resumen-mes" className="text-xl font-bold text-tinta">Resumen del mes</h2>
          <div className="flex items-center gap-1.5">
            {mesVisto !== mesActual && (
              <Button variante="fantasma" tamano="sm" onClick={() => setMesVisto(mesActual)} className="mr-1">
                Mes actual
              </Button>
            )}
            <Button
              variante="secundario"
              tamano="sm"
              aria-label="Mes anterior"
              title="Mes anterior"
              disabled={mesVisto <= primerMes}
              onClick={() => setMesVisto((m) => mesDesplazado(m, -1))}
              className="px-2.5"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <span aria-live="polite" className="min-w-[150px] text-center text-base font-bold capitalize text-tinta tabular">
              {nombreMes(mesVisto)}
            </span>
            <Button
              variante="secundario"
              tamano="sm"
              aria-label="Mes siguiente"
              title="Mes siguiente"
              disabled={mesVisto >= mesActual}
              onClick={() => setMesVisto((m) => mesDesplazado(m, 1))}
              className="px-2.5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-3">
          <StatCard
            tono="oscuro"
            etiqueta={`Ventas de ${nombreMes(mesVisto)}`}
            valor={formatoMoneda(resumen.total)}
            detalle={`${resumen.cantidad} ventas · ${textoBultos(vendidoMes.bulto)}${textoOtrasUnidades(vendidoMes) ? ` ${textoOtrasUnidades(vendidoMes)}` : ''} · ${resumen.anuladas} anuladas · ${
              mesVisto === mesActual ? 'arranca en 0 cada mes' : cierreVisto ? 'mes cerrado' : 'mes por cerrar'
            }`}
          />
          <StatCard
            etiqueta="Ganancia bruta del mes"
            valor={formatoMoneda(resumen.ganancia)}
            detalle={`Gastos ${formatoMoneda(resumen.gastos)} · utilidad ${formatoMoneda(resumen.utilidad)}`}
          />
          <StatCard etiqueta="Margen del mes" valor={margen(resumen.ganancia, resumen.total)} detalle="Sobre el total vendido" />
        </div>
      </section>

      {/* Totales de todos los meses */}
      <section aria-labelledby="titulo-historico" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="titulo-historico" className="text-xl font-bold text-tinta">Ventas totales</h2>
          <span className="text-[15px] text-tinta-suave">Todos los meses</span>
        </div>
        <div className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            etiqueta="Total vendido"
            valor={formatoMoneda(historico.total)}
            detalle={`${historico.cantidad} ventas · ${historico.anuladas} anuladas`}
          />
          <StatCard
            etiqueta="Ganancia bruta total"
            valor={formatoMoneda(historico.ganancia)}
            detalle={`Gastos ${formatoMoneda(historico.gastos)} · utilidad ${formatoMoneda(historico.utilidad)}`}
          />
          <StatCard etiqueta="Margen promedio" valor={margen(historico.ganancia, historico.total)} detalle="Sobre todo lo vendido" />
          <StatCard
            etiqueta="Bultos vendidos"
            valor={textoBultos(vendidoTotal.bulto)}
            detalle={[
              `≈ ${entero.format(Math.round((vendidoTotal.bulto / mesesConDatos) * 10) / 10)} por mes`,
              textoOtrasUnidades(vendidoTotal),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </div>
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

      {/* Cierres de mes */}
      <Panel>
        <div className="flex flex-col gap-1 px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold text-tinta">Cierres de mes</h2>
          <span className="text-sm text-tinta-suave">Al cerrar un mes queda guardado su resumen y ya no se pueden anular sus ventas ni cambiar sus gastos</span>
        </div>
        {mesesCierre.length === 0 ? (
          <EmptyState className="m-6" titulo="Aún no hay meses para cerrar" descripcion="Cuando termine el mes, aquí podrás cerrarlo y guardar su resumen." />
        ) : (
          <Tabla minAncho={760}>
            <thead>
              <tr>
                <Th>Mes</Th>
                <Th alinear="der">Vendido</Th>
                <Th alinear="der">Utilidad</Th>
                <Th>Estado</Th>
                <Th alinear="der"><span className="sr-only">Acción</span></Th>
              </tr>
            </thead>
            <tbody>
              {mesesCierre.map(({ clave, cierre, calculado }) => (
                <Fila key={clave}>
                  <Td className="font-semibold capitalize">{nombreMes(clave)}</Td>
                  <Td alinear="der" className="whitespace-nowrap font-bold tabular">{formatoMoneda(cierre ? cierre.total_ventas : calculado.total)}</Td>
                  <Td alinear="der" className="whitespace-nowrap tabular">{formatoMoneda(cierre ? cierre.utilidad_neta : calculado.utilidad)}</Td>
                  <Td>
                    {cierre ? (
                      <span className="flex flex-col items-start gap-1">
                        <Badge tono="exito">Cerrado</Badge>
                        <span className="text-[13px] text-tinta-suave">{cierre.cerrado_por} · {formatoFecha(cierre.cerrado_en)}</span>
                      </span>
                    ) : (
                      <Badge tono="aviso">Por cerrar</Badge>
                    )}
                  </Td>
                  <Td alinear="der">
                    {cierre ? (
                      <Button variante="fantasma" tamano="sm" onClick={() => setActa(cierre)}>
                        <Receipt className="h-4 w-4" aria-hidden="true" />
                        Ver resumen
                      </Button>
                    ) : (
                      <Button tamano="sm" onClick={() => setMesACerrar(clave)}>
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        Cerrar mes
                      </Button>
                    )}
                  </Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>

      {mesACerrar && previa && (
        <ConfirmDialog
          titulo={`¿Cerrar ${nombreMes(mesACerrar)}?`}
          textoConfirmar="Sí, cerrar el mes"
          cargando={cerrando}
          onConfirmar={confirmarCierre}
          onCancelar={() => setMesACerrar(null)}
        >
          <dl className="flex flex-col rounded-campo bg-hundido px-4 py-2">
            {[
              ['Vendido', formatoMoneda(previa.total)],
              ['Ganancia bruta', formatoMoneda(previa.ganancia)],
              ['Gastos', formatoMoneda(previa.gastos)],
              ['Utilidad', formatoMoneda(previa.utilidad)],
              ['Ventas', `${previa.cantidad} · ${previa.anuladas} anuladas`],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex justify-between gap-4 py-1.5">
                <dt className="text-tinta-suave">{etiqueta}</dt>
                <dd className="font-semibold tabular">{valor}</dd>
              </div>
            ))}
          </dl>
          <p>Después de cerrarlo no se podrán anular ventas ni cambiar gastos de ese mes. Esto no se puede deshacer.</p>
        </ConfirmDialog>
      )}

      {acta && <ComprobanteMesModal cierre={acta} telefonoDueno={telefonoDueno} onCerrar={() => setActa(null)} />}

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
