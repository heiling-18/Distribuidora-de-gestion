'use client';

import React, { useMemo, useState } from 'react';
import { Minus, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, SearchInput, cn } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import { CATEGORIAS_PRODUCTO } from '@/lib/categorias';
import type { Cliente, ItemCarrito, Producto } from '@/types';

type MetodoPago = 'efectivo' | 'transferencia';

interface POSViewProps {
  productos: Producto[];
  carrito: ItemCarrito[];
  totales: { subtotal: number; iva: number; total: number };
  metodoPago: MetodoPago;
  onMetodoPago: (m: MetodoPago) => void;
  clientes: Cliente[];
  clienteSeleccionado: Cliente | null;
  onSeleccionarCliente: (c: Cliente | null) => void;
  busquedaCliente: string;
  onBusquedaCliente: (v: string) => void;
  onRegistrarCliente: (documento: string) => void;
  onAgregar: (p: Producto, tipo: 'detal' | 'mayorista') => void;
  onCantidad: (indice: number, delta: number) => void;
  onQuitar: (indice: number) => void;
  onCobrar: () => void;
  procesando: boolean;
  cajaAbierta: boolean;
  onAbrirCaja: () => void;
}

const POR_PAGINA = 9;

export function POSView(p: POSViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [pagina, setPagina] = useState(1);
  const [listaClientesAbierta, setListaClientesAbierta] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return p.productos.filter((x) => x.nombre.toLowerCase().includes(q) && (categoria === 'Todas' || x.categoria === categoria));
  }, [p.productos, busqueda, categoria]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const clientesCoinciden = useMemo(() => {
    const q = p.busquedaCliente.trim().toLowerCase();
    if (!q) return [];
    return p.clientes.filter((c) => c.documento.includes(q) || c.nombre.toLowerCase().includes(q)).slice(0, 6);
  }, [p.clientes, p.busquedaCliente]);

  const unidades = p.carrito.reduce((a, i) => a + i.cantidad, 0);
  const enCarrito = (id: number) => p.carrito.filter((i) => i.producto.id === id).reduce((a, i) => a + i.cantidad, 0);

  return (
    <div className="flex flex-wrap items-start gap-6">
      {/* Catálogo */}
      <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-5" aria-label="Productos">
        <h1 className="font-display text-[34px] font-extrabold tracking-[-0.03em] sm:text-[36px]">Nueva venta</h1>

        {/* Buscador a todo lo ancho del catálogo */}
        <SearchInput
          etiqueta="Buscar producto"
          placeholder="Buscar producto por nombre"
          valor={busqueda}
          onCambiar={(v) => {
            setBusqueda(v);
            setPagina(1);
          }}
          anchoCompleto
          grande
        />

        {!p.cajaAbierta && (
          <Alert tono="aviso">
            La caja está cerrada: puedes armar el carrito, pero para cobrar debes{' '}
            <button type="button" onClick={p.onAbrirCaja} className="cursor-pointer font-bold underline">abrir la caja</button>.
          </Alert>
        )}

        <div role="group" aria-label="Categorías" className="flex flex-wrap gap-2">
          {['Todas', ...CATEGORIAS_PRODUCTO].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={categoria === c}
              onClick={() => {
                setCategoria(c);
                setPagina(1);
              }}
              className={cn(
                'h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors',
                categoria === c ? 'bg-tinta text-white' : 'bg-neutro text-tinta hover:bg-neutro-hover'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <EmptyState titulo="No hay productos que coincidan" descripcion="Prueba con otro nombre o con otra categoría." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {visibles.map((x) => {
              const disponible = x.stock - enCarrito(x.id);
              const agotado = x.stock <= 0;
              const bajo = !agotado && x.stock <= x.stock_minimo;
              return (
                <article
                  key={x.id}
                  className={cn('flex flex-col gap-3.5 rounded-[16px] bg-superficie p-[18px] transition-transform duration-200 hover:-translate-y-0.5', agotado && 'opacity-60')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-semibold text-tinta-suave">{x.categoria}</span>
                    <Badge tono={agotado ? 'error' : bajo ? 'aviso' : 'exito'}>{agotado ? 'Agotado' : `${x.stock} en bodega`}</Badge>
                  </div>
                  <h2 className="min-h-[46px] text-lg font-bold leading-tight">{x.nombre}</h2>
                  <div className="flex gap-5">
                    <span className="flex flex-col">
                      <span className="text-[13px] text-tinta-suave">Detal</span>
                      <strong className="text-lg tabular">{formatoMoneda(x.precio_venta)}</strong>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[13px] text-mayor">Por mayor</span>
                      <strong className="text-lg text-mayor tabular">{formatoMoneda(x.precio_mayorista)}</strong>
                    </span>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button tamano="sm" className="h-11" disabled={disponible <= 0} onClick={() => p.onAgregar(x, 'detal')}>+ Detal</Button>
                    <Button
                      tamano="sm"
                      className="h-11 bg-mayor-fondo text-mayor hover:bg-[#D9E4F2]"
                      disabled={disponible <= 0}
                      onClick={() => p.onAgregar(x, 'mayorista')}
                    >
                      + Mayor
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalPaginas > 1 && (
          <nav aria-label="Páginas de productos" className="flex flex-wrap items-center justify-center gap-1.5">
            <Button variante="fantasma" tamano="sm" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>‹ Anterior</Button>
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
            <Button variante="fantasma" tamano="sm" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente ›</Button>
          </nav>
        )}
      </section>

      {/* Carrito */}
      <aside
        id="carrito"
        aria-label="Carrito"
        className="flex w-full min-w-0 flex-[1_1_360px] flex-col gap-[18px] rounded-tarjeta bg-superficie p-6 lg:sticky lg:top-6 lg:max-w-[420px]"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-bold">Carrito</h2>
          <span className="text-[15px] text-tinta-suave tabular">{unidades} {unidades === 1 ? 'unidad' : 'unidades'}</span>
        </div>

        {/* Cliente */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Cliente</span>
          {p.clienteSeleccionado ? (
            <div className="flex items-center gap-3 rounded-control bg-exito-fondo px-3.5 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate text-[15px] text-exito-texto">{p.clienteSeleccionado.nombre}</strong>
                <span className="text-[13px] text-exito-texto tabular">C.C. / NIT {p.clienteSeleccionado.documento}</span>
              </div>
              <button
                type="button"
                onClick={() => p.onSeleccionarCliente(null)}
                aria-label="Quitar cliente"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-exito-texto hover:bg-white/60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <SearchInput
                etiqueta="Buscar cliente"
                placeholder="Cédula o nombre · vacío = cliente general"
                valor={p.busquedaCliente}
                onCambiar={(v) => {
                  p.onBusquedaCliente(v);
                  setListaClientesAbierta(true);
                }}
                onFocus={() => setListaClientesAbierta(true)}
                anchoCompleto
              />
              {listaClientesAbierta && p.busquedaCliente.trim().length > 0 && (
                <ul className="absolute inset-x-0 top-[54px] z-20 flex max-h-64 flex-col overflow-y-auto rounded-campo bg-superficie p-1.5 shadow-[0_18px_40px_-16px_rgba(23,19,15,0.45)]">
                  {clientesCoinciden.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          p.onSeleccionarCliente(c);
                          p.onBusquedaCliente('');
                          setListaClientesAbierta(false);
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hundido"
                      >
                        <span className="truncate font-semibold">{c.nombre}</span>
                        <span className="shrink-0 text-[13px] text-tinta-suave tabular">{c.documento}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        p.onRegistrarCliente(p.busquedaCliente.replace(/[^0-9]/g, ''));
                        setListaClientesAbierta(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 font-semibold text-rojo hover:bg-rojo-fondo"
                    >
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Registrar cliente nuevo
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Productos del carrito */}
        <div className="flex min-h-[140px] flex-col gap-2.5">
          {p.carrito.length === 0 ? (
            <EmptyState titulo="El carrito está vacío" descripcion="Toca «+ Detal» o «+ Mayor» en un producto." className="flex-1 py-8" />
          ) : (
            p.carrito.map((item, idx) => {
              const mayor = item.tipo_precio === 'mayorista';
              return (
                <div key={`${item.producto.id}-${item.tipo_precio}`} className="animate-subir flex items-center gap-2.5 rounded-control bg-hundido p-3 [animation-duration:.35s]">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="truncate text-[15px] font-semibold">{item.producto.nombre}</strong>
                    <span className={cn('text-[13px] tabular', mayor ? 'text-mayor' : 'text-tinta-suave')}>
                      {mayor ? 'Por mayor' : 'Detal'} · {formatoMoneda(item.precio_aplicado)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => p.onCantidad(idx, -1)} aria-label="Quitar una unidad" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-neutro hover:bg-neutro-hover">
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-7 text-center font-bold tabular">{item.cantidad}</span>
                    <button type="button" onClick={() => p.onCantidad(idx, 1)} aria-label="Agregar una unidad" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-neutro hover:bg-neutro-hover">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <strong className="min-w-[84px] text-right text-[15px] tabular">{formatoMoneda(item.total)}</strong>
                  <button type="button" onClick={() => p.onQuitar(idx)} aria-label={`Quitar ${item.producto.nombre}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-tinta-tenue hover:bg-error-fondo hover:text-rojo-oscuro">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pago */}
        <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-2 gap-2">
          {(['efectivo', 'transferencia'] as MetodoPago[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={p.metodoPago === m}
              onClick={() => p.onMetodoPago(m)}
              className={cn(
                'h-12 cursor-pointer rounded-control border-2 text-[15px] font-bold capitalize transition-colors',
                p.metodoPago === m ? 'border-rojo bg-rojo-fondo text-tinta' : 'border-neutro-hover bg-superficie text-tinta hover:bg-hundido'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {p.metodoPago === 'transferencia' && (
          <Alert tono="aviso">Guarda el comprobante de la transferencia antes de cobrar.</Alert>
        )}

        <dl className="flex flex-col gap-2 text-[15px]">
          <div className="flex justify-between"><dt className="text-tinta-suave">Subtotal</dt><dd className="tabular">{formatoMoneda(p.totales.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-tinta-suave">IVA</dt><dd className="tabular">{formatoMoneda(p.totales.iva)}</dd></div>
          <div className="flex items-baseline justify-between pt-2">
            <dt className="text-[17px] font-bold">Total</dt>
            <dd className="font-display text-[34px] font-extrabold tracking-[-0.03em] tabular">{formatoMoneda(p.totales.total)}</dd>
          </div>
        </dl>

        <Button tamano="lg" anchoCompleto disabled={p.carrito.length === 0 || !p.cajaAbierta} cargando={p.procesando} onClick={p.onCobrar}>
          {p.procesando ? 'Registrando venta…' : `Cobrar ${formatoMoneda(p.totales.total)}`}
        </Button>
      </aside>

      {/* Barra de total en el celular */}
      {p.carrito.length > 0 && (
        <a
          href="#carrito"
          className="no-print fixed inset-x-3 bottom-[80px] z-20 flex items-center justify-between rounded-campo bg-noche px-4 py-3 text-crema shadow-[0_18px_40px_-16px_rgba(23,19,15,0.6)] lg:hidden"
        >
          <span className="text-sm">{unidades} {unidades === 1 ? 'unidad' : 'unidades'} · ver carrito</span>
          <strong className="font-display text-xl tabular">{formatoMoneda(p.totales.total)}</strong>
        </a>
      )}
    </div>
  );
}
