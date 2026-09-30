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
  ArrowDownCircle, 
  Lock, 
  Mail, 
  LogIn,
  Printer,
  Users,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  AlertCircle,
  Tag,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Check,
  X,
  CreditCard,
  Building2,
  Trash2,
  Edit2,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

// ==========================================
// TIPOS Y MODELOS DYM'S
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
  categoria: string; // 'Purinas y Concentrados' | 'Pollos y Aves' | 'Huevos' | 'Otros'
  precio_compra: number;
  precio_venta: number; // Detal
  precio_mayorista: number;
  iva_porcentaje: number;
  stock: number;
  stock_minimo: number;
  unidad_medida: string; // 'bulto' | 'unidad' | 'panal' | 'kilo'
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
  cliente_documento: string;
  cliente_nombre: string;
  nombre_producto: string;
  categoria_producto?: string;
  cantidad: number;
  tipo_precio: string;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  iva_total: number;
  total_venta: number;
  ganancia_bruta: number;
  metodo_pago: string;
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
  usuario_apertura: string;
  usuario_cierre?: string;
  observaciones?: string;
  created_at: string;
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
  // 1. Estado de Sesión y Navegación
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [moduloActivo, setModuloActivo] = useState<'dashboard' | 'pos' | 'ventas' | 'inventario' | 'caja' | 'clientes' | 'gastos' | 'reportes'>('dashboard');
  const [filtroVentasTiempo, setFiltroVentasTiempo] = useState<'hoy' | 'todas'>('hoy');
  const [busquedaVentasHist, setBusquedaVentasHist] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // 2. Estado de Datos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cajaActual, setCajaActual] = useState<SesionCaja | null>(null);
  const [historialCierres, setHistorialCierres] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 3. Estado de Apertura y Cierre de Caja
  const [montoAperturaInput, setMontoAperturaInput] = useState('');
  const [modalCierreCaja, setModalCierreCaja] = useState(false);
  const [dineroRealContado, setDineroRealContado] = useState('');
  const [obsCierre, setObsCierre] = useState('');
  const [comprobanteCierreData, setComprobanteCierreData] = useState<any | null>(null);

  // 4. Estado de Punto de Venta (POS)
  const [busquedaProdPOS, setBusquedaProdPOS] = useState('');
  const [filtroCatPOS, setFiltroCatPOS] = useState('Todas');
  const [docClientePOS, setDocClientePOS] = useState('');
  const [telClientePOS, setTelClientePOS] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [ticketVentaData, setTicketVentaData] = useState<any | null>(null);

  // 5. Estado de Inventario y Productos
  const [busquedaInv, setBusquedaInv] = useState('');
  const [filtroCatInv, setFiltroCatInv] = useState('Todas');
  const [modalProd, setModalProd] = useState(false);
  const [editandoProdId, setEditandoProdId] = useState<number | null>(null);
  const [prodNombre, setProdNombre] = useState('');
  const [prodCategoria, setProdCategoria] = useState('Purinas y Concentrados');
  const [prodCosto, setProdCosto] = useState('');
  const [prodMargenDeseado, setProdMargenDeseado] = useState('20');
  const [prodPrecioDetal, setProdPrecioDetal] = useState('');
  const [prodPrecioMayor, setProdPrecioMayor] = useState('');
  const [prodIVA, setProdIVA] = useState('0');
  const [prodStock, setProdStock] = useState('');
  const [prodStockMin, setProdStockMin] = useState('5');
  const [prodUnidad, setProdUnidad] = useState('bulto');

  // 6. Estado de Clientes
  const [modalCliente, setModalCliente] = useState(false);
  const [cliDoc, setCliDoc] = useState('');
  const [cliNombre, setCliNombre] = useState('');
  const [cliTel, setCliTel] = useState('');
  const [cliDir, setCliDir] = useState('');
  const [busquedaCli, setBusquedaCli] = useState('');

  // 7. Estado de Gastos
  const [modalGasto, setModalGasto] = useState(false);
  const [gastoCat, setGastoCat] = useState('arriendo');
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');

  // 8. Teléfono Admin (Dueño) y Modal Alertas de Stock
  const [telefonoAdmin, setTelefonoAdmin] = useState('3101234567');
  const [modalAlertasStock, setModalAlertasStock] = useState(false);

  // 9. Inicialización y Carga de Sesión
  useEffect(() => {
    const sesion = localStorage.getItem('dyms_usuario');
    if (sesion) {
      try {
        setUsuario(JSON.parse(sesion));
      } catch {
        localStorage.removeItem('dyms_usuario');
      }
    }
    const telGuardado = localStorage.getItem('dyms_tel_admin');
    if (telGuardado) {
      setTelefonoAdmin(telGuardado);
    }
    cargarDatosGenerales();
  }, []);

  const cargarDatosGenerales = async () => {
    setLoading(true);
    try {
      // 1. Productos
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
        // Fallback predeterminado con las categorías clave (bultos, pollos, huevos)
        setProductos([
          { id: 1, nombre: 'Purina Engorde 40kg', categoria: 'Purinas y Concentrados', precio_compra: 95000, precio_venta: 115000, precio_mayorista: 110000, iva_porcentaje: 0, stock: 24, stock_minimo: 5, unidad_medida: 'bulto' },
          { id: 2, nombre: 'Purina Ponedora 40kg', categoria: 'Purinas y Concentrados', precio_compra: 92000, precio_venta: 110000, precio_mayorista: 106000, iva_porcentaje: 0, stock: 18, stock_minimo: 5, unidad_medida: 'bulto' },
          { id: 3, nombre: 'Pollo de Engorde Campesino', categoria: 'Pollos y Aves', precio_compra: 16000, precio_venta: 22000, precio_mayorista: 20000, iva_porcentaje: 0, stock: 35, stock_minimo: 8, unidad_medida: 'unidad' },
          { id: 4, nombre: 'Huevos Tipo AA (Panal 30 Uds)', categoria: 'Huevos', precio_compra: 14000, precio_venta: 18000, precio_mayorista: 16500, iva_porcentaje: 0, stock: 40, stock_minimo: 10, unidad_medida: 'panal' }
        ]);
      }

      // 2. Ventas
      const { data: vts } = await supabase.from('ventas').select('*').order('fecha', { ascending: false });
      if (vts) setVentas(vts);

      // 3. Gastos
      const { data: gts } = await supabase.from('gastos').select('*').order('fecha', { ascending: false });
      if (gts) setGastos(gts);

      // 4. Clientes
      const { data: clis } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
      if (clis) setClientes(clis);

      // 5. Estado de Caja
      const hoy = new Date().toISOString().split('T')[0];
      const { data: cj } = await supabase.from('caja').select('*').order('id', { ascending: false }).limit(1);
      if (cj && cj.length > 0) {
        setCajaActual({
          id: cj[0].id,
          fecha: cj[0].fecha,
          monto_inicial: Number(cj[0].monto_inicial || 0),
          estado: cj[0].estado || 'abierta',
          usuario_apertura: cj[0].usuario_apertura || 'Admin',
          created_at: cj[0].created_at
        });
      }

      // 6. Historial Cierres
      const { data: cierres } = await supabase.from('cierres_caja').select('*').order('hora_cierre', { ascending: false });
      if (cierres) setHistorialCierres(cierres);
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

  // Autenticación DYM'S
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);

    const email = loginEmail.trim().toLowerCase();

    // Acceso directo garantizado
    if (email === 'admin@dyms.com' || email === 'admin@purina.com') {
      if (loginPassword === 'admin123') {
        const u: Usuario = { id: 1, email: 'admin@dyms.com', nombre: 'Administrador DYM’S', rol: 'admin' };
        setUsuario(u);
        localStorage.setItem('dyms_usuario', JSON.stringify(u));
        setLoadingLogin(false);
        return;
      }
    }

    if (email === 'vendedor@dyms.com' || email === 'vendedor@purina.com') {
      if (loginPassword === 'vendedor123') {
        const u: Usuario = { id: 2, email: 'vendedor@dyms.com', nombre: 'Vendedor DYM’S', rol: 'vendedor' };
        setUsuario(u);
        localStorage.setItem('dyms_usuario', JSON.stringify(u));
        setLoadingLogin(false);
        return;
      }
    }

    // Consulta en Supabase
    try {
      const { data } = await supabase.from('usuarios').select('*').eq('email', email).eq('password', loginPassword).single();
      if (data) {
        const u: Usuario = { id: data.id, email: data.email, nombre: data.nombre, rol: data.rol };
        setUsuario(u);
        localStorage.setItem('dyms_usuario', JSON.stringify(u));
      } else {
        setLoginError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      }
    } catch {
      setLoginError('No se pudo verificar la cuenta. Usa admin@dyms.com / admin123');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dyms_usuario');
    setUsuario(null);
    setCarrito([]);
  };

  // ==========================================
  // LÓGICA DE CONTROL DE CAJA
  // ==========================================
  const totalVentasEfectivoHoy = useMemo(() => {
    return ventas
      .filter(v => esVentaDeHoy(v.fecha) && v.metodo_pago === 'efectivo' && v.estado !== 'anulada')
      .reduce((acc, v) => acc + Number(v.total_venta || 0), 0);
  }, [ventas]);

  const totalVentasTransfHoy = useMemo(() => {
    return ventas
      .filter(v => esVentaDeHoy(v.fecha) && v.metodo_pago === 'transferencia' && v.estado !== 'anulada')
      .reduce((acc, v) => acc + Number(v.total_venta || 0), 0);
  }, [ventas]);

  const totalGastosHoy = useMemo(() => {
    return gastos
      .filter(g => esVentaDeHoy(g.fecha))
      .reduce((acc, g) => acc + Number(g.monto || 0), 0);
  }, [gastos]);

  const dineroEsperadoEnCaja = useMemo(() => {
    const base = cajaActual && cajaActual.estado === 'abierta' ? cajaActual.monto_inicial : 0;
    return base + totalVentasEfectivoHoy - totalGastosHoy;
  }, [cajaActual, totalVentasEfectivoHoy, totalGastosHoy]);

  // Apertura de Caja
  const handleAperturaCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(montoAperturaInput);
    if (isNaN(monto) || monto < 0) {
      alert('Ingresa un monto inicial válido.');
      return;
    }

    try {
      const hoy = new Date().toISOString().split('T')[0];
      const nuevaCaja = {
        fecha: hoy,
        monto_inicial: monto,
        estado: 'abierta',
        usuario_apertura: usuario?.nombre || 'Admin'
      };

      const { data, error } = await supabase.from('caja').insert([nuevaCaja]).select().single();
      if (!error && data) {
        setCajaActual({
          id: data.id,
          fecha: data.fecha,
          monto_inicial: Number(data.monto_inicial),
          estado: 'abierta',
          usuario_apertura: data.usuario_apertura,
          created_at: data.created_at
        });
      } else {
        // Fallback local
        setCajaActual({
          id: Date.now(),
          fecha: hoy,
          monto_inicial: monto,
          estado: 'abierta',
          usuario_apertura: usuario?.nombre || 'Admin',
          created_at: new Date().toISOString()
        });
      }

      setMontoAperturaInput('');
      alert('¡Caja abierta exitosamente para la jornada!');
    } catch (err: any) {
      alert('Error abriendo caja: ' + err.message);
    }
  };

  // Cierre Diario de Caja
  const handleConfirmarCierreCaja = async () => {
    if (!cajaActual || cajaActual.estado !== 'abierta') return;
    const real = Number(dineroRealContado);
    if (isNaN(real) || real < 0) {
      alert('Ingresa el monto de dinero real contado en caja.');
      return;
    }

    const dif = real - dineroEsperadoEnCaja;
    const confirmacion = window.confirm(
      `¿Estás seguro de cerrar la caja de hoy?\n\n- Esperado: ${formatoMoneda(dineroEsperadoEnCaja)}\n- Real Contado: ${formatoMoneda(real)}\n- Diferencia: ${formatoMoneda(dif)}\n\nUna vez cerrada, no se podrán registrar nuevas ventas hasta abrir una nueva caja.`
    );
    if (!confirmacion) return;

    const datosCierre = {
      fecha: cajaActual.fecha,
      monto_inicial: cajaActual.monto_inicial,
      ventas_efectivo: totalVentasEfectivoHoy,
      ventas_transferencia: totalVentasTransfHoy,
      total_gastos: totalGastosHoy,
      dinero_esperado: dineroEsperadoEnCaja,
      dinero_real: real,
      diferencia: dif,
      observaciones: obsCierre.trim() || 'Cierre regular de jornada',
      responsable: usuario?.nombre || 'Admin',
      hora_cierre: new Date().toISOString()
    };

    try {
      // 1. Actualizar estado en tabla caja
      await supabase.from('caja').update({ estado: 'cerrada' }).eq('id', cajaActual.id);
      // 2. Guardar en historial de cierres
      await supabase.from('cierres_caja').insert([datosCierre]);
    } catch (e) {
      console.warn('Guardado en Supabase con fallback local:', e);
    }

    setCajaActual(prev => prev ? { ...prev, estado: 'cerrada' } : null);
    setHistorialCierres(prev => [datosCierre, ...prev]);
    setComprobanteCierreData(datosCierre);
    setModalCierreCaja(false);
    setDineroRealContado('');
    setObsCierre('');
    alert('¡Caja cerrada correctamente! Puedes imprimir el comprobante a continuación.');
  };

  // ==========================================
  // LÓGICA DE CLIENTES
  // ==========================================
  const buscarClientePorDoc = (doc: string) => {
    setDocClientePOS(doc);
    const encontrado = clientes.find(c => c.documento === doc.trim());
    if (encontrado) {
      setClienteSeleccionado(encontrado);
      if (encontrado.telefono) {
        setTelClientePOS(encontrado.telefono);
      }
    } else {
      setClienteSeleccionado(null);
    }
  };

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliDoc.trim() || !cliNombre.trim()) {
      alert('Documento y Nombre son obligatorios.');
      return;
    }

    if (clientes.some(c => c.documento.trim() === cliDoc.trim())) {
      alert('¡Ya existe un cliente registrado con ese número de documento!');
      return;
    }

    const nuevo = {
      documento: cliDoc.trim(),
      nombre: cliNombre.trim(),
      telefono: cliTel.trim(),
      direccion: cliDir.trim()
    };

    try {
      const { data, error } = await supabase.from('clientes').insert([nuevo]).select().single();
      if (!error && data) {
        setClientes(prev => [...prev, data]);
      } else {
        setClientes(prev => [...prev, { ...nuevo, id: Date.now() }]);
      }
      setCliDoc('');
      setCliNombre('');
      setCliTel('');
      setCliDir('');
      setModalCliente(false);
      alert('¡Cliente registrado con éxito en DYM’S!');
    } catch (err: any) {
      alert('Error guardando cliente: ' + err.message);
    }
  };

  // ==========================================
  // LÓGICA DE INVENTARIO Y SUGERENCIA DE PRECIOS
  // ==========================================
  // Calculadora de precio sugerido
  const calcularPrecioSugerido = (costo: number, margenPorcentaje: number) => {
    if (!costo || costo <= 0) return 0;
    return Math.round(costo * (1 + margenPorcentaje / 100));
  };

  const handleCostoChange = (val: string) => {
    setProdCosto(val);
    const c = Number(val);
    const m = Number(prodMargenDeseado) || 20;
    if (c > 0) {
      const sugerido = calcularPrecioSugerido(c, m);
      setProdPrecioDetal(String(sugerido));
      setProdPrecioMayor(String(Math.round(sugerido * 0.93))); // ~7% descuento mayorista sugerido
    }
  };

  const handleMargenChange = (val: string) => {
    setProdMargenDeseado(val);
    const c = Number(prodCosto);
    const m = Number(val);
    if (c > 0) {
      const sugerido = calcularPrecioSugerido(c, m);
      setProdPrecioDetal(String(sugerido));
      setProdPrecioMayor(String(Math.round(sugerido * 0.93)));
    }
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNombre.trim()) {
      alert('El nombre del producto es obligatorio.');
      return;
    }

    // Evitar nombres duplicados
    const nombreNormalizado = prodNombre.trim().toLowerCase();
    const duplicado = productos.some(p => p.nombre.toLowerCase() === nombreNormalizado && p.id !== editandoProdId);
    if (duplicado) {
      alert('¡Ya existe un producto registrado con ese mismo nombre en DYM’S!');
      return;
    }

    const productoPayload = {
      nombre: prodNombre.trim(),
      categoria: prodCategoria,
      precio_compra: Number(prodCosto) || 0,
      precio_venta: Number(prodPrecioDetal) || 0,
      precio_mayorista: Number(prodPrecioMayor) || Number(prodPrecioDetal) || 0,
      iva_porcentaje: Number(prodIVA) || 0,
      stock: Number(prodStock) || 0,
      stock_minimo: Number(prodStockMin) || 5,
      unidad_medida: prodUnidad
    };

    try {
      if (editandoProdId) {
        // Actualizar
        await supabase.from('productos').update(productoPayload).eq('id', editandoProdId);
        setProductos(prev => prev.map(p => p.id === editandoProdId ? { ...p, ...productoPayload } : p));
        alert('Producto actualizado con éxito.');
      } else {
        // Insertar
        const { data, error } = await supabase.from('productos').insert([productoPayload]).select().single();
        if (!error && data) {
          setProductos(prev => [...prev, data]);
        } else {
          setProductos(prev => [...prev, { ...productoPayload, id: Date.now() }]);
        }
        alert('Producto creado con éxito en el catálogo de DYM’S.');
      }

      setModalProd(false);
      setEditandoProdId(null);
      setProdNombre('');
      setProdCosto('');
      setProdPrecioDetal('');
      setProdPrecioMayor('');
      setProdStock('');
    } catch (err: any) {
      alert('Error guardando producto: ' + err.message);
    }
  };

  const handleEliminarProducto = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto del inventario?')) return;
    try {
      await supabase.from('productos').delete().eq('id', id);
      setProductos(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Error eliminando producto: ' + err.message);
    }
  };

  // Valor total de inversión en inventario
  const valorTotalInversion = useMemo(() => {
    return productos.reduce((acc, p) => acc + (p.stock * p.precio_compra), 0);
  }, [productos]);

  // ==========================================
  // LÓGICA DE VENTAS (POS)
  // ==========================================
  const agregarAlCarrito = (prod: Producto, tipoPrecio: 'detal' | 'mayorista' = 'detal') => {
    if (!cajaActual || cajaActual.estado !== 'abierta') {
      alert('⚠️ LA CAJA ESTÁ CERRADA.\n\nDebes abrir la caja del día en el módulo de "Control de Caja" antes de registrar ventas.');
      return;
    }

    if (prod.stock <= 0) {
      alert('Este producto no tiene existencias disponibles en bodega.');
      return;
    }

    const itemExistente = carrito.find(i => i.producto.id === prod.id && i.tipo_precio === tipoPrecio);
    const cantActual = itemExistente ? itemExistente.cantidad : 0;

    if (cantActual + 1 > prod.stock) {
      alert(`No puedes agregar más de ${prod.stock} unidades disponibles.`);
      return;
    }

    const precio = tipoPrecio === 'mayorista' ? prod.precio_mayorista : prod.precio_venta;
    const ivaMonto = (precio * (prod.iva_porcentaje || 0)) / 100;

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
      if (nueva > item.producto.stock) {
        alert(`Stock máximo disponible: ${item.producto.stock}`);
        return prev;
      }
      const sub = nueva * item.precio_aplicado;
      const iva = (sub * (item.producto.iva_porcentaje || 0)) / 100;
      const act = { ...item, cantidad: nueva, subtotal: sub, iva_monto: iva, total: sub + iva };
      return prev.map((it, i) => i === idx ? act : it);
    });
  };

  const totalesCarrito = useMemo(() => {
    const subtotal = carrito.reduce((acc, i) => acc + i.subtotal, 0);
    const iva = carrito.reduce((acc, i) => acc + i.iva_monto, 0);
    const total = carrito.reduce((acc, i) => acc + i.total, 0);
    const costo = carrito.reduce((acc, i) => acc + (i.cantidad * i.producto.precio_compra), 0);
    const ganancia = total - costo;
    return { subtotal, iva, total, costo, ganancia };
  }, [carrito]);

  const handleProcesarVenta = async () => {
    if (!cajaActual || cajaActual.estado !== 'abierta') {
      alert('⚠️ Caja Cerrada: Debes abrir la caja para poder facturar.');
      return;
    }

    if (carrito.length === 0) {
      alert('El carrito de compras está vacío.');
      return;
    }

    const clienteNombreFinal = clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente General';
    const clienteDocFinal = clienteSeleccionado ? clienteSeleccionado.documento : (docClientePOS || 'C.C.');
    const clienteTelFinal = telClientePOS.trim() || (clienteSeleccionado ? clienteSeleccionado.telefono : '');

    const nuevasVentas: Venta[] = [];

    try {
      for (const item of carrito) {
        const ventaRecord = {
          cliente_documento: clienteDocFinal,
          cliente_nombre: clienteNombreFinal,
          nombre_producto: item.producto.nombre,
          categoria_producto: item.producto.categoria,
          cantidad: item.cantidad,
          tipo_precio: item.tipo_precio,
          precio_unitario: item.precio_aplicado,
          costo_unitario: item.producto.precio_compra,
          subtotal: item.subtotal,
          iva_total: item.iva_monto,
          total_venta: item.total,
          ganancia_bruta: item.total - (item.cantidad * item.producto.precio_compra),
          metodo_pago: metodoPagoPOS,
          vendedor: usuario?.nombre || 'Vendedor',
          estado: 'completada' as const
        };

        // 1. Insertar venta en BD
        await supabase.from('ventas').insert([ventaRecord]);

        // 2. Descontar Stock
        const nuevoStock = item.producto.stock - item.cantidad;
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.producto.id);

        nuevasVentas.push({ ...ventaRecord, id: Date.now() + Math.random(), fecha: new Date().toISOString() });
      }

      // Actualizar estado local
      setVentas(prev => [...nuevasVentas, ...prev]);
      setProductos(prev => prev.map(p => {
        const enCarro = carrito.find(c => c.producto.id === p.id);
        return enCarro ? { ...p, stock: p.stock - enCarro.cantidad } : p;
      }));

      // Preparar Comprobante Ticket
      const ticket = {
        numero: Math.floor(100000 + Math.random() * 900000),
        fecha: new Date().toLocaleString(),
        cliente: clienteNombreFinal,
        documento: clienteDocFinal,
        telefono: clienteTelFinal,
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
      setDocClientePOS('');
      setTelClientePOS('');
      alert('¡Venta registrada exitosamente en DYM’S!');
    } catch (err: any) {
      alert('Error registrando venta: ' + err.message);
    }
  };

  // ==========================================
  // ANULACIÓN Y DEVOLUCIÓN DE VENTAS
  // ==========================================
  const handleAnularVenta = async (venta: Venta) => {
    if (usuario?.rol !== 'admin') {
      alert('Solo el Administrador tiene autorización para anular ventas y devolver inventario.');
      return;
    }

    if (venta.estado === 'anulada') {
      alert('Esta venta ya se encuentra anulada.');
      return;
    }

    const confirmar = confirm(
      `¿Deseas anular la venta #${venta.id}?\n\n` +
      `• Producto: ${venta.cantidad}x ${venta.nombre_producto}\n` +
      `• Total Cobrado: ${formatoMoneda(venta.total_venta)}\n` +
      `• Cliente: ${venta.cliente_nombre}\n\n` +
      `Esta acción devolverá ${venta.cantidad} unidad(es) de vuelta al inventario y descontará el dinero de la caja.`
    );
    if (!confirmar) return;

    const motivo = prompt('Ingresa el motivo de la anulación (ej: Error de digitación, Devolución de cliente):', 'Error de facturación');
    if (motivo === null) return;

    try {
      // 1. Devolver Stock del Producto
      const prod = productos.find(p => p.nombre.toLowerCase().trim() === venta.nombre_producto.toLowerCase().trim());
      if (prod) {
        const nuevoStock = prod.stock + venta.cantidad;
        setProductos(prev => prev.map(p => p.id === prod.id ? { ...p, stock: nuevoStock } : p));
        try {
          await supabase.from('productos').update({ stock: nuevoStock }).eq('id', prod.id);
        } catch (e) {
          console.warn('Actualizado localmente en productos', e);
        }
      }

      // 2. Marcar Venta como Anulada
      const ventaActualizada: Venta = { 
        ...venta, 
        estado: 'anulada', 
        motivo_anulacion: motivo.trim() || 'Anulación autorizada' 
      };

      try {
        await supabase.from('ventas').update({ 
          estado: 'anulada', 
          motivo_anulacion: ventaActualizada.motivo_anulacion 
        }).eq('id', venta.id);
      } catch (e) {
        console.warn('Actualizado localmente en ventas', e);
      }

      setVentas(prev => prev.map(v => v.id === venta.id ? ventaActualizada : v));

      alert(
        `✅ Venta #${venta.id} anulada con éxito.\n\n` +
        `• Se devolvieron +${venta.cantidad} unidad(es) al stock de "${venta.nombre_producto}".\n` +
        `• Se descontaron ${formatoMoneda(venta.total_venta)} del saldo esperado en caja.`
      );
    } catch (err: any) {
      alert('Error anulando la venta: ' + err.message);
    }
  };

  // ==========================================
  // GASTOS OPERACIONALES
  // ==========================================
  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(gastoMonto);
    if (!gastoDesc.trim() || isNaN(m) || m <= 0) {
      alert('Ingresa descripción y monto válido.');
      return;
    }

    const payload = {
      categoria: gastoCat,
      descripcion: gastoDesc.trim(),
      monto: m
    };

    try {
      const { data, error } = await supabase.from('gastos').insert([payload]).select().single();
      if (!error && data) {
        setGastos(prev => [data, ...prev]);
      } else {
        setGastos(prev => [{ ...payload, id: Date.now(), fecha: new Date().toISOString() }, ...prev]);
      }
      setGastoDesc('');
      setGastoMonto('');
      setModalGasto(false);
      alert('Gasto registrado exitosamente.');
    } catch (err: any) {
      alert('Error registrando gasto: ' + err.message);
    }
  };

  // ==========================================
  // EXPORTACIONES A EXCEL (.CSV UTF-8)
  // ==========================================
  const exportarInventarioExcel = () => {
    if (productos.length === 0) return alert('No hay productos para exportar.');
    const encabezados = ['ID', 'Producto', 'Categoría', 'Unidad', 'Costo Compra', 'Precio Detal', 'Precio Mayorista', 'IVA (%)', 'Stock', 'Inversión Total', 'Estado'];
    const filas = productos.map(p => [
      p.id,
      `"${p.nombre.replace(/"/g, '""')}"`,
      `"${p.categoria}"`,
      p.unidad_medida,
      p.precio_compra,
      p.precio_venta,
      p.precio_mayorista,
      `${p.iva_porcentaje}%`,
      p.stock,
      p.stock * p.precio_compra,
      p.stock <= 0 ? 'AGOTADO' : p.stock <= p.stock_minimo ? 'STOCK BAJO' : 'DISPONIBLE'
    ].join(';'));

    descargarCSV(`DYMS_Inventario_${new Date().toISOString().split('T')[0]}.csv`, [encabezados.join(';'), ...filas].join('\r\n'));
  };

  const exportarVentasExcel = (soloHoy: boolean | any = false) => {
    const esHoy = soloHoy === true;
    const ventasFiltradas = esHoy ? ventas.filter(v => esVentaDeHoy(v.fecha)) : ventas;
    if (ventasFiltradas.length === 0) {
      alert(esHoy ? 'No se registran ventas el día de hoy para exportar.' : 'No hay ventas registradas para exportar.');
      return;
    }

    const ventasEfectivas = ventasFiltradas.filter(v => v.estado !== 'anulada');
    const totalVenta = ventasEfectivas.reduce((acc, v) => acc + (v.total_venta || 0), 0);
    const totalGanancia = ventasEfectivas.reduce((acc, v) => acc + (v.ganancia_bruta || 0), 0);
    const totalEfectivo = ventasEfectivas.filter(v => v.metodo_pago === 'efectivo').reduce((acc, v) => acc + (v.total_venta || 0), 0);
    const totalTransf = ventasEfectivas.filter(v => v.metodo_pago === 'transferencia').reduce((acc, v) => acc + (v.total_venta || 0), 0);
    const totalAnuladas = ventasFiltradas.filter(v => v.estado === 'anulada').length;

    const fechaHoyStr = new Date().toLocaleDateString();
    const resumenHeader = soloHoy ? [
      `"DYM’S — RESUMEN DE VENTAS DEL DÍA (${fechaHoyStr})"`,
      `"Total Facturado Válido:";"${totalVenta}";"Efectivo:";"${totalEfectivo}";"Transferencias:";"${totalTransf}";"Ganancia Estimada:";"${totalGanancia}";"Ventas Anuladas:";"${totalAnuladas}"`,
      `""`
    ] : [
      `"DYM’S — HISTORIAL COMPLETO DE VENTAS"`,
      `"Fecha de Generación:";"${fechaHoyStr}";"Total Efectivo Acumulado:";"${totalVenta}";"Ganancia Total:";"${totalGanancia}";"Total Anuladas:";"${totalAnuladas}"`,
      `""`
    ];

    const encabezados = ['ID', 'Fecha', 'Hora', 'Estado', 'Cliente', 'Documento', 'Producto', 'Categoría', 'Cant', 'Tipo Precio', 'Precio Unit', 'Subtotal', 'IVA', 'Total Venta', 'Ganancia Estimada', 'Pago', 'Vendedor', 'Motivo Anulación'];
    const filas = ventasFiltradas.map(v => {
      const f = new Date(v.fecha);
      return [
        v.id,
        f.toLocaleDateString(),
        f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        v.estado === 'anulada' ? 'ANULADA' : 'COMPLETADA',
        `"${v.cliente_nombre || 'Cliente General'}"`,
        v.cliente_documento || 'C.C.',
        `"${v.nombre_producto}"`,
        `"${v.categoria_producto || 'General'}"`,
        v.cantidad,
        v.tipo_precio,
        v.precio_unitario,
        v.subtotal,
        v.iva_total,
        v.estado === 'anulada' ? 0 : v.total_venta,
        v.estado === 'anulada' ? 0 : v.ganancia_bruta,
        v.metodo_pago,
        v.vendedor,
        `"${v.motivo_anulacion || ''}"`
      ].join(';');
    });

    const nombreArchivo = soloHoy 
      ? `DYMS_Resumen_Ventas_Dia_${new Date().toISOString().split('T')[0]}.csv`
      : `DYMS_Historial_Ventas_${new Date().toISOString().split('T')[0]}.csv`;

    descargarCSV(nombreArchivo, [...resumenHeader, encabezados.join(';'), ...filas].join('\r\n'));
  };

  const descargarCSV = (nombreArchivo: string, contenido: string) => {
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. WhatsApp Comprobante para el Cliente
  const generarLinkWhatsAppCliente = (ticket: any) => {
    if (!ticket) return '#';
    const detalle = ticket.items.map((i: ItemCarrito) => `• ${i.cantidad}x ${i.producto.nombre} (${formatoMoneda(i.total)})`).join('\n');
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

  // 2. WhatsApp Notificación Interna para el Administrador / Dueño
  const generarLinkWhatsAppAdmin = (ticket: any) => {
    if (!ticket) return '#';
    const detalle = ticket.items.map((i: ItemCarrito) => `• ${i.cantidad}x ${i.producto.nombre} = ${formatoMoneda(i.total)}`).join('\n');
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

  // =========================================================================
  // VISTA: LOGIN (Colores: #E35336 Terracotta, #FFF8DC Cornsilk, #212121 Negro)
  // =========================================================================
  if (!usuario) {
    return (
      <div className="min-h-screen bg-[#212121] flex flex-col justify-center items-center p-4 selection:bg-[#E35336] selection:text-white">
        {/* Tarjeta de Login DYM'S */}
        <div className="w-full max-w-md bg-[#FFF8DC] rounded-3xl shadow-2xl p-8 border-4 border-[#E35336] animate-scale-up">
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#212121] uppercase mb-1.5">
                Correo Electrónico:
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-[#212121]/50 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@dyms.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#212121]/20 rounded-2xl focus:border-[#E35336] focus:ring-2 focus:ring-[#E35336]/20 outline-none text-sm font-semibold text-[#212121]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#212121] uppercase mb-1.5">
                Contraseña:
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-[#212121]/50 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-[#212121]/20 rounded-2xl focus:border-[#E35336] focus:ring-2 focus:ring-[#E35336]/20 outline-none text-sm font-semibold text-[#212121]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full py-3.5 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-sm shadow-lg hover:shadow-xl transition transform active:scale-98 mt-2"
            >
              {loadingLogin ? 'Ingresando a DYM’S...' : 'Ingresar al Sistema'}
            </button>
          </form>

          {/* Cuentas de Acceso Preconfiguradas para pruebas */}
          <div className="mt-8 pt-5 border-t border-[#212121]/15 text-center">
            <p className="text-[11px] font-bold text-[#212121]/60 uppercase mb-2">Acceso Rápido Autorizado:</p>
            <div className="flex justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setLoginEmail('admin@dyms.com'); setLoginPassword('admin123'); }}
                className="px-3 py-1.5 bg-white border border-[#E35336] text-[#E35336] font-bold rounded-xl hover:bg-[#E35336] hover:text-white transition"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('vendedor@dyms.com'); setLoginPassword('vendedor123'); }}
                className="px-3 py-1.5 bg-white border border-[#212121] text-[#212121] font-bold rounded-xl hover:bg-[#212121] hover:text-white transition"
              >
                🛒 Vendedor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA: SISTEMA PRINCIPAL DYM'S (AUTENTICADO)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#CBD5E1] text-[#212121] flex flex-col font-sans">
      {/* BARRA SUPERIOR DYM'S */}
      <header className="bg-[#212121] text-white shadow-xl sticky top-0 z-30 border-b-4 border-[#E35336]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#E35336] text-white p-2.5 rounded-2xl shadow-md">
              <Package className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">DYM’S</span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#E35336] text-white">
                  v3.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#FFF8DC]/70">Gestión de Inventario, Ventas & Caja</p>
            </div>
          </div>

          {/* Menú de Navegación Modular */}
          <nav className="flex items-center gap-1.5 bg-[#2b2b2b] p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
            <button
              onClick={() => setModuloActivo('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'dashboard' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Inicio
            </button>
            <button
              onClick={() => setModuloActivo('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'pos' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Venta POS
            </button>
            <button
              onClick={() => setModuloActivo('ventas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'ventas' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Ventas Realizadas
            </button>
            <button
              onClick={() => setModuloActivo('inventario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'inventario' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Inventario
            </button>
            <button
              onClick={() => setModuloActivo('caja')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'caja' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Caja
            </button>
            <button
              onClick={() => setModuloActivo('clientes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                moduloActivo === 'clientes' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
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
                  <DollarSign className="w-4 h-4" />
                  Gastos
                </button>
                <button
                  onClick={() => setModuloActivo('reportes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    moduloActivo === 'reportes' ? 'bg-[#E35336] text-white shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Reportes
                </button>
              </>
            )}
          </nav>

          {/* Perfil & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white">{usuario.nombre}</p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                usuario.rol === 'admin' ? 'bg-[#FFF8DC] text-[#212121]' : 'bg-[#E35336] text-white'
              }`}>
                {usuario.rol === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 rounded-xl bg-white/10 hover:bg-[#D32F2F] text-white transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ALERTA DE ESTADO DE CAJA */}
      {(!cajaActual || cajaActual.estado === 'cerrada') && (
        <div className="bg-[#D32F2F] text-white py-2 px-4 shadow-md text-xs font-bold flex items-center justify-between">
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

      {/* CONTENEDOR PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* ============================================================ */}
        {/* 1. MÓDULO: DASHBOARD / INICIO */}
        {/* ============================================================ */}
        {moduloActivo === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Panel General de DYM’S</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Resumen operativo de hoy y estado del negocio</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FFF8DC] border border-[#E35336] text-[#E35336] flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cajaActual?.estado === 'abierta' ? 'bg-emerald-500' : 'bg-[#D32F2F]'}`}></span>
                  Caja: {cajaActual?.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                </span>
                <button
                  onClick={cargarDatosGenerales}
                  className="p-2 rounded-xl bg-white border border-[#212121]/20 hover:bg-[#FFF8DC] text-[#212121] transition"
                  title="Actualizar datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ventas Hoy */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs hover:border-[#E35336] transition">
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
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs hover:border-[#E35336] transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-[#212121]/60 uppercase">Efectivo en Caja</span>
                  <div className="p-2 bg-[#FFF8DC] text-[#E35336] rounded-xl border border-[#E35336]">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-[#E35336]">
                  {formatoMoneda(dineroEsperadoEnCaja)}
                </p>
                <p className="text-[11px] text-[#212121]/60 mt-1 font-semibold">
                  Base ({formatoMoneda(cajaActual?.monto_inicial || 0)}) + Ventas - Gastos
                </p>
              </div>

              {/* Valor de Inversión Inventario */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs hover:border-[#E35336] transition">
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

              {/* Alertas de Stock Bajo (Interactivo: abre detalle de productos) */}
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

            {/* Desglose de Ventas por Categoría (Bultos, Pollos, Huevos) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/10 shadow-xs space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-black text-lg text-[#212121]">Movimiento de Categorías Clave (DYM’S)</h3>
                  <span className="text-xs text-[#212121]/50 font-bold">Distribución de existencias</span>
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
                        <p className="text-xs text-[#212121]/60 font-semibold">unidades/bultos</p>
                        <p className="text-xs font-bold text-[#212121] mt-2">Valor: {formatoMoneda(valorCat)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/10 shadow-xs space-y-3">
                <h3 className="font-black text-base text-[#212121] border-b pb-3">Acciones Inmediatas</h3>
                <button
                  onClick={() => setModuloActivo('pos')}
                  className="w-full py-3 px-4 rounded-2xl bg-[#E35336] text-white font-black text-sm flex items-center justify-between hover:bg-[#d0462a] transition shadow-md"
                >
                  <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Facturar Nueva Venta</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setModalProd(true); setEditandoProdId(null); }}
                  className="w-full py-3 px-4 rounded-2xl bg-[#212121] text-white font-black text-sm flex items-center justify-between hover:bg-[#333] transition"
                >
                  <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Crear Nuevo Producto</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setModuloActivo('caja')}
                  className="w-full py-3 px-4 rounded-2xl bg-[#FFF8DC] text-[#212121] border-2 border-[#E35336] font-black text-sm flex items-center justify-between hover:bg-[#FFF8DC]/80 transition"
                >
                  <span className="flex items-center gap-2"><Wallet className="w-4 h-4 text-[#E35336]" /> Arqueo / Cierre de Caja</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabla de Ventas Recientes en el Dashboard con botón de Descarga de Resumen del Día */}
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
                    title="Descargar archivo Excel con el resumen y desglose de las ventas del día"
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
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Cant</th>
                        <th className="py-2.5 px-3">Total Venta</th>
                        <th className="py-2.5 px-3">Método</th>
                        <th className="py-2.5 px-3">Vendedor</th>
                        {usuario.rol === 'admin' && <th className="py-2.5 px-3 text-center">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {ventas
                        .filter(v => esVentaDeHoy(v.fecha))
                        .slice(0, 8)
                        .map((v) => {
                          const f = new Date(v.fecha);
                          return (
                            <tr key={v.id} className={`hover:bg-slate-50 transition ${v.estado === 'anulada' ? 'bg-rose-50/20 opacity-70' : ''}`}>
                              <td className="py-2.5 px-3 font-mono">{f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2.5 px-3">
                                {v.estado === 'anulada' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#D32F2F]/15 text-[#D32F2F] border border-[#D32F2F]/30">
                                    Anulada
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                    Válida
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#212121]">{v.cliente_nombre || 'Cliente General'}</td>
                              <td className="py-2.5 px-3">{v.nombre_producto}</td>
                              <td className="py-2.5 px-3 font-black">{v.cantidad}</td>
                              <td className={`py-2.5 px-3 font-black ${v.estado === 'anulada' ? 'line-through text-slate-400' : 'text-[#E35336]'}`}>
                                {formatoMoneda(v.total_venta)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  v.metodo_pago === 'efectivo' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {v.metodo_pago}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[#212121]/60">{v.vendedor}</td>
                              {usuario.rol === 'admin' && (
                                <td className="py-2.5 px-3 text-center">
                                  {v.estado !== 'anulada' && (
                                    <button
                                      type="button"
                                      onClick={() => handleAnularVenta(v)}
                                      className="p-1 rounded-lg bg-rose-50 text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white transition"
                                      title="Anular venta y devolver stock"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              )}
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
        {/* 2. MÓDULO: VENTAS REALIZADAS (HISTORIAL & EXPORTACIÓN EXCEL) */}
        {/* ============================================================ */}
        {moduloActivo === 'ventas' && (
          <div className="space-y-6 animate-fade-in">
            {/* Cabecera del Módulo */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Ventas Realizadas</h2>
                <p className="text-xs font-semibold text-[#212121]/60">
                  Historial de transacciones, resumen consolidado del día y descarga de reportes en Excel
                </p>
              </div>

              {/* Botones de Exportación a Excel */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportarVentasExcel(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
                  title="Descargar Excel con el resumen consolidado y las ventas de hoy"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Resumen del Día (.CSV)</span>
                </button>
                <button
                  onClick={() => exportarVentasExcel(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#212121] hover:bg-[#333] text-white font-black text-xs shadow-md transition"
                  title="Descargar todo el historial acumulado en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Historial Completo (.CSV)</span>
                </button>
                <button
                  onClick={() => setModuloActivo('pos')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#E35336] hover:bg-[#d0462a] text-white font-black text-xs shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Venta</span>
                </button>
              </div>
            </div>

            {/* Tarjetas KPI de Resumen del Día */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <span className="text-xs font-black text-[#212121]/60 uppercase">Facturado Hoy</span>
                <p className="text-2xl font-black text-[#212121] mt-1">
                  {formatoMoneda(totalVentasEfectivoHoy + totalVentasTransfHoy)}
                </p>
                <p className="text-[11px] text-emerald-700 font-bold mt-1">
                  {ventas.filter(v => esVentaDeHoy(v.fecha)).length} ventas registradas hoy
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <span className="text-xs font-black text-[#212121]/60 uppercase">Efectivo Hoy</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {formatoMoneda(totalVentasEfectivoHoy)}
                </p>
                <p className="text-[11px] text-[#212121]/60 font-semibold mt-1">
                  Dinero recaudado en caja física
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <span className="text-xs font-black text-[#212121]/60 uppercase">Transferencias Hoy</span>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {formatoMoneda(totalVentasTransfHoy)}
                </p>
                <p className="text-[11px] text-[#212121]/60 font-semibold mt-1">
                  Bancolombia, Nequi, Daviplata
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs">
                <span className="text-xs font-black text-[#212121]/60 uppercase">Ganancia Bruta Hoy</span>
                <p className="text-2xl font-black text-[#E35336] mt-1">
                  {formatoMoneda(
                    ventas
                      .filter(v => esVentaDeHoy(v.fecha))
                      .reduce((acc, v) => acc + (v.ganancia_bruta || 0), 0)
                  )}
                </p>
                <p className="text-[11px] text-[#212121]/60 font-semibold mt-1">
                  Margen después de costo de compra
                </p>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroVentasTiempo('hoy')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                    filtroVentasTiempo === 'hoy'
                      ? 'bg-[#E35336] text-white shadow-sm'
                      : 'bg-slate-100 text-[#212121] hover:bg-slate-200'
                  }`}
                >
                  Ventas de Hoy ({ventas.filter(v => esVentaDeHoy(v.fecha)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroVentasTiempo('todas')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                    filtroVentasTiempo === 'todas'
                      ? 'bg-[#E35336] text-white shadow-sm'
                      : 'bg-slate-100 text-[#212121] hover:bg-slate-200'
                  }`}
                >
                  Todas las Ventas ({ventas.length})
                </button>
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, documento o producto..."
                  value={busquedaVentasHist}
                  onChange={(e) => setBusquedaVentasHist(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-bold border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>
            </div>

            {/* Tabla Detallada de Ventas */}
            <div className="bg-white rounded-3xl border-2 border-[#212121]/15 shadow-sm overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="font-black text-base text-[#212121]">
                  {filtroVentasTiempo === 'hoy' ? 'Detalle de Ventas de Hoy' : 'Historial Acumulado de Ventas'}
                </h3>
                <span className="text-xs font-bold text-[#212121]/60">
                  Mostrando{' '}
                  {
                    ventas
                      .filter(v => (filtroVentasTiempo === 'hoy' ? esVentaDeHoy(v.fecha) : true))
                      .filter(v => {
                        if (!busquedaVentasHist.trim()) return true;
                        const q = busquedaVentasHist.toLowerCase();
                        return (
                          (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(q)) ||
                          (v.cliente_documento && v.cliente_documento.toLowerCase().includes(q)) ||
                          (v.nombre_producto && v.nombre_producto.toLowerCase().includes(q)) ||
                          (v.vendedor && v.vendedor.toLowerCase().includes(q))
                        );
                      }).length
                  }{' '}
                  registro(s)
                </span>
              </div>

              {ventas.filter(v => (filtroVentasTiempo === 'hoy' ? esVentaDeHoy(v.fecha) : true)).length === 0 ? (
                <div className="text-center py-16 text-[#212121]/50 space-y-2">
                  <Receipt className="w-10 h-10 mx-auto opacity-40" />
                  <p className="font-bold text-sm">
                    {filtroVentasTiempo === 'hoy' ? 'No se han registrado ventas el día de hoy.' : 'No hay ventas en el historial.'}
                  </p>
                  <button
                    onClick={() => setModuloActivo('pos')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E35336] text-white text-xs font-bold hover:bg-[#d0462a] transition"
                  >
                    <ShoppingCart className="w-4 h-4" /> Ir a Facturar en POS
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF8DC] uppercase font-black text-[10px] text-[#212121] sticky top-0 border-b">
                      <tr>
                        <th className="py-3 px-4">Fecha/Hora</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Cant.</th>
                        <th className="py-3 px-4">Precio Unit.</th>
                        <th className="py-3 px-4">Total Venta</th>
                        <th className="py-3 px-4">Ganancia</th>
                        <th className="py-3 px-4">Método</th>
                        <th className="py-3 px-4">Vendedor</th>
                        <th className="py-3 px-4 text-center">Estado / Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {ventas
                        .filter(v => (filtroVentasTiempo === 'hoy' ? esVentaDeHoy(v.fecha) : true))
                        .filter(v => {
                          if (!busquedaVentasHist.trim()) return true;
                          const q = busquedaVentasHist.toLowerCase();
                          return (
                            (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(q)) ||
                            (v.cliente_documento && v.cliente_documento.toLowerCase().includes(q)) ||
                            (v.nombre_producto && v.nombre_producto.toLowerCase().includes(q)) ||
                            (v.vendedor && v.vendedor.toLowerCase().includes(q))
                          );
                        })
                        .map((v) => {
                          const f = new Date(v.fecha);
                          return (
                            <tr key={v.id} className={`hover:bg-slate-50 transition ${v.estado === 'anulada' ? 'bg-rose-50/20 opacity-70' : ''}`}>
                              <td className="py-3 px-4 font-mono text-[11px]">
                                <span className="block font-bold">{f.toLocaleDateString()}</span>
                                <span className="text-[#212121]/60 text-[10px]">{f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-[#212121] block">{v.cliente_nombre || 'Cliente General'}</span>
                                <span className="text-[10px] text-[#212121]/60">Doc: {v.cliente_documento || 'C.C.'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-[#212121] block">{v.nombre_producto}</span>
                                <span className="text-[10px] text-[#E35336] uppercase font-bold">{v.categoria_producto || 'General'}</span>
                              </td>
                              <td className="py-3 px-4 font-black">{v.cantidad}</td>
                              <td className="py-3 px-4 font-mono">
                                {formatoMoneda(v.precio_unitario)}
                                <span className="text-[9px] text-[#212121]/50 block uppercase">({v.tipo_precio})</span>
                              </td>
                              <td className={`py-3 px-4 font-black text-sm font-mono ${v.estado === 'anulada' ? 'line-through text-slate-400' : 'text-[#212121]'}`}>
                                {formatoMoneda(v.total_venta)}
                              </td>
                              <td className={`py-3 px-4 font-bold font-mono ${v.estado === 'anulada' ? 'line-through text-slate-400' : 'text-emerald-700'}`}>
                                +{formatoMoneda(v.ganancia_bruta)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                  v.metodo_pago === 'efectivo'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}>
                                  {v.metodo_pago}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[#212121]/70">{v.vendedor}</td>
                              <td className="py-3 px-4 text-center">
                                {v.estado === 'anulada' ? (
                                  <div className="inline-block text-center">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#D32F2F]/15 text-[#D32F2F] border border-[#D32F2F]/30">
                                      ❌ Anulada
                                    </span>
                                    {v.motivo_anulacion && (
                                      <p className="text-[9px] text-[#D32F2F] italic truncate max-w-[120px] mx-auto mt-0.5" title={v.motivo_anulacion}>
                                        {v.motivo_anulacion}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                      Completada
                                    </span>
                                    {usuario?.rol === 'admin' && (
                                      <button
                                        type="button"
                                        onClick={() => handleAnularVenta(v)}
                                        className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-[#D32F2F] text-[#D32F2F] hover:text-white transition flex items-center gap-1 text-[10px] font-bold shadow-xs"
                                        title="Anular venta y devolver unidades al inventario"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Anular</span>
                                      </button>
                                    )}
                                  </div>
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
        {/* 3. MÓDULO: VENTAS (POS) */}
        {/* ============================================================ */}
        {moduloActivo === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Columna Izquierda: Catálogo y Búsqueda */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-3xl border-2 border-[#212121]/10 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-[#212121]">Punto de Venta DYM’S</h2>
                  {/* Selector de Cliente por Cédula y Teléfono WhatsApp Directo */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-44">
                      <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar C.C. Cliente..."
                        value={docClientePOS}
                        onChange={(e) => buscarClientePorDoc(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs font-bold border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
                      />
                    </div>
                    {/* Campo de WhatsApp Ocasional / Directo */}
                    <div className="relative flex-1 sm:w-44">
                      <span className="text-[10px] font-bold text-emerald-700 absolute left-2.5 top-2">📱 Tel:</span>
                      <input
                        type="text"
                        placeholder="WhatsApp cliente..."
                        value={telClientePOS}
                        onChange={(e) => setTelClientePOS(e.target.value)}
                        className="w-full pl-14 pr-3 py-1.5 text-xs font-bold border-2 border-emerald-600/30 rounded-xl focus:border-emerald-600 outline-none bg-emerald-50/20"
                        title="Teléfono del cliente para el envío del ticket por WhatsApp (opcional para clientes no registrados)"
                      />
                    </div>
                    <button
                      onClick={() => setModalCliente(true)}
                      className="p-2 rounded-xl bg-[#FFF8DC] border border-[#E35336] text-[#E35336] font-bold text-xs shrink-0"
                      title="Registrar cliente formal en base de datos"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {clienteSeleccionado && (
                  <div className="bg-[#FFF8DC] border border-[#E35336] p-2.5 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#E35336]">Cliente Registrado: </span>
                      <strong className="text-[#212121]">{clienteSeleccionado.nombre}</strong> (Doc: {clienteSeleccionado.documento})
                      {clienteSeleccionado.telefono && (
                        <span className="text-emerald-800 font-bold ml-2">
                          • 📱 {clienteSeleccionado.telefono}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        setClienteSeleccionado(null);
                        setDocClientePOS('');
                        setTelClientePOS('');
                      }} 
                      className="text-[#D32F2F] font-black text-xs hover:underline ml-2"
                    >
                      Quitar
                    </button>
                  </div>
                )}

                {/* Filtros de Categoría y Búsqueda de Producto */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-[#212121]/50 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre..."
                      value={busquedaProdPOS}
                      onChange={(e) => setBusquedaProdPOS(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
                    />
                  </div>
                  <select
                    value={filtroCatPOS}
                    onChange={(e) => setFiltroCatPOS(e.target.value)}
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

              {/* Grid de Productos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                {productos
                  .filter(p => {
                    const matchNombre = p.nombre.toLowerCase().includes(busquedaProdPOS.toLowerCase());
                    const matchCat = filtroCatPOS === 'Todas' || p.categoria === filtroCatPOS;
                    return matchNombre && matchCat;
                  })
                  .map((p) => {
                    const agotado = p.stock <= 0;
                    return (
                      <div
                        key={p.id}
                        className={`bg-white p-4 rounded-3xl border-2 transition shadow-xs flex flex-col justify-between ${
                          agotado ? 'border-[#D32F2F]/30 bg-red-50/20 opacity-70' : 'border-[#212121]/10 hover:border-[#E35336]'
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
                  })}
              </div>
            </div>

            {/* Columna Derecha: Carrito y Facturación */}
            <div className="lg:col-span-5">
              <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-md flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-[#E35336]" />
                      <h3 className="font-black text-lg text-[#212121]">Ticket de Venta Actual</h3>
                    </div>
                    <span className="text-xs font-bold text-[#E35336]">{carrito.length} artículos</span>
                  </div>

                  {/* Lista de Ítems */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {carrito.length === 0 ? (
                      <div className="text-center py-12 text-[#212121]/40 text-xs font-bold">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No has agregado ningún producto al ticket
                      </div>
                    ) : (
                      carrito.map((item, idx) => (
                        <div key={idx} className="bg-[#FFF8DC]/30 p-2.5 rounded-2xl border border-[#212121]/10 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-[#212121] leading-tight">{item.producto.nombre}</p>
                            <span className="text-[10px] text-[#E35336] font-black uppercase">
                              {item.tipo_precio} • {formatoMoneda(item.precio_aplicado)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => modificarCantidadCarrito(idx, -1)}
                              className="w-6 h-6 rounded-lg bg-slate-200 text-[#212121] font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="font-black text-sm w-5 text-center">{item.cantidad}</span>
                            <button
                              onClick={() => modificarCantidadCarrito(idx, 1)}
                              className="w-6 h-6 rounded-lg bg-slate-200 text-[#212121] font-bold text-xs"
                            >
                              +
                            </button>
                            <span className="font-black text-sm text-[#212121] ml-2 w-16 text-right">
                              {formatoMoneda(item.total)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Totales y Cobro */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <div className="space-y-1.5 text-xs text-[#212121]/70">
                    <div className="flex justify-between">
                      <span>Subtotal Venta:</span>
                      <span className="font-bold text-[#212121]">{formatoMoneda(totalesCarrito.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA Configurado:</span>
                      <span className="font-bold text-[#212121]">{formatoMoneda(totalesCarrito.iva)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-[#212121] pt-2 border-t">
                      <span>TOTAL A COBRAR:</span>
                      <span className="text-xl text-[#E35336]">{formatoMoneda(totalesCarrito.total)}</span>
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
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

                  <button
                    disabled={carrito.length === 0}
                    onClick={handleProcesarVenta}
                    className="w-full py-3.5 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-sm shadow-lg hover:shadow-xl transition disabled:bg-slate-300 transform active:scale-98"
                  >
                    Confirmar Venta & Emitir Comprobante
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. MÓDULO: INVENTARIO (BULTOS, POLLOS, HUEVOS) */}
        {/* ============================================================ */}
        {moduloActivo === 'inventario' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Control de Inventario y Productos</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Administración de precios, costos, existencias y alertas</p>
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

            {/* Filtros */}
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

            {/* Tabla de Productos */}
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
                    <th className="py-3 px-3">Valor Total</th>
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
                      const margen = p.precio_venta - p.precio_compra;
                      const margenPct = p.precio_compra > 0 ? ((margen / p.precio_compra) * 100).toFixed(0) : '0';
                      const stockBajo = p.stock <= p.stock_minimo;
                      return (
                        <tr key={p.id} className="hover:bg-[#FFF8DC]/20">
                          <td className="py-3 px-3 font-bold text-[#212121]">{p.nombre}</td>
                          <td className="py-3 px-3">
                            <span className="bg-[#FFF8DC] text-[#E35336] px-2 py-0.5 rounded-md font-bold text-[10px]">
                              {p.categoria}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#212121]/70">{formatoMoneda(p.precio_compra)}</td>
                          <td className="py-3 px-3 font-black text-[#212121]">{formatoMoneda(p.precio_venta)}</td>
                          <td className="py-3 px-3 font-bold text-[#E35336]">{formatoMoneda(p.precio_mayorista)}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-emerald-800">+{formatoMoneda(margen)}</span>{' '}
                            <span className="text-[10px] text-[#212121]/50">({margenPct}%)</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`font-black ${stockBajo ? 'text-[#D32F2F]' : 'text-[#212121]'}`}>
                              {p.stock} {p.unidad_medida}s
                            </span>
                            {stockBajo && (
                              <span className="ml-1 text-[10px] font-bold text-[#D32F2F] bg-red-50 px-1 rounded">
                                ¡Mínimo!
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#212121]">
                            {formatoMoneda(p.stock * p.precio_compra)}
                          </td>
                          {usuario.rol === 'admin' && (
                            <td className="py-3 px-3 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setEditandoProdId(p.id);
                                  setProdNombre(p.nombre);
                                  setProdCategoria(p.categoria);
                                  setProdCosto(String(p.precio_compra));
                                  setProdPrecioDetal(String(p.precio_venta));
                                  setProdPrecioMayor(String(p.precio_mayorista));
                                  setProdStock(String(p.stock));
                                  setProdStockMin(String(p.stock_minimo));
                                  setProdUnidad(p.unidad_medida);
                                  setModalProd(true);
                                }}
                                className="p-1 rounded bg-slate-100 hover:bg-[#FFF8DC] text-[#212121]"
                                title="Editar producto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEliminarProducto(p.id)}
                                className="p-1 rounded bg-rose-50 hover:bg-[#D32F2F] text-[#D32F2F] hover:text-white"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        {/* 4. MÓDULO: CONTROL DE CAJA (APERTURA, ARQUEO Y CIERRE) */}
        {/* ============================================================ */}
        {moduloActivo === 'caja' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Control y Cuadre Diario de Caja</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Administración de la base diaria, ingresos, egresos y cierre de jornada</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportarVentasExcel(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
                  title="Descargar archivo Excel con el resumen de ventas del día"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Resumen del Día (Excel)</span>
                </button>
                {cajaActual?.estado === 'abierta' && (
                  <button
                    onClick={() => setModalCierreCaja(true)}
                    className="bg-[#D32F2F] hover:bg-[#b71c1c] text-white px-4 py-2.5 rounded-2xl font-black text-xs shadow-md transition flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Efectuar Cierre de Caja</span>
                  </button>
                )}
              </div>
            </div>

            {/* Si la caja está cerrada, mostrar tarjeta de Apertura */}
            {(!cajaActual || cajaActual.estado === 'cerrada') && (
              <div className="bg-white p-6 rounded-3xl border-4 border-[#E35336] shadow-md max-w-lg mx-auto text-center space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-[#FFF8DC] text-[#E35336]">
                  <Wallet className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#212121]">Apertura de Caja para la Jornada</h3>
                <p className="text-xs text-[#212121]/60 leading-relaxed font-semibold">
                  Ingresa con cuánto dinero en efectivo físico inicias la caja del día. Esto desbloqueará las ventas.
                </p>

                <form onSubmit={handleAperturaCaja} className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-[#212121] uppercase mb-1">Monto Base Inicial ($):</label>
                    <input
                      type="number"
                      required
                      placeholder="Ej: 100000"
                      value={montoAperturaInput}
                      onChange={(e) => setMontoAperturaInput(e.target.value)}
                      className="w-full text-center text-lg font-black py-2.5 border-2 border-[#212121]/20 rounded-2xl focus:border-[#E35336] outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-2xl text-xs shadow-md transition"
                  >
                    Confirmar Apertura de Caja
                  </button>
                </form>
              </div>
            )}

            {/* Si la caja está abierta, mostrar cuadre en tiempo real */}
            {cajaActual && cajaActual.estado === 'abierta' && (
              <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <h3 className="font-black text-lg text-[#212121]">Jornada en Curso — Cuadre en Vivo</h3>
                  </div>
                  <span className="text-xs font-bold text-[#212121]/60">
                    Apertura: {new Date(cajaActual.created_at).toLocaleDateString()} por {cajaActual.usuario_apertura}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-[#FFF8DC]/50 rounded-2xl border border-[#E35336]/30">
                    <p className="text-[11px] font-bold text-[#212121]/60 uppercase">Dinero Inicial (Base)</p>
                    <p className="text-xl font-black text-[#212121] mt-1">{formatoMoneda(cajaActual.monto_inicial)}</p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase">+ Ventas en Efectivo</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">{formatoMoneda(totalVentasEfectivoHoy)}</p>
                  </div>

                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                    <p className="text-[11px] font-bold text-rose-800 uppercase">- Gastos Operacionales</p>
                    <p className="text-xl font-black text-[#D32F2F] mt-1">-{formatoMoneda(totalGastosHoy)}</p>
                  </div>

                  <div className="p-4 bg-[#212121] text-white rounded-2xl shadow-md border-2 border-[#E35336]">
                    <p className="text-[11px] font-black uppercase text-[#FFF8DC]">Debe Haber en Caja Física</p>
                    <p className="text-2xl font-black text-[#E35336] mt-1">{formatoMoneda(dineroEsperadoEnCaja)}</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border text-xs font-semibold text-[#212121]/70 flex items-center justify-between">
                  <span>📱 Ventas registradas por Transferencia (Nequi / Bancolombia): <strong>{formatoMoneda(totalVentasTransfHoy)}</strong></span>
                  <span className="text-[11px] text-[#212121]/50">* No afecta el dinero en efectivo físico de la caja.</span>
                </div>
              </div>
            )}

            {/* Historial de Cierres de Caja */}
            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-4">
              <h3 className="font-black text-lg text-[#212121] border-b pb-3">Historial de Cierres Diarios</h3>
              {historialCierres.length === 0 ? (
                <p className="text-xs text-[#212121]/40 text-center py-6">No hay registros de cierres anteriores.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF8DC] uppercase font-black text-[10px] text-[#212121] border-b">
                      <tr>
                        <th className="py-2.5 px-3">Fecha y Hora</th>
                        <th className="py-2.5 px-3">Base Inicial</th>
                        <th className="py-2.5 px-3">Ventas Efectivo</th>
                        <th className="py-2.5 px-3">Gastos</th>
                        <th className="py-2.5 px-3">Esperado</th>
                        <th className="py-2.5 px-3">Real Contado</th>
                        <th className="py-2.5 px-3">Diferencia</th>
                        <th className="py-2.5 px-3">Responsable</th>
                        <th className="py-2.5 px-3 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {historialCierres.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">{new Date(c.hora_cierre).toLocaleString()}</td>
                          <td className="py-2.5 px-3">{formatoMoneda(c.monto_inicial)}</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold">{formatoMoneda(c.ventas_efectivo)}</td>
                          <td className="py-2.5 px-3 text-rose-700">-{formatoMoneda(c.total_gastos)}</td>
                          <td className="py-2.5 px-3 font-bold">{formatoMoneda(c.dinero_esperado)}</td>
                          <td className="py-2.5 px-3 font-black text-[#212121]">{formatoMoneda(c.dinero_real)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${c.diferencia === 0 ? 'text-emerald-700' : c.diferencia > 0 ? 'text-blue-700' : 'text-[#D32F2F]'}`}>
                              {c.diferencia > 0 ? `+${formatoMoneda(c.diferencia)}` : formatoMoneda(c.diferencia)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">{c.responsable}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setComprobanteCierreData(c)}
                              className="px-2 py-1 rounded bg-[#FFF8DC] text-[#E35336] font-bold text-[10px] hover:bg-[#E35336] hover:text-white transition"
                            >
                              Ver / Imprimir
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

        {/* ============================================================ */}
        {/* 5. MÓDULO: CLIENTES */}
        {/* ============================================================ */}
        {moduloActivo === 'clientes' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Registro y Directorio de Clientes</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Administración de clientes para facturación y envío de comprobantes</p>
              </div>
              <button
                onClick={() => setModalCliente(true)}
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
                placeholder="Buscar por número de documento o nombre..."
                value={busquedaCli}
                onChange={(e) => setBusquedaCli(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border-2 border-[#212121]/15 rounded-xl focus:border-[#E35336] outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF8DC] text-[#212121] uppercase text-[11px] font-black border-b">
                  <tr>
                    <th className="py-3 px-3">Documento (Cédula/NIT)</th>
                    <th className="py-3 px-3">Nombre Completo</th>
                    <th className="py-3 px-3">Teléfono WhatsApp</th>
                    <th className="py-3 px-3">Dirección / Notas</th>
                    <th className="py-3 px-3 text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {clientes
                    .filter(c => c.documento.includes(busquedaCli) || c.nombre.toLowerCase().includes(busquedaCli.toLowerCase()))
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-[#FFF8DC]/20">
                        <td className="py-3 px-3 font-bold text-[#212121]">{c.documento}</td>
                        <td className="py-3 px-3 font-bold">{c.nombre}</td>
                        <td className="py-3 px-3">{c.telefono || 'Sin teléfono'}</td>
                        <td className="py-3 px-3 text-[#212121]/70">{c.direccion || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          {c.telefono ? (
                            <a
                              href={`https://wa.me/57${c.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-bold hover:bg-emerald-100"
                            >
                              <Send className="w-3 h-3" /> WhatsApp
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sin WhatsApp</span>
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
        {/* 6. MÓDULO: GASTOS (SOLO ADMIN) */}
        {/* ============================================================ */}
        {moduloActivo === 'gastos' && usuario.rol === 'admin' && (
          <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Gastos Operacionales DYM’S</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Registro de salidas de dinero: arriendo, compras de bultos/aves y servicios</p>
              </div>
              <button
                onClick={() => setModalGasto(true)}
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
                    <th className="py-3 px-3 text-right">Monto Egresado</th>
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
                      <td className="py-3 px-3 text-right font-black text-[#D32F2F]">
                        -{formatoMoneda(g.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. MÓDULO: REPORTES & INFORMES (SOLO ADMIN) */}
        {/* ============================================================ */}
        {moduloActivo === 'reportes' && usuario.rol === 'admin' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#212121]">Informes y Estadísticas del Negocio</h2>
                <p className="text-xs font-semibold text-[#212121]/60">Análisis de rentabilidad, exportaciones a Excel y depuración</p>
              </div>
              <button
                onClick={() => exportarVentasExcel(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Historial de Ventas (.CSV)
              </button>
            </div>

            {/* Resumen Histórico de Ventas */}
            <div className="bg-white p-6 rounded-3xl border-2 border-[#212121]/15 shadow-sm space-y-4">
              <h3 className="font-black text-lg text-[#212121] border-b pb-3">Últimas 50 Ventas Registradas</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF8DC] uppercase font-black text-[10px] text-[#212121] sticky top-0 border-b">
                    <tr>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Cliente</th>
                      <th className="py-2 px-3">Producto</th>
                      <th className="py-2 px-3">Cant</th>
                      <th className="py-2 px-3">Precio</th>
                      <th className="py-2 px-3">Total Venta</th>
                      <th className="py-2 px-3">Ganancia Estimada</th>
                      <th className="py-2 px-3">Pago</th>
                      <th className="py-2 px-3">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ventas.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">{new Date(v.fecha).toLocaleDateString()}</td>
                        <td className="py-2 px-3 font-bold">{v.cliente_nombre}</td>
                        <td className="py-2 px-3">{v.nombre_producto}</td>
                        <td className="py-2 px-3 font-black">{v.cantidad}</td>
                        <td className="py-2 px-3">{formatoMoneda(v.precio_unitario)}</td>
                        <td className="py-2 px-3 font-black text-[#212121]">{formatoMoneda(v.total_venta)}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">+{formatoMoneda(v.ganancia_bruta)}</td>
                        <td className="py-2 px-3 capitalize">{v.metodo_pago}</td>
                        <td className="py-2 px-3 text-[#212121]/60">{v.vendedor}</td>
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
      {/* MODAL: REGISTRAR / EDITAR PRODUCTO CON SUGERIDOR DE PRECIOS */}
      {/* ============================================================ */}
      {modalProd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-[#E35336]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-black text-[#212121]">
                {editandoProdId ? 'Editar Producto' : 'Nuevo Producto en DYM’S'}
              </h3>
              <button onClick={() => setModalProd(false)} className="text-2xl font-black text-[#212121]/40 hover:text-[#D32F2F]">✕</button>
            </div>

            <form onSubmit={handleGuardarProducto} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Nombre del Producto:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Purina Engorde 40kg, Pollo Campesino, Huevo AA"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#212121] uppercase mb-1">Categoría:</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl bg-white outline-none focus:border-[#E35336]"
                  >
                    <option value="Purinas y Concentrados">Purinas y Concentrados</option>
                    <option value="Pollos y Aves">Pollos y Aves</option>
                    <option value="Huevos">Huevos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#212121] uppercase mb-1">Unidad de Medida:</label>
                  <select
                    value={prodUnidad}
                    onChange={(e) => setProdUnidad(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl bg-white outline-none focus:border-[#E35336]"
                  >
                    <option value="bulto">Bulto</option>
                    <option value="unidad">Unidad (Pollo/Ave)</option>
                    <option value="panal">Panal (30 Huevos)</option>
                    <option value="kilo">Kilo</option>
                  </select>
                </div>
              </div>

              {/* Sugeridor de Precios según Costo y Margen */}
              <div className="bg-[#FFF8DC] p-3.5 rounded-2xl border-2 border-[#E35336]/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#E35336]">
                  <Calculator className="w-4 h-4" />
                  <span>Sugeridor Automático de Precios</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#212121] uppercase">Costo Compra ($):</label>
                    <input
                      type="number"
                      required
                      placeholder="95000"
                      value={prodCosto}
                      onChange={(e) => handleCostoChange(e.target.value)}
                      className="w-full text-xs font-black px-2.5 py-1.5 bg-white border border-[#212121]/20 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#212121] uppercase">% Ganancia Deseada:</label>
                    <input
                      type="number"
                      placeholder="20"
                      value={prodMargenDeseado}
                      onChange={(e) => handleMargenChange(e.target.value)}
                      className="w-full text-xs font-black px-2.5 py-1.5 bg-white border border-[#212121]/20 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-black text-[#212121] uppercase">Precio Venta Detal ($):</label>
                    <input
                      type="number"
                      required
                      value={prodPrecioDetal}
                      onChange={(e) => setProdPrecioDetal(e.target.value)}
                      className="w-full text-xs font-black px-2.5 py-1.5 bg-white border-2 border-[#E35336] rounded-lg outline-none text-[#E35336]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#212121] uppercase">Precio Mayorista ($):</label>
                    <input
                      type="number"
                      required
                      value={prodPrecioMayor}
                      onChange={(e) => setProdPrecioMayor(e.target.value)}
                      className="w-full text-xs font-black px-2.5 py-1.5 bg-white border-2 border-[#212121]/40 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#212121] uppercase mb-1">IVA (%):</label>
                  <select
                    value={prodIVA}
                    onChange={(e) => setProdIVA(e.target.value)}
                    className="w-full text-xs font-bold px-2.5 py-2 border-2 border-[#212121]/20 rounded-xl bg-white outline-none"
                  >
                    <option value="0">0% (Exento)</option>
                    <option value="5">5%</option>
                    <option value="19">19%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#212121] uppercase mb-1">Stock Actual:</label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full text-xs font-black px-2.5 py-2 border-2 border-[#212121]/20 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#212121] uppercase mb-1">Stock Mínimo:</label>
                  <input
                    type="number"
                    value={prodStockMin}
                    onChange={(e) => setProdStockMin(e.target.value)}
                    className="w-full text-xs font-black px-2.5 py-2 border-2 border-[#212121]/20 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalProd(false)}
                  className="flex-1 py-2.5 border-2 border-[#212121]/20 rounded-xl font-bold text-xs text-[#212121]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E35336] hover:bg-[#d0462a] text-white font-black rounded-xl text-xs shadow-md"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REGISTRAR CLIENTE */}
      {/* ============================================================ */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-[#212121]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-black text-[#212121]">Registrar Nuevo Cliente</h3>
              <button onClick={() => setModalCliente(false)} className="text-2xl font-black text-[#212121]/40">✕</button>
            </div>

            <form onSubmit={handleGuardarCliente} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Cédula / NIT (Único):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1098765432"
                  value={cliDoc}
                  onChange={(e) => setCliDoc(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Granja San Jorge / Juan Gómez"
                  value={cliNombre}
                  onChange={(e) => setCliNombre(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Teléfono WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="Ej: 3101234567"
                  value={cliTel}
                  onChange={(e) => setCliTel(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Dirección / Vereda:</label>
                <input
                  type="text"
                  placeholder="Ej: Vereda El Hato, Galpón 2"
                  value={cliDir}
                  onChange={(e) => setCliDir(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl focus:border-[#E35336] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalCliente(false)}
                  className="flex-1 py-2.5 border-2 border-[#212121]/20 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E35336] text-white font-black rounded-xl text-xs shadow-md"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMAR CIERRE DIARIO DE CAJA */}
      {/* ============================================================ */}
      {modalCierreCaja && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-[#D32F2F] animate-scale-up">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-[#D32F2F]" />
                <h3 className="text-xl font-black text-[#212121]">Cierre Diario de Caja — DYM’S</h3>
              </div>
              <button onClick={() => setModalCierreCaja(false)} className="text-2xl font-black text-[#212121]/40">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#FFF8DC] p-4 rounded-2xl border border-[#E35336]/40 text-xs space-y-1.5 font-bold">
                <div className="flex justify-between">
                  <span>Dinero Inicial (Base):</span>
                  <span className="text-[#212121]">{formatoMoneda(cajaActual?.monto_inicial || 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>+ Ventas Efectivo:</span>
                  <span>+{formatoMoneda(totalVentasEfectivoHoy)}</span>
                </div>
                <div className="flex justify-between text-rose-800">
                  <span>- Gastos Egresados:</span>
                  <span>-{formatoMoneda(totalGastosHoy)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#212121] pt-2 border-t border-[#E35336]/30">
                  <span>DINERO ESPERADO EN CAJA:</span>
                  <span className="text-[#E35336] text-base">{formatoMoneda(dineroEsperadoEnCaja)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">
                  Dinero Real Contado Físicamente ($):
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ingresa el valor total contado en billetes y monedas"
                  value={dineroRealContado}
                  onChange={(e) => setDineroRealContado(e.target.value)}
                  className="w-full text-center text-lg font-black py-2.5 border-2 border-[#D32F2F] rounded-2xl focus:ring-2 focus:ring-[#D32F2F]/20 outline-none"
                />
                {dineroRealContado !== '' && (
                  <p className="text-xs font-black text-center mt-1.5">
                    Diferencia:{' '}
                    <span className={Number(dineroRealContado) - dineroEsperadoEnCaja === 0 ? 'text-emerald-700' : 'text-[#D32F2F]'}>
                      {formatoMoneda(Number(dineroRealContado) - dineroEsperadoEnCaja)}
                      {Number(dineroRealContado) - dineroEsperadoEnCaja === 0 ? ' (¡Caja Cuadrada Exacta!)' : ' (Descuadre)'}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#212121] mb-1">Observaciones del Cierre:</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Turno entregado sin novedades, billetes guardados en sobre."
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 border-2 border-[#212121]/20 rounded-xl outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalCierreCaja(false)}
                  className="flex-1 py-3 border-2 border-[#212121]/20 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarCierreCaja}
                  className="flex-1 py-3 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-black rounded-xl text-xs shadow-md transition"
                >
                  Confirmar y Cerrar Jornada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL COMPROBANTE TICKET DE VENTA (IMPRIMIBLE & WHATSAPP) */}
      {/* ============================================================ */}
      {ticketVentaData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 border-[#E35336]">
            {/* Cabecera Ticket */}
            <div id="ticket-impresion" className="text-center space-y-1 font-mono text-xs border-b pb-4">
              <h2 className="text-2xl font-black text-[#212121] tracking-tighter">DYM’S</h2>
              <p className="text-[10px] text-[#212121]/70">Nutrición y Producción Agropecuaria</p>
              <p className="text-[10px] text-[#212121]/70">Ticket #: {ticketVentaData.numero}</p>
              <p className="text-[10px] text-[#212121]/70">Fecha: {ticketVentaData.fecha}</p>
              <div className="text-left pt-2 text-[10px]">
                <p><strong>Cliente:</strong> {ticketVentaData.cliente}</p>
                <p><strong>Doc:</strong> {ticketVentaData.documento}</p>
                <p><strong>Vendedor:</strong> {ticketVentaData.vendedor}</p>
              </div>
            </div>

            {/* Detalle Items */}
            <div className="py-3 font-mono text-[11px] space-y-1.5 border-b max-h-48 overflow-y-auto">
              {ticketVentaData.items.map((it: ItemCarrito, i: number) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{it.cantidad}x {it.producto.nombre}</p>
                    <span className="text-[9px] text-[#212121]/60">({it.tipo_precio})</span>
                  </div>
                  <span className="font-black">{formatoMoneda(it.total)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="py-3 font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatoMoneda(ticketVentaData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA:</span>
                <span>{formatoMoneda(ticketVentaData.iva)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-[#E35336] pt-1 border-t">
                <span>TOTAL:</span>
                <span>{formatoMoneda(ticketVentaData.total)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#212121]/60">
                <span>Pago:</span>
                <span className="uppercase">{ticketVentaData.metodo}</span>
              </div>
            </div>

            {/* Acciones del Ticket con Doble WhatsApp */}
            <div className="space-y-2 pt-3 border-t">
              {/* WhatsApp del Cliente (Muestra el automático o permite ingresarlo/cambiarlo al instante) */}
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-600/30 flex items-center justify-between text-[11px]">
                <div className="text-emerald-950 truncate mr-2">
                  <span className="font-bold">WhatsApp Cliente:</span>{' '}
                  {ticketVentaData.telefono ? (
                    <span className="font-mono text-emerald-700 font-black">+57 {ticketVentaData.telefono}</span>
                  ) : (
                    <span className="text-slate-500 italic text-[10px]">Sin registrar</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = prompt('Ingresa o modifica el número de WhatsApp del cliente para enviarle la factura:', ticketVentaData.telefono || '');
                    if (nuevo !== null) {
                      const limpio = nuevo.replace(/[^0-9]/g, '');
                      setTicketVentaData({ ...ticketVentaData, telefono: limpio });
                    }
                  }}
                  className="text-[10px] bg-white border border-emerald-600/30 px-2 py-0.5 rounded-md font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition shrink-0"
                >
                  {ticketVentaData.telefono ? 'Cambiar' : '+ Ingresar número'}
                </button>
              </div>

              {/* Botón 1: Enviar Comprobante / Factura al Cliente */}
              <a
                href={generarLinkWhatsAppCliente(ticketVentaData)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <Send className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-tight font-black">Enviar Factura al Cliente</span>
                  <span className="text-[10px] text-emerald-100 font-normal">
                    {ticketVentaData.telefono ? `Enviar directo a: +57 ${ticketVentaData.telefono}` : '(Haz clic para abrir WhatsApp)'}
                  </span>
                </div>
              </a>

              {/* Botón 2: Notificar Venta al Dueño */}
              <a
                href={generarLinkWhatsAppAdmin(ticketVentaData)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#E35336] hover:bg-[#c9452b] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-tight font-black">Notificar Venta al Dueño</span>
                  <span className="text-[10px] text-orange-100 font-normal">
                    Alerta a: +57 {telefonoAdmin}
                  </span>
                </div>
              </a>

              {/* Teléfono del Dueño configurable */}
              <div className="bg-[#FFF8DC] p-2 rounded-xl border border-[#E35336]/30 flex items-center justify-between text-[11px]">
                <div className="text-[#212121]">
                  <span className="font-bold">Tel. Dueño:</span> <span className="font-mono text-[#E35336] font-black">+57 {telefonoAdmin}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = prompt('Número de WhatsApp del Dueño para notificaciones (sin espacios):', telefonoAdmin);
                    if (nuevo && nuevo.trim()) {
                      const limpio = nuevo.replace(/[^0-9]/g, '');
                      setTelefonoAdmin(limpio);
                      localStorage.setItem('dyms_tel_admin', limpio);
                    }
                  }}
                  className="text-[10px] bg-white border border-[#212121]/20 px-2 py-0.5 rounded-md font-bold text-[#E35336] hover:bg-[#E35336] hover:text-white transition"
                >
                  Cambiar
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2 bg-[#212121] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-black transition"
              >
                <Printer className="w-4 h-4" /> Imprimir Ticket
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
      {/* MODAL DETALLE DE ALERTAS DE STOCK BAJO O AGOTADO */}
      {/* ============================================================ */}
      {modalAlertasStock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border-4 border-[#D32F2F] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#D32F2F]/10 text-[#D32F2F] rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#212121]">Alertas de Inventario: Stock Crítico</h3>
                  <p className="text-xs text-[#212121]/60 font-semibold">
                    Productos que han alcanzado o están por debajo del stock mínimo establecido
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAlertasStock(false)}
                className="p-2 text-[#212121]/50 hover:text-[#212121] rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de productos bajo stock */}
            <div className="py-4 overflow-y-auto flex-1 space-y-3">
              {productos.filter(p => p.stock <= p.stock_minimo).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-lg text-[#212121]">¡Inventario en Niveles Óptimos!</h4>
                  <p className="text-xs text-[#212121]/60">
                    Todos los productos de DYM’S cuentan con stock suficiente por encima del mínimo.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {productos
                    .filter(p => p.stock <= p.stock_minimo)
                    .map((prod) => (
                      <div key={prod.id} className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-[#FFF8DC]/40 p-3 rounded-2xl transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-[#212121]">{prod.nombre}</h4>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FFF8DC] text-[#E35336] border border-[#E35336]/30">
                              {prod.categoria}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[#212121]/70">
                            <span>Costo Compra: <strong>{formatoMoneda(prod.precio_compra)}</strong></span>
                            <span>•</span>
                            <span>Venta Sugerida: <strong>{formatoMoneda(prod.precio_venta)}</strong></span>
                            <span>•</span>
                            <span>Unidad: <strong>{prod.unidad_medida}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                              prod.stock === 0 
                                ? 'bg-black text-white' 
                                : 'bg-[#D32F2F]/15 text-[#D32F2F] border border-[#D32F2F]/30'
                            }`}>
                              {prod.stock === 0 ? 'AGOTADO (0)' : `${prod.stock} disponibles`}
                            </span>
                            <p className="text-[10px] text-[#212121]/50 mt-0.5">
                              Mínimo requerido: {prod.stock_minimo}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setModalAlertasStock(false);
                              setBusquedaInv(prod.nombre);
                              setModuloActivo('inventario');
                            }}
                            className="px-3 py-2 bg-[#212121] hover:bg-[#E35336] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Reponer</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#212121]/60 font-semibold">
                Mostrando {productos.filter(p => p.stock <= p.stock_minimo).length} producto(s) en nivel crítico
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalAlertasStock(false);
                    setModuloActivo('inventario');
                  }}
                  className="px-4 py-2 bg-[#E35336] hover:bg-[#c9452b] text-white rounded-xl text-xs font-bold transition"
                >
                  Ir al Inventario Completo
                </button>
                <button
                  type="button"
                  onClick={() => setModalAlertasStock(false)}
                  className="px-4 py-2 border-2 border-[#212121]/20 hover:bg-slate-100 rounded-xl text-xs font-bold text-[#212121]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL COMPROBANTE DE CIERRE DE CAJA */}
      {/* ============================================================ */}
      {comprobanteCierreData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 border-[#212121]">
            <div className="text-center space-y-1 font-mono text-xs border-b pb-4">
              <h2 className="text-2xl font-black text-[#212121]">DYM’S</h2>
              <p className="text-[10px] uppercase font-bold text-[#E35336]">Comprobante de Cierre Diario de Caja</p>
              <p className="text-[10px] text-[#212121]/70">Fecha: {new Date(comprobanteCierreData.hora_cierre).toLocaleString()}</p>
              <p className="text-[10px] text-[#212121]/70">Responsable: {comprobanteCierreData.responsable}</p>
            </div>

            <div className="py-4 font-mono text-xs space-y-2 border-b">
              <div className="flex justify-between">
                <span>Base Inicial:</span>
                <span>{formatoMoneda(comprobanteCierreData.monto_inicial)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>+ Ventas Efectivo:</span>
                <span>+{formatoMoneda(comprobanteCierreData.ventas_efectivo)}</span>
              </div>
              <div className="flex justify-between text-rose-800">
                <span>- Total Gastos:</span>
                <span>-{formatoMoneda(comprobanteCierreData.total_gastos)}</span>
              </div>
              <div className="flex justify-between font-black pt-1 border-t">
                <span>Dinero Esperado:</span>
                <span>{formatoMoneda(comprobanteCierreData.dinero_esperado)}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-[#212121]">
                <span>Dinero Real Contado:</span>
                <span className="text-[#E35336]">{formatoMoneda(comprobanteCierreData.dinero_real)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t">
                <span>Diferencia:</span>
                <span className={comprobanteCierreData.diferencia === 0 ? 'text-emerald-700' : 'text-[#D32F2F]'}>
                  {formatoMoneda(comprobanteCierreData.diferencia)}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-[#212121]/60 py-2 italic font-mono">
              Obs: {comprobanteCierreData.observaciones}
            </p>

            <div className="space-y-2 pt-3 border-t">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-[#212121] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante Cierre
              </button>
              <button
                onClick={() => setComprobanteCierreData(null)}
                className="w-full py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL REGISTRAR GASTO */}
      {/* ============================================================ */}
      {modalGasto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-[#D32F2F]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-black text-[#212121]">Registrar Gasto Operacional</h3>
              <button onClick={() => setModalGasto(false)} className="text-2xl font-black text-[#212121]/40">✕</button>
            </div>

            <form onSubmit={handleGuardarGasto} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Categoría:</label>
                <select
                  value={gastoCat}
                  onChange={(e) => setGastoCat(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl bg-white outline-none focus:border-[#D32F2F]"
                >
                  <option value="arriendo">Arriendo del Local / Granja</option>
                  <option value="compra_mercancia">Compra de Mercancía / Bultos</option>
                  <option value="servicios">Servicios Públicos (Luz, Agua)</option>
                  <option value="nomina">Nómina / Jornales</option>
                  <option value="otro">Otros Gastos Varios</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Descripción:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de arriendo bodega central"
                  value={gastoDesc}
                  onChange={(e) => setGastoDesc(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 border-2 border-[#212121]/20 rounded-xl outline-none focus:border-[#D32F2F]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#212121] uppercase mb-1">Monto ($):</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 350000"
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  className="w-full text-xs font-black px-3 py-2 border-2 border-[#212121]/20 rounded-xl outline-none focus:border-[#D32F2F]"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalGasto(false)}
                  className="flex-1 py-2.5 border-2 border-[#212121]/20 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-black rounded-xl text-xs shadow-md"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
