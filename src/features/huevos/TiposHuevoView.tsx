'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Field, Fila, PageHeader, Panel, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { textoCartones } from '@/lib/galpones';
import { SIN_EXISTENCIA, type ExistenciaTipo, type TipoHuevo } from '@/lib/huevos';

interface TiposHuevoViewProps {
  tipos: TipoHuevo[];
  existencias: Map<number, ExistenciaTipo>;
  /** Tipos que ya tienen movimientos (no se pueden eliminar) */
  conMovimientos: Set<number>;
  procesando: boolean;
  onCrear: (nombre: string, precioVenta: number) => Promise<boolean>;
  onActualizar: (id: number, cambios: Partial<Pick<TipoHuevo, 'precio_venta' | 'activo'>>) => Promise<boolean>;
  onEliminar: (t: TipoHuevo) => void;
}

/** Tamaños de huevo y su precio de venta del cartón (solo administrador) */
export function TiposHuevoView(p: TiposHuevoViewProps) {
  const [nombre, setNombre] = useState('');
  const [precioNuevo, setPrecioNuevo] = useState('');
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const n = nombre.trim().toUpperCase();
    if (!n) return setError('Escribe el nombre del tamaño, por ejemplo AA.');
    if (p.tipos.some((t) => t.nombre.toUpperCase() === n)) return setError(`Ya existe el tamaño ${n}.`);
    if (precioNuevo.trim() && !(Number(precioNuevo) >= 0)) return setError('El precio debe ser un número sin puntos.');
    if (await p.onCrear(n, Math.round(Number(precioNuevo) || 0))) {
      setNombre('');
      setPrecioNuevo('');
    }
  };

  const guardarPrecio = async (t: TipoHuevo) => {
    const v = Number(precios[t.id]);
    if (!(v >= 0) || precios[t.id]?.trim() === '') return;
    if (await p.onActualizar(t.id, { precio_venta: Math.round(v) })) {
      setPrecios((pr) => {
        const resto = { ...pr };
        delete resto[t.id];
        return resto;
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Tipos y precios" descripcion="Los tamaños de huevo que manejas y a cuánto vendes el cartón hoy. El precio de compra se anota en cada llegada." />

      <Panel className="p-5 sm:p-6">
        <form onSubmit={crear} className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Nuevo tamaño</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-4">
            <Field etiqueta="Nombre" placeholder="Ej.: AA" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Field
              etiqueta="Precio de venta"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="Ej.: 18000"
              value={precioNuevo}
              onChange={(e) => setPrecioNuevo(e.target.value)}
              className="tabular"
            />
            <Button type="submit" cargando={p.procesando} className="col-span-2 sm:col-span-1">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Agregar
            </Button>
          </div>
          {error && <Alert tono="error">{error}</Alert>}
        </form>
      </Panel>

      <Panel>
        {p.tipos.length === 0 ? (
          <EmptyState className="m-6" titulo="Todavía no hay tamaños" descripcion="Agrega los tamaños que vendes: AAA, AA, A, B…" />
        ) : (
          <Tabla minAncho={760}>
            <thead>
              <tr>
                <Th>Tamaño</Th>
                <Th>En bodega</Th>
                <Th alinear="der">Costo promedio</Th>
                <Th>Precio de venta (cartón)</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {p.tipos.map((t) => {
                const e = p.existencias.get(t.id) ?? SIN_EXISTENCIA;
                const editando = precios[t.id] !== undefined;
                return (
                  <Fila key={t.id} className={cn(!t.activo && 'text-tinta-tenue')}>
                    <Td className="font-bold">
                      {t.nombre} {!t.activo && <Badge className="ml-1">Oculto</Badge>}
                    </Td>
                    <Td className="whitespace-nowrap tabular">{textoCartones(e.huevos)}</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">{e.huevos > 0 ? formatoMoneda(e.costoCarton) : '—'}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          aria-label={`Precio de venta del cartón ${t.nombre}`}
                          value={editando ? precios[t.id] : String(t.precio_venta)}
                          onChange={(ev) => setPrecios((pr) => ({ ...pr, [t.id]: ev.target.value }))}
                          className="h-10 w-32 rounded-control border-[1.5px] border-borde bg-superficie px-3 text-[15px] font-semibold tabular focus:border-rojo focus:outline-none focus:ring-4 focus:ring-rojo/15"
                        />
                        {editando && Number(precios[t.id]) !== t.precio_venta && (
                          <Button tamano="sm" cargando={p.procesando} onClick={() => guardarPrecio(t)}>
                            Guardar
                          </Button>
                        )}
                      </div>
                    </Td>
                    <Td alinear="der" className="whitespace-nowrap">
                      <Button variante="fantasma" tamano="sm" onClick={() => p.onActualizar(t.id, { activo: !t.activo })}>
                        {t.activo ? 'Ocultar' : 'Mostrar'}
                      </Button>
                      {!p.conMovimientos.has(t.id) && (
                        <Button variante="peligro" tamano="sm" onClick={() => p.onEliminar(t)} aria-label={`Eliminar ${t.nombre}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
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
