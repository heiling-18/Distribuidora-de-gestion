'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CATEGORIAS_PRODUCTO, UNIDADES_MEDIDA, normalizarCategoria } from '@/lib/categorias';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CajaCerradaBanner } from '@/components/layout/CajaCerradaBanner';
import { Toasts } from '@/components/layout/Toasts';
import type { Modulo } from '@/lib/modulos';
import type { Cliente, Gasto, ItemCarrito, NotificacionVisual, Producto, SesionCaja, Usuario, Venta } from '@/types';
import { formatoMoneda } from '@/lib/formato';
import { ConfirmDialog } from '@/components/ui';
import { ClientesView } from '@/features/clientes/ClientesView';
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal';
import { GastosView } from '@/features/gastos/GastosView';
import { GastoFormModal } from '@/features/gastos/GastoFormModal';
import { ReportesView } from '@/features/reportes/ReportesView';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { InventarioView } from '@/features/inventario/InventarioView';
import { AlertasStockModal } from '@/features/inventario/AlertasStockModal';
import { POSView } from '@/features/pos/POSView';
import {
  AlertTriangle,
  Send,
  Receipt,
  Wallet,
  FileSpreadsheet,
  Printer,
  Search,
  AlertCircle,
  Lock,
  Percent,
  RotateCcw
} from 'lucide-react';

const esVentaDeHoy = (fechaStr?: string) => {
  if (!fechaStr) return false;
  const f = new Date(fechaStr);
  const hoy = new Date();
  return f.getDate() === hoy.getDate() &&
    f.getMonth() === hoy.getMonth() &&
    f.getFullYear() === hoy.getFullYear();
};

// Perfil y rol del usuario autenticado (protegido por RLS: cada quien solo lee su fila)
const cargarPerfilUsuario = async (email: string): Promise<Usuario | null> => {
  const { data: dbUser, error } = await supabase
    .from('usuarios')
    .select('id, email, nombre, rol')
    .ilike('email', email)
    .maybeSingle();
  if (error || !dbUser) return null;
  return {
    id: dbUser.id,
    email: dbUser.email,
    nombre: dbUser.nombre || (dbUser.rol === 'admin' ? 'Administrador General' : 'Vendedor de Turno'),
    rol: dbUser.rol === 'admin' ? 'admin' : 'vendedor'
  };
};

export default function DYMSApp() {
  // 1. Sesión y Navegación
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [moduloActivo, setModuloActivo] = useState<Modulo>('dashboard');
  const [filtroVentasTiempo, setFiltroVentasTiempo] = useState<'hoy' | 'todas'>('hoy');
  const [busquedaVentasHist, setBusquedaVentasHist] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // 2. Datos Generales
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cajaActual, setCajaActual] = useState<SesionCaja | null>(null);
  const [historialCierres, setHistorialCierres] = useState<any[]>([]);

  // 3. Notificaciones Visuales Integradas (Cero alert popup)
  const [notificaciones, setNotificaciones] = useState<NotificacionVisual[]>([]);

  const mostrarNotificacion = (tipo: 'exito' | 'error' | 'advertencia' | 'info', mensaje: string) => {
    const id = Date.now() + Math.random();
    setNotificaciones(prev => [...prev.slice(-3), { id, tipo, mensaje }]);
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // 4. Modales de Confirmación In-App (Cero window.confirm o window.prompt)
  const [gastoAEliminar, setGastoAEliminar] = useState<Gasto | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);
  const [motivoAnulacionInput, setMotivoAnulacionInput] = useState('');

  // 5. Bloqueos de Seguridad contra Doble Clic
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [procesandoProducto, setProcesandoProducto] = useState(false);
  const [procesandoGasto, setProcesandoGasto] = useState(false);
  const [procesandoCliente, setProcesandoCliente] = useState(false);
  const [procesandoCaja, setProcesandoCaja] = useState(false);
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

  // 6. Estado de Caja
  const [montoAperturaInput, setMontoAperturaInput] = useState('');
  const [modalCierreCaja, setModalCierreCaja] = useState(false);
  const [dineroRealContado, setDineroRealContado] = useState('');
  const [obsCierre, setObsCierre] = useState('');
  const [comprobanteCierreData, setComprobanteCierreData] = useState<any | null>(null);

  // 7. POS (Punto de Venta) y Paginación
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState<'efectivo' | 'transferencia'>('efectivo');

  // Cliente Opcional en POS
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busquedaClientePOS, setBusquedaClientePOS] = useState('');

  // 8. Ticket de Venta
  const [ticketVentaData, setTicketVentaData] = useState<any | null>(null);

  // 9. Inventario y Calculador Automático de Precios por Margen % e IVA
  const [modalProd, setModalProd] = useState(false);
  const [editandoProdId, setEditandoProdId] = useState<number | null>(null);
  const [prodNombre, setProdNombre] = useState('');
  const [prodCategoria, setProdCategoria] = useState('Purinas y Concentrados');
  const [prodCosto, setProdCosto] = useState('');
  const [prodMargenDeseado, setProdMargenDeseado] = useState('20');
  const [prodMargenMayorista, setProdMargenMayorista] = useState('12');
  const [prodPrecioDetal, setProdPrecioDetal] = useState('');
  const [prodPrecioMayor, setProdPrecioMayor] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodStockMin, setProdStockMin] = useState('5');
  const [prodIva, setProdIva] = useState('0');
  const [prodUnidad, setProdUnidad] = useState('bulto');
  const [modoCostoLote, setModoCostoLote] = useState(false);
  const [costoTotalLoteInput, setCostoTotalLoteInput] = useState('');

  // Funciones de cálculo dinámico de precios por margen e IVA
  const recalcularPrecios = (costoVal: string, margenDVal: string, margenMVal: string, ivaVal: string) => {
    const c = Number(costoVal) || 0;
    const mD = Number(margenDVal) || 0;
    const mM = Number(margenMVal) || 0;
    const iv = Number(ivaVal) || 0;
    if (c > 0) {
      const baseDetal = c * (1 + mD / 100);
      const precioDetalConIva = Math.round(baseDetal * (1 + iv / 100));
      setProdPrecioDetal(String(precioDetalConIva));

      const baseMayor = c * (1 + mM / 100);
      const precioMayorConIva = Math.round(baseMayor * (1 + iv / 100));
      setProdPrecioMayor(String(precioMayorConIva));
    }
  };

  const handleCostoChange = (val: string) => {
    setProdCosto(val);
    recalcularPrecios(val, prodMargenDeseado, prodMargenMayorista, prodIva);
  };

  const handleMargenDetalChange = (val: string) => {
    setProdMargenDeseado(val);
    recalcularPrecios(prodCosto, val, prodMargenMayorista, prodIva);
  };

  const handleMargenMayorChange = (val: string) => {
    setProdMargenMayorista(val);
    recalcularPrecios(prodCosto, prodMargenDeseado, val, prodIva);
  };

  const handleIvaChange = (val: string) => {
    setProdIva(val);
    recalcularPrecios(prodCosto, prodMargenDeseado, prodMargenMayorista, val);
  };

  // 10. Clientes Formulario / Edición
  const [modalCliente, setModalCliente] = useState(false);
  const [editandoClienteId, setEditandoClienteId] = useState<number | null>(null);
  const [cliDoc, setCliDoc] = useState('');
  const [cliNombre, setCliNombre] = useState('');
  const [cliTel, setCliTel] = useState('');
  const [cliDir, setCliDir] = useState('');

  // 11. Gastos Formulario / Edición (Solo Admin)
  const [modalGasto, setModalGasto] = useState(false);
  const [editandoGastoId, setEditandoGastoId] = useState<number | null>(null);
  const [gastoCat, setGastoCat] = useState('arriendo');
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');

  // 12. Modal Alertas de Stock y Motivo Anulación
  const [telefonoAdmin, setTelefonoAdmin] = useState('3101234567');
  const [modalAlertasStock, setModalAlertasStock] = useState(false);
  const [ventaVerMotivo, setVentaVerMotivo] = useState<Venta | null>(null);

  // ==========================================
  // INICIALIZACIÓN Y PERSISTENCIA (F5 / RECARGA)
  // ==========================================
  useEffect(() => {
    // 1. Restaurar sesión de Supabase Auth (el perfil y rol se leen de la tabla 'usuarios')
    localStorage.removeItem('dyms_usuario');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user.email) {
        const u = await cargarPerfilUsuario(session.user.email);
        if (u) {
          setUsuario(u);
        } else {
          await supabase.auth.signOut();
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUsuario(null);
        setCarrito([]);
      }
    });
    // 2. Teléfono Admin
    const telGuardado = localStorage.getItem('dyms_tel_admin');
    if (telGuardado) {
      setTelefonoAdmin(telGuardado);
    }
    return () => subscription.unsubscribe();
  }, []);

  const cargarDatosGenerales = async () => {
    setLoading(true);
    try {
      // 1. Cargar Productos
      const { data: prods, error: errProds } = await supabase.from('productos').select('*').order('nombre', { ascending: true });
      if (errProds) {
        mostrarNotificacion('error', 'No se pudieron cargar los productos: ' + errProds.message);
      }
      setProductos((prods || []).map(p => ({
        ...p,
        categoria: normalizarCategoria(p.categoria),
        precio_mayorista: p.precio_mayorista || p.precio_venta * 0.95,
        iva_porcentaje: p.iva_porcentaje || 0,
        unidad_medida: p.unidad_medida || 'bulto'
      })));

      // 2. Cargar Ventas
      const { data: vts } = await supabase.from('ventas').select('*').order('fecha', { ascending: false });
      if (vts) {
        setVentas(vts.map(v => {
          const esAnulada = (v.estado_pago && v.estado_pago.toLowerCase().startsWith('anulada')) || v.estado === 'anulada';
          let motivo = v.motivo_anulacion || '';
          if (!motivo && v.estado_pago && v.estado_pago.includes(':')) {
            motivo = v.estado_pago.split(':')[1]?.trim() || '';
          }
          return {
            ...v,
            estado: esAnulada ? 'anulada' : 'completada',
            motivo_anulacion: motivo,
            subtotal: v.subtotal || v.total_venta,
            iva_total: v.iva_total || 0,
            tipo_precio: v.tipo_precio || 'detal'
          };
        }));
      }

      // 3. Cargar Gastos
      const { data: gts } = await supabase.from('gastos').select('*').order('fecha', { ascending: false });
      if (gts) setGastos(gts);

      // 4. Cargar Clientes (con respaldo localStorage)
      const { data: clis, error: errClis } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
      const clisLocalStr = localStorage.getItem('dyms_clientes');
      const clisLocal: Cliente[] = clisLocalStr ? JSON.parse(clisLocalStr) : [];
      if (clis && clis.length > 0) {
        setClientes(clis);
        localStorage.setItem('dyms_clientes', JSON.stringify(clis));
      } else if (errClis && clisLocal.length > 0) {
        // Solo lectura sin conexión: nunca se re-suben a la nube (evita duplicados)
        setClientes(clisLocal);
      } else {
        setClientes([]);
      }

      // 5. PERSISTENCIA DE CAJA: No cerrar en recarga (F5)
      const { data: cj } = await supabase.from('caja').select('*').order('id', { ascending: false }).limit(1);
      const cajaGuardadaLocal = localStorage.getItem('dyms_caja_activa');

      if (cj && cj.length > 0 && cj[0].estado === 'abierta') {
        const sesionAbierta: SesionCaja = {
          id: cj[0].id,
          fecha: cj[0].fecha,
          monto_inicial: Number(cj[0].monto_inicial || 0),
          estado: 'abierta',
          usuario_apertura: 'Admin/Vendedor',
          created_at: cj[0].created_at
        };
        setCajaActual(sesionAbierta);
        localStorage.setItem('dyms_caja_activa', JSON.stringify(sesionAbierta));
      } else if (cajaGuardadaLocal) {
        try {
          const parsed = JSON.parse(cajaGuardadaLocal);
          if (parsed && parsed.estado === 'abierta') {
            setCajaActual(parsed);
          } else {
            setCajaActual(null);
          }
        } catch {
          setCajaActual(null);
        }
      } else {
        setCajaActual(null);
      }

      // 6. Historial Cierres
      const { data: cierres } = await supabase.from('cierres_caja').select('*').order('hora_cierre', { ascending: false });
      const cierresLocal = localStorage.getItem('dyms_cierres');
      if (cierres && cierres.length > 0) {
        setHistorialCierres(cierres);
      } else if (cierresLocal) {
        try { setHistorialCierres(JSON.parse(cierresLocal)); } catch {}
      }

    } catch (e) {
      console.error('Error cargando datos de Supabase:', e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Cargar Datos Globales solo con sesión iniciada (RLS bloquea a usuarios anónimos)
  useEffect(() => {
    if (usuario) cargarDatosGenerales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.email]);

  // Helper para identificar si una venta fue Al Detal o Al por Mayor
  const determinarTipoPrecioVenta = (v: Venta): 'detal' | 'mayorista' => {
    if (v.tipo_precio === 'mayorista' || v.tipo_precio === 'mayor') return 'mayorista';
    if (v.tipo_precio === 'detal') return 'detal';
    if (v.estado_pago && v.estado_pago.toLowerCase().includes('mayorista')) return 'mayorista';
    if (v.estado_pago && v.estado_pago.toLowerCase().includes('detal')) return 'detal';
    const prod = productos.find(p => p.id === v.producto_id || p.nombre.trim().toLowerCase() === v.nombre_producto.trim().toLowerCase());
    if (prod && prod.precio_mayorista && prod.precio_venta && prod.precio_mayorista !== prod.precio_venta) {
      const difMayor = Math.abs(v.precio_unitario - prod.precio_mayorista);
      const difDetal = Math.abs(v.precio_unitario - prod.precio_venta);
      if (difMayor < difDetal) return 'mayorista';
    }
    if (prod && v.precio_unitario < prod.precio_venta) return 'mayorista';
    return 'detal';
  };

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);

    const emailNorm = loginEmail.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailNorm, password: loginPass });
      if (error) {
        setLoginError('Credenciales incorrectas. Verifica tu correo y contraseña.');
        return;
      }

      const u = await cargarPerfilUsuario(emailNorm);
      if (!u) {
        await supabase.auth.signOut();
        setLoginError('Tu cuenta no tiene un rol asignado en DYM’S. Contacta al administrador.');
        return;
      }

      setUsuario(u);
      setLoginPass('');
      mostrarNotificacion('exito', `¡Bienvenido ${u.nombre}!`);
    } catch {
      setLoginError('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setCarrito([]);
    mostrarNotificacion('info', 'Has cerrado tu sesión.');
  };

  // ==========================================
  // 1. CÁLCULOS DE CAJA Y DINERO DISPONIBLE
  // ==========================================
  const totalVentasEfectivoHoy = useMemo(() => {
    return ventas
      .filter(v => esVentaDeHoy(v.fecha) && v.estado !== 'anulada' && v.metodo_pago === 'efectivo')
      .reduce((acc, v) => acc + (Number(v.total_venta) || 0), 0);
  }, [ventas]);

  const totalVentasTransfHoy = useMemo(() => {
    return ventas
      .filter(v => esVentaDeHoy(v.fecha) && v.estado !== 'anulada' && v.metodo_pago === 'transferencia')
      .reduce((acc, v) => acc + (Number(v.total_venta) || 0), 0);
  }, [ventas]);

  const totalGastosHoy = useMemo(() => {
    return gastos
      .filter(g => esVentaDeHoy(g.fecha))
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  }, [gastos]);

  // Efectivo físico real en gaveta (Base + Ventas Efectivo - Gastos)
  const efectivoFisicoEnCaja = useMemo(() => {
    const base = cajaActual && cajaActual.estado === 'abierta' ? cajaActual.monto_inicial : 0;
    return base + totalVentasEfectivoHoy - totalGastosHoy;
  }, [cajaActual, totalVentasEfectivoHoy, totalGastosHoy]);

  // Total disponible en caja: Efectivo + Transferencias (Utilizado para validar operaciones)
  const dineroTotalDisponibleEnCaja = useMemo(() => {
    const base = cajaActual && cajaActual.estado === 'abierta' ? cajaActual.monto_inicial : 0;
    return base + totalVentasEfectivoHoy + totalVentasTransfHoy - totalGastosHoy;
  }, [cajaActual, totalVentasEfectivoHoy, totalVentasTransfHoy, totalGastosHoy]);

  // Inversión Total en Inventario
  const valorTotalInversion = useMemo(() => {
    return productos.reduce((acc, p) => acc + (p.stock * p.precio_compra), 0);
  }, [productos]);

  // Apertura de Caja
  const handleAperturaCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesandoCaja) return;
    const monto = Number(montoAperturaInput);
    if (isNaN(monto) || monto < 0) {
      mostrarNotificacion('advertencia', 'Ingresa un monto inicial válido (mayor o igual a $0).');
      return;
    }

    setProcesandoCaja(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const nuevaCajaDB = {
        fecha: hoy,
        monto_inicial: monto,
        estado: 'abierta'
      };

      const { data, error } = await supabase.from('caja').insert([nuevaCajaDB]).select().single();
      if (error || !data) throw new Error(error?.message || 'Sin respuesta del servidor');
      const sesionAbierta: SesionCaja = {
        id: data.id,
        fecha: hoy,
        monto_inicial: monto,
        estado: 'abierta',
        usuario_apertura: usuario?.nombre || 'Admin',
        created_at: new Date().toISOString()
      };

      setCajaActual(sesionAbierta);
      localStorage.setItem('dyms_caja_activa', JSON.stringify(sesionAbierta));
      setMontoAperturaInput('');
      mostrarNotificacion('exito', '¡Caja abierta exitosamente para la jornada!');
    } catch (err: any) {
      mostrarNotificacion('error', 'Error abriendo caja: ' + err.message);
    } finally {
      setProcesandoCaja(false);
    }
  };

  // Cierre Diario de Caja con Validaciones Estrictas
  const handleConfirmarCierreCaja = async () => {
    if (!cajaActual || cajaActual.estado !== 'abierta' || procesandoCaja) return;
    const real = Number(dineroRealContado);
    if (isNaN(real) || real < 0) {
      mostrarNotificacion('advertencia', 'Ingresa el monto de dinero físico contado en caja.');
      return;
    }

    // 19.1 No permitir caja negativa
    if (efectivoFisicoEnCaja < 0 || dineroTotalDisponibleEnCaja < 0) {
      mostrarNotificacion('error', '❌ NO SE PERMITE CERRAR CAJA EN NEGATIVO. Debes corregir los egresos o cuadrar los ingresos antes de cerrar.');
      return;
    }

    // Descuadre de caja contra el dinero físico esperado
    const dif = real - efectivoFisicoEnCaja;

    // 19.2 Alerta clara de descuadre
    if (dif < 0) {
      mostrarNotificacion('advertencia', `⚠️ Se detectó un faltante de dinero en caja correspondiente al vendedor: ${formatoMoneda(Math.abs(dif))}. Esperado: ${formatoMoneda(efectivoFisicoEnCaja)} vs Real: ${formatoMoneda(real)}.`);
    } else if (dif > 0) {
      mostrarNotificacion('info', `ℹ️ Se detectó un sobrante de dinero en caja de: +${formatoMoneda(dif)}.`);
    }

    setProcesandoCaja(true);
    const datosCierre = {
      fecha: cajaActual.fecha,
      monto_inicial: cajaActual.monto_inicial,
      ventas_efectivo: totalVentasEfectivoHoy,
      ventas_transferencia: totalVentasTransfHoy,
      total_gastos: totalGastosHoy,
      dinero_esperado: efectivoFisicoEnCaja,
      dinero_real: real,
      diferencia: dif,
      observaciones: obsCierre.trim() || 'Cierre de jornada regular',
      responsable: usuario?.nombre || 'Admin',
      hora_cierre: new Date().toISOString()
    };

    const { error: errCierre } = await supabase.from('cierres_caja').insert([datosCierre]);
    const { error: errCaja } = errCierre
      ? { error: null }
      : await supabase.from('caja').update({ estado: 'cerrada', monto_cierre: real }).eq('id', cajaActual.id);
    if (errCierre || errCaja) {
      mostrarNotificacion('error', 'No se pudo cerrar la caja: ' + (errCierre || errCaja)?.message);
      setProcesandoCaja(false);
      return;
    }

    setCajaActual(prev => prev ? { ...prev, estado: 'cerrada' } : null);
    localStorage.removeItem('dyms_caja_activa');

    const nuevosCierres = [datosCierre, ...historialCierres];
    setHistorialCierres(nuevosCierres);
    localStorage.setItem('dyms_cierres', JSON.stringify(nuevosCierres));

    setComprobanteCierreData(datosCierre);
    setModalCierreCaja(false);
    setDineroRealContado('');
    setObsCierre('');
    setProcesandoCaja(false);
    mostrarNotificacion('exito', '¡Caja cerrada correctamente! Comprobante emitido.');
  };

  // ==========================================
  // 5. VENTAS POS & CARRITO
  // ==========================================
  // Venta al Detal y Mayorista (misma referencia compartida)
  const agregarAlCarrito = (prod: Producto, tipoPrecio: 'detal' | 'mayorista') => {
    if (!cajaActual || cajaActual.estado !== 'abierta') {
      mostrarNotificacion('advertencia', '⚠️ Caja Cerrada: Debes abrir la caja para poder facturar.');
      return;
    }

    const totalEnCarritoMismaReferencia = carrito
      .filter(i => i.producto.id === prod.id)
      .reduce((sum, i) => sum + i.cantidad, 0);

    if (totalEnCarritoMismaReferencia + 1 > prod.stock) {
      mostrarNotificacion('error', `Existencias insuficientes: Solo hay ${prod.stock} unidades disponibles en inventario.`);
      return;
    }

    const precio = tipoPrecio === 'mayorista' ? prod.precio_mayorista : prod.precio_venta;
    const ivaMonto = (precio * (prod.iva_porcentaje || 0)) / 100;

    const itemExistente = carrito.find(i => i.producto.id === prod.id && i.tipo_precio === tipoPrecio);

    if (itemExistente) {
      setCarrito(prev => prev.map(i => {
        if (i.producto.id === prod.id && i.tipo_precio === tipoPrecio) {
          const nuevaCant = i.cantidad + 1;
          const sub = nuevaCant * precio;
          const iva = (sub * (prod.iva_porcentaje || 0)) / 100;
          return { ...i, cantidad: nuevaCant, subtotal: sub, iva_monto: iva, total: sub + iva };
        }
        return i;
      }));
    } else {
      const sub = precio;
      setCarrito(prev => [...prev, {
        producto: prod,
        cantidad: 1,
        tipo_precio: tipoPrecio,
        precio_aplicado: precio,
        subtotal: sub,
        iva_monto: ivaMonto,
        total: sub + ivaMonto
      }]);
    }
  };

  const modificarCantidadCarrito = (idx: number, delta: number) => {
    setCarrito(prev => {
      const item = prev[idx];
      const nueva = item.cantidad + delta;
      if (nueva <= 0) {
        return prev.filter((_, i) => i !== idx);
      }

      const otrasCantidades = prev
        .filter((it, i) => i !== idx && it.producto.id === item.producto.id)
        .reduce((sum, it) => sum + it.cantidad, 0);

      if (nueva + otrasCantidades > item.producto.stock) {
        mostrarNotificacion('advertencia', `Existencias máximas disponibles: ${item.producto.stock}`);
        return prev;
      }

      const sub = nueva * item.precio_aplicado;
      const iva = (sub * (item.producto.iva_porcentaje || 0)) / 100;
      const act = { ...item, cantidad: nueva, subtotal: sub, iva_monto: iva, total: sub + iva };
      return prev.map((it, i) => i === idx ? act : it);
    });
  };

  const eliminarDelCarrito = (idx: number) => {
    setCarrito(prev => prev.filter((_, i) => i !== idx));
  };

  const totalesCarrito = useMemo(() => {
    const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
    const iva = carrito.reduce((acc, i) => acc + i.iva_monto, 0);
    const total = carrito.reduce((acc, i) => acc + i.total, 0);
    const costo = carrito.reduce((acc, i) => acc + (i.cantidad * i.producto.precio_compra), 0);
    const ganancia = total - costo;
    return { subtotal, iva, total, costo, ganancia };
  }, [carrito]);

  // PROCESAR VENTA ATÓMICA
  const handleProcesarVenta = async () => {
    if (procesandoVenta) return;

    if (!cajaActual || cajaActual.estado !== 'abierta') {
      mostrarNotificacion('advertencia', '⚠️ Caja Cerrada: Debes abrir la caja para poder facturar.');
      return;
    }

    if (carrito.length === 0) {
      mostrarNotificacion('advertencia', 'El carrito de compras está vacío.');
      return;
    }

    setProcesandoVenta(true);

    const clienteNombreFinal = clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente General';
    const clienteDocFinal = clienteSeleccionado ? clienteSeleccionado.documento : 'C.C.';
    const clienteTelFinal = clienteSeleccionado ? clienteSeleccionado.telefono : '';

    const stockADescontarPorProducto = new Map<number, number>();
    carrito.forEach(i => {
      stockADescontarPorProducto.set(i.producto.id, (stockADescontarPorProducto.get(i.producto.id) || 0) + i.cantidad);
    });

    try {
      // Venta atómica en la base de datos: registra todas las líneas y descuenta stock
      // en una sola transacción (función registrar_venta, ver supabase/migrations)
      const { data: ventasDB, error } = await supabase.rpc('registrar_venta', {
        p_items: carrito.map(i => ({ producto_id: i.producto.id, cantidad: i.cantidad, tipo_precio: i.tipo_precio })),
        p_metodo_pago: metodoPagoPOS,
        p_cliente_nombre: clienteNombreFinal
      });
      if (error) {
        console.error('Error registrando venta en Supabase:', error);
        throw new Error(error.message);
      }

      const filasDB: Venta[] = ventasDB || [];
      const nuevasVentas: Venta[] = filasDB.map((data, idx) => {
        const item = carrito[idx];
        return {
          ...data,
          cliente_documento: clienteDocFinal,
          tipo_precio: item?.tipo_precio,
          subtotal: item?.subtotal,
          iva_total: item?.iva_monto,
          estado: 'completada'
        };
      });

      // Stock real tras la venta (lo descontó la base de datos)
      const idsVendidos = Array.from(stockADescontarPorProducto.keys());
      const { data: stocks } = await supabase.from('productos').select('id, stock').in('id', idsVendidos);

      setVentas(prev => [...nuevasVentas, ...prev]);
      setProductos(prev => prev.map(p => {
        const real = stocks?.find(s => s.id === p.id);
        if (real) return { ...p, stock: real.stock };
        const descuento = stockADescontarPorProducto.get(p.id);
        return descuento ? { ...p, stock: Math.max(0, p.stock - descuento) } : p;
      }));

      const ticket = {
        numero: Math.floor(100000 + Math.random() * 900000),
        fecha: new Date().toLocaleString(),
        cliente: clienteNombreFinal,
        documento: clienteDocFinal,
        telefono: clienteTelFinal,
        esClienteRegistrado: !!clienteSeleccionado,
        items: [...carrito],
        subtotal: totalesCarrito.subtotal,
        iva: totalesCarrito.iva,
        total: totalesCarrito.total,
        metodo: metodoPagoPOS,
        vendedor: usuario?.nombre || 'Vendedor'
      };

      setTicketVentaData(ticket);
      setCarrito([]);
      setClienteSeleccionado(null);
      setBusquedaClientePOS('');
      mostrarNotificacion('exito', '¡Venta registrada y descontada del inventario exitosamente!');
    } catch (err: any) {
      mostrarNotificacion('error', 'Error al procesar la venta: ' + err.message);
    } finally {
      setProcesandoVenta(false);
    }
  };

  // ==========================================
  // 13 & 20. ANULACIÓN DE VENTAS IN-APP (SIN PROMPT)
  // ==========================================
  const handleIniciarAnulacion = (venta: Venta) => {
    if (venta.estado === 'anulada') {
      mostrarNotificacion('advertencia', 'Esta venta ya se encuentra anulada.');
      return;
    }
    setVentaAAnular(venta);
    setMotivoAnulacionInput('Devolución de cliente');
  };

  const handleConfirmarAnulacion = async () => {
    if (!ventaAAnular || procesandoAnulacion) return;

    const motivoLimpio = motivoAnulacionInput.trim().slice(0, 40);
    if (!motivoLimpio) {
      mostrarNotificacion('advertencia', 'El motivo de anulación es obligatorio (máx 40 caracteres).');
      return;
    }

    setProcesandoAnulacion(true);
    try {
      // Anulación atómica en la base de datos: marca la venta y devuelve el stock
      const { error } = await supabase.rpc('anular_venta', { p_venta_id: ventaAAnular.id, p_motivo: motivoLimpio });
      if (error) throw new Error(error.message);

      const prodRelacionado = productos.find(p => p.id === ventaAAnular.producto_id || p.nombre === ventaAAnular.nombre_producto);
      if (prodRelacionado) {
        const { data: real } = await supabase.from('productos').select('stock').eq('id', prodRelacionado.id).maybeSingle();
        const nuevoStock = real ? real.stock : prodRelacionado.stock + ventaAAnular.cantidad;
        setProductos(prev => prev.map(p => p.id === prodRelacionado.id ? { ...p, stock: nuevoStock } : p));
      }

      const textoEstado = `anulada: ${motivoLimpio}`;

      const ventaActualizada: Venta = {
        ...ventaAAnular,
        estado: 'anulada',
        estado_pago: textoEstado,
        motivo_anulacion: motivoLimpio
      };

      setVentas(prev => prev.map(v => v.id === ventaAAnular.id ? ventaActualizada : v));
      mostrarNotificacion('exito', `Venta #${ventaAAnular.id} anulada. Se devolvieron +${ventaAAnular.cantidad} unidades al inventario.`);
      setVentaAAnular(null);
      setMotivoAnulacionInput('');
    } catch (err: any) {
      mostrarNotificacion('error', 'Error anulando venta: ' + err.message);
    } finally {
      setProcesandoAnulacion(false);
    }
  };

  // ==========================================
  // 14 & 21. PRODUCTOS (CALCULADOR PORCENTUAL Y MANUAL)
  // ==========================================
  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesandoProducto) return;

    if (usuario?.rol !== 'admin') {
      mostrarNotificacion('error', 'Solo el Administrador tiene permiso para crear o editar productos.');
      return;
    }

    const c = Number(prodCosto);
    const pD = Number(prodPrecioDetal);
    const pM = Number(prodPrecioMayor);
    const st = Number(prodStock);
    const stM = Number(prodStockMin);
    const iv = Number(prodIva);

    if (!prodNombre.trim()) {
      mostrarNotificacion('advertencia', 'El nombre del producto es obligatorio.');
      return;
    }

    if (pD < c) {
      mostrarNotificacion('error', `El precio de venta detal (${formatoMoneda(pD)}) no puede ser menor que el costo de compra (${formatoMoneda(c)}).`);
      return;
    }

    if (st < 0 || isNaN(st)) {
      mostrarNotificacion('error', 'El stock de existencias no puede ser negativo.');
      return;
    }

    if (stM < 0 || isNaN(stM)) {
      mostrarNotificacion('error', 'El stock mínimo no puede ser negativo.');
      return;
    }

    setProcesandoProducto(true);

    const prodData = {
      nombre: prodNombre.trim(),
      categoria: prodCategoria,
      precio_compra: c,
      precio_venta: pD,
      precio_mayorista: pM || pD * 0.95,
      iva_porcentaje: iv || 0,
      stock: st,
      stock_minimo: stM,
      unidad_medida: prodUnidad
    };

    try {
      if (editandoProdId) {
        const { error } = await supabase.from('productos').update(prodData).eq('id', editandoProdId);
        if (error) throw new Error(error.message);
        setProductos(prev => prev.map(p => p.id === editandoProdId ? { ...prodData, id: editandoProdId } : p));
        mostrarNotificacion('exito', '¡Producto actualizado correctamente!');
      } else {
        const { data, error } = await supabase.from('productos').insert([prodData]).select().single();
        if (error || !data) throw new Error(error?.message || 'Sin respuesta del servidor');
        setProductos(prev => [...prev, data]);
        mostrarNotificacion('exito', '¡Nuevo producto registrado en DYM’S!');
      }

      setModalProd(false);
      setEditandoProdId(null);
      setProdNombre('');
      setProdCosto('');
      setProdPrecioDetal('');
      setProdPrecioMayor('');
      setProdStock('');
    } catch (err: any) {
      mostrarNotificacion('error', 'Error al guardar producto: ' + err.message);
    } finally {
      setProcesandoProducto(false);
    }
  };

  const handleConfirmarEliminarProducto = async (id: number) => {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) {
      mostrarNotificacion('error', 'No se pudo eliminar el producto: ' + error.message);
      setProductoAEliminar(null);
      return;
    }
    setProductos(prev => prev.filter(p => p.id !== id));
    setCarrito(prev => prev.filter(i => i.producto.id !== id));
    setProductoAEliminar(null);
    mostrarNotificacion('exito', 'Producto eliminado del inventario correctamente.');
  };

  // ==========================================
  // 16. CLIENTES: CONSULTAR, EDITAR, ELIMINAR Y GUARDAR
  // ==========================================
  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesandoCliente) return;

    if (!cliDoc.trim() || !cliNombre.trim()) {
      mostrarNotificacion('advertencia', 'Documento y Nombre son campos obligatorios.');
      return;
    }

    setProcesandoCliente(true);
    const nuevoClienteData = {
      documento: cliDoc.trim(),
      nombre: cliNombre.trim(),
      telefono: cliTel.trim(),
      direccion: cliDir.trim()
    };

    try {
      if (editandoClienteId) {
        const { error } = await supabase.from('clientes').update(nuevoClienteData).eq('id', editandoClienteId);
        if (error) throw new Error(error.message);
        mostrarNotificacion('exito', '¡Cliente actualizado con éxito!');

        const actualizados = clientes.map(c => c.id === editandoClienteId ? { ...nuevoClienteData, id: editandoClienteId } : c);
        setClientes(actualizados);
        localStorage.setItem('dyms_clientes', JSON.stringify(actualizados));
      } else {
        const { data, error } = await supabase.from('clientes').insert([nuevoClienteData]).select().single();
        if (error || !data) throw new Error(error?.message || 'Sin respuesta del servidor');
        mostrarNotificacion('exito', '¡Cliente registrado y sincronizado en Supabase!');

        const nuevos = [...clientes, { ...nuevoClienteData, id: data.id }];
        setClientes(nuevos);
        localStorage.setItem('dyms_clientes', JSON.stringify(nuevos));
      }

      setCliDoc('');
      setCliNombre('');
      setCliTel('');
      setCliDir('');
      setEditandoClienteId(null);
      setModalCliente(false);
    } catch (err: any) {
      mostrarNotificacion('error', 'Error con cliente: ' + err.message);
    } finally {
      setProcesandoCliente(false);
    }
  };

  const handleConfirmarEliminarCliente = async (id: number) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) {
      mostrarNotificacion('error', 'No se pudo eliminar el cliente: ' + error.message);
      setClienteAEliminar(null);
      return;
    }
    mostrarNotificacion('exito', 'Cliente eliminado del directorio con éxito.');

    const actualizados = clientes.filter(c => c.id !== id);
    setClientes(actualizados);
    localStorage.setItem('dyms_clientes', JSON.stringify(actualizados));
    if (clienteSeleccionado?.id === id) {
      setClienteSeleccionado(null);
    }
    setClienteAEliminar(null);
  };

  // ==========================================
  // 17. GASTOS: MODIFICAR Y ELIMINAR IN-APP (SIN CONFIRM)
  // ==========================================
  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesandoGasto) return;

    if (usuario?.rol !== 'admin') {
      mostrarNotificacion('error', 'Solo el Administrador tiene autorización para registrar o modificar gastos.');
      return;
    }

    const m = Number(gastoMonto);
    if (!gastoDesc.trim() || isNaN(m) || m <= 0) {
      mostrarNotificacion('advertencia', 'Ingresa una descripción y monto válido.');
      return;
    }

    if (m > dineroTotalDisponibleEnCaja) {
      mostrarNotificacion('error', `Fondos insuficientes: El monto (${formatoMoneda(m)}) supera el total disponible en caja (${formatoMoneda(dineroTotalDisponibleEnCaja)}).`);
      return;
    }

    setProcesandoGasto(true);
    const nuevoGasto = {
      categoria: gastoCat,
      descripcion: gastoDesc.trim(),
      monto: m,
      fecha: new Date().toISOString()
    };

    try {
      if (editandoGastoId) {
        const { error } = await supabase.from('gastos').update(nuevoGasto).eq('id', editandoGastoId);
        if (error) throw new Error(error.message);
        setGastos(prev => prev.map(g => g.id === editandoGastoId ? { ...nuevoGasto, id: editandoGastoId } : g));
        mostrarNotificacion('exito', '¡Gasto operacional actualizado!');
      } else {
        const { data, error } = await supabase.from('gastos').insert([nuevoGasto]).select().single();
        if (error || !data) throw new Error(error?.message || 'Sin respuesta del servidor');
        setGastos(prev => [data, ...prev]);
        mostrarNotificacion('exito', '¡Gasto operacional registrado en caja!');
      }

      setGastoDesc('');
      setGastoMonto('');
      setEditandoGastoId(null);
      setModalGasto(false);
    } catch (err: any) {
      mostrarNotificacion('error', 'Error al procesar el gasto: ' + err.message);
    } finally {
      setProcesandoGasto(false);
    }
  };

  const handleIniciarEliminarGasto = (g: Gasto) => {
    if (usuario?.rol !== 'admin') {
      mostrarNotificacion('error', 'Solo el Administrador puede eliminar gastos.');
      return;
    }
    setGastoAEliminar(g);
  };

  const handleConfirmarEliminarGasto = async () => {
    if (!gastoAEliminar) return;
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', gastoAEliminar.id);
      if (error) throw new Error(error.message);
      setGastos(prev => prev.filter(g => g.id !== gastoAEliminar.id));
      mostrarNotificacion('exito', 'Gasto eliminado y restituido al saldo de caja.');
      setGastoAEliminar(null);
    } catch (err: any) {
      mostrarNotificacion('error', 'Error eliminando gasto: ' + err.message);
    }
  };

  // ==========================================
  // REPORTES EN EXCEL (.CSV UTF-8)
  // ==========================================
  const exportarVentasExcel = (soloHoy: boolean = false) => {
    const lista = soloHoy ? ventas.filter(v => esVentaDeHoy(v.fecha)) : ventas;
    if (lista.length === 0) {
      mostrarNotificacion('advertencia', 'No hay ventas para exportar.');
      return;
    }

    const encabezados = [
      'ID Venta', 'Fecha', 'Hora', 'Vendedor', 'Cliente', 'Documento', 'Producto', 'Modalidad',
      'Cantidad', 'Precio Unitario', 'Total Venta', 'Ganancia Estimada', 'Metodo Pago', 'Estado', 'Motivo Anulacion'
    ];

    const filas = lista.map(v => {
      const d = new Date(v.fecha);
      const mod = determinarTipoPrecioVenta(v) === 'mayorista' ? 'Al por Mayor' : 'Al Detal';
      return [
        v.id,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        `"${v.vendedor || 'Vendedor'}"`,
        `"${v.cliente_nombre || 'Cliente General'}"`,
        `"${v.cliente_documento || 'C.C.'}"`,
        `"${v.nombre_producto}"`,
        `"${mod}"`,
        v.cantidad,
        v.precio_unitario,
        v.total_venta,
        v.ganancia_bruta,
        `"${v.metodo_pago}"`,
        `"${v.estado || 'completada'}"`,
        `"${v.motivo_anulacion || ''}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ventas_DYMS_${soloHoy ? 'Hoy' : 'Historial'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarNotificacion('exito', 'Reporte Excel descargado correctamente.');
  };

  const exportarInventarioExcel = () => {
    if (productos.length === 0) {
      mostrarNotificacion('advertencia', 'No hay productos registrados en inventario.');
      return;
    }

    const encabezados = [
      'ID', 'Producto', 'Categoria', 'Unidad Medida', 'Costo Compra', 'Precio Detal',
      'Precio Mayorista', 'IVA (%)', 'Stock Actual', 'Stock Minimo', 'Valor Total en Bodega'
    ];

    const filas = productos.map(p => [
      p.id,
      `"${p.nombre}"`,
      `"${p.categoria}"`,
      `"${p.unidad_medida}"`,
      p.precio_compra,
      p.precio_venta,
      p.precio_mayorista,
      p.iva_porcentaje,
      p.stock,
      p.stock_minimo,
      p.stock * p.precio_compra
    ].join(';'));

    const csvContent = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventario_DYMS_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarNotificacion('exito', 'Inventario exportado a Excel.');
  };

  // ==========================================
  // WHATSAPP GENERADORES DIRECTOS
  // ==========================================
  const generarLinkWhatsAppCliente = (ticket: any) => {
    if (!ticket) return '#';
    const detalle = ticket.items.map((i: ItemCarrito) => 
      `• ${i.cantidad}x ${i.producto.nombre} (${i.tipo_precio}) = ${formatoMoneda(i.total)}`
    ).join('\n');

    const texto = 
`🌾 *DYM’S — COMPROBANTE DE VENTA* 🌾

Hola *${ticket.cliente}*, ¡muchas gracias por su compra! Aquí tiene el detalle de su factura:

📋 *Factura Nro:* ${ticket.numero}
📅 *Fecha:* ${ticket.fecha}
👤 *Atendido por:* ${ticket.vendedor}

📦 *Detalle de Productos:*
${detalle}

💵 *Subtotal:* ${formatoMoneda(ticket.subtotal)}
🧾 *IVA:* ${formatoMoneda(ticket.iva)}
💰 *TOTAL PAGADO:* ${formatoMoneda(ticket.total)}
💳 *Método de Pago:* ${ticket.metodo.toUpperCase()}

📍 *DYM’S — Nutrición y Producción Agropecuaria*
¡Esperamos atenderle de nuevo pronto! 🚜`;

    const num = ticket.telefono ? ticket.telefono.replace(/[^0-9]/g, '') : '';
    return num ? `https://wa.me/57${num}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  const generarLinkWhatsAppAdmin = (ticket: any) => {
    if (!ticket) return '#';
    const detalle = ticket.items.map((i: ItemCarrito) => 
      `• ${i.cantidad}x ${i.producto.nombre} = ${formatoMoneda(i.total)}`
    ).join('\n');

    const texto = 
`🔔 *ALERTA DE VENTA — DYM’S* 🔔

Se acaba de registrar una nueva venta en la plataforma:

👤 *Vendedor:* ${ticket.vendedor}
📅 *Fecha/Hora:* ${ticket.fecha}
🏷️ *Ticket Nro:* ${ticket.numero}

🛒 *Cliente:* ${ticket.cliente} (Doc: ${ticket.documento})
${ticket.telefono ? `📞 *Tel:* ${ticket.telefono}` : ''}

📦 *Productos Vendidos:*
${detalle}

💰 *TOTAL COBRADO:* ${formatoMoneda(ticket.total)}
💳 *Forma de Pago:* ${ticket.metodo.toUpperCase()}

✅ _Inventario y caja actualizados automáticamente._`;

    const numAdmin = telefonoAdmin.replace(/[^0-9]/g, '');
    return numAdmin ? `https://wa.me/57${numAdmin}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  // Reconstruye el ticket de una venta guardada (Reportes)
  const verTicketDeVenta = (v: Venta) => {
    setTicketVentaData({
      numero: v.id,
      fecha: new Date(v.fecha).toLocaleString(),
      cliente: v.cliente_nombre,
      documento: v.cliente_documento || 'C.C.',
      telefono: '',
      esClienteRegistrado: v.cliente_nombre !== 'Cliente General',
      items: [{
        producto: { nombre: v.nombre_producto, precio_venta: v.precio_unitario, precio_compra: v.costo_unitario, categoria: '' },
        cantidad: v.cantidad,
        tipo_precio: determinarTipoPrecioVenta(v),
        precio_aplicado: v.precio_unitario,
        subtotal: v.total_venta,
        iva_monto: 0,
        total: v.total_venta
      }],
      subtotal: v.total_venta,
      iva: 0,
      total: v.total_venta,
      metodo: v.metodo_pago,
      vendedor: v.vendedor
    });
  };

  // Formulario de producto: nuevo o edición (Inventario y alertas de stock)
  const abrirNuevoProducto = () => {
    setEditandoProdId(null);
    setProdNombre('');
    setProdCosto('');
    setProdMargenDeseado('20');
    setProdMargenMayorista('12');
    setProdPrecioDetal('');
    setProdPrecioMayor('');
    setProdStock('');
    setModalProd(true);
  };

  const abrirEdicionProducto = (p: Producto) => {
    setEditandoProdId(p.id);
    setProdNombre(p.nombre);
    setProdCategoria(p.categoria);
    setProdCosto(String(p.precio_compra));
    const mD = p.precio_compra > 0 ? Math.round(((p.precio_venta - p.precio_compra) / p.precio_compra) * 100) : 20;
    const mM = p.precio_compra > 0 ? Math.round(((p.precio_mayorista - p.precio_compra) / p.precio_compra) * 100) : 12;
    setProdMargenDeseado(String(mD));
    setProdMargenMayorista(String(mM));
    setProdPrecioDetal(String(p.precio_venta));
    setProdPrecioMayor(String(p.precio_mayorista));
    setProdStock(String(p.stock));
    setProdStockMin(String(p.stock_minimo));
    setProdIva(String(p.iva_porcentaje));
    setProdUnidad(p.unidad_medida);
    setModalProd(true);
  };

  // ==========================================
  // PANTALLA DE LOGIN (src/features/auth/LoginScreen.tsx)
  // ==========================================
  if (!usuario) {
    return (
      <LoginScreen
        email={loginEmail}
        password={loginPass}
        error={loginError}
        cargando={loadingLogin}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPass}
        onSubmit={handleLogin}
      />
    );
  }

  // ==========================================
  // VISTA PRINCIPAL CON NAVEGACIÓN
  // ==========================================
  const stockBajo = productos.filter(p => p.stock <= p.stock_minimo).length;
  const cajaAbierta = cajaActual?.estado === 'abierta';

  return (
    <div className="min-h-dvh bg-papel text-tinta lg:flex">
      {/* Notificaciones flotantes */}
      <Toasts
        notificaciones={notificaciones}
        onCerrar={(id) => setNotificaciones(prev => prev.filter(item => item.id !== id))}
      />

      {/* Menú lateral (escritorio) */}
      <Sidebar
        moduloActivo={moduloActivo}
        onCambiar={setModuloActivo}
        usuario={usuario}
        onSalir={handleLogout}
        stockBajo={stockBajo}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior e inferior (celular y tablet) */}
        <MobileNav
          moduloActivo={moduloActivo}
          onCambiar={setModuloActivo}
          usuario={usuario}
          onSalir={handleLogout}
          stockBajo={stockBajo}
          cajaAbierta={cajaAbierta}
        />

        {/* Aviso de caja cerrada */}
        {!cajaAbierta && <CajaCerradaBanner onAbrir={() => setModuloActivo('caja')} />}

      {/* CONTENIDO PRINCIPAL */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">
        {moduloActivo === 'dashboard' && (
          <DashboardView
            nombreUsuario={usuario.nombre}
            cajaAbierta={cajaAbierta}
            ventas={ventas}
            ventasHoy={ventas.filter(v => esVentaDeHoy(v.fecha))}
            productos={productos}
            totales={{
              efectivoHoy: totalVentasEfectivoHoy,
              transferenciaHoy: totalVentasTransfHoy,
              dineroEnCaja: dineroTotalDisponibleEnCaja,
              efectivoEnCaja: efectivoFisicoEnCaja,
              gastosHoy: totalGastosHoy,
              inversion: valorTotalInversion
            }}
            tipoPrecio={determinarTipoPrecioVenta}
            procesandoAnulacion={procesandoAnulacion}
            onActualizar={cargarDatosGenerales}
            onNuevaVenta={() => setModuloActivo('pos')}
            onIrCaja={() => setModuloActivo('caja')}
            onVerVentas={() => setModuloActivo('ventas')}
            onExportarHoy={() => exportarVentasExcel(true)}
            onVerAlertas={() => setModalAlertasStock(true)}
            onAnular={handleIniciarAnulacion}
            onVerMotivo={setVentaVerMotivo}
          />
        )}

        {moduloActivo === 'pos' && (
          <POSView
            productos={productos}
            carrito={carrito}
            totales={totalesCarrito}
            metodoPago={metodoPagoPOS}
            onMetodoPago={setMetodoPagoPOS}
            clientes={clientes}
            clienteSeleccionado={clienteSeleccionado}
            onSeleccionarCliente={setClienteSeleccionado}
            busquedaCliente={busquedaClientePOS}
            onBusquedaCliente={setBusquedaClientePOS}
            onRegistrarCliente={(doc) => {
              setEditandoClienteId(null);
              setCliDoc(doc);
              setCliNombre('');
              setCliTel('');
              setCliDir('');
              setModalCliente(true);
            }}
            onAgregar={agregarAlCarrito}
            onCantidad={modificarCantidadCarrito}
            onQuitar={eliminarDelCarrito}
            onCobrar={handleProcesarVenta}
            procesando={procesandoVenta}
            cajaAbierta={cajaAbierta}
            onAbrirCaja={() => setModuloActivo('caja')}
          />
        )}

        {/* ============================================================ */}
        {/* 11. MÓDULO: VENTAS REALIZADAS (SIN BOTÓN 'NUEVA VENTA') */}
        {/* ============================================================ */}
        {moduloActivo === 'ventas' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Historial de Ventas Realizadas</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Consulta, auditoría, anulación y exportación de operaciones</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportarVentasExcel(filtroVentasTiempo === 'hoy')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar a Excel
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o producto..."
                  value={busquedaVentasHist}
                  onChange={(e) => setBusquedaVentasHist(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltroVentasTiempo('hoy')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filtroVentasTiempo === 'hoy' ? 'bg-[#E35336] text-white shadow' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Solo Hoy ({ventas.filter(v => esVentaDeHoy(v.fecha)).length})
                </button>
                <button
                  onClick={() => setFiltroVentasTiempo('todas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filtroVentasTiempo === 'todas' ? 'bg-[#E35336] text-white shadow' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Historial Completo ({ventas.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF8DC] text-[#212121] uppercase text-[11px] font-black border-b">
                  <tr>
                    <th className="py-3 px-3">Fecha y Hora</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Producto</th>
                    <th className="py-3 px-3">Cant</th>
                    <th className="py-3 px-3">Precio Unit.</th>
                    <th className="py-3 px-3">Total Venta</th>
                    <th className="py-3 px-3">Método</th>
                    <th className="py-3 px-3">Vendedor</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ventas
                    .filter(v => {
                      const matchTiempo = filtroVentasTiempo === 'todas' || esVentaDeHoy(v.fecha);
                      const matchBusq = v.nombre_producto.toLowerCase().includes(busquedaVentasHist.toLowerCase()) ||
                        v.cliente_nombre.toLowerCase().includes(busquedaVentasHist.toLowerCase());
                      return matchTiempo && matchBusq;
                    })
                    .map((v) => {
                      const esAnulada = v.estado === 'anulada';
                      return (
                        <tr key={v.id} className={esAnulada ? 'bg-red-50/50 line-through text-slate-400' : 'hover:bg-[#FFF8DC]/20'}>
                          <td className="py-3 px-3">{new Date(v.fecha).toLocaleString()}</td>
                          <td className="py-3 px-3 font-bold text-[#212121]">{v.cliente_nombre}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#212121]">{v.nombre_producto}</div>
                            <div className="mt-0.5">
                              {determinarTipoPrecioVenta(v) === 'mayorista' ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                                  Al por Mayor
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-100 text-[#E35336]">
                                  Al Detal
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-black">{v.cantidad}</td>
                          <td className="py-3 px-3">{formatoMoneda(v.precio_unitario)}</td>
                          <td className="py-3 px-3 font-black text-[#212121]">{formatoMoneda(v.total_venta)}</td>
                          <td className="py-3 px-3 capitalize">{v.metodo_pago}</td>
                          <td className="py-3 px-3">{v.vendedor}</td>
                          <td className="py-3 px-3">
                            {esAnulada ? (
                              <button
                                onClick={() => setVentaVerMotivo(v)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-[#D32F2F] hover:underline"
                                title="Haz clic para ver el motivo real de la anulación"
                              >
                                Anulada 🔍
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                Completada
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!esAnulada && (
                              <button
                                disabled={procesandoAnulacion}
                                onClick={() => handleIniciarAnulacion(v)}
                                className="px-3 py-1 bg-white border border-[#D32F2F] text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white rounded-xl text-xs font-bold transition shadow-xs"
                              >
                                Anular
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {moduloActivo === 'inventario' && (
          <InventarioView
            productos={productos}
            esAdmin={usuario.rol === 'admin'}
            onNuevo={abrirNuevoProducto}
            onEditar={abrirEdicionProducto}
            onEliminar={setProductoAEliminar}
            onExportar={exportarInventarioExcel}
          />
        )}

        {/* ============================================================ */}
        {/* 1 & 19. MÓDULO: CAJA (DINERO EN CAJA, ARQUEO Y CIERRE) */}
        {/* ============================================================ */}
        {moduloActivo === 'caja' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-black text-[#212121]">Control de Caja & Arqueo Diario</h2>
                  <p className="text-xs font-semibold text-[#212121]/60">Monitoreo del dinero en efectivo y transferencias</p>
                </div>
                {cajaActual?.estado === 'abierta' && (
                  <button
                    onClick={() => {
                      setDineroRealContado(String(efectivoFisicoEnCaja));
                      setModalCierreCaja(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-black text-xs shadow-md transition"
                  >
                    <Lock className="w-4 h-4" />
                    Cerrar Caja de Hoy
                  </button>
                )}
              </div>

              {(!cajaActual || cajaActual.estado === 'cerrada') ? (
                <div className="max-w-md mx-auto py-8 text-center space-y-4">
                  <div className="p-4 bg-[#FFF8DC] text-[#E35336] rounded-3xl inline-block border-2 border-[#E35336]">
                    <Wallet className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-[#212121]">Apertura de Jornada en Caja</h3>
                  <p className="text-xs text-[#212121]/70 font-medium">
                    Ingresa el monto de base con el que se inicia la caja hoy (efectivo para vueltas).
                  </p>
                  <form onSubmit={handleAperturaCaja} className="space-y-3">
                    <input
                      type="number"
                      required
                      placeholder="Monto base inicial (ej: 300000)"
                      value={montoAperturaInput}
                      onChange={(e) => setMontoAperturaInput(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm font-bold border-2 border-[#212121]/20 rounded-2xl focus:border-[#E35336] outline-none text-center"
                    />
                    <button
                      type="submit"
                      disabled={procesandoCaja}
                      className="w-full py-3 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-xs shadow-md transition disabled:opacity-50"
                    >
                      {procesandoCaja ? 'Abriendo caja...' : 'Confirmar Apertura de Caja'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Monto Base Apertura</span>
                    <p className="text-xl font-black text-[#212121]">{formatoMoneda(cajaActual.monto_inicial)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Registrado al abrir jornada</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block mb-1">+ Ventas en Efectivo</span>
                    <p className="text-xl font-black text-emerald-800">+{formatoMoneda(totalVentasEfectivoHoy)}</p>
                    <p className="text-[10px] text-emerald-600 mt-1">Ingresos directos en caja</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] font-black uppercase text-blue-700 block mb-1">Ventas por Transferencia</span>
                    <p className="text-xl font-black text-blue-800">+{formatoMoneda(totalVentasTransfHoy)}</p>
                    <p className="text-[10px] text-blue-600 mt-1">En banco / soporte digital</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-black uppercase text-rose-700 block mb-1">- Gastos Operacionales</span>
                    <p className="text-xl font-black text-rose-800">-{formatoMoneda(totalGastosHoy)}</p>
                    <p className="text-[10px] text-rose-600 mt-1">Salidas de dinero autorizadas</p>
                  </div>

                  <div className="md:col-span-4 p-5 rounded-3xl bg-[#FFF8DC] border-2 border-[#E35336] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-black uppercase text-[#E35336] block mb-1">Total Disponible en Caja (Efectivo + Transferencias):</span>
                      <p className="text-3xl font-black text-[#212121]">{formatoMoneda(dineroTotalDisponibleEnCaja)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-600 block">Efectivo Físico en Gaveta:</span>
                      <p className="text-xl font-black text-[#E35336]">{formatoMoneda(efectivoFisicoEnCaja)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Base + Ventas Efectivo - Gastos</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* HISTORIAL DE CIERRES DE CAJA SIEMPRE VISIBLE */}
            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-lg text-[#212121]">Historial de Cierres de Caja</h3>
                  <p className="text-xs text-slate-500 font-semibold">Registro de arqueos, auditorías y comprobantes de caja</p>
                </div>
                <span className="text-xs font-bold text-[#E35336] bg-[#FFF8DC] px-3 py-1 rounded-xl border border-[#E35336]/30">
                  {historialCierres.length} Cierres Registrados
                </span>
              </div>

              {historialCierres.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-xs">
                  No se han registrado cierres de caja aún. Al realizar el arqueo y cierre de jornada, el comprobante detallado aparecerá en esta tabla.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF8DC] uppercase font-black text-[10px] text-[#212121] border-b">
                      <tr>
                        <th className="py-2.5 px-3">Fecha y Hora</th>
                        <th className="py-2.5 px-3">Responsable</th>
                        <th className="py-2.5 px-3">Base</th>
                        <th className="py-2.5 px-3">Ventas Efectivo</th>
                        <th className="py-2.5 px-3">Ventas Transf</th>
                        <th className="py-2.5 px-3">Gastos</th>
                        <th className="py-2.5 px-3">Dinero Esperado</th>
                        <th className="py-2.5 px-3">Dinero Contado</th>
                        <th className="py-2.5 px-3">Diferencia</th>
                        <th className="py-2.5 px-3 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {historialCierres.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">{new Date(c.hora_cierre).toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-bold">{c.responsable}</td>
                          <td className="py-2.5 px-3">{formatoMoneda(c.monto_inicial)}</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold">+{formatoMoneda(c.ventas_efectivo)}</td>
                          <td className="py-2.5 px-3 text-blue-700 font-bold">+{formatoMoneda(c.ventas_transferencia)}</td>
                          <td className="py-2.5 px-3 text-rose-700 font-bold">-{formatoMoneda(c.total_gastos)}</td>
                          <td className="py-2.5 px-3 font-black">{formatoMoneda(c.dinero_esperado)}</td>
                          <td className="py-2.5 px-3 font-black text-[#212121]">{formatoMoneda(c.dinero_real)}</td>
                          <td className={`py-2.5 px-3 font-black ${
                            c.diferencia < 0 ? 'text-[#D32F2F]' : c.diferencia > 0 ? 'text-emerald-700' : 'text-slate-500'
                          }`}>
                            {formatoMoneda(c.diferencia)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setComprobanteCierreData(c)}
                              className="px-2.5 py-1 bg-[#212121] hover:bg-[#E35336] text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3" />
                              Ver Ticket
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {moduloActivo === 'clientes' && (
          <ClientesView
            clientes={clientes}
            esAdmin={usuario.rol === 'admin'}
            onNuevo={() => {
              setEditandoClienteId(null);
              setCliDoc('');
              setCliNombre('');
              setCliTel('');
              setCliDir('');
              setModalCliente(true);
            }}
            onEditar={(c) => {
              setEditandoClienteId(c.id);
              setCliDoc(c.documento);
              setCliNombre(c.nombre);
              setCliTel(c.telefono || '');
              setCliDir(c.direccion || '');
              setModalCliente(true);
            }}
            onEliminar={setClienteAEliminar}
          />
        )}

        {moduloActivo === 'gastos' && usuario.rol === 'admin' && (
          <GastosView
            gastos={gastos}
            onNuevo={() => {
              setEditandoGastoId(null);
              setGastoDesc('');
              setGastoMonto('');
              setModalGasto(true);
            }}
            onEditar={(g) => {
              setEditandoGastoId(g.id);
              setGastoCat(g.categoria);
              setGastoDesc(g.descripcion);
              setGastoMonto(String(g.monto));
              setModalGasto(true);
            }}
            onEliminar={handleIniciarEliminarGasto}
          />
        )}

        {moduloActivo === 'reportes' && usuario.rol === 'admin' && (
          <ReportesView
            ventas={ventas}
            tipoPrecio={determinarTipoPrecioVenta}
            onExportar={() => exportarVentasExcel(false)}
            onVerTicket={verTicketDeVenta}
          />
        )}
      </main>
      </div>

      {/* ============================================================ */}
      {/* 6. MODAL: TICKET DE VENTA (DISEÑO LIMPIO, UNA SOLA IMPRESIÓN) */}
      {/* ============================================================ */}
      {ticketVentaData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 my-8">
            <div id="ticket-imprimible" className="font-mono text-xs text-[#212121] space-y-2 border-b-2 border-dashed pb-3">
              <div className="text-center space-y-0.5">
                <h3 className="text-lg font-black tracking-tight text-black">DYM’S</h3>
                <p className="text-[10px] font-bold text-black uppercase">Nutrición & Producción Agropecuaria</p>
                <p className="text-[9px] text-black">NIT: 901.458.712-4</p>
                <p className="text-[9px] text-black">Ticket Nro: #{ticketVentaData.numero}</p>
                <p className="text-[9px] text-black">Fecha: {ticketVentaData.fecha}</p>
                <p className="text-[9px] text-black">Atendido por: {ticketVentaData.vendedor}</p>
                {ticketVentaData.esClienteRegistrado && ticketVentaData.cliente !== 'Cliente General' && (
                  <p className="text-[9px] font-bold text-black mt-1">
                    Cliente: {ticketVentaData.cliente} (Doc: {ticketVentaData.documento})
                  </p>
                )}
              </div>

              <div className="border-t border-b border-black py-2 my-2 space-y-1">
                <div className="flex justify-between font-black text-[10px]">
                  <span>CANT / PRODUCTO</span>
                  <span>TOTAL</span>
                </div>
                {ticketVentaData.items.map((it: ItemCarrito, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] leading-tight">
                    <span className="truncate mr-2">
                      {it.cantidad}x {it.producto.nombre} <span className="font-bold text-[9px]">{it.tipo_precio === 'mayorista' ? '(Mayorista)' : '(Detal)'}</span>
                    </span>
                    <span className="font-black whitespace-nowrap">{formatoMoneda(it.total)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatoMoneda(ticketVentaData.subtotal)}</span>
                </div>
                {ticketVentaData.iva > 0 && (
                  <div className="flex justify-between">
                    <span>IVA:</span>
                    <span>{formatoMoneda(ticketVentaData.iva)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
                  <span>TOTAL:</span>
                  <span>{formatoMoneda(ticketVentaData.total)}</span>
                </div>
                <div className="flex justify-between text-[10px] uppercase">
                  <span>Método de Pago:</span>
                  <span>{ticketVentaData.metodo}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] font-bold">
                <p>¡Gracias por su compra!</p>
              </div>
            </div>

            <div className="space-y-2 pt-1 no-print">
              {ticketVentaData.esClienteRegistrado && ticketVentaData.cliente !== 'Cliente General' && (
                <a
                  href={generarLinkWhatsAppCliente(ticketVentaData)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>Enviar Factura al Cliente por WhatsApp</span>
                </a>
              )}

              <a
                href={generarLinkWhatsAppAdmin(ticketVentaData)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#E35336] hover:bg-[#c9452b] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notificar Venta al Dueño (+57 {telefonoAdmin})</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 bg-[#212121] hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => setTicketVentaData(null)}
                className="w-full py-2 border-2 border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL IN-APP: CONFIRMAR ANULACIÓN DE VENTA (SIN PROMPT) */}
      {/* ============================================================ */}
      {ventaAAnular && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#D32F2F]">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-black text-base">Anular Venta #{ventaAAnular.id}</h3>
            </div>

            <p className="text-xs text-slate-600">
              Se devolverán <strong>{ventaAAnular.cantidad} unidad(es)</strong> al inventario de <strong>"{ventaAAnular.nombre_producto}"</strong> y se descontarán {formatoMoneda(ventaAAnular.total_venta)} del saldo de caja.
            </p>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                Motivo de la Anulación (Máx 40 caracteres):
              </label>
              <input
                type="text"
                maxLength={40}
                placeholder="Ej: Devolución de cliente o digitación"
                value={motivoAnulacionInput}
                onChange={(e) => setMotivoAnulacionInput(e.target.value.slice(0, 40))}
                className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-300 rounded-xl focus:border-[#E35336] outline-none"
              />
              <div className="text-right text-[10px] text-slate-400 mt-1">
                {motivoAnulacionInput.length}/40 caracteres
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setVentaAAnular(null); setMotivoAnulacionInput(''); }}
                className="flex-1 py-2 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!motivoAnulacionInput.trim() || procesandoAnulacion}
                onClick={handleConfirmarAnulacion}
                className="flex-1 py-2 bg-[#D32F2F] hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50"
              >
                {procesandoAnulacion ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {gastoAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este gasto?"
          textoConfirmar="Eliminar gasto"
          onConfirmar={handleConfirmarEliminarGasto}
          onCancelar={() => setGastoAEliminar(null)}
        >
          <p>Se eliminará <strong>{gastoAEliminar.descripcion}</strong> por <strong className="tabular">{formatoMoneda(gastoAEliminar.monto)}</strong>.</p>
          <p className="text-tinta-suave">El valor vuelve al dinero disponible en caja.</p>
        </ConfirmDialog>
      )}

      {/* ============================================================ */}
      {/* 13. MODAL: CONSULTA MOTIVO REAL DE ANULACIÓN */}
      {/* ============================================================ */}
      {ventaVerMotivo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#D32F2F]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-black text-base">Detalle de Venta Anulada</h3>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs space-y-1.5">
              <p><strong>Venta Nro:</strong> #{ventaVerMotivo.id}</p>
              <p><strong>Producto:</strong> {ventaVerMotivo.nombre_producto} ({ventaVerMotivo.cantidad} uds)</p>
              <p><strong>Total Anulado:</strong> {formatoMoneda(ventaVerMotivo.total_venta)}</p>
              <p><strong>Vendedor Responsable:</strong> {ventaVerMotivo.vendedor}</p>
              <div className="pt-2 border-t border-rose-200">
                <span className="font-black text-[#D32F2F] block">Motivo Registrado (Máx 40 Caracteres):</span>
                <p className="text-sm font-bold text-black mt-0.5">
                  "{ventaVerMotivo.motivo_anulacion || 'Sin motivo especificado'}"
                </p>
              </div>
            </div>
            <button
              onClick={() => setVentaVerMotivo(null)}
              className="w-full py-2 bg-[#212121] text-white font-bold rounded-xl text-xs hover:bg-black transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: COMPROBANTE DE CIERRE DE CAJA */}
      {/* ============================================================ */}
      {comprobanteCierreData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div id="ticket-imprimible" className="font-mono text-xs text-[#212121] space-y-2 border-b-2 border-dashed pb-3">
              <div className="text-center space-y-0.5">
                <h3 className="text-lg font-black text-black">DYM’S</h3>
                <p className="text-[10px] font-bold text-black uppercase">Comprobante de Cierre de Caja</p>
                <p className="text-[9px] text-black">Fecha: {new Date(comprobanteCierreData.hora_cierre).toLocaleString()}</p>
                <p className="text-[9px] text-black">Responsable: {comprobanteCierreData.responsable}</p>
              </div>

              <div className="border-t border-b border-black py-2 my-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Monto Inicial Apertura:</span>
                  <span>{formatoMoneda(comprobanteCierreData.monto_inicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas en Efectivo:</span>
                  <span className="font-bold">+{formatoMoneda(comprobanteCierreData.ventas_efectivo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas en Transferencia:</span>
                  <span>+{formatoMoneda(comprobanteCierreData.ventas_transferencia)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos Pagados:</span>
                  <span className="font-bold">-{formatoMoneda(comprobanteCierreData.total_gastos)}</span>
                </div>
                <div className="flex justify-between border-t border-black pt-1 font-bold">
                  <span>Efectivo Esperado:</span>
                  <span>{formatoMoneda(comprobanteCierreData.dinero_esperado)}</span>
                </div>
                <div className="flex justify-between font-black text-sm">
                  <span>Efectivo Real Contado:</span>
                  <span>{formatoMoneda(comprobanteCierreData.dinero_real)}</span>
                </div>
                <div className="flex justify-between text-xs font-black">
                  <span>Diferencia:</span>
                  <span className={comprobanteCierreData.diferencia < 0 ? 'text-[#D32F2F]' : ''}>
                    {formatoMoneda(comprobanteCierreData.diferencia)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] italic text-center">"{comprobanteCierreData.observaciones}"</p>
            </div>

            <div className="space-y-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2 bg-[#212121] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
              <button
                onClick={() => setComprobanteCierreData(null)}
                className="w-full py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 19. MODAL: CIERRE DE CAJA DIARIO */}
      {/* ============================================================ */}
      {modalCierreCaja && cajaActual && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-[#212121]">Arqueo & Cierre de Caja</h3>
              <button onClick={() => setModalCierreCaja(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>

            {efectivoFisicoEnCaja < 0 && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-800 text-xs font-bold rounded-xl">
                ⚠️ ALERTA: La caja tiene saldo en efectivo negativo ({formatoMoneda(efectivoFisicoEnCaja)}). El cierre está bloqueado hasta corregir egresos.
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Base Apertura:</span>
                <span className="font-bold">{formatoMoneda(cajaActual.monto_inicial)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas Efectivo Hoy:</span>
                <span className="font-bold text-emerald-700">+{formatoMoneda(totalVentasEfectivoHoy)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gastos Hoy:</span>
                <span className="font-bold text-rose-700">-{formatoMoneda(totalGastosHoy)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t pt-1 text-[#212121]">
                <span>Efectivo Físico Esperado:</span>
                <span className="text-[#E35336]">{formatoMoneda(efectivoFisicoEnCaja)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#212121] uppercase mb-1">
                Dinero Real Contado en Efectivo:
              </label>
              <input
                type="number"
                required
                value={dineroRealContado}
                onChange={(e) => setDineroRealContado(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-300 rounded-xl focus:border-[#E35336] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#212121] uppercase mb-1">
                Observaciones de Cierre:
              </label>
              <input
                type="text"
                placeholder="Novedades o justificación..."
                value={obsCierre}
                onChange={(e) => setObsCierre(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:border-[#E35336] outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalCierreCaja(false)}
                className="flex-1 py-2.5 border-2 border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoCaja || efectivoFisicoEnCaja < 0}
                onClick={handleConfirmarCierreCaja}
                className="flex-1 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-black rounded-xl text-xs shadow-md transition disabled:opacity-50"
              >
                {procesandoCaja ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 14. MODAL: CREAR / EDITAR PRODUCTO (CON CALCULADOR AUTOMÁTICO DE MARGEN %) */}
      {/* ============================================================ */}
      {modalProd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-black text-[#212121]">
                {editandoProdId ? 'Editar Producto' : 'Nuevo Producto en DYM’S'}
              </h3>
              <button onClick={() => setModalProd(false)} className="text-xl font-black text-slate-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleGuardarProducto} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Nombre del Producto:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Purina Engorde 40kg"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Categoría:</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="w-full px-2 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl bg-white outline-none"
                  >
                    {CATEGORIAS_PRODUCTO.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Unidad de Medida:</label>
                  <select
                    value={prodUnidad}
                    onChange={(e) => setProdUnidad(e.target.value)}
                    className="w-full px-2 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl bg-white outline-none"
                  >
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u.valor} value={u.valor}>{u.texto}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Costo de Compra con selector: Por Unidad o Total Lote */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-[#212121]">
                    Costo de Compra:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nuevo = !modoCostoLote;
                      setModoCostoLote(nuevo);
                      if (!nuevo) {
                        setCostoTotalLoteInput('');
                      }
                    }}
                    className="text-[10px] font-black text-[#E35336] hover:underline"
                  >
                    {modoCostoLote ? '← Ingresar Costo por Unidad' : '🧮 ¿Compraste un lote completo?'}
                  </button>
                </div>

                {modoCostoLote ? (
                  <div className="space-y-2 bg-white p-2.5 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-600 font-semibold leading-tight">
                      Ingresa el valor total pagado al proveedor y la cantidad de bultos/unidades para calcular el costo individual:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Factura Total ($):</label>
                        <input
                          type="number"
                          placeholder="Ej: 900000"
                          value={costoTotalLoteInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCostoTotalLoteInput(val);
                            const stk = Number(prodStock) || 0;
                            if (Number(val) > 0 && stk > 0) {
                              const unitario = String(Math.round(Number(val) / stk));
                              setProdCosto(unitario);
                              recalcularPrecios(unitario, prodMargenDeseado, prodMargenMayorista, prodIva);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Costo Resultante / Bulto:</label>
                        <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs font-black text-[#212121] border border-slate-200">
                          {prodCosto ? formatoMoneda(Number(prodCosto)) : '$ 0'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="number"
                      required
                      placeholder="Ej: 95000 (Costo de 1 solo bulto/unidad)"
                      value={prodCosto}
                      onChange={(e) => handleCostoChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-300 rounded-xl focus:border-[#E35336] outline-none bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                      💡 El costo y precio deben ser por <strong>una sola unidad/bulto</strong> individual.
                    </p>
                  </div>
                )}
              </div>

              {/* CALCULADOR AUTOMÁTICO DE PRECIOS POR MARGEN PORCENTUAL (%) E IVA */}
              <div className="bg-[#FFF8DC] p-3 rounded-2xl border-2 border-[#E35336]/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black text-[#E35336]">
                  <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Calculador de Margen e IVA</span>
                  <span className="text-[10px] text-slate-500 font-normal">Calcula sugerido y puedes editar abajo</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#212121]">Margen Detal (%):</label>
                    <input
                      type="number"
                      placeholder="20"
                      value={prodMargenDeseado}
                      onChange={(e) => handleMargenDetalChange(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#E35336]">Margen Mayorista (%):</label>
                    <input
                      type="number"
                      placeholder="12"
                      value={prodMargenMayorista}
                      onChange={(e) => handleMargenMayorChange(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Sección de IVA */}
                <div className="border-t border-[#E35336]/20 pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black uppercase text-[#212121]">IVA (%):</label>
                    <div className="flex items-center gap-1">
                      {['0', '5', '19'].map((ivaRate) => (
                        <button
                          key={ivaRate}
                          type="button"
                          onClick={() => handleIvaChange(ivaRate)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black transition ${
                            prodIva === ivaRate
                              ? 'bg-[#E35336] text-white'
                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {ivaRate}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={prodIva}
                      onChange={(e) => handleIvaChange(e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                    />
                    <span className="text-[10px] text-slate-600 font-medium">
                      {Number(prodIva) > 0 ? `+${prodIva}% IVA incluido en el cálculo` : 'Producto exento de IVA (0%)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Precios Finales (Editables Directamente) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[#212121]">Precio Detal ($ por unidad):</label>
                  <input
                    type="number"
                    required
                    placeholder="115000"
                    value={prodPrecioDetal}
                    onChange={(e) => setProdPrecioDetal(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-bold border-2 border-[#212121]/30 rounded-xl focus:border-[#E35336] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase mb-1 text-[#E35336]">Precio Mayorista ($ por unidad):</label>
                  <input
                    type="number"
                    placeholder="110000"
                    value={prodPrecioMayor}
                    onChange={(e) => setProdPrecioMayor(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-bold border-2 border-[#E35336]/30 rounded-xl focus:border-[#E35336] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Stock Actual:</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="20"
                    value={prodStock}
                    onChange={(e) => {
                      const sVal = e.target.value;
                      setProdStock(sVal);
                      if (modoCostoLote && Number(costoTotalLoteInput) > 0 && Number(sVal) > 0) {
                        const unitario = String(Math.round(Number(costoTotalLoteInput) / Number(sVal)));
                        setProdCosto(unitario);
                        recalcularPrecios(unitario, prodMargenDeseado, prodMargenMayorista, prodIva);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="5"
                    value={prodStockMin}
                    onChange={(e) => setProdStockMin(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={procesandoProducto}
                className="w-full py-3 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-xs shadow-md transition disabled:opacity-50 mt-2"
              >
                {procesandoProducto ? 'Guardando producto...' : (editandoProdId ? 'Actualizar Producto' : 'Guardar Producto')}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalCliente && (
        <ClienteFormModal
          editando={!!editandoClienteId}
          documento={cliDoc}
          nombre={cliNombre}
          telefono={cliTel}
          direccion={cliDir}
          procesando={procesandoCliente}
          onDocumento={setCliDoc}
          onNombre={setCliNombre}
          onTelefono={setCliTel}
          onDireccion={setCliDir}
          onSubmit={handleGuardarCliente}
          onCerrar={() => setModalCliente(false)}
        />
      )}

      {modalGasto && (
        <GastoFormModal
          editando={!!editandoGastoId}
          categoria={gastoCat}
          descripcion={gastoDesc}
          monto={gastoMonto}
          disponibleEnCaja={dineroTotalDisponibleEnCaja}
          procesando={procesandoGasto}
          onCategoria={setGastoCat}
          onDescripcion={setGastoDesc}
          onMonto={setGastoMonto}
          onSubmit={handleGuardarGasto}
          onCerrar={() => setModalGasto(false)}
        />
      )}

      {modalAlertasStock && (
        <AlertasStockModal
          productos={productos}
          esAdmin={usuario.rol === 'admin'}
          onReponer={(p) => {
            setModalAlertasStock(false);
            setModuloActivo('inventario');
            abrirEdicionProducto(p);
          }}
          onCerrar={() => setModalAlertasStock(false)}
        />
      )}

      {clienteAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este cliente?"
          textoConfirmar="Eliminar cliente"
          onConfirmar={() => handleConfirmarEliminarCliente(clienteAEliminar.id)}
          onCancelar={() => setClienteAEliminar(null)}
        >
          <div className="flex flex-col gap-0.5 rounded-campo bg-hundido px-4 py-3">
            <strong className="font-semibold">{clienteAEliminar.nombre}</strong>
            <span className="text-sm text-tinta-suave tabular">C.C. / NIT {clienteAEliminar.documento}{clienteAEliminar.telefono ? ` · ${clienteAEliminar.telefono}` : ''}</span>
          </div>
          <p className="text-tinta-suave">Sus ventas anteriores no se borran.</p>
        </ConfirmDialog>
      )}

      {productoAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este producto?"
          textoConfirmar="Eliminar producto"
          onConfirmar={() => handleConfirmarEliminarProducto(productoAEliminar.id)}
          onCancelar={() => setProductoAEliminar(null)}
        >
          <div className="flex flex-col gap-0.5 rounded-campo bg-hundido px-4 py-3">
            <strong className="font-semibold">{productoAEliminar.nombre}</strong>
            <span className="text-sm text-tinta-suave tabular">
              {productoAEliminar.stock} {productoAEliminar.unidad_medida}s en bodega · detal {formatoMoneda(productoAEliminar.precio_venta)}
            </span>
          </div>
          <p className="text-tinta-suave">Dejará de aparecer en el inventario y en el punto de venta. Las ventas anteriores no se borran.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
