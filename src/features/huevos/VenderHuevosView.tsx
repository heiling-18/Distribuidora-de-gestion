'use client';

import React, { useState } from 'react';
import { Alert, Badge, Button, EmptyState, Field, Fila, PageHeader, Panel, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { hoyLocal, textoCartones } from '@/lib/galpones';
import {
  SIN_EXISTENCIA,
  gananciaVenta,
  totalesMovimientos,
  valorHuevos,
  type ExistenciaTipo,
  type MovimientoHuevo,
  type NuevoMovimiento,
  type TipoHuevo,
} from '@/lib/huevos';
import { CantidadHuevos, leerCantidad } from './CantidadHuevos';

interface VenderHuevosViewProps {
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  existencias: Map<number, ExistenciaTipo>;
  tipoInicial: number | null;
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
}

type Modo = 'venta' | 'perdida';

export function VenderHuevosView(p: VenderHuevosViewProps) {
  const hoy = hoyLocal();
  const activos = p.tipos.filter((t) => t.activo);
  const [modo, setModo] = useState<Modo>('venta');
  const [tipoId, setTipoId] = useState<number | null>(
    p.tipoInicial && activos.some((t) => t.id === p.tipoInicial) ? p.tipoInicial : activos[0]?.id ?? null
  );
  const tipo = activos.find((t) => t.id === tipoId) ?? null;
  const existencia = (tipo && p.existencias.get(tipo.id)) || SIN_EXISTENCIA;

  const [cartones, setCartones] = useState('');
  const [sueltos, setSueltos] = useState('');
  const [precio, setPrecio] = useState(tipo && tipo.precio_venta > 0 ? String(tipo.precio_venta) : '');
  const [cliente, setCliente] = useState('');
  const [pago, setPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  const elegirTipo = (t: TipoHuevo) => {
    setTipoId(t.id);
    setPrecio(t.precio_venta > 0 ? String(t.precio_venta) : '');
  };

  const cantidad = leerCantidad(cartones, sueltos);
  const huevos = 'huevos' in cantidad ? cantidad.huevos : 0;
  const nPrecio = Number(precio) || 0;
  const total = valorHuevos(huevos, nPrecio);
  const costo = valorHuevos(huevos, existencia.costoCarton);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tipo) return setError('Elige el tipo de huevo.');
    if ('error' in cantidad) return setError(cantidad.error);
    if (huevos > existencia.huevos) return setError(`Solo quedan ${textoCartones(existencia.huevos)} de ${tipo.nombre}.`);
    if (modo === 'venta' && !(nPrecio > 0)) return setError('Escribe a cuánto vendes el cartón.');
    const ok = await p.onGuardar([
      {
        fecha: hoy,
        tipo_id: tipo.id,
        clase: modo,
        huevos,
        precio_carton: modo === 'venta' ? Math.round(nPrecio) : 0,
        costo_carton: existencia.costoCarton,
        tercero: modo === 'venta' ? cliente.trim() || null : null,
        metodo_pago: modo === 'venta' ? pago : null,
        notas: notas.trim() || null,
      },
    ]);
    if (ok) {
      setCartones('');
      setSueltos('');
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
      <PageHeader titulo="Vender huevos" descripcion="Elige el tamaño, cuántos cartones y a cuánto. El inventario baja solo." />

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
                const quedan = (p.existencias.get(t.id) ?? SIN_EXISTENCIA).huevos;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => elegirTipo(t)}
                    className={cn(
                      'flex min-h-[64px] cursor-pointer touch-manipulation flex-col items-start justify-center gap-0.5 rounded-campo border-2 px-3.5 py-2 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
                      sel ? 'border-rojo bg-rojo-fondo' : 'border-neutro-hover bg-superficie hover:border-tinta-tenue'
                    )}
                  >
                    <strong className={cn('text-lg leading-tight', sel ? 'text-rojo-oscuro' : 'text-tinta')}>{t.nombre}</strong>
                    <span className={cn('text-[13px] tabular', quedan > 0 ? 'text-tinta-suave' : 'font-semibold text-rojo-oscuro')}>
                      {quedan > 0 ? `Hay ${textoCartones(quedan)}` : 'Agotado'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <CantidadHuevos cartones={cartones} sueltos={sueltos} onCartones={setCartones} onSueltos={setSueltos} />

          {modo === 'venta' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Field
                  etiqueta="Precio del cartón"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="Ej.: 18000"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  ayuda={existencia.costoCarton > 0 ? `Te costó ${formatoMoneda(existencia.costoCarton)} en promedio` : undefined}
                  className="tabular"
                />
                <Field etiqueta="Cliente (opcional)" placeholder="Ej.: Doña Rosa" value={cliente} onChange={(e) => setCliente(e.target.value)} />
              </div>
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
          {huevos > 0 && tipo && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-campo bg-hundido px-4 py-3.5">
              <span className="text-[15px] text-tinta-suave tabular">
                {textoCartones(huevos)} de {tipo.nombre}
              </span>
              {modo === 'venta' ? (
                <span className="flex flex-wrap items-baseline gap-x-2.5">
                  <strong className="font-display text-[26px] font-extrabold tracking-[-0.02em] tabular">{formatoMoneda(total)}</strong>
                  {costo > 0 && (
                    <span className={cn('text-[15px] font-bold tabular', total - costo < 0 ? 'text-rojo-oscuro' : 'text-exito-texto')}>
                      {total - costo < 0 ? 'Pierdes' : 'Ganas'} {formatoMoneda(Math.abs(total - costo))}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-[15px] font-bold text-rojo-oscuro tabular">Se pierden {formatoMoneda(costo)}</span>
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
            Vendido {formatoMoneda(totHoy.vendido)} · ganancia {formatoMoneda(totHoy.ganancia)}
          </span>
        </div>
        {deHoy.length === 0 ? (
          <EmptyState className="m-6" titulo="Aún no hay ventas hoy" descripcion="Las ventas y los huevos rotos de hoy aparecerán aquí." />
        ) : (
          <Tabla minAncho={640}>
            <thead>
              <tr>
                <Th>Hora</Th>
                <Th>Tamaño</Th>
                <Th>Cantidad</Th>
                <Th alinear="der">Total</Th>
                <Th alinear="der">Ganancia</Th>
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
                  <Td alinear="der" className="whitespace-nowrap tabular">
                    {m.clase === 'venta' ? formatoMoneda(gananciaVenta(m)) : <span className="text-rojo-oscuro">−{formatoMoneda(valorHuevos(m.huevos, m.costo_carton ?? 0))}</span>}
                  </Td>
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
