'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Alert, Button, EmptyState, Field, Fila, PageHeader, Panel, Select, Tabla, Td, Th } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { formatoDia, hoyLocal, textoCartones } from '@/lib/galpones';
import { enBodega, valorHuevos, type MovimientoHuevo, type NuevoMovimiento, type TipoHuevo } from '@/lib/huevos';
import { CantidadHuevos, leerCantidad } from './CantidadHuevos';

interface InventarioHuevosViewProps {
  esAdmin: boolean;
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  saldo: Map<number, number>;
  procesando: boolean;
  onGuardar: (movs: NuevoMovimiento[]) => Promise<boolean>;
  /** Guarda el precio de venta del cartón de un tamaño (el que se usa al vender) */
  onPrecioVenta: (tipoId: number, precio: number) => Promise<boolean>;
}

interface Linea {
  clave: number;
  tipoId: string;
  cartones: string;
  sueltos: string;
  /** A cuánto se vende el cartón de ese tamaño */
  venta: string;
}

let siguienteClave = 1;

/** Cargar huevos al inventario (producción propia), cada tamaño con su precio de venta */
export function InventarioHuevosView(p: InventarioHuevosViewProps) {
  const hoy = hoyLocal();
  const activos = p.tipos.filter((t) => t.activo);
  const [fecha, setFecha] = useState(hoy);
  const [origen, setOrigen] = useState('');
  const [error, setError] = useState('');

  // El precio de venta viene lleno con el que ya tiene el tamaño; si lo cambias, queda como el nuevo
  const ventaDe = (tipoId: string) => {
    const t = p.tipos.find((x) => String(x.id) === tipoId);
    return t && t.precio_venta > 0 ? String(t.precio_venta) : '';
  };
  const nueva = (tipoId = ''): Linea => ({ clave: siguienteClave++, tipoId, cartones: '', sueltos: '', venta: ventaDe(tipoId) });
  const [lineas, setLineas] = useState<Linea[]>(() => [nueva(activos[0] ? String(activos[0].id) : '')]);

  const cambiar = (clave: number, cambios: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  const quitar = (clave: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((l) => l.clave !== clave) : ls));
  const agregar = () => {
    // Propone el siguiente tamaño que todavía no está en la lista
    const usado = new Set(lineas.map((l) => l.tipoId));
    const libre = activos.find((t) => !usado.has(String(t.id)));
    setLineas((ls) => [...ls, nueva(libre ? String(libre.id) : '')]);
  };

  const huevosDe = (l: Linea) => {
    const c = leerCantidad(l.cartones, l.sueltos);
    return 'huevos' in c ? c.huevos : 0;
  };
  const totalHuevos = lineas.reduce((acc, l) => acc + huevosDe(l), 0);
  const totalValor = lineas.reduce((acc, l) => acc + valorHuevos(huevosDe(l), Number(l.venta) || 0), 0);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const movs: NuevoMovimiento[] = [];
    for (const [i, l] of lineas.entries()) {
      const n = lineas.length > 1 ? ` (fila ${i + 1})` : '';
      if (!l.tipoId) return setError(`Elige el tamaño${n}.`);
      const c = leerCantidad(l.cartones, l.sueltos);
      if ('error' in c) return setError(c.error + n);
      if (!(Number(l.venta) > 0)) return setError(`Escribe a cuánto vendes el cartón${n}.`);
      movs.push({
        fecha,
        tipo_id: Number(l.tipoId),
        clase: 'entrada',
        huevos: c.huevos,
        precio_carton: 0,
        costo_carton: null,
        tercero: origen.trim() || null,
        metodo_pago: null,
        notas: null,
      });
    }
    if (!(await p.onGuardar(movs))) return;
    // Precio de venta: el último escrito para cada tamaño, solo si cambió
    const precios = new Map<number, number>();
    for (const l of lineas) precios.set(Number(l.tipoId), Math.round(Number(l.venta)));
    for (const [tipoId, venta] of precios) {
      if (p.tipos.find((t) => t.id === tipoId)?.precio_venta !== venta) await p.onPrecioVenta(tipoId, venta);
    }
    setLineas([nueva(activos[0] ? String(activos[0].id) : '')]);
  };

  const ingresos = p.movimientos.filter((m) => m.clase === 'entrada').slice(0, 60);
  const nombreTipo = (id: number) => p.tipos.find((t) => t.id === id)?.nombre ?? '—';
  const opcionesTipo = [{ valor: '', texto: 'Elige…' }, ...activos.map((t) => ({ valor: String(t.id), texto: t.nombre }))];

  if (activos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Inventario de huevos" />
        <EmptyState titulo="Todavía no hay tamaños" descripcion="El administrador debe crearlos en Tipos y precios." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader titulo="Inventario de huevos" descripcion="Carga los cartones que hay para vender, cada tamaño con su precio de venta." />

      {/* Lo que hay ahora */}
      <section aria-label="En bodega" className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-tarjeta bg-neutro-hover sm:grid-cols-4">
        {activos.map((t) => {
          const hay = enBodega(p.saldo, t.id);
          return (
            <div key={t.id} className="flex flex-col gap-1 bg-superficie p-4">
              <span className="text-sm font-semibold text-tinta-suave">{t.nombre}</span>
              <strong className="font-display text-xl font-extrabold tabular">{hay > 0 ? textoCartones(hay) : 'Agotado'}</strong>
              <span className="text-[13px] text-tinta-suave tabular">{t.precio_venta > 0 ? `${formatoMoneda(t.precio_venta)} el cartón` : 'Sin precio'}</span>
            </div>
          );
        })}
      </section>

      <Panel className="p-5 sm:p-6">
        <form onSubmit={enviar} className="flex flex-col gap-6">
          <h2 className="text-lg font-bold">Agregar al inventario</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {p.esAdmin ? (
              <Field etiqueta="Fecha" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} />
            ) : (
              <p className="self-end pb-3 text-[15px] text-tinta-suave">
                Fecha: <strong className="text-tinta">{formatoDia(hoy)}</strong>
              </p>
            )}
            <Field etiqueta="De qué galpón (opcional)" placeholder="Ej.: Galpón 1" value={origen} onChange={(e) => setOrigen(e.target.value)} />
          </div>

          <div className="flex flex-col gap-3">
            {lineas.map((l, i) => (
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
                  <Select
                    etiqueta="Tamaño"
                    opciones={opcionesTipo}
                    value={l.tipoId}
                    onChange={(e) => cambiar(l.clave, { tipoId: e.target.value, venta: ventaDe(e.target.value) })}
                  />
                  <Field
                    etiqueta="Precio de venta (cartón)"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    placeholder="18000"
                    value={l.venta}
                    onChange={(e) => cambiar(l.clave, { venta: e.target.value })}
                    className="tabular"
                  />
                </div>
                <CantidadHuevos
                  cartones={l.cartones}
                  sueltos={l.sueltos}
                  onCartones={(v) => cambiar(l.clave, { cartones: v })}
                  onSueltos={(v) => cambiar(l.clave, { sueltos: v })}
                />
              </div>
            ))}
            <Button type="button" variante="secundario" onClick={agregar} className="self-start">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Agregar otro tamaño
            </Button>
          </div>

          {totalHuevos > 0 && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-campo bg-hundido px-4 py-3.5">
              <span className="text-[15px] text-tinta-suave tabular">Se agregan {textoCartones(totalHuevos)}</span>
              {totalValor > 0 && <span className="text-[15px] font-bold tabular">Valen {formatoMoneda(totalValor)} a precio de venta</span>}
            </div>
          )}

          {error && <Alert tono="error">{error}</Alert>}

          <Button type="submit" tamano="lg" anchoCompleto cargando={p.procesando}>
            Agregar al inventario
          </Button>
        </form>
      </Panel>

      <Panel>
        <div className="px-6 pb-2 pt-5">
          <h2 className="text-xl font-bold">Últimos ingresos</h2>
        </div>
        {ingresos.length === 0 ? (
          <EmptyState className="m-6" titulo="Todavía no hay ingresos" descripcion="Cada vez que cargues huevos al inventario aparecerán aquí." />
        ) : (
          <Tabla minAncho={560}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Tamaño</Th>
                <Th>Cantidad</Th>
                <Th>Galpón</Th>
                <Th>Anotó</Th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((m) => (
                <Fila key={m.id}>
                  <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoDia(m.fecha)}</Td>
                  <Td className="font-semibold">{nombreTipo(m.tipo_id)}</Td>
                  <Td className="whitespace-nowrap font-bold tabular">{textoCartones(m.huevos)}</Td>
                  <Td className="text-tinta-suave">{m.tercero || '—'}</Td>
                  <Td className="text-tinta-suave">{m.registrado_por || '—'}</Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  );
}
