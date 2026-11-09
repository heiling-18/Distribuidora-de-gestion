'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo } from '@/components/ui';
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal';
import { armarItem, enCarrito, totalesDe, type ItemCarrito } from '@/features/pos/carrito';
import { POSView } from '@/features/pos/POSView';
import { TicketVentaModal, type TicketVenta } from '@/features/pos/TicketVentaModal';
import { ticketDeVenta } from '@/features/pos/ticket';
import { linkWhatsAppCliente, linkWhatsAppDueno } from '@/features/pos/whatsapp';
import { ApiError, mensajeDeError } from '@/lib/api/cliente';
import { clientesApi, configuracionApi, productosApi, ventasApi, type Configuracion } from '@/lib/api/servicios';
import { nuevaClaveVenta } from '@/lib/ventas';
import type { Cliente, MetodoPago, Producto, TipoPrecio } from '@/types/api';

const clienteVacio = { documento: '', nombre: '', telefono: '', direccion: '' };

export default function PosPage() {
  const router = useRouter();
  const notificar = useNotificar();
  const { caja, refrescar } = useEstadoNegocio();

  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [config, setConfig] = useState<Configuracion>({ nombreNegocio: "DYM'S", nit: '', telefonoWhatsapp: '' });
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [ticket, setTicket] = useState<TicketVenta | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState<typeof clienteVacio | null>(null);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  // Una clave por intento de venta: si la red falla y se reintenta, el servidor no la duplica.
  const claveVenta = useRef(nuevaClaveVenta());

  const cargar = useCallback(async () => {
    try {
      const [p, c, cfg] = await Promise.all([productosApi.todos(), clientesApi.todos(), configuracionApi.obtener()]);
      setProductos(p);
      setClientes(c);
      setConfig(cfg.configuracion);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const totales = useMemo(() => totalesDe(carrito), [carrito]);
  const cajaAbierta = !!caja;

  const agregar = (p: Producto, tipo: TipoPrecio) => {
    if (!cajaAbierta) return notificar('advertencia', 'La caja está cerrada: ábrela para poder vender.');
    if (enCarrito(carrito, p.id) + 1 > p.stock) return notificar('error', `Solo hay ${p.stock} disponibles de ${p.nombre}.`);
    setCarrito((prev) => {
      const i = prev.findIndex((it) => it.producto.id === p.id && it.tipoPrecio === tipo);
      if (i === -1) return [...prev, armarItem(p, tipo, 1)];
      return prev.map((it, j) => (j === i ? armarItem(p, tipo, it.cantidad + 1) : it));
    });
  };

  const cambiarCantidad = (idx: number, delta: number) => {
    const item = carrito[idx];
    if (!item) return;
    const nueva = item.cantidad + delta;
    if (nueva <= 0) return setCarrito((prev) => prev.filter((_, i) => i !== idx));
    if (nueva + enCarrito(carrito, item.producto.id, idx) > item.producto.stock) {
      return notificar('advertencia', `Existencias máximas disponibles: ${item.producto.stock}`);
    }
    setCarrito((prev) => prev.map((it, i) => (i === idx ? armarItem(it.producto, it.tipoPrecio, nueva) : it)));
  };


  const cobrar = async () => {
    if (procesando || carrito.length === 0) return;
    if (!cajaAbierta) return notificar('advertencia', 'La caja está cerrada: ábrela para poder vender.');
    setProcesando(true);
    try {
      const { venta } = await ventasApi.registrar({
        idempotencyKey: claveVenta.current,
        metodoPago,
        ...(cliente ? { clienteId: cliente.id } : {}),
        items: carrito.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad, tipoPrecio: i.tipoPrecio })),
      });
      claveVenta.current = nuevaClaveVenta();
      setTicket(ticketDeVenta(venta, cliente?.telefono ?? ''));
      setCarrito([]);
      setCliente(null);
      setBusquedaCliente('');
      notificar('exito', `Venta #${venta.numero} registrada.`);
      await Promise.all([cargar(), refrescar()]);
    } catch (err) {
      // Si la API rechazó la venta (stock, caja…), el siguiente intento es una venta nueva.
      if (err instanceof ApiError && err.status !== 0) claveVenta.current = nuevaClaveVenta();
      notificar('error', mensajeDeError(err));
      if (err instanceof ApiError && err.status === 409) void cargar();
    } finally {
      setProcesando(false);
    }
  };

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCliente) return;
    setGuardandoCliente(true);
    try {
      const { cliente: c } = await clientesApi.crear(nuevoCliente);
      setClientes((prev) => [...prev, c]);
      setCliente(c);
      setNuevoCliente(null);
      notificar('exito', `${c.nombre} registrado y seleccionado.`);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setGuardandoCliente(false);
    }
  };

  if (!productos) return <CargandoModulo />;

  return (
    <>
      <POSView
        productos={productos}
        carrito={carrito}
        totales={totales}
        metodoPago={metodoPago}
        onMetodoPago={setMetodoPago}
        clientes={clientes}
        clienteSeleccionado={cliente}
        onSeleccionarCliente={setCliente}
        busquedaCliente={busquedaCliente}
        onBusquedaCliente={setBusquedaCliente}
        onRegistrarCliente={(documento) => setNuevoCliente({ ...clienteVacio, documento })}
        onAgregar={agregar}
        onCantidad={cambiarCantidad}
        onQuitar={(idx) => setCarrito((prev) => prev.filter((_, i) => i !== idx))}
        onCobrar={cobrar}
        procesando={procesando}
        cajaAbierta={cajaAbierta}
        onAbrirCaja={() => router.push('/caja')}
      />
      {nuevoCliente && (
        <ClienteFormModal
          editando={false}
          {...nuevoCliente}
          procesando={guardandoCliente}
          onDocumento={(documento) => setNuevoCliente({ ...nuevoCliente, documento })}
          onNombre={(nombre) => setNuevoCliente({ ...nuevoCliente, nombre })}
          onTelefono={(telefono) => setNuevoCliente({ ...nuevoCliente, telefono })}
          onDireccion={(direccion) => setNuevoCliente({ ...nuevoCliente, direccion })}
          onSubmit={guardarCliente}
          onCerrar={() => setNuevoCliente(null)}
        />
      )}
      {ticket && (
        <TicketVentaModal
          ticket={ticket}
          linkWhatsAppCliente={linkWhatsAppCliente(ticket, config.nombreNegocio)}
          linkWhatsAppDueno={linkWhatsAppDueno(ticket, config.telefonoWhatsapp, config.nombreNegocio)}
          nit={config.nit}
          telefonoDueno={config.telefonoWhatsapp}
          onCerrar={() => setTicket(null)}
        />
      )}
    </>
  );
}
