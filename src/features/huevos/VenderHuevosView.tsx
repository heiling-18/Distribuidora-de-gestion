'use client';

import React, { useState } from 'react';
import { Alert, Badge, Button, EmptyState, Field, Fila, PageHeader, Panel, Tabla, Td, Th, campoBase, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { HUEVOS_POR_CARTON, formatoEntero, hoyLocal, textoCartones } from '@/lib/galpones';
import {
  enBodega,
  totalesMovimientos,
  valorHuevos,
  type MovimientoHuevo,
  type NuevoMovimiento,
  type TipoHuevo,
} from '@/lib/huevos';

interface VenderHuevosViewProps {
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  /** Huevos en bodega por tamaño */
  saldo: Map<number, number>;
  tipoInicial: number | null;
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
}

type Modo = 'venta' | 'perdida';
type Forma = 'carton' | 'unidad';

export function VenderHuevosView(p: VenderHuevosViewProps) {
  const hoy = hoyLocal();
  const activos = p.tipos.filter((t) => t.activo);
  const [modo, setModo] = useState<Modo>('venta');
  // Empieza en el tamaño pedido o en el primero que tenga huevos (los agotados no se pueden elegir)
  const conHuevos = (id: number) => enBodega(p.saldo, id) > 0;
  const [tipoId, setTipoId] = useState<number | null>(
    p.tipoInicial && activos.some((t) => t.id === p.tipoInicial) && conHuevos(p.tipoInicial)
      ? p.tipoInicial
      : activos.find((t) => conHuevos(t.id))?.id ?? null
  );
  const tipo = activos.find((t) => t.id === tipoId) ?? null;
  const hay = tipo ? enBodega(p.saldo, tipo.id) : 0;

  // Se vende por cartón (de 30) o por huevo suelto, siempre al precio subido en Tipos y precios
  const [forma, setForma] = useState<Forma>('carton');
  const [cantidad, setCantidad] = useState('');
  const [cliente, setCliente] = useState('');
  const [pago, setPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  const precioCarton = tipo?.precio_venta ?? 0;
  const precioUnidad = Math.round(precioCarton / HUEVOS_POR_CARTON);
  const precio = forma === 'carton' ? precioCarton : precioUnidad;
  // Lo que se puede vender: por cartón solo cartones completos; por unidad, todos los huevos
  const disponible = forma === 'carton' ? Math.floor(hay / HUEVOS_POR_CARTON) : hay;
  const nCantidad = /^\d+$/.test(cantidad.trim()) ? Number(cantidad) : 0;
  const huevos = forma === 'carton' ? nCantidad * HUEVOS_POR_CARTON : nCantidad;
  const total = nCantidad * precio;

  const textoCantidad = (n: number, f: Forma) =>
    f === 'carton' ? `${formatoEntero(n)} ${n === 1 ? 'cartón' : 'cartones'}` : `${formatoEntero(n)} ${n === 1 ? 'huevo' : 'huevos'}`;

  const elegirTipo = (t: TipoHuevo) => {
    setTipoId(t.id);
    setCantidad('');
    setError('');
  };
  const elegirForma = (f: Forma) => {
    setForma(f);
    setCantidad('');
    setError('');
  };
  const sumar = (d: number) => setCantidad(String(Math.min(disponible, Math.max(0, nCantidad + d))));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tipo) return setError('Elige el tamaño del huevo.');
    if (!/^\d+$/.test(cantidad.trim()) || nCantidad <= 0) return setError(`Escribe cuántos ${forma === 'carton' ? 'cartones' : 'huevos'} son.`);
    if (nCantidad > disponible) return setError(`Solo hay ${textoCantidad(disponible, forma)} de ${tipo.nombre}.`);
    if (modo === 'venta' && !(precioCarton > 0)) return setError(`${tipo.nombre} no tiene precio de venta. Pónselo en Tipos y precios.`);
    const ok = await p.onGuardar([
      {
        fecha: hoy,
        tipo_id: tipo.id,
        clase: modo,
        huevos,
        // Se guarda el precio del cartón equivalente: así el total es exactamente cantidad × precio
        precio_carton: modo === 'venta' ? (forma === 'carton' ? precioCarton : precioUnidad * HUEVOS_POR_CARTON) : 0,
        costo_carton: null,
        tercero: modo === 'venta' ? cliente.trim() || null : null,
        metodo_pago: modo === 'venta' ? pago : null,
        notas: notas.trim() || null,
      },
    ]);
    if (ok) {
      setCantidad('');
      setCliente('');
      setNotas('');
    }
  };

  const deHoy = p.movimientos.filter((m) => m.fecha === hoy && m.clase !== 'entrada');
  const totHoy = totalesMovimientos(deHoy);
  const nombreTipo = (id: number) => p.tipos.find((t) => t.id === id)?.nombre ?? '—';

  if (activos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Vender huevos" />
        <EmptyState titulo="Todavía no hay tipos de huevo" descripcion="El administrador debe crear los tamaños en Tipos y precios." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader titulo="Vender huevos" descripcion="Elige el tamaño, si vendes por cartón o por huevo, y cuántos. El precio y el inventario se toman solos." />

      <Panel className="p-5 sm:p-6">
        <form onSubmit={enviar} className="flex flex-col gap-6">
          {/* Venta o rotos */}
          <div role="radiogroup" aria-label="Qué vas a anotar" className="grid grid-cols-2 gap-1 rounded-campo bg-neutro p-1">
            {(['venta', 'perdida'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={modo === m}
                onClick={() => setModo(m)}
                className={cn(
                  'h-11 cursor-pointer touch-manipulation rounded-control text-[15px] font-bold transition-colors',
                  modo === m ? 'bg-superficie text-tinta shadow-[0_1px_2px_rgba(23,19,15,0.12)]' : 'text-tinta-suave hover:text-tinta'
                )}
              >
                {m === 'venta' ? 'Venta' : 'Huevos rotos'}
              </button>
            ))}
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">Tamaño</span>
            <div role="radiogroup" aria-label="Tamaño del huevo" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {activos.map((t) => {
                const sel = t.id === tipoId;
                const quedan = enBodega(p.saldo, t.id);
                const agotado = quedan <= 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    disabled={agotado}
                    onClick={() => elegirTipo(t)}
                    className={cn(
                      'flex min-h-[64px] touch-manipulation flex-col items-start justify-center gap-0.5 rounded-campo border-2 px-3.5 py-2 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
                      agotado
                        ? 'cursor-not-allowed border-neutro-hover bg-hundido opacity-60'
                        : sel
                          ? 'cursor-pointer border-rojo bg-rojo-fondo'
                          : 'cursor-pointer border-neutro-hover bg-superficie hover:border-tinta-tenue'
                    )}
                  >
                    <strong className={cn('text-lg leading-tight', sel && !agotado ? 'text-rojo-oscuro' : 'text-tinta')}>{t.nombre}</strong>
                    <span className={cn('text-[13px] tabular', agotado ? 'font-semibold text-rojo-oscuro' : 'text-tinta-suave')}>
                      {agotado ? 'Agotado' : `Hay ${textoCartones(quedan)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Por cartón o por unidad */}
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">{modo === 'venta' ? 'Vender por' : 'Se rompieron'}</span>
            <div role="radiogroup" aria-label="Cartón o unidad" className="grid grid-cols-2 gap-2.5">
              {(['carton', 'unidad'] as const).map((f) => {
                const sel = forma === f;
                const valor = f === 'carton' ? precioCarton : precioUnidad;
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => elegirForma(f)}
                    className={cn(
                      'flex min-h-[64px] cursor-pointer touch-manipulation flex-col items-start justify-center gap-0.5 rounded-campo border-2 px-3.5 py-2 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
                      sel ? 'border-noche bg-noche text-crema' : 'border-neutro-hover bg-superficie hover:border-tinta-tenue'
                    )}
                  >
                    <strong className="text-base leading-tight">{f === 'carton' ? 'Cartón (30)' : 'Unidad'}</strong>
                    {modo === 'venta' && (
                      <span className={cn('text-[13px] tabular', sel ? 'text-crema-suave' : 'text-tinta-suave')}>
                        {valor > 0 ? `${formatoMoneda(valor)} c/u` : 'Sin precio'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cantidad con botones, como los bultos en el punto de venta */}
          <div className="flex flex-col gap-2">
            <label htmlFor="cantidad-huevos" className="text-[15px] font-semibold">
              ¿Cuántos {forma === 'carton' ? 'cartones' : 'huevos'}?
            </label>
            <div className="flex items-center gap-2.5">
              <Button type="button" variante="secundario" tamano="lg" aria-label="Uno menos" disabled={nCantidad <= 0} onClick={() => sumar(-1)} className="w-14 shrink-0 px-0 text-2xl">
                −
              </Button>
              <input
                id="cantidad-huevos"
                type="number"
                inputMode="numeric"
                min="0"
                max={disponible}
                step="1"
                placeholder="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={cn(campoBase, 'h-14 text-center text-2xl font-extrabold tabular')}
              />
              <Button type="button" variante="secundario" tamano="lg" aria-label="Uno más" disabled={nCantidad >= disponible} onClick={() => sumar(1)} className="w-14 shrink-0 px-0 text-2xl">
                +
              </Button>
            </div>
            <span className="text-sm text-tinta-suave tabular">
              {tipo ? (disponible > 0 ? `Hay ${textoCantidad(disponible, forma)} de ${tipo.nombre}` : `No hay ${forma === 'carton' ? 'cartones completos' : 'huevos'} de ${tipo.nombre}`) : ''}
            </span>
          </div>

          {modo === 'venta' ? (
            <>
              {tipo && precioCarton <= 0 && (
                <Alert tono="aviso">{tipo.nombre} no tiene precio de venta. El administrador lo pone en Tipos y precios.</Alert>
              )}
              <Field etiqueta="Cliente (opcional)" placeholder="Ej.: Doña Rosa" value={cliente} onChange={(e) => setCliente(e.target.value)} />
              <div role="radiogroup" aria-label="Forma de pago" className="grid grid-cols-2 gap-2.5">
                {(['efectivo', 'transferencia'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={pago === f}
                    onClick={() => setPago(f)}
                    className={cn(
                      'h-12 cursor-pointer touch-manipulation rounded-control text-[15px] font-bold capitalize transition-colors',
                      pago === f ? 'bg-noche text-crema' : 'bg-neutro text-tinta hover:bg-neutro-hover'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Field etiqueta="Qué pasó (opcional)" placeholder="Ej.: se cayó una bandeja" value={notas} onChange={(e) => setNotas(e.target.value)} />
          )}

          {/* Cuenta */}
          {nCantidad > 0 && tipo && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-campo bg-hundido px-4 py-3.5">
              <span className="text-[15px] text-tinta-suave tabular">
                {textoCantidad(nCantidad, forma)} de {tipo.nombre}
                {modo === 'venta' && precio > 0 && ` × ${formatoMoneda(precio)}`}
              </span>
              {modo === 'venta' ? (
                <strong className="font-display text-[26px] font-extrabold tracking-[-0.02em] tabular">{formatoMoneda(total)}</strong>
              ) : (
                <span className="text-[15px] font-bold text-rojo-oscuro tabular">Salen del inventario</span>
              )}
            </div>
          )}

          {error && <Alert tono="error">{error}</Alert>}

          <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando} variante={modo === 'venta' ? 'primario' : 'secundario'}>
            {modo === 'venta' ? 'Registrar venta' : 'Anotar huevos rotos'}
          </Button>
        </form>
      </Panel>

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
