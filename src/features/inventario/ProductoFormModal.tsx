'use client';

import React from 'react';
import { Button, Field, Modal, Select, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { CATEGORIAS_PRODUCTO, UNIDADES_MEDIDA } from '@/lib/categorias';

export interface ValoresProducto {
  nombre: string;
  categoria: string;
  unidad: string;
  costo: string;
  margenDetal: string;
  margenMayor: string;
  iva: string;
  precioDetal: string;
  precioMayor: string;
  stock: string;
  stockMin: string;
  modoLote: boolean;
  facturaLote: string;
}

interface ProductoFormModalProps {
  editando: boolean;
  procesando: boolean;
  v: ValoresProducto;
  onNombre: (x: string) => void;
  onCategoria: (x: string) => void;
  onUnidad: (x: string) => void;
  onCosto: (x: string) => void;
  onMargenDetal: (x: string) => void;
  onMargenMayor: (x: string) => void;
  onIva: (x: string) => void;
  onPrecioDetal: (x: string) => void;
  onPrecioMayor: (x: string) => void;
  onStock: (x: string) => void;
  onStockMin: (x: string) => void;
  onModoLote: (x: boolean) => void;
  onFacturaLote: (x: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCerrar: () => void;
}

const TASAS_IVA = ['0', '5', '19'];

function Seccion({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="text-base font-bold text-tinta">{titulo}</legend>
        {accion}
      </div>
      {children}
    </fieldset>
  );
}

export function ProductoFormModal(p: ProductoFormModalProps) {
  const { v } = p;
  const costo = Number(v.costo) || 0;
  const detal = Number(v.precioDetal) || 0;
  const mayor = Number(v.precioMayor) || 0;
  const unidad = UNIDADES_MEDIDA.find((u) => u.valor === v.unidad)?.texto.split(' ')[0].toLowerCase() ?? 'unidad';

  const ganancia = (precio: number) => {
    if (!costo || !precio) return null;
    const g = precio - costo;
    return { g, pct: (g / costo) * 100 };
  };
  const gDetal = ganancia(detal);
  const gMayor = ganancia(mayor);
  const resumen = (x: ReturnType<typeof ganancia>) =>
    x ? `${x.g >= 0 ? 'Ganas' : 'Pierdes'} ${formatoMoneda(Math.abs(x.g))} por ${unidad} (${x.pct.toFixed(1).replace('.', ',')} %)` : undefined;

  return (
    <Modal titulo={p.editando ? 'Editar producto' : 'Nuevo producto'} onCerrar={p.onCerrar} ancho="lg">
      <form onSubmit={p.onSubmit} className="flex flex-col gap-7">
        <Seccion titulo="Datos del producto">
          <Field etiqueta="Nombre" required placeholder="Ej.: Purina Engorde 40 kg" value={v.nombre} onChange={(e) => p.onNombre(e.target.value)} />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Select etiqueta="Categoría" value={v.categoria} onChange={(e) => p.onCategoria(e.target.value)} opciones={CATEGORIAS_PRODUCTO.map((c) => ({ valor: c, texto: c }))} />
            <Select etiqueta="Se vende por" value={v.unidad} onChange={(e) => p.onUnidad(e.target.value)} opciones={[...UNIDADES_MEDIDA]} />
          </div>
        </Seccion>

        <Seccion
          titulo="Costo de compra"
          accion={
            <button
              type="button"
              onClick={() => p.onModoLote(!v.modoLote)}
              className="cursor-pointer text-sm font-semibold text-rojo hover:text-rojo-oscuro"
            >
              {v.modoLote ? 'Escribir el costo por unidad' : '¿Compraste un lote? Calcúlalo con la factura'}
            </button>
          }
        >
          {v.modoLote ? (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                etiqueta="Valor total de la factura"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="900000"
                value={v.facturaLote}
                onChange={(e) => p.onFacturaLote(e.target.value)}
                ayuda="Se divide entre las existencias que escribas abajo."
                className="tabular"
              />
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">Costo por {unidad}</span>
                <span className="flex h-[52px] items-center rounded-campo bg-hundido px-4 text-lg font-bold tabular">
                  {costo ? formatoMoneda(costo) : '—'}
                </span>
              </div>
            </div>
          ) : (
            <Field
              etiqueta={`Costo por ${unidad}`}
              type="number"
              inputMode="numeric"
              required
              min="0"
              placeholder="95000"
              value={v.costo}
              onChange={(e) => p.onCosto(e.target.value)}
              ayuda={`Lo que te cuesta un solo ${unidad}, no el lote completo.`}
              className="tabular"
            />
          )}
        </Seccion>

        <Seccion titulo="Precios de venta">
          <div className="flex flex-col gap-3.5 rounded-campo bg-hundido p-4">
            <p className="text-sm text-tinta-suave">Escribe el margen que quieres ganar y el precio se calcula solo. También puedes escribir el precio directamente.</p>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field etiqueta="Margen detal (%)" type="number" inputMode="decimal" placeholder="20" value={v.margenDetal} onChange={(e) => p.onMargenDetal(e.target.value)} className="tabular" />
              <Field etiqueta="Margen por mayor (%)" type="number" inputMode="decimal" placeholder="12" value={v.margenMayor} onChange={(e) => p.onMargenMayor(e.target.value)} className="tabular" />
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold" id="iva-etiqueta">IVA</span>
                <div role="radiogroup" aria-labelledby="iva-etiqueta" className="grid h-[52px] grid-cols-3 gap-1 rounded-campo bg-neutro p-1">
                  {TASAS_IVA.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={v.iva === t}
                      onClick={() => p.onIva(t)}
                      className={cn(
                        'cursor-pointer rounded-lg text-sm font-bold tabular transition-colors',
                        v.iva === t ? 'bg-superficie text-tinta shadow-[0_1px_2px_rgba(23,19,15,0.12)]' : 'text-tinta-suave hover:text-tinta'
                      )}
                    >
                      {t} %
                    </button>
                  ))}
                </div>
                {!TASAS_IVA.includes(v.iva) && v.iva !== '' && <span className="text-sm text-tinta-suave">IVA actual: {v.iva} %</span>}
              </div>
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              etiqueta="Precio detal"
              type="number"
              inputMode="numeric"
              required
              min="0"
              placeholder="115000"
              value={v.precioDetal}
              onChange={(e) => p.onPrecioDetal(e.target.value)}
              ayuda={resumen(gDetal)}
              error={gDetal && gDetal.g < 0 ? 'El precio detal es menor que el costo.' : undefined}
              className="text-lg font-bold tabular"
            />
            <Field
              etiqueta="Precio por mayor"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="110000"
              value={v.precioMayor}
              onChange={(e) => p.onPrecioMayor(e.target.value)}
              ayuda={resumen(gMayor) ?? 'Si lo dejas vacío, será 5 % menos que el detal.'}
              className="text-lg font-bold text-mayor tabular"
            />
          </div>
        </Seccion>

        <Seccion titulo="Existencias">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field etiqueta="En bodega" type="number" inputMode="numeric" required min="0" placeholder="20" value={v.stock} onChange={(e) => p.onStock(e.target.value)} className="tabular" />
            <Field
              etiqueta="Avisar cuando queden"
              type="number"
              inputMode="numeric"
              required
              min="0"
              placeholder="5"
              value={v.stockMin}
              onChange={(e) => p.onStockMin(e.target.value)}
              ayuda="Stock mínimo antes de mostrar la alerta."
              className="tabular"
            />
          </div>
        </Seccion>

        <div className="grid grid-cols-2 gap-2.5">
          <Button variante="secundario" tamano="lg" onClick={p.onCerrar}>Cancelar</Button>
          <Button type="submit" tamano="lg" cargando={p.procesando}>{p.editando ? 'Guardar cambios' : 'Guardar producto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
