'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo, ConfirmDialog } from '@/components/ui';
import { useUsuario } from '@/features/auth/SesionProvider';
import { InventarioView } from '@/features/inventario/InventarioView';
import { useProductoForm } from '@/features/inventario/useProductoForm';
import { mensajeDeError } from '@/lib/api/cliente';
import { productosApi } from '@/lib/api/servicios';
import { exportarInventarioCsv } from '@/lib/exportar';
import type { Producto } from '@/types/api';

export default function InventarioPage() {
  const usuario = useUsuario();
  const notificar = useNotificar();
  const { refrescar } = useEstadoNegocio();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [aQuitar, setAQuitar] = useState<Producto | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setProductos(await productosApi.todos());
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const form = useProductoForm(() => {
    void cargar();
    void refrescar();
  });

  const quitar = async () => {
    if (!aQuitar) return;
    setProcesando(true);
    try {
      await productosApi.desactivar(aQuitar.id);
      notificar('exito', `${aQuitar.nombre} ya no aparece en el inventario. Sus ventas e historial se conservan.`);
      setAQuitar(null);
      await Promise.all([cargar(), refrescar()]);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  if (!productos) return <CargandoModulo />;

  return (
    <>
      <InventarioView
        productos={productos}
        esAdmin={usuario.rol === 'admin'}
        onNuevo={form.abrirNuevo}
        onEditar={form.abrirEdicion}
        onEliminar={setAQuitar}
        onExportar={() => exportarInventarioCsv(productos, `Inventario_DYMS_${new Date().toLocaleDateString('en-CA')}`)}
      />
      {form.modal}
      {aQuitar && (
        <ConfirmDialog
          titulo={`¿Quitar ${aQuitar.nombre} del inventario?`}
          textoConfirmar="Quitar producto"
          cargando={procesando}
          onConfirmar={quitar}
          onCancelar={() => setAQuitar(null)}
        >
          Dejará de aparecer en el inventario y en el punto de venta. Sus ventas y su historial de stock se conservan.
        </ConfirmDialog>
      )}
    </>
  );
}
