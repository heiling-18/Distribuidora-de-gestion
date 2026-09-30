'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Send, 
  Plus, 
  ShieldCheck, 
  User, 
  Receipt, 
  Wallet, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  FileSpreadsheet, 
  Printer, 
  Users, 
  Search, 
  Filter, 
  BarChart3, 
  Calendar, 
  Layers, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  ArrowRight, 
  ArrowUpRight, 
  Check, 
  X, 
  Loader2, 
  Info, 
  Eye,
  Mail,
  Lock,
  Percent,
  Calculator,
  RotateCcw
} from 'lucide-react';

// ==========================================
// MODELOS Y TIPOS DE DATOS DYM'S
// ==========================================
interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: 'admin' | 'vendedor';
}

interface Producto {
  id: number;
  codigo?: string;
  nombre: string;
  categoria: string;
  precio_compra: number;
  precio_venta: number; // Precio Detal
  precio_mayorista: number;
  iva_porcentaje: number;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
}

interface Cliente {
  id: number;
  documento: string;
  nombre: string;
  telefono: string;
  direccion: string;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  tipo_precio: 'detal' | 'mayorista';
  precio_aplicado: number;
  subtotal: number;
  iva_monto: number;
  total: number;
}

interface Venta {
  id: number;
  producto_id?: number;
  cliente_documento?: string;
  cliente_nombre: string;
  nombre_producto: string;
  categoria_producto?: string;
  cantidad: number;
  tipo_precio?: string;
  precio_unitario: number;
  costo_unitario: number;
  subtotal?: number;
  iva_total?: number;
  total_venta: number;
  ganancia_bruta: number;
  metodo_pago: string;
  estado_pago?: string;
  vendedor: string;
  fecha: string;
  estado?: 'completada' | 'anulada';
  motivo_anulacion?: string;
}

interface Gasto {
  id: number;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

interface SesionCaja {
  id: number;
  fecha: string;
  monto_inicial: number;
  monto_cierre?: number;
  dinero_esperado?: number;
  diferencia?: number;
  estado: 'abierta' | 'cerrada';
  usuario_apertura?: string;
  created_at?: string;
}

interface NotificacionVisual {
  id: number;
  tipo: 'exito' | 'error' | 'advertencia' | 'info';
  mensaje: string;
}

const esVentaDeHoy = (fechaStr?: string) => {
  if (!fechaStr) return false;
  const f = new Date(fechaStr);
  const hoy = new Date();
  return f.getDate() === hoy.getDate() &&
    f.getMonth() === hoy.getMonth() &&
    f.getFullYear() === hoy.getFullYear();
};

export default function DYMSApp() {
  // 1. Sesión y Navegación
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [moduloActivo, setModuloActivo] = useState<'dashboard' | 'pos' | 'ventas' | 'inventario' | 'caja' | 'clientes' | 'gastos' | 'reportes'>('dashboard');
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
  const [busquedaProdPOS, setBusquedaProdPOS] = useState('');
  const [filtroCatPOS, setFiltroCatPOS] = useState('Todas');
  const [paginaPOS, setPaginaPOS] = useState(1);
  const prodsPorPagina = 4;

  // Cliente Opcional en POS
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busquedaClientePOS, setBusquedaClientePOS] = useState('');
  const [mostrarDropdownClientes, setMostrarDropdownClientes] = useState(false);

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
  const [busquedaInv, setBusquedaInv] = useState('');
  const [filtroCatInv, setFiltroCatInv] = useState('Todas');

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
  const [busquedaCli, setBusquedaCli] = useState('');

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
    // 1. Cargar Usuario
    const sesion = localStorage.getItem('dyms_usuario');
    if (sesion) {
      try {
        setUsuario(JSON.parse(sesion));
      } catch {
        localStorage.removeItem('dyms_usuario');
      }
    }
    // 2. Teléfono Admin
    const telGuardado = localStorage.getItem('dyms_tel_admin');
    if (telGuardado) {
      setTelefonoAdmin(telGuardado);
    }
    // 3. Cargar Datos Globales
    cargarDatosGenerales();
  }, []);

  const cargarDatosGenerales = async () => {
    setLoading(true);
    try {
      // 1. Cargar Productos
      const { data: prods } = await supabase.from('productos').select('*').order('nombre', { ascending: true });
      if (prods && prods.length > 0) {
        setProductos(prods.map(p => ({
          ...p,
          categoria: p.categoria || 'Purinas y Concentrados',
          precio_mayorista: p.precio_mayorista || p.precio_venta * 0.95,
          iva_porcentaje: p.iva_porcentaje || 0,
          unidad_medida: p.unidad_medida || 'bulto'
        })));
      } else {
        setProductos([
          { id: 4, nombre: 'Purina Engorde 40kg', categoria: 'Purinas y Concentrados', precio_compra: 95000, precio_venta: 115000, precio_mayorista: 110000, iva_porcentaje: 0, stock: 24, stock_minimo: 5, unidad_medida: 'bulto' },
          { id: 2, nombre: 'Purina Ponedora 40kg', categoria: 'Purinas y Concentrados', precio_compra: 92000, precio_venta: 110000, precio_mayorista: 106000, iva_porcentaje: 0, stock: 18, stock_minimo: 5, unidad_medida: 'bulto' },
          { id: 6, nombre: 'purina ponedora 50 kg', categoria: 'Purinas y Concentrados', precio_compra: 100000, precio_venta: 125000, precio_mayorista: 120000, iva_porcentaje: 0, stock: 10, stock_minimo: 3, unidad_medida: 'bulto' }
        ]);
      }

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
      } else if (clisLocal.length > 0) {
        setClientes(clisLocal);
        if (!errClis) {
          try {
            for (const c of clisLocal) {
              await supabase.from('clientes').insert([{
                documento: c.documento,
                nombre: c.nombre,
                telefono: c.telefono,
                direccion: c.direccion
              }]);
            }
          } catch {}
        }
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

  // Formato Moneda Colombiana
  const formatoMoneda = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

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
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);

    setTimeout(() => {
      const emailNorm = loginEmail.trim().toLowerCase();
      const passNorm = loginPass.trim();

      if (emailNorm === 'admin@dyms.com' && passNorm === 'admin123') {
        const u: Usuario = { id: 1, email: 'admin@dyms.com', nombre: 'Administrador DYM’S', rol: 'admin' };
        setUsuario(u);
        localStorage.setItem('dyms_usuario', JSON.stringify(u));
        setLoadingLogin(false);
        mostrarNotificacion('exito', '¡Bienvenido Administrador a DYM’S!');
        return;
      }

      if (emailNorm === 'vendedor@dyms.com' && passNorm === 'vendedor123') {
        const u: Usuario = { id: 2, email: 'vendedor@dyms.com', nombre: 'Vendedor de Turno', rol: 'vendedor' };
        setUsuario(u);
        localStorage.setItem('dyms_usuario', JSON.stringify(u));
        setLoadingLogin(false);
        mostrarNotificacion('exito', '¡Bienvenido al Punto de Venta DYM’S!');
        return;
      }

      setLoginError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      setLoadingLogin(false);
    }, 400);
  };

  const handleLogout = () => {
    localStorage.removeItem('dyms_usuario');
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
      const sesionAbierta: SesionCaja = {
        id: (!error && data) ? data.id : Date.now(),
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

    try {
      await supabase.from('caja').update({ estado: 'cerrada', monto_cierre: real }).eq('id', cajaActual.id);
      await supabase.from('cierres_caja').insert([datosCierre]);
    } catch (e) {
      console.warn('Cierre sincronizado localmente:', e);
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
  const productosFiltradosPOS = useMemo(() => {
    return productos.filter(p => {
      const matchNombre = p.nombre.toLowerCase().includes(busquedaProdPOS.toLowerCase());
      const matchCat = filtroCatPOS === 'Todas' || p.categoria === filtroCatPOS;
      return matchNombre && matchCat;
    });
  }, [productos, busquedaProdPOS, filtroCatPOS]);

  const totalPaginasPOS = Math.max(1, Math.ceil(productosFiltradosPOS.length / prodsPorPagina));

  const productosPaginadosPOS = useMemo(() => {
    const inicio = (paginaPOS - 1) * prodsPorPagina;
    return productosFiltradosPOS.slice(inicio, inicio + prodsPorPagina);
  }, [productosFiltradosPOS, paginaPOS]);

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

    const nuevasVentas: Venta[] = [];

    try {
      for (const item of carrito) {
        const ventaRecordDB = {
          producto_id: item.producto.id,
          nombre_producto: item.producto.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_aplicado,
          costo_unitario: item.producto.precio_compra,
          total_venta: item.total,
          ganancia_bruta: item.total - (item.cantidad * item.producto.precio_compra),
          metodo_pago: metodoPagoPOS,
          estado_pago: item.tipo_precio === 'mayorista' ? 'pagado (mayorista)' : 'pagado (detal)',
          cliente_nombre: clienteNombreFinal,
          vendedor: usuario?.nombre || 'Vendedor'
        };

        const { data, error } = await supabase.from('ventas').insert([ventaRecordDB]).select().single();
        if (error) {
          console.error('Error insertando venta en Supabase:', error);
          throw new Error('Error al registrar venta en base de datos: ' + error.message);
        }

        nuevasVentas.push({
          id: data ? data.id : Date.now() + Math.random(),
          producto_id: item.producto.id,
          cliente_documento: clienteDocFinal,
          cliente_nombre: clienteNombreFinal,
          nombre_producto: item.producto.nombre,
          cantidad: item.cantidad,
          tipo_precio: item.tipo_precio,
          precio_unitario: item.precio_aplicado,
          costo_unitario: item.producto.precio_compra,
          subtotal: item.subtotal,
          iva_total: item.iva_monto,
          total_venta: item.total,
          ganancia_bruta: ventaRecordDB.ganancia_bruta,
          metodo_pago: metodoPagoPOS,
          estado_pago: item.tipo_precio === 'mayorista' ? 'pagado (mayorista)' : 'pagado (detal)',
          vendedor: usuario?.nombre || 'Vendedor',
          fecha: data ? data.fecha : new Date().toISOString(),
          estado: 'completada'
        });
      }

      for (const [prodId, cantADescontar] of stockADescontarPorProducto.entries()) {
        const prodActual = productos.find(p => p.id === prodId);
        if (prodActual) {
          const nuevoStock = Math.max(0, prodActual.stock - cantADescontar);
          await supabase.from('productos').update({ stock: nuevoStock }).eq('id', prodId);
        }
      }

      setVentas(prev => [...nuevasVentas, ...prev]);
      setProductos(prev => prev.map(p => {
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
      const prodRelacionado = productos.find(p => p.id === ventaAAnular.producto_id || p.nombre === ventaAAnular.nombre_producto);
      if (prodRelacionado) {
        const nuevoStock = prodRelacionado.stock + ventaAAnular.cantidad;
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', prodRelacionado.id);
        setProductos(prev => prev.map(p => p.id === prodRelacionado.id ? { ...p, stock: nuevoStock } : p));
      }

      const textoEstado = `anulada: ${motivoLimpio}`;
      await supabase.from('ventas').update({ estado_pago: textoEstado }).eq('id', ventaAAnular.id);

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
        await supabase.from('productos').update(prodData).eq('id', editandoProdId);
        setProductos(prev => prev.map(p => p.id === editandoProdId ? { ...prodData, id: editandoProdId } : p));
        mostrarNotificacion('exito', '¡Producto actualizado correctamente!');
      } else {
        const { data, error } = await supabase.from('productos').insert([prodData]).select().single();
        if (!error && data) {
          setProductos(prev => [...prev, data]);
        } else {
          setProductos(prev => [...prev, { ...prodData, id: Date.now() }]);
        }
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
        if (error && error.code === '42501') {
          mostrarNotificacion('advertencia', 'Cliente actualizado en tu dispositivo. (Nota: Para sincronizar con la nube, desactiva RLS en la tabla clientes de Supabase).');
        } else {
          mostrarNotificacion('exito', '¡Cliente actualizado con éxito!');
        }

        const actualizados = clientes.map(c => c.id === editandoClienteId ? { ...nuevoClienteData, id: editandoClienteId } : c);
        setClientes(actualizados);
        localStorage.setItem('dyms_clientes', JSON.stringify(actualizados));
      } else {
        let idAsignado = Date.now();
        const { data, error } = await supabase.from('clientes').insert([nuevoClienteData]).select().single();
        if (error && error.code === '42501') {
          mostrarNotificacion('advertencia', '¡Cliente guardado en el sistema! Nota: La tabla "clientes" de Supabase tiene RLS activado. Desactívalo en Supabase para reflejarlo en la nube.');
        } else if (data) {
          idAsignado = data.id;
          mostrarNotificacion('exito', '¡Cliente registrado y sincronizado en Supabase!');
        } else {
          mostrarNotificacion('exito', '¡Cliente registrado en el directorio de DYM’S!');
        }

        const nuevos = [...clientes, { ...nuevoClienteData, id: idAsignado }];
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
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error && error.code === '42501') {
        mostrarNotificacion('advertencia', 'Cliente eliminado localmente. (Nota: RLS en Supabase impide borrarlo en la nube hasta desactivar RLS).');
      } else {
        mostrarNotificacion('exito', 'Cliente eliminado del directorio con éxito.');
      }
    } catch (e) {
      console.error('Error eliminando cliente de Supabase:', e);
      mostrarNotificacion('exito', 'Cliente eliminado del directorio.');
    }

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
        await supabase.from('gastos').update(nuevoGasto).eq('id', editandoGastoId);
        setGastos(prev => prev.map(g => g.id === editandoGastoId ? { ...nuevoGasto, id: editandoGastoId } : g));
        mostrarNotificacion('exito', '¡Gasto operacional actualizado!');
      } else {
        const { data, error } = await supabase.from('gastos').insert([nuevoGasto]).select().single();
        if (!error && data) {
          setGastos(prev => [data, ...prev]);
        } else {
          setGastos(prev => [{ ...nuevoGasto, id: Date.now() }, ...prev]);
        }
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
      await supabase.from('gastos').delete().eq('id', gastoAEliminar.id);
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

  // ==========================================
  // PANTALLA DE LOGIN (SIN AUTOCOMPLETADO, PLACEHOLDERS NEUTROS)
  // ==========================================
  if (!usuario) {
    return (
      <div className="min-h-screen bg-[#212121] flex flex-col justify-center items-center p-4 selection:bg-[#E35336] selection:text-white">
        <div className="w-full max-w-md bg-[#FFF8DC] rounded-3xl shadow-2xl p-8 border-4 border-[#E35336]">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-[#E35336] text-white rounded-3xl mb-3 shadow-lg">
              <Package className="w-10 h-10 stroke-[2.2]" />
            </div>
            <h1 className="text-3xl font-black text-[#212121] tracking-tight">DYM’S</h1>
            <p className="text-xs font-bold text-[#E35336] uppercase tracking-wider mt-1">
              Sistema de Gestión Integral de Producción & Ventas
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-2xl bg-[#D32F2F]/10 border-2 border-[#D32F2F] text-[#D32F2F] text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#212121] uppercase mb-1.5">Correo Electrónico:</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-[#212121]/50 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  name="email_dyms_usuario"
                  placeholder="ejemplo@correo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#212121]/20 rounded-2xl focus:border-[#E35336] focus:ring-2 focus:ring-[#E35336]/20 outline-none text-sm font-semibold text-[#212121]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#212121] uppercase mb-1.5">Contraseña:</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-[#212121]/50 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  name="password_dyms_clave"
                  placeholder="Ingresa tu contraseña"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#212121]/20 rounded-2xl focus:border-[#E35336] focus:ring-2 focus:ring-[#E35336]/20 outline-none text-sm font-semibold text-[#212121]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full py-3.5 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-sm shadow-lg hover:shadow-xl transition transform active:scale-98 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingLogin ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL CON NAVEGACIÓN
  // ==========================================
  return (
    <div className="min-h-screen bg-[#CBD5E1] text-[#212121] flex flex-col">
      {/* NOTIFICACIONES VISUALES FLOTANTES (NO INVASIVAS, CERO ALERT POPUPS) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none no-print">
        {notificaciones.map(n => (
          <div
            key={n.id}
            className={`pointer-events-auto shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 border-2 text-xs font-bold transition transform duration-200 ${
              n.tipo === 'exito' ? 'bg-emerald-600 border-emerald-700 text-white' :
              n.tipo === 'error' ? 'bg-[#D32F2F] border-red-700 text-white' :
              n.tipo === 'advertencia' ? 'bg-amber-500 border-amber-600 text-black' :
              'bg-[#212121] border-black text-white'
            }`}
          >
            {n.tipo === 'exito' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {n.tipo === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {n.tipo === 'advertencia' && <AlertCircle className="w-5 h-5 shrink-0" />}
            {n.tipo === 'info' && <Info className="w-5 h-5 shrink-0" />}
            <span className="flex-1">{n.mensaje}</span>
            <button
              onClick={() => setNotificaciones(prev => prev.filter(item => item.id !== n.id))}
              className="opacity-70 hover:opacity-100 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ENCABEZADO FIJO (STICKY, SIN DESPLAZAMIENTOS) & SIN 'v3.0' */}
      <header className="bg-[#212121] text-white shadow-xl sticky top-0 z-40 border-b-4 border-[#E35336] w-full no-print">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo y Nombre Limpio */}
          <div className="flex items-center gap-3">
            <div className="bg-[#E35336] text-white p-2 rounded-2xl shadow-md">
              <Package className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">DYM’S</span>
              <p className="text-[10px] font-medium text-[#FFF8DC]/70 hidden sm:block">Gestión de Inventario, Ventas & Caja</p>
            </div>
          </div>

          {/* Menú de Navegación Modular */}
          <nav className="flex items-center gap-1 bg-[#2b2b2b] p-1 rounded-2xl border border-white/10 overflow-x-auto">
            <button
              onClick={() => setModuloActivo('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'dashboard' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Inicio
            </button>
            <button
              onClick={() => setModuloActivo('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'pos' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Venta POS
            </button>
            <button
              onClick={() => setModuloActivo('ventas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'ventas' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Ventas
            </button>
            <button
              onClick={() => setModuloActivo('inventario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'inventario' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Inventario
            </button>
            <button
              onClick={() => setModuloActivo('caja')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'caja' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Caja
            </button>
            <button
              onClick={() => setModuloActivo('clientes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'clientes' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Clientes
            </button>
            {usuario.rol === 'admin' && (
              <>
                <button
                  onClick={() => setModuloActivo('gastos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    moduloActivo === 'gastos' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Gastos
                </button>
                <button
                  onClick={() => setModuloActivo('reportes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    moduloActivo === 'reportes' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Reportes
                </button>
              </>
            )}
          </nav>

          {/* BOTÓN DE SALIDA INDEPENDIENTE */}
          <div className="flex items-center gap-2 border-l border-white/20 pl-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-white leading-tight">{usuario.nombre}</p>
              <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-md ${
                usuario.rol === 'admin' ? 'bg-[#FFF8DC] text-[#212121]' : 'bg-[#E35336] text-white'
              }`}>
                {usuario.rol === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión / Salir"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#D32F2F] text-white text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salida</span>
            </button>
          </div>
        </div>
      </header>

      {/* AVISO VISUAL DE CAJA CERRADA */}
      {(!cajaActual || cajaActual.estado === 'cerrada') && (
        <div className="bg-[#D32F2F] text-white py-2 px-4 shadow-md text-xs font-bold no-print">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FFF8DC]" />
              <span><strong>CAJA CERRADA:</strong> Las ventas y operaciones están bloqueadas hasta realizar la apertura diaria.</span>
            </div>
            <button
              onClick={() => setModuloActivo('caja')}
              className="bg-white text-[#D32F2F] px-3 py-1 rounded-lg font-black hover:bg-[#FFF8DC] transition shadow-xs"
            >
              Abrir Caja Ahora
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* ============================================================ */}
        {/* 1. MÓDULO: DASHBOARD / INICIO */}
        {/* ============================================================ */}
        {moduloActivo === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Panel General de DYM’S</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Resumen operativo de hoy y estado del negocio</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#212121]/20 text-[#212121] flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cajaActual?.estado === 'abierta' ? 'bg-emerald-500' : 'bg-[#D32F2F]'}`}></span>
                  Caja: {cajaActual?.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                </span>
                <button
                  onClick={cargarDatosGenerales}
                  className="p-2 rounded-xl bg-white border border-[#212121]/20 hover:bg-slate-100 text-[#212121] transition"
                  title="Actualizar datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TARJETAS KPI (SIN HOVER GENERAL, SÓLO ALERTAS DE STOCK TIENE HOVER) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ventas Hoy */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#212121]/60 uppercase">Ventas de Hoy</span>
                  <div className="p-2 bg-[#E35336]/10 text-[#E35336] rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-[#212121]">
                  {formatoMoneda(totalVentasEfectivoHoy + totalVentasTransfHoy)}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#212121]/70">
                  <span>💵 Efec: {formatoMoneda(totalVentasEfectivoHoy)}</span>
                  <span>•</span>
                  <span>📱 Transf: {formatoMoneda(totalVentasTransfHoy)}</span>
                </div>
              </div>

              {/* Dinero en Caja */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#212121]/60 uppercase">Dinero en Caja</span>
                  <div className="p-2 bg-[#FFF8DC] text-[#E35336] rounded-xl border border-[#E35336]">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-[#E35336]">
                  {formatoMoneda(dineroTotalDisponibleEnCaja)}
                </p>
                <div className="flex items-center justify-between mt-2 text-[10px] text-[#212121]/70 font-semibold border-t pt-1">
                  <span>💵 Efectivo: {formatoMoneda(efectivoFisicoEnCaja)}</span>
                  <span>📱 Transf: {formatoMoneda(totalVentasTransfHoy)}</span>
                </div>
              </div>

              {/* Inversión en Bodega */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#212121]/60 uppercase">Inversión en Bodega</span>
                  <div className="p-2 bg-[#212121]/5 text-[#212121] rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-[#212121]">
                  {formatoMoneda(valorTotalInversion)}
                </p>
                <p className="text-[11px] text-[#212121]/60 mt-1 font-semibold">
                  {productos.length} referencias registradas
                </p>
              </div>

              {/* ALERTAS DE STOCK: ÚNICA TARJETA CON HOVER */}
              <div
                onClick={() => setModalAlertasStock(true)}
                className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs hover:border-[#D32F2F] hover:shadow-lg cursor-pointer transition transform hover:-translate-y-0.5 group"
                title="Haz clic para ver la lista de productos con stock bajo o agotado"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#212121]/60 uppercase group-hover:text-[#D32F2F] transition">Alertas de Stock</span>
                  <div className="p-2 bg-[#D32F2F]/10 text-[#D32F2F] rounded-xl group-hover:bg-[#D32F2F] group-hover:text-white transition">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-[#D32F2F]">
                  {productos.filter(p => p.stock <= p.stock_minimo).length}
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-[#D32F2F]">
                  <span>En o por debajo del mínimo</span>
                  <span className="text-[10px] bg-[#D32F2F]/10 px-2 py-0.5 rounded-full font-black group-hover:bg-[#D32F2F] group-hover:text-white transition">
                    Ver productos →
                  </span>
                </div>
              </div>
            </div>

            {/* INVENTARIO TOTAL */}
            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/10 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-lg text-[#212121]">Inventario Total</h3>
                  <p className="text-xs text-[#212121]/60 font-semibold">Distribución de existencias y valorización por categorías</p>
                </div>
                <span className="text-xs text-[#E35336] font-bold bg-[#FFF8DC] px-3 py-1 rounded-xl border border-[#E35336]">
                  Total Bodega: {productos.reduce((acc, p) => acc + p.stock, 0)} unidades/bultos
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['Purinas y Concentrados', 'Pollos y Aves', 'Huevos'].map((cat) => {
                  const prodsCat = productos.filter(p => p.categoria === cat);
                  const stockTotal = prodsCat.reduce((acc, p) => acc + p.stock, 0);
                  const valorCat = prodsCat.reduce((acc, p) => acc + (p.stock * p.precio_compra), 0);
                  return (
                    <div key={cat} className="p-4 rounded-2xl bg-[#FFF8DC]/40 border border-[#212121]/10">
                      <span className="text-[11px] font-black uppercase text-[#E35336] block mb-1">{cat}</span>
                      <p className="text-2xl font-black text-[#212121]">{stockTotal}</p>
                      <p className="text-xs text-[#212121]/60 font-semibold">unidades/bultos disponibles</p>
                      <p className="text-xs font-bold text-[#212121] mt-2">Valoración: {formatoMoneda(valorCat)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabla de Ventas de Hoy */}
            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/10 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h3 className="font-black text-lg text-[#212121]">Ventas Realizadas Hoy</h3>
                  <p className="text-xs text-[#212121]/60 font-semibold">Resumen de operaciones facturadas durante la jornada</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportarVentasExcel(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Descargar Resumen del Día (Excel)</span>
                  </button>
                  <button
                    onClick={() => setModuloActivo('ventas')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#212121] hover:bg-[#E35336] text-white font-bold text-xs transition"
                  >
                    <span>Ver Todas las Ventas →</span>
                  </button>
                </div>
              </div>

              {ventas.filter(v => esVentaDeHoy(v.fecha)).length === 0 ? (
                <div className="text-center py-8 text-[#212121]/50 text-xs font-bold">
                  Aún no se han registrado ventas el día de hoy.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF8DC] uppercase font-black text-[10px] text-[#212121] border-b">
                      <tr>
                        <th className="py-2.5 px-3">Hora</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Cant</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Método</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {ventas
                        .filter(v => esVentaDeHoy(v.fecha))
                        .slice(0, 10)
                        .map((v) => {
                          const esAnulada = v.estado === 'anulada';
                          return (
                            <tr key={v.id} className={esAnulada ? 'bg-red-50/50 line-through text-slate-400' : 'hover:bg-slate-50'}>
                              <td className="py-2.5 px-3">{new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-[#212121]">{v.nombre_producto}</span>
                                <span className="ml-1.5">
                                  {determinarTipoPrecioVenta(v) === 'mayorista' ? (
                                    <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                                      Mayor
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-orange-100 text-[#E35336]">
                                      Detal
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-black">{v.cantidad}</td>
                              <td className="py-2.5 px-3 font-black text-[#212121]">{formatoMoneda(v.total_venta)}</td>
                              <td className="py-2.5 px-3 capitalize">{v.metodo_pago}</td>
                              <td className="py-2.5 px-3">{v.cliente_nombre}</td>
                              <td className="py-2.5 px-3">
                                {esAnulada ? (
                                  <button
                                    onClick={() => setVentaVerMotivo(v)}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-[#D32F2F] hover:underline"
                                    title="Haz clic para ver el motivo real de anulación"
                                  >
                                    Anulada 🔍
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                    Completada
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {!esAnulada && (
                                  <button
                                    disabled={procesandoAnulacion}
                                    onClick={() => handleIniciarAnulacion(v)}
                                    className="px-2.5 py-1 bg-white border border-[#D32F2F] text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white rounded-lg text-[10px] font-bold transition shadow-2xs"
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
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. MÓDULO: VENTAS POS CON PAGINACIÓN Y BÚSQUEDA INTEGRADA */}
        {/* ============================================================ */}
        {moduloActivo === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Catálogo y Búsqueda */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-[#212121]">Punto de Venta DYM’S</h2>
                  <span className="text-xs font-bold text-slate-500">
                    Página {paginaPOS} de {totalPaginasPOS} ({productosFiltradosPOS.length} productos)
                  </span>
                </div>

                {/* Búsqueda de Productos y Filtro de Categoría Limpios */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre..."
                      value={busquedaProdPOS}
                      onChange={(e) => {
                        setBusquedaProdPOS(e.target.value);
                        setPaginaPOS(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none bg-slate-50/50"
                    />
                  </div>
                  <select
                    value={filtroCatPOS}
                    onChange={(e) => {
                      setFiltroCatPOS(e.target.value);
                      setPaginaPOS(1);
                    }}
                    className="text-xs font-bold px-3 py-1.5 border-2 border-[#212121]/15 rounded-xl bg-white outline-none focus:border-[#E35336]"
                  >
                    <option value="Todas">Todas las Categorías</option>
                    <option value="Purinas y Concentrados">Purinas y Concentrados</option>
                    <option value="Pollos y Aves">Pollos y Aves</option>
                    <option value="Huevos">Huevos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              {/* Grid de Productos con Paginación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[380px]">
                {productosPaginadosPOS.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-[#212121]/40 text-xs font-bold">
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                ) : (
                  productosPaginadosPOS.map((p) => {
                    const agotado = p.stock <= 0;
                    return (
                      <div
                        key={p.id}
                        className={`bg-white p-4 rounded-3xl border-2 transition shadow-xs flex flex-col justify-between ${
                          agotado ? 'border-[#D32F2F]/30 bg-red-50/20 opacity-70' : 'border-[#212121]/10'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-black uppercase text-[#E35336] bg-[#FFF8DC] px-2 py-0.5 rounded-md">
                              {p.categoria}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${agotado ? 'bg-rose-100 text-[#D32F2F]' : 'bg-emerald-100 text-emerald-800'}`}>
                              {agotado ? 'Agotado' : `${p.stock} ${p.unidad_medida}s`}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#212121] text-sm mt-2">{p.nombre}</h4>
                          <div className="mt-2 flex items-baseline justify-between">
                            <div>
                              <p className="text-[10px] text-[#212121]/50 font-bold uppercase">Precio Detal</p>
                              <p className="text-base font-black text-[#212121]">{formatoMoneda(p.precio_venta)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-[#E35336] font-bold uppercase">Mayorista</p>
                              <p className="text-sm font-black text-[#E35336]">{formatoMoneda(p.precio_mayorista)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                          <button
                            disabled={agotado}
                            onClick={() => agregarAlCarrito(p, 'detal')}
                            className="py-1.5 px-2 bg-[#E35336] hover:bg-[#d0462a] text-white rounded-xl text-xs font-bold transition disabled:bg-slate-300"
                          >
                            + Detal
                          </button>
                          <button
                            disabled={agotado}
                            onClick={() => agregarAlCarrito(p, 'mayorista')}
                            className="py-1.5 px-2 bg-[#212121] hover:bg-[#333] text-white rounded-xl text-xs font-bold transition disabled:bg-slate-300"
                          >
                            + Mayorista
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PAGINACIÓN ESTILO NÚMEROS (AMAZON / GOOGLE) */}
              {productosFiltradosPOS.length > 0 && (
                <div className="bg-white py-3 px-4 rounded-2xl border-2 border-[#212121]/10 flex flex-wrap items-center justify-center gap-2 text-sm select-none">
                  {paginaPOS > 1 && (
                    <button
                      type="button"
                      onClick={() => setPaginaPOS(prev => Math.max(1, prev - 1))}
                      className="text-slate-700 hover:text-black font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      ‹ Anterior
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPaginasPOS }, (_, i) => i + 1).map((num) => {
                      const activo = paginaPOS === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPaginaPOS(num)}
                          className={`min-w-[34px] h-[34px] px-2 rounded-lg font-black text-sm transition flex items-center justify-center ${
                            activo
                              ? 'border-2 border-[#1E88E5] text-[#1E88E5] bg-white shadow-xs'
                              : 'text-slate-600 hover:text-black hover:bg-slate-100 font-semibold'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  {paginaPOS < totalPaginasPOS && (
                    <button
                      type="button"
                      onClick={() => setPaginaPOS(prev => Math.min(totalPaginasPOS, prev + 1))}
                      className="text-slate-700 hover:text-black font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      Siguiente ›
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Columna Derecha: Ticket de Venta Actual y Cobro */}
            <div className="lg:col-span-5">
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-[#E35336]" />
                      <h3 className="font-black text-lg text-[#212121]">Ticket Actual</h3>
                    </div>
                    <span className="text-xs font-bold text-[#E35336]">{carrito.length} ítems</span>
                  </div>

                  {/* CLIENTE OPCIONAL */}
                  <div className="mb-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <span className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Cliente (Opcional):
                    </span>

                    {clienteSeleccionado ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2 rounded-xl text-xs">
                        <div className="truncate mr-2">
                          <span className="font-black text-emerald-900">{clienteSeleccionado.nombre}</span>
                          <span className="text-[10px] text-emerald-700 ml-1.5">(Doc: {clienteSeleccionado.documento})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClienteSeleccionado(null)}
                          className="text-[10px] bg-white border border-red-300 text-red-600 px-2 py-0.5 rounded-md font-bold hover:bg-red-50"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar por C.C. o Nombre..."
                          value={busquedaClientePOS}
                          onFocus={() => setMostrarDropdownClientes(true)}
                          onChange={(e) => {
                            setBusquedaClientePOS(e.target.value);
                            setMostrarDropdownClientes(true);
                          }}
                          className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white outline-none focus:border-[#E35336]"
                        />

                        {mostrarDropdownClientes && busquedaClientePOS.trim().length > 0 && (
                          <div className="absolute left-0 right-0 top-9 bg-white border-2 border-[#212121]/20 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto divide-y">
                            {clientes
                              .filter(c => c.documento.includes(busquedaClientePOS) || c.nombre.toLowerCase().includes(busquedaClientePOS.toLowerCase()))
                              .map(c => (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    setClienteSeleccionado(c);
                                    setBusquedaClientePOS('');
                                    setMostrarDropdownClientes(false);
                                  }}
                                  className="p-2 text-xs hover:bg-[#FFF8DC] cursor-pointer flex justify-between items-center"
                                >
                                  <span className="font-bold text-[#212121]">{c.nombre}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">CC: {c.documento}</span>
                                </div>
                              ))}
                            <div
                              onClick={() => {
                                setCliDoc(busquedaClientePOS.replace(/[^0-9]/g, ''));
                                setModalCliente(true);
                                setMostrarDropdownClientes(false);
                              }}
                              className="p-2 text-xs text-[#E35336] font-bold hover:bg-orange-50 cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Registrar nuevo cliente
                            </div>
                          </div>
                        )}
                        {!clienteSeleccionado && !busquedaClientePOS && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            Si no seleccionas cliente, la venta se registrará como Cliente General.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LISTA DE ÍTEMS EN CARRITO */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {carrito.length === 0 ? (
                      <div className="text-center py-10 text-[#212121]/40 text-xs font-bold">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No has agregado ningún producto al ticket
                      </div>
                    ) : (
                      carrito.map((item, idx) => (
                        <div key={idx} className="bg-[#FFF8DC]/40 p-2.5 rounded-2xl border border-[#212121]/10 flex items-center justify-between text-xs gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#212121] leading-tight truncate">{item.producto.nombre}</p>
                            <span className="text-[10px] text-[#E35336] font-black uppercase">
                              {item.tipo_precio} • {formatoMoneda(item.precio_aplicado)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => modificarCantidadCarrito(idx, -1)}
                              className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-[#212121] font-bold text-xs flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="font-black text-xs min-w-[28px] text-center px-1">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => modificarCantidadCarrito(idx, 1)}
                              className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-[#212121] font-bold text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                            <span className="font-black text-xs text-[#212121] min-w-[65px] text-right">
                              {formatoMoneda(item.total)}
                            </span>
                            <button
                              onClick={() => eliminarDelCarrito(idx)}
                              title="Eliminar producto del ticket"
                              className="p-1 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Totales y Cobro */}
                <div className="border-t pt-3 mt-3 space-y-2.5">
                  <div className="space-y-1 text-xs text-[#212121]/70">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold text-[#212121]">{formatoMoneda(totalesCarrito.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-[#212121] pt-1 border-t">
                      <span>TOTAL A COBRAR:</span>
                      <span className="text-xl text-[#E35336]">{formatoMoneda(totalesCarrito.total)}</span>
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMetodoPagoPOS('efectivo')}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition ${
                        metodoPagoPOS === 'efectivo'
                          ? 'bg-[#E35336] text-white border-[#E35336]'
                          : 'border-[#212121]/20 text-[#212121]'
                      }`}
                    >
                      💵 Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPagoPOS('transferencia')}
                      className={`py-2 rounded-xl text-xs font-black border-2 transition ${
                        metodoPagoPOS === 'transferencia'
                          ? 'bg-[#E35336] text-white border-[#E35336]'
                          : 'border-[#212121]/20 text-[#212121]'
                      }`}
                    >
                      📱 Transferencia
                    </button>
                  </div>

                  {metodoPagoPOS === 'transferencia' && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>💡 <strong>Recordatorio:</strong> No olvides tomarle foto o guardar el soporte de la transferencia bancaria.</span>
                    </div>
                  )}

                  <button
                    disabled={carrito.length === 0 || procesandoVenta}
                    onClick={handleProcesarVenta}
                    className="w-full py-3.5 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-sm shadow-lg hover:shadow-xl transition disabled:bg-slate-300 flex items-center justify-center gap-2"
                  >
                    {procesandoVenta ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando venta...</span>
                      </>
                    ) : (
                      'Confirmar Venta & Emitir Ticket'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
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

        {/* ============================================================ */}
        {/* 14 & 21. MÓDULO: INVENTARIO CON MARGEN ESTIMADO Y SIN BOTÓN REPONER PARA VENDEDOR */}
        {/* ============================================================ */}
        {moduloActivo === 'inventario' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Control de Inventario y Productos</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Existencias, referencias, costos y precios al detal y mayorista</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={exportarInventarioExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-emerald-600 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar a Excel
                </button>
                {usuario.rol === 'admin' && (
                  <button
                    onClick={() => {
                      setEditandoProdId(null);
                      setProdNombre('');
                      setProdCosto('');
                      setProdMargenDeseado('20');
                      setProdMargenMayorista('12');
                      setProdPrecioDetal('');
                      setProdPrecioMayor('');
                      setProdStock('');
                      setModalProd(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E35336] hover:bg-[#d0462a] text-white font-black text-xs shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Producto
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={busquedaInv}
                  onChange={(e) => setBusquedaInv(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>
              <select
                value={filtroCatInv}
                onChange={(e) => setFiltroCatInv(e.target.value)}
                className="text-xs font-bold px-3 py-2 border-2 border-[#212121]/15 rounded-xl bg-white outline-none focus:border-[#E35336]"
              >
                <option value="Todas">Todas las Categorías</option>
                <option value="Purinas y Concentrados">Purinas y Concentrados</option>
                <option value="Pollos y Aves">Pollos y Aves</option>
                <option value="Huevos">Huevos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF8DC] text-[#212121] uppercase text-[11px] font-black border-b-2 border-[#212121]/10">
                  <tr>
                    <th className="py-3 px-3">Producto / Referencia</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Costo Compra</th>
                    <th className="py-3 px-3">Precio Detal</th>
                    <th className="py-3 px-3">Precio Mayorista</th>
                    <th className="py-3 px-3">Margen Estimado</th>
                    <th className="py-3 px-3">Existencias</th>
                    <th className="py-3 px-3">Valor en Bodega</th>
                    {usuario.rol === 'admin' && <th className="py-3 px-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {productos
                    .filter(p => {
                      const matchNombre = p.nombre.toLowerCase().includes(busquedaInv.toLowerCase());
                      const matchCat = filtroCatInv === 'Todas' || p.categoria === filtroCatInv;
                      return matchNombre && matchCat;
                    })
                    .map((p) => {
                      const bajo = p.stock <= p.stock_minimo;
                      const margen = p.precio_venta - p.precio_compra;
                      const margenPct = p.precio_compra > 0 ? ((margen / p.precio_compra) * 100).toFixed(0) : '0';

                      return (
                        <tr key={p.id} className="hover:bg-[#FFF8DC]/20">
                          <td className="py-3 px-3 font-bold text-[#212121]">{p.nombre}</td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p.categoria}</span>
                          </td>
                          <td className="py-3 px-3">{formatoMoneda(p.precio_compra)}</td>
                          <td className="py-3 px-3 font-bold text-[#212121]">{formatoMoneda(p.precio_venta)}</td>
                          <td className="py-3 px-3 font-bold text-[#E35336]">{formatoMoneda(p.precio_mayorista)}</td>
                          {/* Columna Margen Estimado Reincorporada */}
                          <td className="py-3 px-3">
                            <span className="font-bold text-emerald-800">+{formatoMoneda(margen)}</span>{' '}
                            <span className="text-[10px] text-slate-500 font-semibold">({margenPct}%)</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                              bajo ? 'bg-rose-100 text-[#D32F2F]' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {p.stock} {p.unidad_medida}s {bajo && '⚠️ Mínimo'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-black">{formatoMoneda(p.stock * p.precio_compra)}</td>
                          {usuario.rol === 'admin' && (
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
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
                                }}
                                className="px-2.5 py-1 bg-white border border-[#212121]/30 hover:border-[#E35336] hover:text-[#E35336] rounded-lg text-[11px] font-bold transition"
                              >
                                Editar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
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

            {historialCierres.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-4">
                <h3 className="font-black text-lg text-[#212121] border-b pb-3">Historial de Cierres de Jornada</h3>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 16. MÓDULO: CLIENTES (CONSULTAR, EDITAR Y GUARDAR) */}
        {/* ============================================================ */}
        {moduloActivo === 'clientes' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Directorio de Clientes</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Administración, consulta y edición de datos de clientes</p>
              </div>
              <button
                onClick={() => {
                  setEditandoClienteId(null);
                  setCliDoc('');
                  setCliNombre('');
                  setCliTel('');
                  setCliDir('');
                  setModalCliente(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E35336] hover:bg-[#d0462a] text-white font-black text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            </div>

            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por cédula o nombre..."
                value={busquedaCli}
                onChange={(e) => setBusquedaCli(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF8DC] text-[#212121] uppercase text-[11px] font-black border-b">
                  <tr>
                    <th className="py-3 px-3">Documento (C.C. / NIT)</th>
                    <th className="py-3 px-3">Nombre Completo</th>
                    <th className="py-3 px-3">WhatsApp / Teléfono</th>
                    <th className="py-3 px-3">Dirección / Notas</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {clientes
                    .filter(c => c.documento.includes(busquedaCli) || c.nombre.toLowerCase().includes(busquedaCli.toLowerCase()))
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-[#FFF8DC]/20">
                        <td className="py-3 px-3 font-bold text-[#212121]">{c.documento}</td>
                        <td className="py-3 px-3 font-bold">{c.nombre}</td>
                        <td className="py-3 px-3">
                          {c.telefono ? (
                            <a
                              href={`https://wa.me/57${c.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> +57 {c.telefono}
                            </a>
                          ) : (
                            <span className="text-slate-400">Sin teléfono</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#212121]/70">{c.direccion || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          {usuario.rol === 'admin' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditandoClienteId(c.id);
                                  setCliDoc(c.documento);
                                  setCliNombre(c.nombre);
                                  setCliTel(c.telefono || '');
                                  setCliDir(c.direccion || '');
                                  setModalCliente(true);
                                }}
                                className="px-2.5 py-1 bg-white border border-[#212121]/20 hover:border-[#E35336] hover:text-[#E35336] rounded-lg text-[11px] font-bold transition"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setClienteAEliminar(c)}
                                className="p-1 text-slate-400 hover:text-[#D32F2F] hover:bg-rose-50 rounded-lg transition"
                                title="Eliminar Cliente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 17. MÓDULO: GASTOS OPERACIONALES (SOLO ADMIN PUEDE MODIFICAR/ELIMINAR) */}
        {/* ============================================================ */}
        {moduloActivo === 'gastos' && usuario.rol === 'admin' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Gastos Operacionales DYM’S</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Registro de salidas de dinero: arriendo, compras y servicios</p>
              </div>
              <button
                onClick={() => {
                  setEditandoGastoId(null);
                  setGastoDesc('');
                  setGastoMonto('');
                  setModalGasto(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-black text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                Registrar Gasto
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF8DC] text-[#212121] uppercase text-[11px] font-black border-b">
                  <tr>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Descripción</th>
                    <th className="py-3 px-3">Monto Egresado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gastos.map((g) => (
                    <tr key={g.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-3">{new Date(g.fecha).toLocaleDateString()}</td>
                      <td className="py-3 px-3">
                        <span className="bg-rose-50 text-[#D32F2F] px-2 py-0.5 rounded-md font-bold uppercase text-[10px]">
                          {g.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#212121]">{g.descripcion}</td>
                      <td className="py-3 px-3 font-black text-[#D32F2F]">
                        -{formatoMoneda(g.monto)}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditandoGastoId(g.id);
                            setGastoCat(g.categoria);
                            setGastoDesc(g.descripcion);
                            setGastoMonto(String(g.monto));
                            setModalGasto(true);
                          }}
                          className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-500 rounded-lg text-[10px] font-bold text-slate-700"
                        >
                          Modificar
                        </button>
                        {/* 17. ELIMINAR GASTO CON DIÁLOGO IN-APP (SIN CONFIRM DE NAVEGADOR) */}
                        <button
                          onClick={() => handleIniciarEliminarGasto(g)}
                          className="px-2 py-1 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-[#D32F2F] rounded-lg text-[10px] font-bold"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 18. MÓDULO: REPORTES (SELECCIONAR VENTA Y VER/REIMPRIMIR TICKET) */}
        {/* ============================================================ */}
        {moduloActivo === 'reportes' && usuario.rol === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Informes y Estadísticas del Negocio</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Análisis de rentabilidad, reimpresión de comprobantes y exportaciones</p>
              </div>
              <button
                onClick={() => exportarVentasExcel(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Historial de Ventas (.CSV)
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-4">
              <h3 className="font-black text-lg text-[#212121] border-b pb-3">Últimas Ventas (Haz clic en una venta para ver o imprimir su ticket)</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF8DC] uppercase font-black text-[10px] text-[#212121] sticky top-0 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3">Cant</th>
                      <th className="py-2.5 px-3">Total Venta</th>
                      <th className="py-2.5 px-3">Ganancia</th>
                      <th className="py-2.5 px-3">Pago</th>
                      <th className="py-2.5 px-3">Vendedor</th>
                      <th className="py-2.5 px-3 text-right">Tirilla / Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ventas.slice(0, 50).map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 font-bold">{v.cliente_nombre}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[#212121]">{v.nombre_producto}</div>
                          <div className="mt-0.5">
                            {determinarTipoPrecioVenta(v) === 'mayorista' ? (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                                Al por Mayor
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black bg-orange-100 text-[#E35336]">
                                Al Detal
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-black">{v.cantidad}</td>
                        <td className="py-2.5 px-3 font-black text-[#212121]">{formatoMoneda(v.total_venta)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">+{formatoMoneda(v.ganancia_bruta)}</td>
                        <td className="py-2.5 px-3 capitalize">{v.metodo_pago}</td>
                        <td className="py-2.5 px-3 text-[#212121]/60">{v.vendedor}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              const tipoPrecioRec = determinarTipoPrecioVenta(v);
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
                                  tipo_precio: tipoPrecioRec,
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
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#212121] hover:bg-[#E35336] text-white rounded-lg text-[10px] font-bold transition"
                          >
                            <Receipt className="w-3 h-3" /> Ver Ticket
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

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

      {/* ============================================================ */}
      {/* MODAL IN-APP: CONFIRMAR ELIMINACIÓN DE GASTO (SIN CONFIRM) */}
      {/* ============================================================ */}
      {gastoAEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#D32F2F]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-black text-base">Eliminar Gasto de Caja</h3>
            </div>

            <p className="text-xs text-slate-600">
              ¿Deseas eliminar el registro del gasto <strong>"{gastoAEliminar.descripcion}"</strong> por un monto de <strong>{formatoMoneda(gastoAEliminar.monto)}</strong>?
            </p>
            <p className="text-[11px] text-slate-400 italic">
              El valor se reintegrará al saldo disponible de la caja.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGastoAEliminar(null)}
                className="flex-1 py-2 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminarGasto}
                className="flex-1 py-2 bg-[#D32F2F] hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow transition"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
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
                    <option value="Purinas y Concentrados">Purinas y Concentrados</option>
                    <option value="Pollos y Aves">Pollos y Aves</option>
                    <option value="Huevos">Huevos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Unidad de Medida:</label>
                  <select
                    value={prodUnidad}
                    onChange={(e) => setProdUnidad(e.target.value)}
                    className="w-full px-2 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl bg-white outline-none"
                  >
                    <option value="bulto">Bulto (Saco)</option>
                    <option value="unidad">Unidad / Pollo</option>
                    <option value="panal">Panal (Huevos)</option>
                    <option value="kilo">Kilo</option>
                  </select>
                </div>
              </div>

              {/* Costo de Compra */}
              <div>
                <label className="block text-xs font-black uppercase mb-1">Costo de Compra ($):</label>
                <input
                  type="number"
                  required
                  placeholder="95000"
                  value={prodCosto}
                  onChange={(e) => handleCostoChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-300 rounded-xl focus:border-[#E35336] outline-none"
                />
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
                  <label className="block text-[11px] font-black uppercase mb-1 text-[#212121]">Precio Detal ($):</label>
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
                  <label className="block text-[11px] font-black uppercase mb-1 text-[#E35336]">Precio Mayorista ($):</label>
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
                    onChange={(e) => setProdStock(e.target.value)}
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

      {/* ============================================================ */}
      {/* 16. MODAL: REGISTRAR / EDITAR CLIENTE */}
      {/* ============================================================ */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-black text-[#212121]">
                {editandoClienteId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button onClick={() => setModalCliente(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleGuardarCliente} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Cédula o NIT:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1098765432"
                  value={cliDoc}
                  onChange={(e) => setCliDoc(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Gómez"
                  value={cliNombre}
                  onChange={(e) => setCliNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">WhatsApp / Teléfono:</label>
                <input
                  type="text"
                  placeholder="Ej: 3101234567"
                  value={cliTel}
                  onChange={(e) => setCliTel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Dirección / Finca:</label>
                <input
                  type="text"
                  placeholder="Ej: Vereda El Salitre"
                  value={cliDir}
                  onChange={(e) => setCliDir(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border-2 border-slate-200 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={procesandoCliente}
                className="w-full py-2.5 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-xl text-xs shadow-md transition disabled:opacity-50 mt-2"
              >
                {procesandoCliente ? 'Guardando...' : (editandoClienteId ? 'Guardar Cambios' : 'Registrar Cliente')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 17. MODAL: REGISTRAR / EDITAR GASTO (ADMIN) */}
      {/* ============================================================ */}
      {modalGasto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-black text-[#D32F2F]">
                {editandoGastoId ? 'Modificar Gasto' : 'Registrar Gasto Operacional'}
              </h3>
              <button onClick={() => setModalGasto(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>

            <form onSubmit={handleGuardarGasto} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Categoría del Gasto:</label>
                <select
                  value={gastoCat}
                  onChange={(e) => setGastoCat(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl bg-white outline-none"
                >
                  <option value="arriendo">Arriendo de Local</option>
                  <option value="compra_inventario">Compra de Bultos / Aves</option>
                  <option value="servicios">Servicios Públicos (Luz/Agua)</option>
                  <option value="nomina">Nómina / Pagos Empleados</option>
                  <option value="transporte">Fletes / Transporte</option>
                  <option value="otros">Otros Gastos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Descripción:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de recibo de energía eléctrica"
                  value={gastoDesc}
                  onChange={(e) => setGastoDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border-2 border-slate-200 rounded-xl focus:border-[#D32F2F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Monto a Retirar de Caja:</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="50000"
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border-2 border-slate-200 rounded-xl focus:border-[#D32F2F] outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Máximo disponible: {formatoMoneda(dineroTotalDisponibleEnCaja)}
                </p>
              </div>

              <button
                type="submit"
                disabled={procesandoGasto}
                className="w-full py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-black rounded-xl text-xs shadow-md transition disabled:opacity-50 mt-2"
              >
                {procesandoGasto ? 'Guardando...' : (editandoGastoId ? 'Actualizar Gasto' : 'Registrar Salida de Dinero')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 21.1 MODAL: ALERTAS DE STOCK (SIN BOTÓN REPONER PARA VENDEDOR) */}
      {/* ============================================================ */}
      {modalAlertasStock && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 text-[#D32F2F]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-lg">Productos con Stock Crítico o Agotado</h3>
              </div>
              <button onClick={() => setModalAlertasStock(false)} className="text-slate-400 hover:text-black">✕</button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {productos.filter(p => p.stock <= p.stock_minimo).length === 0 ? (
                <div className="text-center py-8 text-emerald-700 font-bold text-xs">
                  ✅ Todos los productos cuentan con existencias por encima del mínimo requerido.
                </div>
              ) : (
                productos
                  .filter(p => p.stock <= p.stock_minimo)
                  .map(p => (
                    <div key={p.id} className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-black text-[#212121]">{p.nombre}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{p.categoria}</p>
                        <span className="text-[10px] text-rose-700 font-bold">
                          Mínimo requerido: {p.stock_minimo} {p.unidad_medida}s
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                          {p.stock} {p.unidad_medida}s
                        </span>
                        {usuario.rol === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalAlertasStock(false);
                              setEditandoProdId(p.id);
                              setProdNombre(p.nombre);
                              setProdCategoria(p.categoria);
                              setProdCosto(String(p.precio_compra));
                              setProdMargenDeseado('20');
                              setProdMargenMayorista('12');
                              setProdPrecioDetal(String(p.precio_venta));
                              setProdPrecioMayor(String(p.precio_mayorista));
                              setProdStock(String(p.stock));
                              setProdStockMin(String(p.stock_minimo));
                              setProdIva(String(p.iva_porcentaje));
                              setProdUnidad(p.unidad_medida);
                              setModuloActivo('inventario');
                              setModalProd(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E35336] hover:bg-[#c9452b] text-white text-xs font-black shadow-md transition transform hover:scale-105 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Reponer Stock</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <button
              onClick={() => setModalAlertasStock(false)}
              className="w-full py-2.5 bg-[#212121] text-white font-bold rounded-xl text-xs hover:bg-black transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL IN-APP: CONFIRMAR ELIMINACIÓN DE CLIENTE (SIN CONFIRM) */}
      {/* ============================================================ */}
      {clienteAEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#D32F2F]">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-[#D32F2F]" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#212121]">¿Eliminar Cliente?</h3>
                <p className="text-xs text-slate-500">Esta acción removerá el cliente del sistema</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-[#212121]">{clienteAEliminar.nombre}</p>
              <p className="text-slate-500">C.C. / NIT: {clienteAEliminar.documento}</p>
              {clienteAEliminar.telefono && <p className="text-slate-500">Tel: +57 {clienteAEliminar.telefono}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClienteAEliminar(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmarEliminarCliente(clienteAEliminar.id)}
                className="py-2.5 px-4 bg-[#D32F2F] hover:bg-red-700 text-white font-black rounded-xl text-xs shadow-md transition"
              >
                Eliminar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
