'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Fila, PageHeader, Panel, Select, Tabla, Td, Th } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { formatoDia, hoyLocal, textoCartones } from '@/lib/galpones';
import { valorHuevos, type MovimientoHuevo, type NuevoMovimiento, type TipoHuevo } from '@/lib/huevos';
import { CantidadHuevos, leerCantidad } from './CantidadHuevos';

interface LlegadasViewProps {
  esAdmin: boolean;
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
}

interface Linea {
  clave: number;
  tipoId: string;
  cartones: string;
  sueltos: string;
  precio: string;
}

let siguienteClave = 1;
const lineaVacia = (tipoId = ''): Linea => ({ clave: siguienteClave++, tipoId, cartones: '', sueltos: '', precio: '' });

/** Llegadas de huevos: cada tamaño con su cantidad y lo que se pagó por cartón ese día */
export function LlegadasView(p: LlegadasViewProps) {
  const hoy = hoyLocal();
  const activos = p.tipos.filter((t) => t.activo);
  const [fecha, setFecha] = useState(hoy);
  const [proveedor, setProveedor] = useState('');
  const [lineas, setLineas] = useState<Linea[]>(() => [lineaVacia(activos[0] ? String(activos[0].id) : '')]);
  const [error, setError] = useState('');

  const cambiar = (clave: number, cambios: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  const quitar = (clave: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((l) => l.clave !== clave) : ls));
  const agregar = () => {
    // Propone el siguiente tamaño que todavía no está en la lista
    const usado = new Set(lineas.map((l) => l.tipoId));
    const libre = activos.find((t) => !usado.has(String(t.id)));
    setLineas((ls) => [...ls, lineaVacia(libre ? String(libre.id) : '')]);
  };

  const totalDe = (l: Linea) => {
    const c = leerCantidad(l.cartones, l.sueltos);
    return 'huevos' in c ? { huevos: c.huevos, valor: valorHuevos(c.huevos, Number(l.precio) || 0) } : { huevos: 0, valor: 0 };
  };
  const total = lineas.reduce((acc, l) => {
    const t = totalDe(l);
    return { huevos: acc.huevos + t.huevos, valor: acc.valor + t.valor };
  }, { huevos: 0, valor: 0 });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const movs: NuevoMovimiento[] = [];
    for (const [i, l] of lineas.entries()) {
      const n = lineas.length > 1 ? ` (fila ${i + 1})` : '';
      if (!l.tipoId) return setError(`Elige el tamaño${n}.`);
      const c = leerCantidad(l.cartones, l.sueltos);
      if ('error' in c) return setError(c.error + n);
      const precio = Number(l.precio);
      if (!(precio > 0)) return setError(`Escribe cuánto pagaste por cartón${n}.`);
      movs.push({
        fecha,
        tipo_id: Number(l.tipoId),
        clase: 'entrada',
        huevos: c.huevos,
        precio_carton: Math.round(precio),
        costo_carton: null,
        tercero: proveedor.trim() || null,
        metodo_pago: null,
        notas: null,
      });
    }
    if (await p.onGuardar(movs)) setLineas([lineaVacia(activos[0] ? String(activos[0].id) : '')]);
  };

  const llegadas = p.movimientos.filter((m) => m.clase === 'entrada').slice(0, 60);
  const nombreTipo = (id: number) => p.tipos.find((t) => t.id === id)?.nombre ?? '—';
  const opcionesTipo = [{ valor: '', texto: 'Elige…' }, ...activos.map((t) => ({ valor: String(t.id), texto: t.nombre }))];

  if (activos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Llegadas de huevos" />
        <EmptyState titulo="Todavía no hay tipos de huevo" descripcion="El administrador debe crear los tamaños en Tipos y precios." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader titulo="Llegadas de huevos" descripcion="Anota lo que te trajeron hoy, cada tamaño con el precio que pagaste por cartón." />

      <Panel className="p-5 sm:p-6">
        <form onSubmit={enviar} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {p.esAdmin ? (
              <Field etiqueta="Fecha" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} />
            ) : (
              <p className="self-end pb-3 text-[15px] text-tinta-suave">
                Fecha: <strong className="text-tinta">{formatoDia(hoy)}</strong>
              </p>
            )}
            <Field etiqueta="Quién los trajo (opcional)" placeholder="Ej.: Galpón El Recreo" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          </div>

          <div className="flex flex-col gap-3">
            {lineas.map((l, i) => {
              const t = totalDe(l);
              return (
                <div key={l.clave} className="flex flex-col gap-3 rounded-campo border-[1.5px] border-neutro-hover p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold uppercase tracking-[0.06em] text-tinta-suave">Tamaño {i + 1}</span>
                    {lineas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitar(l.clave)}
                        aria-label={`Quitar tamaño ${i + 1}`}
                        className="-mr-1.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-tinta-suave hover:bg-neutro hover:text-tinta"
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select etiqueta="Tamaño" opciones={opcionesTipo} value={l.tipoId} onChange={(e) => cambiar(l.clave, { tipoId: e.target.value })} />
                    <Field
                      etiqueta="Precio por cartón"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      placeholder="18000"
                      value={l.precio}
                      onChange={(e) => cambiar(l.clave, { precio: e.target.value })}
                      className="tabular"
                    />
                  </div>
                  <CantidadHuevos
                    cartones={l.cartones}
                    sueltos={l.sueltos}
                    onCartones={(v) => cambiar(l.clave, { cartones: v })}
                    onSueltos={(v) => cambiar(l.clave, { sueltos: v })}
                  />
                  {t.huevos > 0 && t.valor > 0 && (
                    <p className="text-[15px] text-tinta-suave tabular">
                      {textoCartones(t.huevos)} = <strong className="text-tinta">{formatoMoneda(t.valor)}</strong>
                    </p>
                  )}
                </div>
              );
            })}
            {/* Sin límite: el mismo tamaño puede llegar dos veces a precios distintos */}
            <Button type="button" variante="secundario" onClick={agregar} className="self-start">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Agregar otro tamaño o precio
            </Button>
          </div>

          {total.huevos > 0 && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-campo bg-hundido px-4 py-3.5">
              <span className="text-[15px] text-tinta-suave tabular">Llegaron {textoCartones(total.huevos)}</span>
              <strong className="font-display text-[26px] font-extrabold tracking-[-0.02em] tabular">{formatoMoneda(total.valor)}</strong>
            </div>
          )}

          {error && <Alert tono="error">{error}</Alert>}

          <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando}>
            Guardar llegada
          </Button>
        </form>
      </Panel>

      <Panel>
        <div className="px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold">Últimas llegadas</h2>
        </div>
        {llegadas.length === 0 ? (
          <EmptyState className="m-6" titulo="Todavía no hay llegadas" descripcion="Cada vez que te traigan huevos, anótalos aquí." />
        ) : (
          <Tabla minAncho={640}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Tamaño</Th>
                <Th>Cantidad</Th>
                <Th alinear="der">Precio cartón</Th>
                <Th alinear="der">Total</Th>
                <Th>Quién los trajo</Th>
              </tr>
            </thead>
            <tbody>
              {llegadas.map((m) => (
                <Fila key={m.id}>
                  <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoDia(m.fecha)}</Td>
                  <Td className="font-semibold">{nombreTipo(m.tipo_id)}</Td>
                  <Td className="whitespace-nowrap tabular">{textoCartones(m.huevos)}</Td>
                  <Td alinear="der" className="whitespace-nowrap tabular">{formatoMoneda(m.precio_carton)}</Td>
                  <Td alinear="der" className="whitespace-nowrap font-bold tabular">{formatoMoneda(valorHuevos(m.huevos, m.precio_carton))}</Td>
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
