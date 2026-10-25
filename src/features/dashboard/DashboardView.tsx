import React, { useMemo } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, Panel, StatCard, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { Producto, Venta } from '@/types';

interface DashboardViewProps {
  nombreUsuario: string;
  esAdmin: boolean;
  cajaAbierta: boolean;
  ventas: Venta[];
  ventasHoy: Venta[];
  productos: Producto[];
  totales: {
    efectivoHoy: number;
    transferenciaHoy: number;
    dineroEnCaja: number;
    efectivoEnCaja: number;
    gastosHoy: number;
    inversion: number;
    valorComercial: number;
  };
  tipoPrecio: (v: Venta) => 'detal' | 'mayorista';
  procesandoAnulacion: boolean;
  actualizando?: boolean;
  onActualizar: () => void;
  onNuevaVenta: () => void;
  onIrCaja: () => void;
  onVerVentas: () => void;
  onExportarHoy: () => void;
  onVerAlertas: () => void;
  onAnular: (v: Venta) => void;
  onVerMotivo: (v: Venta) => void;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export function DashboardView(p: DashboardViewProps) {
  const primerNombre = p.nombreUsuario.split(' ')[0] || p.nombreUsuario;
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  // Ventas de los últimos 7 días (sin anuladas)
  const semana = useMemo(() => {
    const dias: { etiqueta: string; total: number; hoy: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const total = p.ventas
        .filter((v) => v.estado !== 'anulada')
        .filter((v) => {
          const f = new Date(v.fecha);
          return f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth() && f.getDate() === d.getDate();
        })
        .reduce((acc, v) => acc + (Number(v.total_venta) || 0), 0);
      dias.push({ etiqueta: i === 0 ? 'Hoy' : DIAS[d.getDay()], total, hoy: i === 0 });
    }
    const max = Math.max(1, ...dias.map((d) => d.total));
    return { dias, max, total: dias.reduce((a, d) => a + d.total, 0) };
  }, [p.ventas]);

  const porReponer = useMemo(
    () => p.productos.filter((x) => x.stock <= x.stock_minimo).sort((a, b) => a.stock / Math.max(1, a.stock_minimo) - b.stock / Math.max(1, b.stock_minimo)),
    [p.productos]
  );

  const totalBultos = useMemo(
    () => p.productos.reduce((acc, prod) => acc + (Number(prod.stock) || 0), 0),
    [p.productos]
  );

  const vendidoHoy = p.totales.efectivoHoy + p.totales.transferenciaHoy;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] text-tinta-suave">
            <span className="capitalize">{fechaHoy}</span> · caja {p.cajaAbierta ? 'abierta' : 'cerrada'}
          </span>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
            {saludo()}, {primerNombre}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variante="secundario" onClick={p.onActualizar} disabled={p.actualizando} aria-label="Actualizar datos" title="Actualizar datos" className="px-3.5">
            <RefreshCw className={cn('h-5 w-5', p.actualizando && 'animate-spin')} aria-hidden="true" />
          </Button>
          <Button variante="secundario" onClick={p.onIrCaja}>{p.cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}</Button>
          <Button onClick={p.onNuevaVenta}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nueva venta
          </Button>
        </div>
      </header>

      {/* Resumen del día */}
      <section
        aria-label="Resumen del día"
        className={cn(
          'grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-2',
          p.esAdmin ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
        )}
      >
        <StatCard
          tono="oscuro"
          etiqueta="Vendido hoy"
          valor={formatoMoneda(vendidoHoy)}
          detalle={`Efectivo ${formatoMoneda(p.totales.efectivoHoy)} · Transferencia ${formatoMoneda(p.totales.transferenciaHoy)}`}
        />
        <StatCard
          etiqueta="Dinero en caja"
          valor={formatoMoneda(p.totales.dineroEnCaja)}
          detalle={`Efectivo ${formatoMoneda(p.totales.efectivoEnCaja)} · gastos ${formatoMoneda(p.totales.gastosHoy)}`}
        />
        
        {/* Total Inventario al Precio del Excel (Precio Venta Detal) */}
        <StatCard
          etiqueta="Total inventario (Venta)"
          valor={formatoMoneda(p.totales.valorComercial)}
          detalle={`${totalBultos} bultos · ${p.productos.length} referencias`}
        />

        {/* Inversión en bodega a Costo de Compra (Exclusivo Administrador) */}
        {p.esAdmin && (
          <StatCard
            etiqueta="Inversión en bodega"
            valor={formatoMoneda(p.totales.inversion)}
            detalle={`Margen est. +${formatoMoneda(Math.max(0, p.totales.valorComercial - p.totales.inversion))}`}
          />
        )}

        <button
          type="button"
          onClick={p.onVerAlertas}
          className="group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-maiz"
        >
          <StatCard
            tono={porReponer.length > 0 ? 'aviso' : 'claro'}
            etiqueta="Stock por reponer"
            valor={`${porReponer.length} ${porReponer.length === 1 ? 'producto' : 'productos'}`}
            detalle={<span className="font-semibold group-hover:underline">Ver cuáles →</span>}
            className="h-full"
          />
        </button>
      </section>

      <div className="flex flex-wrap gap-6">
        {/* Gráfica de la semana */}
        <Panel className="flex min-w-0 flex-[3_1_460px] flex-col gap-5 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold">Ventas de la semana</h2>
            <span className="text-[15px] text-tinta-suave tabular">Total {formatoMoneda(semana.total)}</span>
          </div>
          <div className="grid h-[220px] grid-cols-7 items-end gap-2.5 sm:gap-3.5">
            {semana.dias.map((d, i) => (
              <div key={i} className="flex h-full flex-col items-center justify-end gap-2" title={`${d.etiqueta}: ${formatoMoneda(d.total)}`}>
                <div
                  className={cn('barra-crecer w-full rounded-[8px_8px_4px_4px]', d.hoy ? 'bg-rojo' : 'bg-neutro-hover')}
                  style={{ height: `${Math.max(3, (d.total / semana.max) * 100)}%`, animationDelay: `${i * 50}ms` }}
                />
                <span className={cn('text-[13px]', d.hoy ? 'font-bold text-tinta' : 'text-tinta-suave')}>{d.etiqueta}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Reponer pronto */}
        <Panel className="flex min-w-0 flex-[2_1_320px] flex-col gap-4 p-6">
          <h2 className="text-xl font-bold">Reponer pronto</h2>
          {porReponer.length === 0 ? (
            <EmptyState titulo="Todo en orden" descripcion="Ningún producto está por debajo de su mínimo." className="flex-1" />
          ) : (
            <ul className="flex flex-col gap-4">
              {porReponer.slice(0, 5).map((x) => {
                const agotado = x.stock <= 0;
                const pct = Math.min(100, Math.max(3, (x.stock / Math.max(1, x.stock_minimo * 2)) * 100));
                return (
                  <li key={x.id} className="flex flex-col gap-2">
                    <div className="flex justify-between gap-3 text-[15px]">
                      <span className="truncate font-semibold">{x.nombre}</span>
                      <span className={cn('shrink-0 font-bold tabular', agotado ? 'text-rojo-oscuro' : 'text-aviso-texto')}>
                        {agotado ? 'Agotado' : `${x.stock} de ${x.stock_minimo} mín.`}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-hundido">
                      <div className={cn('h-full rounded', agotado ? 'bg-rojo' : 'bg-maiz-oscuro')} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {porReponer.length > 0 && (
            <button type="button" onClick={p.onVerAlertas} className="mt-auto cursor-pointer self-start text-[15px] font-semibold text-rojo hover:text-rojo-oscuro">
              Ver todos los productos por reponer
            </button>
          )}
        </Panel>
      </div>

      {/* Ventas de hoy */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold">Ventas de hoy</h2>
          <div className="flex flex-wrap gap-2">
            <Button variante="fantasma" tamano="sm" onClick={p.onExportarHoy}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar el día
            </Button>
            <Button variante="fantasma" tamano="sm" onClick={p.onVerVentas}>Ver historial</Button>
          </div>
        </div>
        {p.ventasHoy.length === 0 ? (
          <EmptyState className="m-6" titulo="Aún no hay ventas hoy" descripcion="Las ventas que registres en el punto de venta aparecerán aquí." />
        ) : (
          <Tabla minAncho={820}>
            <thead>
              <tr>
                <Th>Hora</Th>
                <Th>Cliente</Th>
                <Th>Producto</Th>
                <Th>Precio</Th>
                <Th>Pago</Th>
                <Th alinear="der">Total</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {p.ventasHoy.slice(0, 10).map((v) => {
                const anulada = v.estado === 'anulada';
                const mayor = p.tipoPrecio(v) === 'mayorista';
                return (
                  <Fila key={v.id} className={anulada ? 'text-tinta-tenue' : undefined}>
                    <Td className="text-tinta-suave tabular">{new Date(v.fecha).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</Td>
                    <Td className="font-semibold">{v.cliente_nombre}</Td>
                    <Td className={anulada ? 'line-through' : undefined}>{v.nombre_producto} × {v.cantidad}</Td>
                    <Td>{anulada ? <Badge tono="error">Anulada</Badge> : <Badge tono={mayor ? 'mayor' : 'neutro'}>{mayor ? 'Por mayor' : 'Detal'}</Badge>}</Td>
                    <Td className="capitalize">{v.metodo_pago}</Td>
                    <Td alinear="der" className={cn('whitespace-nowrap font-bold tabular', anulada && 'line-through')}>{formatoMoneda(v.total_venta)}</Td>
                    <Td alinear="der">
                      {anulada ? (
                        <Button variante="fantasma" tamano="sm" onClick={() => p.onVerMotivo(v)}>Ver motivo</Button>
                      ) : (
                        <Button variante="peligro" tamano="sm" disabled={p.procesandoAnulacion} onClick={() => p.onAnular(v)}>Anular</Button>
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
