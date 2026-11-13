'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Alert, CargandoModulo, ConfirmDialog } from '@/components/ui';
import type { CambioSeccion } from '@/lib/modulos';
import type { Usuario } from '@/types';
import {
  MODULOS_GALPONES,
  costoAlimento,
  formatoDia,
  formatoKg,
  formatoPesos,
  precioDelRegistro,
  textoCartones,
  type Galpon,
  type ModuloGalpones,
  type RegistroGalpon,
} from '@/lib/galpones';
import { GalponesInicioView } from './GalponesInicioView';
import { RegistroDiarioView, type DatosRegistro } from './RegistroDiarioView';
import { GalponesAdminView } from './GalponesAdminView';
import { GalponFormModal, type DatosGalpon } from './GalponFormModal';

type Tono = 'exito' | 'error' | 'advertencia' | 'info';

interface GalponesAppProps {
  usuario: Usuario;
  onSalir: () => void;
  notificar: (tipo: Tono, mensaje: string) => void;
  cambiosSeccion?: CambioSeccion[];
}

/** Normaliza numéricos que Supabase devuelve como texto (numeric) */
const aGalpon = (g: Galpon): Galpon => ({
  ...g,
  // Sin la migración de levante las columnas no existen: se toman como postura sin precio
  tipo: g.tipo === 'levante' ? 'levante' : 'postura',
  aves_iniciales: Number(g.aves_iniciales),
  edad_semanas_llegada: Number(g.edad_semanas_llegada),
  gramos_ave_dia: Number(g.gramos_ave_dia),
  precio_bulto: Number(g.precio_bulto) || 0,
});
const aRegistro = (r: RegistroGalpon): RegistroGalpon => ({
  ...r,
  huevos: Number(r.huevos),
  muertas: Number(r.muertas),
  alimento_kg: Number(r.alimento_kg),
  precio_bulto: r.precio_bulto == null ? null : Number(r.precio_bulto),
});

/** Columna nueva que no existe todavía: falta ejecutar la migración de levante */
const faltaColumnaLevante = (mensaje?: string) => /tipo|precio_bulto/.test(mensaje || '') && /column|columna|schema cache/i.test(mensaje || '');
const AVISO_MIGRACION_LEVANTE =
  'Falta activar los galpones de levante en la base de datos. Ejecuta en Supabase el archivo supabase/migrations/20261110000000_galpones_levante.sql.';

/**
 * Sección GALPONES: gallinas de postura (huevos) y pollitas de levante (solo alimento y mortalidad).
 * Solo lee y escribe las tablas gal_galpones y gal_registros;
 * nunca toca los datos de la Distribuidora.
 */
export function GalponesApp({ usuario, onSalir, notificar, cambiosSeccion }: GalponesAppProps) {
  const esAdmin = usuario.rol === 'admin';
  const [modulo, setModulo] = useState<ModuloGalpones>('gal-inicio');
  const [galpones, setGalpones] = useState<Galpon[]>([]);
  const [registros, setRegistros] = useState<RegistroGalpon[]>([]);
  const [cargando, setCargando] = useState(true);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [galponParaRegistrar, setGalponParaRegistrar] = useState<number | null>(null);

  const [procesandoRegistro, setProcesandoRegistro] = useState(false);
  const [registroAEliminar, setRegistroAEliminar] = useState<RegistroGalpon | null>(null);

  const [modalGalpon, setModalGalpon] = useState<{ editando: Galpon | null } | null>(null);
  const [procesandoGalpon, setProcesandoGalpon] = useState(false);
  const [galponAEliminar, setGalponAEliminar] = useState<Galpon | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [g, r] = await Promise.all([
      supabase.from('gal_galpones').select('*').order('id', { ascending: true }),
      supabase.from('gal_registros').select('*').order('fecha', { ascending: false }),
    ]);
    const error = g.error || r.error;
    if (error) {
      // 42P01 / PGRST205: la tabla no existe todavía (migración sin ejecutar)
      if (error.code === '42P01' || error.code === 'PGRST205' || /gal_(galpones|registros)/.test(error.message)) {
        setFaltaMigracion(true);
      } else {
        notificar('error', 'No se pudieron cargar los galpones: ' + error.message);
      }
    } else {
      setFaltaMigracion(false);
      setGalpones((g.data || []).map(aGalpon));
      setRegistros((r.data || []).map(aRegistro));
    }
    setCargando(false);
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de la sección (los datos viven en Supabase)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const irARegistrar = (galponId: number) => {
    setGalponParaRegistrar(galponId);
    setModulo('gal-registro');
  };

  // Guarda el registro del día; si ya existía ese día para ese galpón, lo corrige
  const guardarRegistro = async (datos: DatosRegistro) => {
    if (procesandoRegistro) return false;
    setProcesandoRegistro(true);
    try {
      // Sin precio no se manda la columna: así el registro sigue funcionando aunque falte la migración de levante
      const { precio_bulto, ...sinPrecio } = datos;
      const fila = precio_bulto > 0 ? datos : sinPrecio;
      const { data, error } = await supabase
        .from('gal_registros')
        .upsert([{ ...fila, registrado_por: usuario.nombre }], { onConflict: 'galpon_id,fecha' })
        .select()
        .single();
      if (error || !data) {
        const permiso = error?.code === '42501' || /row-level security/i.test(error?.message || '');
        notificar(
          'error',
          permiso
            ? 'Solo puedes anotar o corregir el día de hoy. Para otros días, pídeselo al administrador.'
            : faltaColumnaLevante(error?.message)
              ? AVISO_MIGRACION_LEVANTE
              : 'No se pudo guardar el registro: ' + (error?.message || 'sin respuesta del servidor')
        );
        return false;
      }
      const nuevo = aRegistro(data);
      setRegistros((prev) =>
        [nuevo, ...prev.filter((r) => r.id !== nuevo.id)].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
      );
      const galpon = galpones.find((g) => g.id === nuevo.galpon_id);
      const precio = precioDelRegistro(nuevo, galpon);
      const partes = [
        galpon?.tipo === 'levante' ? null : textoCartones(nuevo.huevos),
        `${nuevo.muertas} muertas`,
        `${formatoKg(nuevo.alimento_kg)} de alimento${precio > 0 ? ` (${formatoPesos(costoAlimento(nuevo.alimento_kg, precio))})` : ''}`,
      ].filter(Boolean);
      notificar('exito', `Guardado ${galpon?.nombre ?? ''} · ${formatoDia(nuevo.fecha)}: ${partes.join(', ')}.`);
      return true;
    } finally {
      setProcesandoRegistro(false);
    }
  };

  const confirmarEliminarRegistro = async () => {
    if (!registroAEliminar) return;
    const { error } = await supabase.from('gal_registros').delete().eq('id', registroAEliminar.id);
    if (error) {
      notificar('error', 'No se pudo eliminar el registro: ' + error.message);
    } else {
      setRegistros((prev) => prev.filter((r) => r.id !== registroAEliminar.id));
      notificar('exito', 'Registro eliminado.');
    }
    setRegistroAEliminar(null);
  };

  const guardarGalpon = async (datos: DatosGalpon) => {
    if (procesandoGalpon || !modalGalpon) return;
    setProcesandoGalpon(true);
    try {
      const editando = modalGalpon.editando;
      const consulta = editando
        ? supabase.from('gal_galpones').update(datos).eq('id', editando.id).select().single()
        : supabase.from('gal_galpones').insert([datos]).select().single();
      const { data, error } = await consulta;
      if (error || !data) {
        notificar(
          'error',
          faltaColumnaLevante(error?.message) ? AVISO_MIGRACION_LEVANTE : 'No se pudo guardar el galpón: ' + (error?.message || 'sin respuesta del servidor')
        );
        return;
      }
      const g = aGalpon(data);
      setGalpones((prev) => (editando ? prev.map((x) => (x.id === g.id ? g : x)) : [...prev, g]));
      notificar('exito', editando ? `${g.nombre} actualizado.` : `${g.nombre} creado.`);
      setModalGalpon(null);
    } finally {
      setProcesandoGalpon(false);
    }
  };

  // Solo se elimina un galpón sin registros; con historial se sugiere desactivarlo
  const pedirEliminarGalpon = (g: Galpon) => {
    const cantidad = registros.filter((r) => r.galpon_id === g.id).length;
    if (cantidad > 0) {
      notificar(
        'advertencia',
        `${g.nombre} tiene ${cantidad} ${cantidad === 1 ? 'día anotado' : 'días anotados'} y no se puede eliminar sin perder ese historial. Desactívalo: toca Editar y quita la marca de "Galpón activo".`
      );
      return;
    }
    setGalponAEliminar(g);
  };

  const confirmarEliminarGalpon = async () => {
    if (!galponAEliminar || procesandoGalpon) return;
    setProcesandoGalpon(true);
    try {
      const { data, error } = await supabase.from('gal_galpones').delete().eq('id', galponAEliminar.id).select('id');
      if (error) {
        // 23503: tiene registros (alguien anotó un día mientras tanto)
        notificar(
          'error',
          error.code === '23503'
            ? `${galponAEliminar.nombre} ya tiene días anotados. Desactívalo en vez de eliminarlo.`
            : 'No se pudo eliminar el galpón: ' + error.message
        );
        return;
      }
      if (!data || data.length === 0) {
        // Sin error y sin filas: falta el permiso de borrar en la base de datos
        notificar('error', 'La base de datos no permitió eliminarlo. Ejecuta en Supabase el archivo supabase/migrations/20261106000000_galpones_eliminar.sql.');
        return;
      }
      setGalpones((prev) => prev.filter((x) => x.id !== galponAEliminar.id));
      notificar('exito', `${galponAEliminar.nombre} eliminado.`);
      setGalponAEliminar(null);
    } finally {
      setProcesandoGalpon(false);
    }
  };

  const modulos = MODULOS_GALPONES.filter((m) => esAdmin || !m.soloAdmin);
  const moduloVisible = modulos.some((m) => m.id === modulo) ? modulo : 'gal-inicio';

  return (
    <div className="min-h-dvh bg-papel text-tinta lg:flex">
      <Sidebar
        modulos={modulos}
        moduloActivo={moduloVisible}
        onCambiar={setModulo}
        usuario={usuario}
        onSalir={onSalir}
        seccion="Galpones"
        cambiosSeccion={cambiosSeccion}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          modulos={modulos}
          barraMovil={['gal-inicio', 'gal-registro']}
          moduloActivo={moduloVisible}
          onCambiar={setModulo}
          usuario={usuario}
          onSalir={onSalir}
          seccion="Galpones"
          cambiosSeccion={cambiosSeccion}
        />

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">
          {cargando && galpones.length === 0 ? (
            <CargandoModulo />
          ) : faltaMigracion ? (
            <Alert tono="aviso">
              La sección de Galpones todavía no está activada en la base de datos. El administrador debe ejecutar el archivo
              <strong> supabase/migrations/20261105000000_galpones.sql</strong> en Supabase → SQL Editor.
            </Alert>
          ) : (
            <>
              {moduloVisible === 'gal-inicio' && (
                <GalponesInicioView
                  nombreUsuario={usuario.nombre}
                  esAdmin={esAdmin}
                  galpones={galpones}
                  registros={registros}
                  actualizando={cargando}
                  onActualizar={cargar}
                  onRegistrar={irARegistrar}
                  onCrearGalpon={() => {
                    setModulo('gal-galpones');
                    setModalGalpon({ editando: null });
                  }}
                />
              )}
              {moduloVisible === 'gal-registro' && (
                <RegistroDiarioView
                  esAdmin={esAdmin}
                  galpones={galpones}
                  registros={registros}
                  galponInicial={galponParaRegistrar}
                  procesando={procesandoRegistro}
                  onGuardar={guardarRegistro}
                  onEliminar={setRegistroAEliminar}
                />
              )}
              {moduloVisible === 'gal-galpones' && esAdmin && (
                <GalponesAdminView
                  galpones={galpones}
                  registros={registros}
                  onNuevo={() => setModalGalpon({ editando: null })}
                  onEditar={(g) => setModalGalpon({ editando: g })}
                  onEliminar={pedirEliminarGalpon}
                />
              )}
            </>
          )}
        </main>
      </div>

      {modalGalpon && (
        <GalponFormModal
          galpon={modalGalpon.editando}
          procesando={procesandoGalpon}
          onGuardar={guardarGalpon}
          onCerrar={() => setModalGalpon(null)}
        />
      )}

      {galponAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este galpón?"
          textoConfirmar="Eliminar galpón"
          cargando={procesandoGalpon}
          onConfirmar={confirmarEliminarGalpon}
          onCancelar={() => setGalponAEliminar(null)}
        >
          <div className="flex flex-col gap-0.5 rounded-campo bg-hundido px-4 py-3">
            <strong className="font-semibold">{galponAEliminar.nombre}</strong>
            <span className="text-sm text-tinta-suave tabular">
              {galponAEliminar.aves_iniciales.toLocaleString('es-CO')} aves · llegada {formatoDia(galponAEliminar.fecha_llegada)}
            </span>
          </div>
          <p className="text-tinta-suave">No tiene días anotados. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}

      {registroAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este registro?"
          textoConfirmar="Eliminar registro"
          onConfirmar={confirmarEliminarRegistro}
          onCancelar={() => setRegistroAEliminar(null)}
        >
          <p>
            Se borrará el registro del <strong>{formatoDia(registroAEliminar.fecha)}</strong> de{' '}
            <strong>{galpones.find((g) => g.id === registroAEliminar.galpon_id)?.nombre ?? 'galpón'}</strong>.
          </p>
          {registroAEliminar.muertas > 0 && (
            <p className="text-tinta-suave">Las {registroAEliminar.muertas} gallinas muertas de ese día vuelven a contarse como vivas.</p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
