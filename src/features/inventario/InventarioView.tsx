'use client';

import React, { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, Fila, PageHeader, Panel, SearchInput, Select, Tabla, Td, Th, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { CATEGORIAS_PRODUCTO } from '@/lib/categorias';
import type { Producto } from '@/types';

interface InventarioViewProps {
  productos: Producto[];
  esAdmin: boolean;
  onNuevo: () => void;
  onEditar: (p: Producto) => void;
  onEliminar: (p: Producto) => void;
  onExportar: () => void;
}

const POR_PAGINA = 12;

export function InventarioView({ productos, esAdmin, onNuevo, onEditar, onEliminar, onExportar }: InventarioViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [soloReponer, setSoloReponer] = useState(false);
  const [pagina, setPagina] = useState(1);

  const porReponer = productos.filter((p) => p.stock <= p.stock_minimo).length;
  const inversion = productos.reduce((acc, p) => acc + p.stock * p.precio_compra, 0);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) &&
        (categoria === 'Todas' || p.categoria === categoria) &&
        (!soloReponer || p.stock <= p.stock_minimo)
    );
  }, [productos, busqueda, categoria, soloReponer]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const porCategoria = CATEGORIAS_PRODUCTO.map((cat) => {
    const prods = productos.filter((p) => p.categoria === cat);
    return { cat, stock: prods.reduce((a, p) => a + p.stock, 0), valor: prods.reduce((a, p) => a + p.stock * p.precio_compra, 0) };
  }).filter((c) => c.stock > 0 || c.valor > 0);

  const filtrar = (fn: () => void) => {
    fn();
    setPagina(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Inventario"
        descripcion={`${productos.length} referencias · ${formatoMoneda(inversion)} invertidos · ${porReponer} por reponer`}
        acciones={
          <>
            <Button variante="secundario" onClick={onExportar}>
              <Download className="h-5 w-5" aria-hidden="true" />
              Exportar a Excel
            </Button>
            {esAdmin && (
              <Button onClick={onNuevo}>
                <Plus className="h-5 w-5" aria-hidden="true" />
                Nuevo producto
              </Button>
            )}
          </>
        }
      />

      {porCategoria.length > 0 && (
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-tinta-suave" aria-label="Existencias por categoría">
          {porCategoria.map((c) => (
            <li key={c.cat} className="tabular">
              <strong className="font-semibold text-tinta">{c.cat}:</strong> {c.stock} en bodega · {formatoMoneda(c.valor)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput etiqueta="Buscar producto" placeholder="Buscar producto" valor={busqueda} onCambiar={(v) => filtrar(() => setBusqueda(v))} />
        <div className="w-full sm:w-auto sm:min-w-[230px]">
          <Select
            etiqueta="Categoría"
            etiquetaOculta
            value={categoria}
            onChange={(e) => filtrar(() => setCategoria(e.target.value))}
            opciones={[{ valor: 'Todas', texto: 'Todas las categorías' }, ...CATEGORIAS_PRODUCTO.map((c) => ({ valor: c, texto: c }))]}
            className="h-12"
          />
        </div>
        <button
          type="button"
          aria-pressed={soloReponer}
          onClick={() => filtrar(() => setSoloReponer((v) => !v))}
          className={cn(
            'h-12 cursor-pointer rounded-control px-4 text-[15px] font-bold transition-colors',
            soloReponer ? 'bg-aviso-texto text-white' : 'bg-aviso-fondo text-aviso-texto hover:bg-[#F8E2B4]'
          )}
        >
          Solo por reponer ({porReponer})
        </button>
      </div>

      <Panel>
        {visibles.length === 0 ? (
          <EmptyState
            className="m-6"
            titulo={productos.length === 0 ? 'Todavía no hay productos' : 'Ningún producto coincide'}
            descripcion={productos.length === 0 ? 'Registra tus purinas y concentrados para empezar a vender.' : 'Prueba con otro nombre o quita los filtros.'}
          />
        ) : (
          <Tabla minAncho={1040}>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th className="w-[200px]">Existencias</Th>
                <Th alinear="der">Costo</Th>
                <Th alinear="der">Detal</Th>
                <Th alinear="der">Por mayor</Th>
                <Th alinear="der">Margen</Th>
                <Th alinear="der">En bodega</Th>
                {esAdmin && <Th alinear="der"><span className="sr-only">Acciones</span></Th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const agotado = p.stock <= 0;
                const bajo = p.stock <= p.stock_minimo;
                const pct = Math.min(100, Math.max(agotado ? 2 : 4, (p.stock / Math.max(1, p.stock_minimo * 3)) * 100));
                const margenPct = p.precio_compra > 0 ? ((p.precio_venta - p.precio_compra) / p.precio_compra) * 100 : 0;
                const unidad = `${p.unidad_medida}${p.stock === 1 ? '' : 's'}`;
                return (
                  <Fila key={p.id}>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <strong className="font-semibold">{p.nombre}</strong>
                        <span className="text-[13px] text-tinta-suave">
                          {p.categoria} · {p.unidad_medida}{p.iva_porcentaje ? ` · IVA ${p.iva_porcentaje} %` : ''}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1.5">
                        <span className={cn('font-bold tabular', agotado ? 'text-rojo-oscuro' : bajo ? 'text-aviso-texto' : 'text-tinta')}>
                          {agotado ? `Agotado · mín. ${p.stock_minimo}` : bajo ? `${p.stock} · mín. ${p.stock_minimo}` : `${p.stock} ${unidad}`}
                        </span>
                        <div className="h-1.5 rounded-sm bg-hundido">
                          <div className={cn('h-full rounded-sm', agotado ? 'bg-rojo' : bajo ? 'bg-maiz-oscuro' : 'bg-exito')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </Td>
                    <Td alinear="der" className="tabular">{formatoMoneda(p.precio_compra)}</Td>
                    <Td alinear="der" className="font-semibold tabular">{formatoMoneda(p.precio_venta)}</Td>
                    <Td alinear="der" className="font-semibold text-mayor tabular">{formatoMoneda(p.precio_mayorista)}</Td>
                    <Td alinear="der" className="tabular">{margenPct.toFixed(1).replace('.', ',')} %</Td>
                    <Td alinear="der" className="font-semibold tabular">{formatoMoneda(p.stock * p.precio_compra)}</Td>
                    {esAdmin && (
                      <Td alinear="der" className="whitespace-nowrap">
                        {bajo && (
                          <Button tamano="sm" onClick={() => onEditar(p)} className="mr-1">Reponer</Button>
                        )}
                        <Button variante="fantasma" tamano="sm" onClick={() => onEditar(p)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </Button>
                        <Button variante="peligro" tamano="sm" onClick={() => onEliminar(p)} aria-label={`Eliminar ${p.nombre}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </Td>
                    )}
                  </Fila>
                );
              })}
            </tbody>
          </Tabla>
        )}
        {filtrados.length > POR_PAGINA && (
          <footer className="flex flex-wrap items-center justify-between gap-3 bg-hundido px-6 py-3.5 text-sm text-tinta-suave">
            <span className="tabular">
              Mostrando {(paginaActual - 1) * POR_PAGINA + 1}–{Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <nav aria-label="Páginas" className="flex gap-1.5">
              <Button variante="fantasma" tamano="sm" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior">‹</Button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variante={n === paginaActual ? 'primario' : 'fantasma'}
                  tamano="sm"
                  aria-current={n === paginaActual ? 'page' : undefined}
                  onClick={() => setPagina(n)}
                  className={cn('min-w-9 px-0', n === paginaActual && 'bg-tinta hover:bg-tinta')}
                >
                  {n}
                </Button>
              ))}
              <Button variante="fantasma" tamano="sm" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente">›</Button>
            </nav>
          </footer>
        )}
      </Panel>
    </div>
  );
}
