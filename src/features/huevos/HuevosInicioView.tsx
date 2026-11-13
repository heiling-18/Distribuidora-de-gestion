import React, { useMemo } from 'react';
import { PackagePlus, RefreshCw, ShoppingBasket } from 'lucide-react';
import { Badge, Button, EmptyState, Panel, StatCard, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { hoyLocal, textoCartones } from '@/lib/galpones';
import { SIN_EXISTENCIA, totalesMovimientos, type ExistenciaTipo, type MovimientoHuevo, type TipoHuevo } from '@/lib/huevos';

interface HuevosInicioViewProps {
  nombreUsuario: string;
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  existencias: Map<number, ExistenciaTipo>;
  actualizando: boolean;
  onActualizar: () => void;
  onVender: (tipoId: number) => void;
  onLlegada: () => void;
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export function HuevosInicioView(p: HuevosInicioViewProps) {
  const hoy = hoyLocal();
  const primerNombre = p.nombreUsuario.split(' ')[0] || p.nombreUsuario;
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const activos = p.tipos.filter((t) => t.activo);

  const resumen = useMemo(() => {
    const deHoy = totalesMovimientos(p.movimientos.filter((m) => m.fecha === hoy));
    let huevos = 0;
    let valor = 0;
    for (const e of p.existencias.values()) {
      huevos += e.huevos;
      valor += e.valorCosto;
    }
    return { ...deHoy, huevosBodega: huevos, valorBodega: valor };
  }, [p.movimientos, p.existencias, hoy]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] capitalize text-tinta-suave">{fechaHoy}</span>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
            {saludo()}, {primerNombre}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variante="secundario" onClick={p.onActualizar} disabled={p.actualizando} aria-label="Actualizar datos" title="Actualizar datos" className="px-3.5">
            <RefreshCw className={cn('h-5 w-5', p.actualizando && 'animate-spin')} aria-hidden="true" />
          </Button>
          <Button variante="secundario" onClick={p.onLlegada}>
            <PackagePlus className="h-5 w-5" aria-hidden="true" />
            Llegaron huevos
          </Button>
        </div>
      </header>

      <section aria-label="Resumen de hoy" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tono="oscuro" etiqueta="Vendido hoy" valor={formatoMoneda(resumen.vendido)} detalle={textoCartones(resumen.huevosVendidos)} />
        <StatCard etiqueta="Ganancia de hoy" valor={formatoMoneda(resumen.ganancia)} detalle="Venta menos lo que costaron" />
        <StatCard etiqueta="Huevos en bodega" valor={textoCartones(resumen.huevosBodega)} detalle={`Costaron ${formatoMoneda(resumen.valorBodega)}`} />
        <StatCard
          etiqueta="Llegó hoy"
          valor={formatoMoneda(resumen.comprado)}
          detalle={resumen.huevosPerdidos > 0 ? `${textoCartones(resumen.huevosComprados)} · ${resumen.huevosPerdidos} rotos` : textoCartones(resumen.huevosComprados)}
        />
      </section>

      {activos.length === 0 ? (
        <EmptyState titulo="Todavía no hay tipos de huevo" descripcion="El administrador debe crear los tamaños (AAA, AA, A, B…) en Tipos y precios." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activos.map((t) => {
            const e = p.existencias.get(t.id) ?? SIN_EXISTENCIA;
            const margen = t.precio_venta - e.costoCarton;
            const agotado = e.huevos <= 0;
            return (
              <Panel key={t.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-tinta-suave">Huevo</span>
                    <h2 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.02em]">{t.nombre}</h2>
                  </div>
                  {agotado ? <Badge tono="error">Agotado</Badge> : <Badge tono="exito">{textoCartones(e.huevos)}</Badge>}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-[15px]">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-tinta-suave">Costo promedio</dt>
                    <dd className="font-bold tabular">{e.huevos > 0 ? formatoMoneda(e.costoCarton) : '—'}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-tinta-suave">Precio de venta</dt>
                    <dd className="font-bold tabular">{t.precio_venta > 0 ? formatoMoneda(t.precio_venta) : 'Sin precio'}</dd>
                  </div>
                  {e.huevos > 0 && t.precio_venta > 0 && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <dt className="text-tinta-suave">Se gana por cartón</dt>
                      <dd className={cn('font-bold tabular', margen < 0 ? 'text-rojo-oscuro' : 'text-exito-texto')}>
                        {margen < 0 ? '−' : '+'}
                        {formatoMoneda(Math.abs(margen))}
                      </dd>
                    </div>
                  )}
                </dl>

                <Button anchoCompleto disabled={agotado} onClick={() => p.onVender(t.id)} className="mt-auto">
                  <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
                  Vender {t.nombre}
                </Button>
              </Panel>
            );
          })}
        </div>
      )}
      <p className="text-sm text-tinta-suave">
        Precios por cartón de 30. El costo promedio mezcla lo que pagaste en cada llegada: si hoy llegan más caros, sube; si llegan más baratos, baja.
      </p>
    </div>
  );
}
