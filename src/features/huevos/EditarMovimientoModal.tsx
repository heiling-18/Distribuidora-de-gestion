'use client';

import React, { useState } from 'react';
import { Alert, Button, Field, Modal, Select, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { HUEVOS_POR_CARTON, hoyLocal, textoCartones } from '@/lib/galpones';
import {
  NOMBRE_CLASE,
  saldoPorTipo,
  valorHuevos,
  type MovimientoHuevo,
  type NuevoMovimiento,
  type TipoHuevo,
} from '@/lib/huevos';
import { CantidadHuevos, leerCantidad } from './CantidadHuevos';

interface EditarMovimientoModalProps {
  movimiento: MovimientoHuevo;
  tipos: TipoHuevo[];
  movimientos: MovimientoHuevo[];
  procesando: boolean;
  onGuardar: (id: number, cambios: NuevoMovimiento) => Promise<boolean>;
  onCerrar: () => void;
}

/** Corrige un ingreso, una venta o unos rotos ya guardados (solo administrador) */
export function EditarMovimientoModal({ movimiento: m, tipos, movimientos, procesando, onGuardar, onCerrar }: EditarMovimientoModalProps) {
  const [tipoId, setTipoId] = useState(String(m.tipo_id));
  const [fecha, setFecha] = useState(m.fecha);
  const [cartones, setCartones] = useState(String(Math.floor(m.huevos / HUEVOS_POR_CARTON)));
  const [sueltos, setSueltos] = useState(String(m.huevos % HUEVOS_POR_CARTON));
  const [precio, setPrecio] = useState(m.clase === 'venta' ? String(m.precio_carton) : '');
  const [tercero, setTercero] = useState(m.tercero ?? '');
  const [pago, setPago] = useState<'efectivo' | 'transferencia'>(m.metodo_pago ?? 'efectivo');
  const [notas, setNotas] = useState(m.notas ?? '');
  const [error, setError] = useState('');

  const cantidad = leerCantidad(cartones, sueltos);
  const huevos = 'huevos' in cantidad ? cantidad.huevos : 0;
  const nPrecio = Number(precio) || 0;
  // Los tamaños ocultos se pueden elegir si es el que ya tenía
  const opciones = tipos.filter((t) => t.activo || t.id === m.tipo_id).map((t) => ({ valor: String(t.id), texto: t.nombre }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if ('error' in cantidad) return setError(cantidad.error);
    if (m.clase === 'venta' && !(nPrecio > 0)) return setError('Escribe el precio por cartón.');

    const nuevoTipo = Number(tipoId);
    const corregido: MovimientoHuevo = { ...m, tipo_id: nuevoTipo, fecha, huevos };

    // Con el cambio, ningún tamaño puede quedar con menos huevos de los que ya se vendieron
    const saldo = saldoPorTipo(movimientos.map((x) => (x.id === m.id ? corregido : x)));
    for (const id of new Set([m.tipo_id, nuevoTipo])) {
      const queda = saldo.get(id) ?? 0;
      if (queda < 0) {
        const nombre = tipos.find((t) => t.id === id)?.nombre ?? 'ese tamaño';
        return setError(`Con ese cambio, de ${nombre} quedarían ${queda} huevos: ya se vendieron más de los que llegaron.`);
      }
    }

    await onGuardar(m.id, {
      fecha,
      tipo_id: nuevoTipo,
      clase: m.clase,
      huevos,
      precio_carton: m.clase === 'venta' ? Math.round(nPrecio) : 0,
      costo_carton: null,
      tercero: m.clase === 'perdida' ? null : tercero.trim() || null,
      metodo_pago: m.clase === 'venta' ? pago : null,
      notas: notas.trim() || null,
    });
  };

  return (
    <Modal titulo={`Corregir ${NOMBRE_CLASE[m.clase].toLowerCase()}`} descripcion={`Anotada por ${m.registrado_por || '—'}`} onCerrar={onCerrar} ancho="md">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Select etiqueta="Tamaño" opciones={opciones} value={tipoId} onChange={(e) => setTipoId(e.target.value)} />
          <Field etiqueta="Fecha" type="date" max={hoyLocal()} required value={fecha} onChange={(e) => setFecha(e.target.value || m.fecha)} />
        </div>

        <CantidadHuevos cartones={cartones} sueltos={sueltos} onCartones={setCartones} onSueltos={setSueltos} />

        {m.clase === 'venta' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              etiqueta="Vendido a (cartón)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="tabular"
            />
            <Field etiqueta="Cliente" placeholder="Opcional" value={tercero} onChange={(e) => setTercero(e.target.value)} />
          </div>
        )}
        {m.clase === 'entrada' && (
          <Field etiqueta="De qué galpón" placeholder="Opcional" value={tercero} onChange={(e) => setTercero(e.target.value)} />
        )}

        {m.clase === 'venta' && (
          <div role="radiogroup" aria-label="Forma de pago" className="grid grid-cols-2 gap-2.5">
            {(['efectivo', 'transferencia'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={pago === f}
                onClick={() => setPago(f)}
                className={cn(
                  'h-11 cursor-pointer touch-manipulation rounded-control text-[15px] font-bold capitalize transition-colors',
                  pago === f ? 'bg-noche text-crema' : 'bg-neutro text-tinta hover:bg-neutro-hover'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <Field etiqueta="Notas" placeholder="Opcional" value={notas} onChange={(e) => setNotas(e.target.value)} />

        {huevos > 0 && m.clase === 'venta' && nPrecio > 0 && (
          <p className="rounded-campo bg-hundido px-4 py-3 text-[15px] text-tinta-suave tabular">
            {textoCartones(huevos)} = <strong className="text-tinta">{formatoMoneda(valorHuevos(huevos, nPrecio))}</strong>
          </p>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variante="secundario" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" cargando={procesando}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}
