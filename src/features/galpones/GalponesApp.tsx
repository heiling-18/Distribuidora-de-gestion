'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CargandoModulo, ConfirmDialog } from '@/components/ui';
import { mensajeDeError } from '@/lib/api/cliente';
import { galponesApi } from '@/lib/api/servicios';
import type { CambioSeccion } from '@/lib/modulos';
import type { Galpon as GalponApi, RegistroGalpon as RegistroApi, Usuario } from '@/types/api';
import {
  MODULOS_GALPONES,
  formatoDia,
  formatoKg,
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
  cambioSeccion?: CambioSeccion;
}

// Las vistas de Galpones trabajan con la forma de datos de lib/galpones; aquí se traduce desde la API.
const aGalpon = (g: GalponApi): Galpon => ({
  id: g.id,
  nombre: g.nombre,
  aves_iniciales: g.avesIniciales,
  fecha_llegada: g.fechaLlegada,
  edad_semanas_llegada: g.edadSemanasLlegada,
  gramos_ave_dia: g.gramosAveDia,
  activo: g.activo,
});
const aRegistro = (r: Omit<RegistroApi, 'galpon'>): RegistroGalpon => ({
  id: r.id,
  galpon_id: r.galponId,
  fecha: r.fecha,
  huevos: r.huevos,
  muertas: r.muertas,
  alimento_kg: r.alimentoKg,
  notas: r.notas,
  registrado_por: r.registradoPorNombre,
});

/**
 * Todos los registros diarios. La primera página dice cuántas hay y el resto se pide en paralelo.
 * Las vistas calculan aves vivas con el historial completo; cuando crezca mucho, conviene que usen
 * los totales que ya da GET /api/galpones (avesVivas, muertasTotales) y pedir solo un rango de fechas.
 */
async function todosLosRegistros(): Promise<RegistroGalpon[]> {
  const primera = await galponesApi.registros({ pagina: 1, limite: 100 });
  const resto = await Promise.all(
    Array.from({ length: primera.totalPaginas - 1 }, (_, i) => galponesApi.registros({ pagina: i + 2, limite: 100 })),
  );
  return [primera, ...resto].flatMap((p) => p.datos.map(aRegistro));
}

/**
 * Sección GALPONES: producción de huevos.
 * Solo usa /api/galpones; nunca toca los datos de la Distribuidora.
 */
export function GalponesApp({ usuario, onSalir, notificar, cambioSeccion }: GalponesAppProps) {
  const esAdmin = usuario.rol === 'admin';
  const [modulo, setModulo] = useState<ModuloGalpones>('gal-inicio');
  const [galpones, setGalpones] = useState<Galpon[]>([]);
  const [registros, setRegistros] = useState<RegistroGalpon[]>([]);
  const [cargando, setCargando] = useState(true);
  const [galponParaRegistrar, setGalponParaRegistrar] = useState<number | null>(null);

  const [procesandoRegistro, setProcesandoRegistro] = useState(false);
  const [registroAEliminar, setRegistroAEliminar] = useState<RegistroGalpon | null>(null);

  const [modalGalpon, setModalGalpon] = useState<{ editando: Galpon | null } | null>(null);
  const [procesandoGalpon, setProcesandoGalpon] = useState(false);
  const [galponAEliminar, setGalponAEliminar] = useState<Galpon | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // El admin ve también los galpones desactivados (para editarlos o reactivarlos).
      const [g, r] = await Promise.all([galponesApi.listar(esAdmin ? 'todos' : 'true'), todosLosRegistros()]);
      setGalpones(g.galpones.map(aGalpon));
      setRegistros(r);
    } catch (err) {
      notificar('error', 'No se pudieron cargar los galpones: ' + mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [esAdmin, notificar]);

  useEffect(() => {
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
      const { registro } = await galponesApi.guardarRegistro(datos.galpon_id, datos.fecha, {
        huevos: datos.huevos,
        muertas: datos.muertas,
        alimentoKg: datos.alimento_kg,
        notas: datos.notas,
      });
      const nuevo = aRegistro(registro);
      setRegistros((prev) =>
        [nuevo, ...prev.filter((r) => r.id !== nuevo.id)].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
      );
      const galpon = galpones.find((g) => g.id === nuevo.galpon_id);
      notificar('exito', `Guardado ${galpon?.nombre ?? ''} · ${formatoDia(nuevo.fecha)}: ${textoCartones(nuevo.huevos)}, ${nuevo.muertas} muertas, ${formatoKg(nuevo.alimento_kg)} de alimento.`);
      return true;
    } catch (err) {
      notificar('error', mensajeDeError(err));
      return false;
    } finally {
      setProcesandoRegistro(false);
    }
  };

  const confirmarEliminarRegistro = async () => {
    if (!registroAEliminar) return;
    try {
      await galponesApi.eliminarRegistro(registroAEliminar.id);
      setRegistros((prev) => prev.filter((r) => r.id !== registroAEliminar.id));
      notificar('exito', 'Registro eliminado.');
    } catch (err) {
      notificar('error', 'No se pudo eliminar el registro: ' + mensajeDeError(err));
    }
    setRegistroAEliminar(null);
  };

  const guardarGalpon = async (datos: DatosGalpon) => {
    if (procesandoGalpon || !modalGalpon) return;
    setProcesandoGalpon(true);
    try {
      const editando = modalGalpon.editando;
      const cuerpo = {
        nombre: datos.nombre,
        avesIniciales: datos.aves_iniciales,
        fechaLlegada: datos.fecha_llegada,
        edadSemanasLlegada: datos.edad_semanas_llegada,
        gramosAveDia: datos.gramos_ave_dia,
      };
      const { galpon } = editando
        ? await galponesApi.actualizar(editando.id, { ...cuerpo, activo: datos.activo })
        : await galponesApi.crear(cuerpo);
      const g = aGalpon({ ...galpon, activo: editando ? datos.activo : galpon.activo });
      setGalpones((prev) => (editando ? prev.map((x) => (x.id === g.id ? g : x)) : [...prev, g]));
      notificar('exito', editando ? `${g.nombre} actualizado.` : `${g.nombre} creado.`);
      setModalGalpon(null);
    } catch (err) {
      notificar('error', 'No se pudo guardar el galpón: ' + mensajeDeError(err));
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
      await galponesApi.eliminar(galponAEliminar.id);
      setGalpones((prev) => prev.filter((x) => x.id !== galponAEliminar.id));
      notificar('exito', `${galponAEliminar.nombre} eliminado.`);
      setGalponAEliminar(null);
    } catch (err) {
      notificar('error', mensajeDeError(err));
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
        cambioSeccion={cambioSeccion}
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
          cambioSeccion={cambioSeccion}
        />

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">
          {cargando && galpones.length === 0 ? (
            <CargandoModulo />
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
