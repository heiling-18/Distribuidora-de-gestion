'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo, ConfirmDialog } from '@/components/ui';
import { GastoFormModal } from '@/features/gastos/GastoFormModal';
import { GastosView } from '@/features/gastos/GastosView';
import { mensajeDeError } from '@/lib/api/cliente';
import { cajaApi, gastosApi } from '@/lib/api/servicios';
import { formatoMoneda } from '@/lib/formato';
import type { CategoriaGasto, Gasto } from '@/types/api';

const vacio = { categoria: 'arriendo', descripcion: '', monto: '' };

export default function GastosPage() {
  const notificar = useNotificar();
  const { caja, refrescar } = useEstadoNegocio();
  const [gastos, setGastos] = useState<Gasto[] | null>(null);
  /** Totales de todos los gastos (la lista muestra solo los más recientes). */
  const [resumen, setResumen] = useState({ total: 0, montoTotal: 0 });
  const [form, setForm] = useState<typeof vacio | null>(null);
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [aEliminar, setAEliminar] = useState<Gasto | null>(null);
  const [disponible, setDisponible] = useState(0);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const pagina = await gastosApi.listar({ limite: 100 });
      setGastos(pagina.datos);
      setResumen({ total: pagina.total, montoTotal: pagina.montoTotal });
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const abrirForm = async (g: Gasto | null) => {
    setEditando(g);
    setForm(g ? { categoria: g.categoria, descripcion: g.descripcion, monto: String(g.monto) } : vacio);
    // Efectivo disponible en la caja abierta, como referencia al registrar el gasto.
    setDisponible(caja ? (await cajaApi.resumen().catch(() => null))?.resumen.dineroEsperado ?? 0 : 0);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) return notificar('advertencia', 'Escribe un monto mayor a 0.');
    // Al editar se conserva el método de pago original (un gasto por transferencia no debe pasar a efectivo).
    const datos = { categoria: form.categoria as CategoriaGasto, descripcion: form.descripcion.trim(), monto, metodoPago: editando?.metodoPago ?? 'efectivo' };
    setProcesando(true);
    try {
      if (editando) {
        await gastosApi.actualizar(editando.id, datos);
        notificar('exito', 'Gasto actualizado.');
      } else {
        await gastosApi.crear(datos);
        notificar('exito', `Gasto de ${formatoMoneda(monto)} registrado.`);
      }
      setForm(null);
      await Promise.all([cargar(), refrescar()]);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setProcesando(true);
    try {
      await gastosApi.eliminar(aEliminar.id);
      notificar('exito', 'Gasto eliminado.');
      setAEliminar(null);
      await Promise.all([cargar(), refrescar()]);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  if (!gastos) return <CargandoModulo />;

  return (
    <>
      <GastosView gastos={gastos} resumen={resumen} onNuevo={() => abrirForm(null)} onEditar={abrirForm} onEliminar={setAEliminar} />
      {form && (
        <GastoFormModal
          editando={editando !== null}
          {...form}
          disponibleEnCaja={disponible}
          procesando={procesando}
          onCategoria={(categoria) => setForm({ ...form, categoria })}
          onDescripcion={(descripcion) => setForm({ ...form, descripcion })}
          onMonto={(monto) => setForm({ ...form, monto })}
          onSubmit={guardar}
          onCerrar={() => setForm(null)}
        />
      )}
      {aEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este gasto?"
          textoConfirmar="Eliminar gasto"
          cargando={procesando}
          onConfirmar={eliminar}
          onCancelar={() => setAEliminar(null)}
        >
          {aEliminar.descripcion} · {formatoMoneda(aEliminar.monto)}. Queda registrado en la auditoría.
        </ConfirmDialog>
      )}
    </>
  );
}
