'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo, ConfirmDialog } from '@/components/ui';
import { useUsuario } from '@/features/auth/SesionProvider';
import { ClienteFormModal } from '@/features/clientes/ClienteFormModal';
import { ClientesView } from '@/features/clientes/ClientesView';
import { mensajeDeError } from '@/lib/api/cliente';
import { clientesApi } from '@/lib/api/servicios';
import type { Cliente } from '@/types/api';

const vacio = { documento: '', nombre: '', telefono: '', direccion: '' };

export default function ClientesPage() {
  const usuario = useUsuario();
  const notificar = useNotificar();
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [form, setForm] = useState<typeof vacio | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [aEliminar, setAEliminar] = useState<Cliente | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setClientes(await clientesApi.todos());
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(vacio);
  };

  const abrirEdicion = (c: Cliente) => {
    setEditandoId(c.id);
    setForm({ documento: c.documento ?? '', nombre: c.nombre, telefono: c.telefono ?? '', direccion: c.direccion ?? '' });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setProcesando(true);
    try {
      if (editandoId) {
        await clientesApi.actualizar(editandoId, form);
        notificar('exito', 'Cliente actualizado.');
      } else {
        await clientesApi.crear(form);
        notificar('exito', 'Cliente registrado.');
      }
      setForm(null);
      await cargar();
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
      await clientesApi.desactivar(aEliminar.id);
      notificar('exito', `${aEliminar.nombre} ya no aparecerá en la lista. Sus ventas se conservan.`);
      setAEliminar(null);
      await cargar();
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  if (!clientes) return <CargandoModulo />;

  return (
    <>
      <ClientesView clientes={clientes} esAdmin={usuario.rol === 'admin'} onNuevo={abrirNuevo} onEditar={abrirEdicion} onEliminar={setAEliminar} />
      {form && (
        <ClienteFormModal
          editando={editandoId !== null}
          {...form}
          procesando={procesando}
          onDocumento={(documento) => setForm({ ...form, documento })}
          onNombre={(nombre) => setForm({ ...form, nombre })}
          onTelefono={(telefono) => setForm({ ...form, telefono })}
          onDireccion={(direccion) => setForm({ ...form, direccion })}
          onSubmit={guardar}
          onCerrar={() => setForm(null)}
        />
      )}
      {aEliminar && (
        <ConfirmDialog
          titulo={`¿Quitar a ${aEliminar.nombre}?`}
          textoConfirmar="Quitar cliente"
          cargando={procesando}
          onConfirmar={eliminar}
          onCancelar={() => setAEliminar(null)}
        >
          Dejará de aparecer en la lista y en el punto de venta. Sus ventas anteriores se conservan.
        </ConfirmDialog>
      )}
    </>
  );
}
