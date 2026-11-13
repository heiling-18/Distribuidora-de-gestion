'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Alert, CargandoModulo, ConfirmDialog } from '@/components/ui';
import { formatoMoneda } from '@/lib/formato';
import type { CambioSeccion } from '@/lib/modulos';
import type { Usuario } from '@/types';
import { formatoDia, textoCartones } from '@/lib/galpones';
import {
  MODULOS_HUEVOS,
  NOMBRE_CLASE,
  SIN_EXISTENCIA,
  calcularExistencias,
  valorHuevos,
  type ModuloHuevos,
  type MovimientoHuevo,
  type NuevoMovimiento,
  type TipoHuevo,
} from '@/lib/huevos';
import { HuevosInicioView } from './HuevosInicioView';
import { VenderHuevosView } from './VenderHuevosView';
import { LlegadasView } from './LlegadasView';
import { HistorialHuevosView } from './HistorialHuevosView';
import { TiposHuevoView } from './TiposHuevoView';

type Tono = 'exito' | 'error' | 'advertencia' | 'info';

interface HuevosAppProps {
  usuario: Usuario;
  onSalir: () => void;
  notificar: (tipo: Tono, mensaje: string) => void;
  cambiosSeccion?: CambioSeccion[];
}

/** Normaliza numéricos que Supabase devuelve como texto (numeric) */
const aTipo = (t: TipoHuevo): TipoHuevo => ({ ...t, precio_venta: Number(t.precio_venta) || 0, orden: Number(t.orden) || 0 });
const aMovimiento = (m: MovimientoHuevo): MovimientoHuevo => ({
  ...m,
  huevos: Number(m.huevos),
  precio_carton: Number(m.precio_carton) || 0,
  costo_carton: m.costo_carton == null ? null : Number(m.costo_carton),
});
const ordenarMovs = (a: MovimientoHuevo, b: MovimientoHuevo) => b.fecha.localeCompare(a.fecha) || b.id - a.id;

/**
 * Sección HUEVOS: compra y venta de huevos por tamaño.
 * Solo lee y escribe las tablas hue_tipos y hue_movimientos; no toca la Distribuidora ni Galpones.
 */
export function HuevosApp({ usuario, onSalir, notificar, cambiosSeccion }: HuevosAppProps) {
  const esAdmin = usuario.rol === 'admin';
  const [modulo, setModulo] = useState<ModuloHuevos>('hue-inicio');
  const [tipos, setTipos] = useState<TipoHuevo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoHuevo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [tipoParaVender, setTipoParaVender] = useState<number | null>(null);
  const [movAEliminar, setMovAEliminar] = useState<MovimientoHuevo | null>(null);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoHuevo | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [t, m] = await Promise.all([
      supabase.from('hue_tipos').select('*').order('orden', { ascending: true }).order('nombre', { ascending: true }),
      supabase.from('hue_movimientos').select('*').order('fecha', { ascending: false }).order('id', { ascending: false }),
    ]);
    const error = t.error || m.error;
    if (error) {
      // 42P01 / PGRST205: la tabla no existe todavía (migración sin ejecutar)
      if (error.code === '42P01' || error.code === 'PGRST205' || /hue_(tipos|movimientos)/.test(error.message)) {
        setFaltaMigracion(true);
      } else {
        notificar('error', 'No se pudieron cargar los huevos: ' + error.message);
      }
    } else {
      setFaltaMigracion(false);
      setTipos((t.data || []).map(aTipo));
      setMovimientos((m.data || []).map(aMovimiento));
    }
    setCargando(false);
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de la sección (los datos viven en Supabase)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const existencias = useMemo(() => calcularExistencias(movimientos), [movimientos]);
  const conMovimientos = useMemo(() => new Set(movimientos.map((m) => m.tipo_id)), [movimientos]);

  const permiso = (msg?: string) => /row-level security|42501/i.test(msg || '');

  /** Guarda una o varias llegadas, una venta o unos rotos */
  const guardarMovimientos = async (movs: NuevoMovimiento[]) => {
    if (procesando || movs.length === 0) return false;
    setProcesando(true);
    try {
      const { data, error } = await supabase
        .from('hue_movimientos')
        .insert(movs.map((m) => ({ ...m, registrado_por: usuario.nombre })))
        .select();
      if (error || !data) {
        notificar(
          'error',
          permiso(error?.message)
            ? 'Solo puedes anotar movimientos de hoy. Para otros días, pídeselo al administrador.'
            : /No hay suficientes huevos/.test(error?.message || '')
              ? 'No hay suficientes huevos de ese tamaño: alguien acaba de vender. Toca actualizar y vuelve a intentar.'
              : 'No se pudo guardar: ' + (error?.message || 'sin respuesta del servidor')
        );
        return false;
      }
      const nuevos = data.map(aMovimiento);
      setMovimientos((prev) => [...nuevos, ...prev].sort(ordenarMovs));
      const primero = nuevos[0];
      const nombre = tipos.find((t) => t.id === primero.tipo_id)?.nombre ?? '';
      if (primero.clase === 'entrada') {
        const total = nuevos.reduce((acc, m) => acc + valorHuevos(m.huevos, m.precio_carton), 0);
        const huevos = nuevos.reduce((acc, m) => acc + m.huevos, 0);
        notificar('exito', `Llegada guardada: ${textoCartones(huevos)} por ${formatoMoneda(total)}.`);
      } else if (primero.clase === 'venta') {
        notificar('exito', `Venta guardada: ${textoCartones(primero.huevos)} de ${nombre} por ${formatoMoneda(valorHuevos(primero.huevos, primero.precio_carton))}.`);
      } else {
        notificar('exito', `Anotados ${textoCartones(primero.huevos)} de ${nombre} rotos.`);
      }
      return true;
    } finally {
      setProcesando(false);
    }
  };

  // Borrar una llegada no puede dejar el inventario negativo (ya se vendió de ella)
  const pedirEliminarMovimiento = (m: MovimientoHuevo) => {
    if (m.clase === 'entrada') {
      const quedan = (existencias.get(m.tipo_id) ?? SIN_EXISTENCIA).huevos;
      if (quedan < m.huevos) {
        notificar('advertencia', `No se puede borrar esta llegada: ya se vendieron parte de esos huevos (quedan ${textoCartones(quedan)}). Borra primero las ventas que sobran o anota la corrección como rotos.`);
        return;
      }
    }
    setMovAEliminar(m);
  };

  const confirmarEliminarMovimiento = async () => {
    if (!movAEliminar) return;
    const { error } = await supabase.from('hue_movimientos').delete().eq('id', movAEliminar.id);
    if (error) {
      notificar('error', 'No se pudo eliminar: ' + error.message);
    } else {
      setMovimientos((prev) => prev.filter((m) => m.id !== movAEliminar.id));
      notificar('exito', `${NOMBRE_CLASE[movAEliminar.clase]} eliminada.`);
    }
    setMovAEliminar(null);
  };

  const crearTipo = async (nombre: string, precioVenta: number) => {
    if (procesando) return false;
    setProcesando(true);
    try {
      const orden = tipos.reduce((max, t) => Math.max(max, t.orden), 0) + 1;
      const { data, error } = await supabase.from('hue_tipos').insert([{ nombre, precio_venta: precioVenta, orden }]).select().single();
      if (error || !data) {
        notificar('error', 'No se pudo crear el tamaño: ' + (error?.message || 'sin respuesta del servidor'));
        return false;
      }
      setTipos((prev) => [...prev, aTipo(data)]);
      notificar('exito', `Tamaño ${nombre} creado.`);
      return true;
    } finally {
      setProcesando(false);
    }
  };

  const actualizarTipo = async (id: number, cambios: Partial<Pick<TipoHuevo, 'precio_venta' | 'activo'>>) => {
    const { data, error } = await supabase.from('hue_tipos').update(cambios).eq('id', id).select().single();
    if (error || !data) {
      notificar('error', 'No se pudo guardar el cambio: ' + (error?.message || 'sin respuesta del servidor'));
      return false;
    }
    const t = aTipo(data);
    setTipos((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    notificar('exito', cambios.precio_venta !== undefined ? `Precio de ${t.nombre}: ${formatoMoneda(t.precio_venta)} el cartón.` : `${t.nombre} ${t.activo ? 'visible' : 'oculto'}.`);
    return true;
  };

  const confirmarEliminarTipo = async () => {
    if (!tipoAEliminar) return;
    const { error } = await supabase.from('hue_tipos').delete().eq('id', tipoAEliminar.id);
    if (error) {
      notificar('error', error.code === '23503' ? `${tipoAEliminar.nombre} ya tiene movimientos; ocúltalo en vez de eliminarlo.` : 'No se pudo eliminar: ' + error.message);
    } else {
      setTipos((prev) => prev.filter((t) => t.id !== tipoAEliminar.id));
      notificar('exito', `Tamaño ${tipoAEliminar.nombre} eliminado.`);
    }
    setTipoAEliminar(null);
  };

  const irAVender = (tipoId: number) => {
    setTipoParaVender(tipoId);
    setModulo('hue-vender');
  };

  const modulos = MODULOS_HUEVOS.filter((m) => esAdmin || !m.soloAdmin);
  const moduloVisible = modulos.some((m) => m.id === modulo) ? modulo : 'hue-inicio';

  return (
    <div className="min-h-dvh bg-papel text-tinta lg:flex">
      <Sidebar
        modulos={modulos}
        moduloActivo={moduloVisible}
        onCambiar={setModulo}
        usuario={usuario}
        onSalir={onSalir}
        seccion="Huevos"
        cambiosSeccion={cambiosSeccion}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          modulos={modulos}
          barraMovil={['hue-inicio', 'hue-vender', 'hue-llegadas', 'hue-historial']}
          moduloActivo={moduloVisible}
          onCambiar={setModulo}
          usuario={usuario}
          onSalir={onSalir}
          seccion="Huevos"
          cambiosSeccion={cambiosSeccion}
        />

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">
          {cargando && tipos.length === 0 && movimientos.length === 0 ? (
            <CargandoModulo />
          ) : faltaMigracion ? (
            <Alert tono="aviso">
              La sección de Huevos todavía no está activada en la base de datos. El administrador debe ejecutar el archivo
              <strong> supabase/migrations/20261112000000_huevos.sql</strong> en Supabase → SQL Editor.
            </Alert>
          ) : (
            <>
              {moduloVisible === 'hue-inicio' && (
                <HuevosInicioView
                  nombreUsuario={usuario.nombre}
                  tipos={tipos}
                  movimientos={movimientos}
                  existencias={existencias}
                  actualizando={cargando}
                  onActualizar={cargar}
                  onVender={irAVender}
                  onLlegada={() => setModulo('hue-llegadas')}
                />
              )}
              {moduloVisible === 'hue-vender' && (
                <VenderHuevosView
                  key={tipoParaVender ?? 'vender'}
                  tipos={tipos}
                  movimientos={movimientos}
                  existencias={existencias}
                  tipoInicial={tipoParaVender}
                  procesando={procesando}
                  onGuardar={guardarMovimientos}
                />
              )}
              {moduloVisible === 'hue-llegadas' && (
                <LlegadasView esAdmin={esAdmin} tipos={tipos} movimientos={movimientos} procesando={procesando} onGuardar={guardarMovimientos} />
              )}
              {moduloVisible === 'hue-historial' && (
                <HistorialHuevosView esAdmin={esAdmin} tipos={tipos} movimientos={movimientos} onEliminar={pedirEliminarMovimiento} />
              )}
              {moduloVisible === 'hue-tipos' && esAdmin && (
                <TiposHuevoView
                  tipos={tipos}
                  existencias={existencias}
                  conMovimientos={conMovimientos}
                  procesando={procesando}
                  onCrear={crearTipo}
                  onActualizar={actualizarTipo}
                  onEliminar={setTipoAEliminar}
                />
              )}
            </>
          )}
        </main>
      </div>

      {movAEliminar && (
        <ConfirmDialog
          titulo={`¿Eliminar esta ${NOMBRE_CLASE[movAEliminar.clase].toLowerCase()}?`}
          textoConfirmar="Eliminar"
          onConfirmar={confirmarEliminarMovimiento}
          onCancelar={() => setMovAEliminar(null)}
        >
          <p>
            {textoCartones(movAEliminar.huevos)} de <strong>{tipos.find((t) => t.id === movAEliminar.tipo_id)?.nombre ?? 'huevo'}</strong> del{' '}
            {formatoDia(movAEliminar.fecha)}.
          </p>
          <p className="text-tinta-suave">
            {movAEliminar.clase === 'entrada' ? 'Esos huevos salen del inventario.' : 'Esos huevos vuelven al inventario.'} Esto no se puede deshacer.
          </p>
        </ConfirmDialog>
      )}

      {tipoAEliminar && (
        <ConfirmDialog titulo={`¿Eliminar el tamaño ${tipoAEliminar.nombre}?`} textoConfirmar="Eliminar" onConfirmar={confirmarEliminarTipo} onCancelar={() => setTipoAEliminar(null)}>
          <p className="text-tinta-suave">No tiene llegadas ni ventas. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
