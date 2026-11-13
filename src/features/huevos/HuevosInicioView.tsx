import React, { useMemo } from 'react';
import { PackagePlus, RefreshCw, ShoppingBasket } from 'lucide-react';
import { Badge, Button, EmptyState, Panel, StatCard, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { hoyLocal, textoCartones } from '@/lib/galpones';
import { enBodega, totalesMovimientos, valorHuevos, type MovimientoHuevo, type TipoHuevo } from '@/lib/huevos';

interface HuevosInicioViewProps {
  nombreUsuario: string;
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  saldo: Map<number, number>;
  actualizando: boolean;
  onActualizar: () => void;
  onVender: (tipoId: number) => void;
  onInventario: () => void;
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
    for (const t of p.tipos) {
      const hay = enBodega(p.saldo, t.id);
      huevos += hay;
      valor += valorHuevos(hay, t.precio_venta);
    }
    return { ...deHoy, huevosBodega: huevos, valorBodega: valor };
  }, [p.movimientos, p.tipos, p.saldo, hoy]);

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
          <Button variante="secundario" onClick={p.onInventario}>
            <PackagePlus className="h-5 w-5" aria-hidden="true" />
            Agregar al inventario
          </Button>
        </div>
      </header>

      <section aria-label="Resumen de hoy" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tono="oscuro" etiqueta="Vendido hoy" valor={formatoMoneda(resumen.vendido)} detalle={textoCartones(resumen.huevosVendidos)} />
        <StatCard etiqueta="Huevos en bodega" valor={textoCartones(resumen.huevosBodega)} detalle={`Valen ${formatoMoneda(resumen.valorBodega)} a precio de venta`} />
        <StatCard etiqueta="Ingresado hoy" valor={textoCartones(resumen.huevosIngresados)} detalle="Cargado al inventario" />
        <StatCard
          tono={resumen.huevosRotos > 0 ? 'aviso' : 'claro'}
          etiqueta="Rotos hoy"
          valor={textoCartones(resumen.huevosRotos)}
          detalle={resumen.huevosRotos > 0 ? 'Ya descontados del inventario' : 'Sin pérdidas'}
        />
      </section>

      {activos.length === 0 ? (
        <EmptyState titulo="Todavía no hay tamaños de huevo" descripcion="El administrador debe crearlos (AAA, AA, A, B…) en Tipos y precios." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activos.map((t) => {
            const hay = enBodega(p.saldo, t.id);
            const agotado = hay <= 0;
            return (
              <Panel key={t.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-tinta-suave">Huevo</span>
                    <h2 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.02em]">{t.nombre}</h2>
                  </div>
                  {agotado ? <Badge tono="error">Agotado</Badge> : <Badge tono="exito">{textoCartones(hay)}</Badge>}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-[15px]">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-tinta-suave">Precio del cartón</dt>
                    <dd className="font-bold tabular">
                      {t.precio_venta > 0 ? formatoMoneda(t.precio_venta) : <span className="text-rojo-oscuro">Falta ponerlo</span>}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-tinta-suave">Lo que hay vale</dt>
                    <dd className="font-bold tabular">{hay > 0 && t.precio_venta > 0 ? formatoMoneda(valorHuevos(hay, t.precio_venta)) : '—'}</dd>
                  </div>
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
    </div>
  );
}
