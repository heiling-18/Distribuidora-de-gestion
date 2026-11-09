'use client';

import { useState } from 'react';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CATEGORIA_PRINCIPAL } from '@/lib/categorias';
import { mensajeDeError } from '@/lib/api/cliente';
import { productosApi } from '@/lib/api/servicios';
import { formatoMoneda } from '@/lib/formato';
import type { Producto, UnidadMedida } from '@/types/api';
import { ProductoFormModal } from './ProductoFormModal';

const inicial = {
  nombre: '',
  categoria: CATEGORIA_PRINCIPAL as string,
  unidad: 'bulto',
  costo: '',
  margenDetal: '20',
  margenMayor: '12',
  iva: '0',
  precioDetal: '',
  precioMayor: '',
  stock: '',
  stockMin: '5',
  modoLote: false,
  facturaLote: '',
};
type Valores = typeof inicial;

/** Precio de venta con IVA incluido a partir del costo y el margen. */
const precioCon = (costo: number, margen: number, iva: number) => Math.round(costo * (1 + margen / 100) * (1 + iva / 100));

/** Formulario de producto (crear y editar) con el cálculo de precios por margen e IVA. */
export function useProductoForm(alGuardar: () => void) {
  const notificar = useNotificar();
  const [v, setV] = useState<Valores | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [procesando, setProcesando] = useState(false);

  const conPrecios = (x: Valores): Valores => {
    const c = Number(x.costo) || 0;
    if (c <= 0) return x;
    const iva = Number(x.iva) || 0;
    return {
      ...x,
      precioDetal: String(precioCon(c, Number(x.margenDetal) || 0, iva)),
      precioMayor: String(precioCon(c, Number(x.margenMayor) || 0, iva)),
    };
  };
  const cambiar = (cambios: Partial<Valores>, recalcular = false) =>
    setV((prev) => (prev ? (recalcular ? conPrecios({ ...prev, ...cambios }) : { ...prev, ...cambios }) : prev));

  /** En modo lote, el costo unitario sale de dividir el valor de la factura entre las unidades. */
  const conCostoLote = (x: Valores): Partial<Valores> => {
    const factura = Number(x.facturaLote);
    const unidades = Number(x.stock);
    return x.modoLote && factura > 0 && unidades > 0 ? { costo: String(Math.round(factura / unidades)) } : {};
  };

  const abrirNuevo = () => {
    setEditando(null);
    setV(inicial);
  };

  const abrirEdicion = (p: Producto) => {
    const costo = p.precioCompra ?? 0;
    const margen = (precio: number) => (costo > 0 ? Math.round(((precio - costo) / costo) * 100) : 0);
    setEditando(p);
    setV({
      ...inicial,
      nombre: p.nombre,
      categoria: p.categoria,
      unidad: p.unidadMedida,
      costo: String(costo),
      margenDetal: String(margen(p.precioVenta)),
      margenMayor: String(margen(p.precioMayorista)),
      iva: String(p.ivaPorcentaje),
      precioDetal: String(p.precioVenta),
      precioMayor: String(p.precioMayorista),
      stock: String(p.stock),
      stockMin: String(p.stockMinimo),
    });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v || procesando) return;
    const costo = Number(v.costo) || 0;
    const precioVenta = Number(v.precioDetal);
    const stock = Number(v.stock) || 0;
    const datos = {
      nombre: v.nombre.trim(),
      categoria: v.categoria,
      unidadMedida: v.unidad as UnidadMedida,
      precioCompra: costo,
      precioVenta,
      precioMayorista: Number(v.precioMayor) || 0,
      ivaPorcentaje: Number(v.iva) || 0,
      stockMinimo: Number(v.stockMin) || 0,
    };
    if (!datos.nombre) return notificar('advertencia', 'El nombre del producto es obligatorio.');
    if (precioVenta < costo) {
      return notificar('error', `El precio detal (${formatoMoneda(precioVenta)}) no puede ser menor que el costo (${formatoMoneda(costo)}).`);
    }
    if (stock < 0) return notificar('error', 'El stock no puede ser negativo.');

    setProcesando(true);
    try {
      if (editando) {
        // El stock no se edita directo: la diferencia viaja como ajuste (queda en el historial)
        // y la API guarda datos y existencias juntos, o nada si algo falla.
        const diferencia = Math.round((stock - editando.stock) * 1000) / 1000;
        const esCompra = diferencia > 0 && v.modoLote;
        await productosApi.actualizar(editando.id, {
          ...datos,
          ...(diferencia !== 0
            ? {
                ajusteStock: {
                  tipo: esCompra ? 'compra' : 'ajuste',
                  cantidad: diferencia,
                  motivo: esCompra ? `Ingreso de lote (${formatoMoneda(Number(v.facturaLote) || 0)})` : 'Corrección desde la ficha del producto',
                },
              }
            : {}),
        });
        notificar('exito', 'Producto actualizado.');
      } else {
        await productosApi.crear({ ...datos, stockInicial: stock });
        notificar('exito', `${datos.nombre} agregado al inventario.`);
      }
      setV(null);
      alGuardar();
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const modal = v && (
    <ProductoFormModal
      editando={editando !== null}
      procesando={procesando}
      v={v}
      onNombre={(nombre) => cambiar({ nombre })}
      onCategoria={(categoria) => cambiar({ categoria })}
      onUnidad={(unidad) => cambiar({ unidad })}
      onCosto={(costo) => cambiar({ costo }, true)}
      onMargenDetal={(margenDetal) => cambiar({ margenDetal }, true)}
      onMargenMayor={(margenMayor) => cambiar({ margenMayor }, true)}
      onIva={(iva) => cambiar({ iva }, true)}
      onPrecioDetal={(precioDetal) => cambiar({ precioDetal })}
      onPrecioMayor={(precioMayor) => cambiar({ precioMayor })}
      onStock={(stock) => cambiar({ stock, ...conCostoLote({ ...v, stock }) }, true)}
      onStockMin={(stockMin) => cambiar({ stockMin })}
      onModoLote={(modoLote) => cambiar({ modoLote, ...(modoLote ? {} : { facturaLote: '' }) })}
      onFacturaLote={(facturaLote) => cambiar({ facturaLote, ...conCostoLote({ ...v, facturaLote }) }, true)}
      onSubmit={guardar}
      onCerrar={() => setV(null)}
    />
  );

  return { abrirNuevo, abrirEdicion, modal };
}
