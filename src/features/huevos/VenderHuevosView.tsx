'use client';

import React, { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Field, Fila, PageHeader, Panel, Tabla, Td, Th, campoBase, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { HUEVOS_POR_CARTON, formatoEntero, hoyLocal, textoCartones } from '@/lib/galpones';
import { enBodega, totalesMovimientos, valorHuevos, type MovimientoHuevo, type NuevoMovimiento, type TipoHuevo } from '@/lib/huevos';

interface VenderHuevosViewProps {
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  /** Huevos en bodega por tamaño */
  saldo: Map<number, number>;
  /** Tamaño elegido en el Inicio ("Vender AA"): entra al carrito con un cartón */
  tipoInicial: number | null;
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
}

type Forma = 'carton' | 'unidad';
type MetodoPago = 'efectivo' | 'transferencia';

interface LineaCarrito {
  tipoId: number;
  forma: Forma;
  cantidad: number;
}

const huevosPor = (forma: Forma) => (forma === 'carton' ? HUEVOS_POR_CARTON : 1);
/** Precio de un cartón o de un huevo suelto, según el precio de venta del cartón */
const precioDe = (t: TipoHuevo, forma: Forma) => (forma === 'carton' ? t.precio_venta : Math.round(t.precio_venta / HUEVOS_POR_CARTON));
const textoForma = (n: number, forma: Forma) =>
  forma === 'carton' ? `${formatoEntero(n)} ${n === 1 ? 'cartón' : 'cartones'}` : `${formatoEntero(n)} ${n === 1 ? 'huevo' : 'huevos'}`;

export function VenderHuevosView(p: VenderHuevosViewProps) {
  const hoy = hoyLocal();
  const activos = p.tipos.filter((t) => t.activo);
  const [pestana, setPestana] = useState<'venta' | 'rotos'>('venta');

  const deHoy = p.movimientos.filter((m) => m.fecha === hoy && m.clase !== 'entrada');
  const totHoy = totalesMovimientos(deHoy);
  const nombreTipo = (id: number) => p.tipos.find((t) => t.id === id)?.nombre ?? '—';

  if (activos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Vender huevos" />
        <EmptyState titulo="Todavía no hay tamaños de huevo" descripcion="El administrador debe crearlos en Tipos y precios." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader titulo="Vender huevos" descripcion="Agrega cartones o huevos sueltos al carrito y cobra. El precio y el inventario se toman solos." />

      <div role="tablist" aria-label="Qué vas a anotar" className="grid max-w-md grid-cols-2 gap-1 rounded-campo bg-neutro p-1">
        {(['venta', 'rotos'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={pestana === t}
            onClick={() => setPestana(t)}
            className={cn(
              'h-11 cursor-pointer touch-manipulation rounded-control text-[15px] font-bold transition-colors',
              pestana === t ? 'bg-superficie text-tinta shadow-[0_1px_2px_rgba(23,19,15,0.12)]' : 'text-tinta-suave hover:text-tinta'
            )}
          >
            {t === 'venta' ? 'Venta' : 'Huevos rotos'}
          </button>
        ))}
      </div>

      {pestana === 'venta' ? (
        <VentaConCarrito tipos={activos} saldo={p.saldo} tipoInicial={p.tipoInicial} procesando={p.procesando} onGuardar={p.onGuardar} />
      ) : (
        <AnotarRotos tipos={activos} saldo={p.saldo} procesando={p.procesando} onGuardar={p.onGuardar} />
      )}

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold">Hoy</h2>
          <span className="text-[15px] text-tinta-suave tabular">
            Vendido {formatoMoneda(totHoy.vendido)} · {textoCartones(totHoy.huevosVendidos)}
          </span>
        </div>
        {deHoy.length === 0 ? (
          <EmptyState className="m-6" titulo="Aún no hay ventas hoy" descripcion="Las ventas y los huevos rotos de hoy aparecerán aquí." />
        ) : (
          <Tabla minAncho={560}>
            <thead>
              <tr>
                <Th>Hora</Th>
                <Th>Tamaño</Th>
                <Th>Cantidad</Th>
                <Th alinear="der">Total</Th>
                <Th>Cliente</Th>
              </tr>
            </thead>
            <tbody>
              {deHoy.map((m) => (
                <Fila key={m.id}>
                  <Td className="text-tinta-suave tabular">{new Date(m.created_at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</Td>
                  <Td className="font-semibold">
                    {nombreTipo(m.tipo_id)} {m.clase === 'perdida' && <Badge tono="error" className="ml-1">Rotos</Badge>}
                  </Td>
                  <Td className="whitespace-nowrap tabular">{textoCartones(m.huevos)}</Td>
                  <Td alinear="der" className="whitespace-nowrap font-bold tabular">{m.clase === 'venta' ? formatoMoneda(valorHuevos(m.huevos, m.precio_carton)) : '—'}</Td>
                  <Td className="text-tinta-suave">{m.tercero || '—'}</Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  );
}

/** Punto de venta de huevos: tarjetas por tamaño, carrito y cobrar (como la purina) */
function VentaConCarrito({
  tipos,
  saldo,
  tipoInicial,
  procesando,
  onGuardar,
}: {
  tipos: TipoHuevo[];
  saldo: Map<number, number>;
  tipoInicial: number | null;
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
}) {
  // Si viene del Inicio con un tamaño, ese tamaño ya entra al carrito con un cartón (o un huevo si no hay cartón completo)
  const [carrito, setCarrito] = useState<LineaCarrito[]>(() => {
    const t = tipos.find((x) => x.id === tipoInicial);
    const hay = t ? enBodega(saldo, t.id) : 0;
    if (!t || hay <= 0 || t.precio_venta <= 0) return [];
    return [{ tipoId: t.id, forma: hay >= HUEVOS_POR_CARTON ? 'carton' : 'unidad', cantidad: 1 }];
  });
  const [cliente, setCliente] = useState('');
  const [pago, setPago] = useState<MetodoPago>('efectivo');
  const [error, setError] = useState('');

  const tipoDe = (id: number) => tipos.find((t) => t.id === id);
  const huevosEnCarrito = (tipoId: number) =>
    carrito.filter((l) => l.tipoId === tipoId).reduce((a, l) => a + l.cantidad * huevosPor(l.forma), 0);
  /** Lo que todavía se puede agregar de un tamaño, contando lo que ya está en el carrito */
  const libres = (tipoId: number) => enBodega(saldo, tipoId) - huevosEnCarrito(tipoId);

  const agregar = (t: TipoHuevo, forma: Forma, delta = 1) => {
    setError('');
    if (delta > 0 && libres(t.id) < huevosPor(forma) * delta) return;
    setCarrito((c) => {
      const i = c.findIndex((l) => l.tipoId === t.id && l.forma === forma);
      if (i < 0) return delta > 0 ? [...c, { tipoId: t.id, forma, cantidad: delta }] : c;
      const nueva = c[i].cantidad + delta;
      return nueva <= 0 ? c.filter((_, j) => j !== i) : c.map((l, j) => (j === i ? { ...l, cantidad: nueva } : l));
    });
  };
  const quitar = (l: LineaCarrito) => setCarrito((c) => c.filter((x) => !(x.tipoId === l.tipoId && x.forma === l.forma)));

  const totalDe = (l: LineaCarrito) => {
    const t = tipoDe(l.tipoId);
    return t ? l.cantidad * precioDe(t, l.forma) : 0;
  };
  const total = carrito.reduce((a, l) => a + totalDe(l), 0);
  const huevosTotal = carrito.reduce((a, l) => a + l.cantidad * huevosPor(l.forma), 0);

  const cobrar = async () => {
    setError('');
    if (carrito.length === 0) return;
    for (const l of carrito) {
      const t = tipoDe(l.tipoId);
      if (!t) return setError('Hay un tamaño que ya no existe en el carrito. Quítalo.');
      if (huevosEnCarrito(t.id) > enBodega(saldo, t.id)) return setError(`No alcanzan los huevos ${t.nombre}: hay ${textoCartones(enBodega(saldo, t.id))}.`);
    }
    // Cada línea del carrito es una venta (mismo cliente y pago); se guardan todas juntas
    const movs: NuevoMovimiento[] = carrito.map((l) => {
      const t = tipoDe(l.tipoId)!;
      return {
        fecha: hoyLocal(),
        tipo_id: t.id,
        clase: 'venta',
        huevos: l.cantidad * huevosPor(l.forma),
        // Precio del cartón equivalente: así el total de la línea es exactamente cantidad × precio
        precio_carton: l.forma === 'carton' ? t.precio_venta : precioDe(t, 'unidad') * HUEVOS_POR_CARTON,
        costo_carton: null,
        tercero: cliente.trim() || null,
        metodo_pago: pago,
        notas: null,
      };
    });
    if (await onGuardar(movs)) {
      setCarrito([]);
      setCliente('');
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Tamaños */}
      <section aria-label="Tamaños de huevo" className="grid min-w-0 flex-[3_1_520px] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {tipos.map((t) => {
          const hay = enBodega(saldo, t.id);
          const quedan = libres(t.id);
          const agotado = hay <= 0;
          const sinPrecio = t.precio_venta <= 0;
          return (
            <article
              key={t.id}
              className={cn('flex flex-col gap-3.5 rounded-[16px] bg-superficie p-[18px] transition-transform duration-200 hover:-translate-y-0.5', agotado && 'opacity-60')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-tinta-suave">Huevo</span>
                <Badge tono={agotado ? 'error' : 'exito'}>{agotado ? 'Agotado' : textoCartones(hay)}</Badge>
              </div>
              <h2 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.02em]">{t.nombre}</h2>
              {sinPrecio ? (
                <p className="text-[15px] font-semibold text-rojo-oscuro">Falta el precio de venta</p>
              ) : (
                <div className="flex gap-5">
                  <span className="flex flex-col">
                    <span className="text-[13px] text-tinta-suave">Cartón</span>
                    <strong className="text-lg tabular">{formatoMoneda(precioDe(t, 'carton'))}</strong>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] text-tinta-suave">Unidad</span>
                    <strong className="text-lg tabular">{formatoMoneda(precioDe(t, 'unidad'))}</strong>
                  </span>
                </div>
              )}
              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button tamano="sm" className="h-11" disabled={sinPrecio || quedan < HUEVOS_POR_CARTON} onClick={() => agregar(t, 'carton')}>
                  + Cartón
                </Button>
                <Button tamano="sm" variante="secundario" className="h-11" disabled={sinPrecio || quedan < 1} onClick={() => agregar(t, 'unidad')}>
                  + Unidad
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      {/* Carrito */}
      <aside aria-label="Carrito" className="flex w-full min-w-0 flex-[1_1_340px] flex-col gap-[18px] rounded-tarjeta bg-superficie p-6 lg:sticky lg:top-6 lg:max-w-[420px]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-bold">Carrito</h2>
          <span className="text-[15px] text-tinta-suave tabular">{huevosTotal > 0 ? textoCartones(huevosTotal) : 'Vacío'}</span>
        </div>

        <Field etiqueta="Cliente (opcional)" placeholder="Ej.: Doña Rosa" value={cliente} onChange={(e) => setCliente(e.target.value)} />

        <div className="flex min-h-[120px] flex-col gap-2.5">
          {carrito.length === 0 ? (
            <EmptyState titulo="El carrito está vacío" descripcion="Toca «+ Cartón» o «+ Unidad» en un tamaño." className="flex-1 py-8" />
          ) : (
            carrito.map((l) => {
              const t = tipoDe(l.tipoId);
              if (!t) return null;
              const puedeMas = libres(t.id) >= huevosPor(l.forma);
              return (
                <div key={`${l.tipoId}-${l.forma}`} className="animate-subir flex items-center gap-2.5 rounded-control bg-hundido p-3 [animation-duration:.35s]">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="truncate text-[15px] font-semibold">
                      {t.nombre} · {l.forma === 'carton' ? 'Cartón' : 'Unidad'}
                    </strong>
                    <span className="text-[13px] text-tinta-suave tabular">{formatoMoneda(precioDe(t, l.forma))} c/u</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => agregar(t, l.forma, -1)} aria-label="Quitar uno" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-neutro hover:bg-neutro-hover">
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-7 text-center font-bold tabular">{l.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => agregar(t, l.forma, 1)}
                      disabled={!puedeMas}
                      aria-label="Agregar uno"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-neutro hover:bg-neutro-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <strong className="min-w-[84px] text-right text-[15px] tabular">{formatoMoneda(totalDe(l))}</strong>
                  <button
                    type="button"
                    onClick={() => quitar(l)}
                    aria-label={`Quitar ${t.nombre} del carrito`}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-tinta-tenue hover:bg-error-fondo hover:text-rojo-oscuro"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div role="radiogroup" aria-label="Forma de pago" className="grid grid-cols-2 gap-2">
          {(['efectivo', 'transferencia'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={pago === m}
              onClick={() => setPago(m)}
              className={cn(
                'h-12 cursor-pointer rounded-control border-2 text-[15px] font-bold capitalize transition-colors',
                pago === m ? 'border-rojo bg-rojo-fondo text-tinta' : 'border-neutro-hover bg-superficie text-tinta hover:bg-hundido'
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-[17px] font-bold">Total</span>
          <strong className="font-display text-[34px] font-extrabold tracking-[-0.03em] tabular">{formatoMoneda(total)}</strong>
        </div>

        {error && <Alert tono="error">{error}</Alert>}

        <Button tamano="lg" anchoCompleto disabled={carrito.length === 0} cargando={procesando} onClick={cobrar}>
          {procesando ? 'Registrando venta…' : `Cobrar ${formatoMoneda(total)}`}
        </Button>
      </aside>
    </div>
  );
}

/** Anotar huevos rotos: tamaño, cartón o unidad y cuántos (salen del inventario) */
function AnotarRotos({
  tipos,
  saldo,
  procesando,
  onGuardar,
}: {
  tipos: TipoHuevo[];
  saldo: Map<number, number>;
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
}) {
  const [tipoId, setTipoId] = useState<number | null>(tipos.find((t) => enBodega(saldo, t.id) > 0)?.id ?? null);
  const [forma, setForma] = useState<Forma>('unidad');
  const [cantidad, setCantidad] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  const tipo = tipos.find((t) => t.id === tipoId) ?? null;
  const hay = tipo ? enBodega(saldo, tipo.id) : 0;
  const disponible = forma === 'carton' ? Math.floor(hay / HUEVOS_POR_CARTON) : hay;
  const n = /^\d+$/.test(cantidad.trim()) ? Number(cantidad) : 0;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tipo) return setError('Elige el tamaño.');
    if (n <= 0) return setError(`Escribe cuántos ${forma === 'carton' ? 'cartones' : 'huevos'} se rompieron.`);
    if (n > disponible) return setError(`Solo hay ${textoForma(disponible, forma)} de ${tipo.nombre}.`);
    const ok = await onGuardar([
      {
        fecha: hoyLocal(),
        tipo_id: tipo.id,
        clase: 'perdida',
        huevos: n * huevosPor(forma),
        precio_carton: 0,
        costo_carton: null,
        tercero: null,
        metodo_pago: null,
        notas: notas.trim() || null,
      },
    ]);
    if (ok) {
      setCantidad('');
      setNotas('');
    }
  };

  return (
    <Panel className="max-w-2xl p-5 sm:p-6">
      <form onSubmit={enviar} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">Tamaño</span>
          <div role="radiogroup" aria-label="Tamaño del huevo" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {tipos.map((t) => {
              const sel = t.id === tipoId;
              const quedan = enBodega(saldo, t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  disabled={quedan <= 0}
                  onClick={() => setTipoId(t.id)}
                  className={cn(
                    'flex min-h-[60px] touch-manipulation flex-col items-start justify-center gap-0.5 rounded-campo border-2 px-3.5 py-2 text-left transition-colors',
                    quedan <= 0
                      ? 'cursor-not-allowed border-neutro-hover bg-hundido opacity-60'
                      : sel
                        ? 'cursor-pointer border-rojo bg-rojo-fondo'
                        : 'cursor-pointer border-neutro-hover bg-superficie hover:border-tinta-tenue'
                  )}
                >
                  <strong className="text-lg leading-tight">{t.nombre}</strong>
                  <span className="text-[13px] text-tinta-suave tabular">{quedan > 0 ? `Hay ${textoCartones(quedan)}` : 'Agotado'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div role="radiogroup" aria-label="Cartón o unidad" className="grid grid-cols-2 gap-2.5">
          {(['unidad', 'carton'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={forma === f}
              onClick={() => {
                setForma(f);
                setCantidad('');
              }}
              className={cn(
                'h-12 cursor-pointer touch-manipulation rounded-control text-[15px] font-bold transition-colors',
                forma === f ? 'bg-noche text-crema' : 'bg-neutro text-tinta hover:bg-neutro-hover'
              )}
            >
              {f === 'carton' ? 'Cartones' : 'Huevos sueltos'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="cantidad-rotos" className="text-[15px] font-semibold">
            ¿Cuántos {forma === 'carton' ? 'cartones' : 'huevos'} se rompieron?
          </label>
          <input
            id="cantidad-rotos"
            type="number"
            inputMode="numeric"
            min="0"
            max={disponible}
            step="1"
            placeholder="0"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={cn(campoBase, 'text-center text-xl font-extrabold tabular')}
          />
        </div>

        <Field etiqueta="Qué pasó (opcional)" placeholder="Ej.: se cayó una bandeja" value={notas} onChange={(e) => setNotas(e.target.value)} />

        {error && <Alert tono="error">{error}</Alert>}

        <Button type="submit" tamano="lg" anchoCompleto variante="secundario" cargando={procesando}>
          Anotar huevos rotos
        </Button>
      </form>
    </Panel>
  );
}
