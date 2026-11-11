import React, { useMemo } from 'react';
import { ClipboardPen, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, EmptyState, Panel, StatCard, cn } from '@/components/ui';
import {
  alimentoSugeridoKg,
  avesVivas,
  costoAlimento,
  costoLote,
  edadSemanas,
  formatoBultos,
  formatoEntero,
  formatoKg,
  formatoPesos,
  hoyLocal,
  kgABultos,
  kgLote,
  precioDelRegistro,
  textoCartones,
  type Galpon,
  type RegistroGalpon,
} from '@/lib/galpones';

interface GalponesInicioViewProps {
  nombreUsuario: string;
  esAdmin: boolean;
  galpones: Galpon[];
  registros: RegistroGalpon[];
  actualizando: boolean;
  onActualizar: () => void;
  onRegistrar: (galponId: number) => void;
  onCrearGalpon: () => void;
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export function GalponesInicioView(p: GalponesInicioViewProps) {
  const hoy = hoyLocal();
  const primerNombre = p.nombreUsuario.split(' ')[0] || p.nombreUsuario;
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const activos = p.galpones.filter((g) => g.activo);

  const resumen = useMemo(() => {
    const deHoy = p.registros.filter((r) => r.fecha === hoy);
    const vivas = activos.reduce((acc, g) => acc + avesVivas(g, p.registros), 0);
    const iniciales = activos.reduce((acc, g) => acc + g.aves_iniciales, 0);
    const alimento = activos.reduce((acc, g) => acc + alimentoSugeridoKg(avesVivas(g, p.registros), g.gramos_ave_dia), 0);
    // Lo que costaría el alimento que toca hoy, con el precio actual de cada galpón
    const costoAlDia = activos.reduce((acc, g) => acc + costoAlimento(alimentoSugeridoKg(avesVivas(g, p.registros), g.gramos_ave_dia), g.precio_bulto), 0);
    const gastoHoy = deHoy.reduce((acc, r) => {
      const g = p.galpones.find((x) => x.id === r.galpon_id);
      return acc + costoAlimento(r.alimento_kg, precioDelRegistro(r, g));
    }, 0);
    return {
      hayPostura: activos.some((g) => g.tipo !== 'levante'),
      costoAlDia,
      gastoHoy,
      kgHoy: deHoy.reduce((acc, r) => acc + r.alimento_kg, 0),
      huevosHoy: deHoy.reduce((acc, r) => acc + r.huevos, 0),
      muertasHoy: deHoy.reduce((acc, r) => acc + r.muertas, 0),
      pendientes: activos.filter((g) => !deHoy.some((r) => r.galpon_id === g.id)).length,
      vivas,
      muertasTotal: iniciales - vivas,
      alimento,
    };
  }, [p.registros, p.galpones, activos, hoy]);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] capitalize text-tinta-suave">{fechaHoy}</span>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
            {saludo()}, {primerNombre}
          </h1>
        </div>
        <Button variante="secundario" onClick={p.onActualizar} disabled={p.actualizando} aria-label="Actualizar datos" title="Actualizar datos" className="px-3.5">
          <RefreshCw className={cn('h-5 w-5', p.actualizando && 'animate-spin')} aria-hidden="true" />
        </Button>
      </header>

      {activos.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay galpones"
          descripcion={
            p.esAdmin
              ? 'Crea los galpones con la cantidad de aves que llegaron y su edad. Después se anota cada día.'
              : 'El administrador debe crear los galpones antes de empezar a anotar.'
          }
          accion={
            p.esAdmin && (
              <Button onClick={p.onCrearGalpon}>
                <Plus className="h-5 w-5" aria-hidden="true" />
                Crear galpón
              </Button>
            )
          }
        />
      ) : (
        <>
          <section aria-label="Resumen de hoy" className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-2 xl:grid-cols-4">
            {resumen.hayPostura ? (
              <StatCard tono="oscuro" etiqueta="Huevos de hoy" valor={formatoEntero(resumen.huevosHoy)} detalle={textoCartones(resumen.huevosHoy)} />
            ) : (
              <StatCard tono="oscuro" etiqueta="Gasto en alimento hoy" valor={formatoPesos(resumen.gastoHoy)} detalle={`${formatoKg(resumen.kgHoy)} anotados hoy`} />
            )}
            <StatCard
              etiqueta="Aves vivas"
              valor={formatoEntero(resumen.vivas)}
              detalle={`${formatoEntero(resumen.muertasTotal)} muertas en total · ${resumen.muertasHoy} hoy`}
            />
            <StatCard
              etiqueta="Alimento al día (aves vivas)"
              valor={formatoKg(resumen.alimento)}
              detalle={`≈ ${formatoBultos(kgABultos(resumen.alimento))} de 40 kg${resumen.costoAlDia > 0 ? ` · ${formatoPesos(resumen.costoAlDia)}` : ''}`}
            />
            <StatCard
              tono={resumen.pendientes > 0 ? 'aviso' : 'claro'}
              etiqueta="Registro de hoy"
              valor={resumen.pendientes > 0 ? `Faltan ${resumen.pendientes}` : 'Completo'}
              detalle={resumen.pendientes > 0 ? `${resumen.pendientes === 1 ? 'galpón sin anotar' : 'galpones sin anotar'}` : 'Todos los galpones anotados'}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {activos.map((g) => {
              const vivas = avesVivas(g, p.registros);
              const kg = alimentoSugeridoKg(vivas, g.gramos_ave_dia);
              const deHoy = p.registros.find((r) => r.galpon_id === g.id && r.fecha === hoy);
              const semanas = edadSemanas(g, hoy);
              const muertas = g.aves_iniciales - vivas;
              const levante = g.tipo === 'levante';
              const gastoHoy = deHoy ? costoAlimento(deHoy.alimento_kg, precioDelRegistro(deHoy, g)) : 0;
              const gastoLote = costoLote(g, p.registros);
              return (
                <Panel key={g.id} className="flex flex-col gap-5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold tracking-[-0.02em]">
                        {g.nombre}
                        {levante && <Badge tono="mayor">Levante</Badge>}
                      </h2>
                      <span className="text-[15px] text-tinta-suave tabular">
                        Semana {semanas} · {formatoEntero(vivas)} de {formatoEntero(g.aves_iniciales)} aves
                      </span>
                    </div>
                    {deHoy ? <Badge tono="exito">Anotado hoy</Badge> : <Badge tono="aviso">Falta anotar hoy</Badge>}
                  </div>

                  <div className="rounded-campo bg-hundido px-5 py-4">
                    <span className="text-sm font-semibold text-tinta-suave">{deHoy ? 'Echar mañana' : 'Echar hoy'}</span>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <strong className="font-display text-[34px] font-extrabold leading-tight tracking-[-0.03em] tabular">{formatoKg(kg)}</strong>
                      <span className="text-[15px] text-tinta-suave tabular">≈ {formatoBultos(kgABultos(kg))}</span>
                    </div>
                    <span className="text-sm text-tinta-suave tabular">
                      {formatoEntero(vivas)} aves × {formatoEntero(g.gramos_ave_dia)} g
                      {g.precio_bulto > 0 && ` · ${formatoPesos(costoAlimento(kg, g.precio_bulto))}`}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-4 text-[15px]">
                    {levante ? (
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-tinta-suave">Alimento hoy</dt>
                        <dd className="font-bold tabular">
                          {deHoy ? `${formatoKg(deHoy.alimento_kg)}${gastoHoy > 0 ? ` · ${formatoPesos(gastoHoy)}` : ''}` : '—'}
                        </dd>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-tinta-suave">Huevos hoy</dt>
                        <dd className="font-bold tabular">{deHoy ? `${formatoEntero(deHoy.huevos)} · ${textoCartones(deHoy.huevos)}` : '—'}</dd>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-tinta-suave">Muertas</dt>
                      <dd className="font-bold tabular">
                        {deHoy ? `${deHoy.muertas} hoy` : '—'} · {formatoEntero(muertas)} total
                      </dd>
                    </div>
                    {(levante || gastoLote > 0) && (
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <dt className="text-tinta-suave">Alimento de todo el lote</dt>
                        <dd className="font-bold tabular">
                          {formatoKg(kgLote(g, p.registros))}
                          {gastoLote > 0 && ` · ${formatoPesos(gastoLote)}`}
                          {gastoLote > 0 && vivas > 0 && <span className="font-normal text-tinta-suave"> · {formatoPesos(gastoLote / vivas)} por ave viva</span>}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <Button tamano="lg" anchoCompleto variante={deHoy ? 'secundario' : 'primario'} onClick={() => p.onRegistrar(g.id)}>
                    <ClipboardPen className="h-5 w-5" aria-hidden="true" />
                    {deHoy ? 'Corregir el día de hoy' : 'Anotar el día de hoy'}
                  </Button>
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
