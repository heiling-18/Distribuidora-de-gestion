'use client';

import { useState } from 'react';
import { useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { mensajeDeError } from '@/lib/api/cliente';
import { ventasApi } from '@/lib/api/servicios';
import type { Venta } from '@/types/api';
import { AnularVentaModal } from './AnularVentaModal';
import { MotivoAnulacionModal } from './MotivoAnulacionModal';

/**
 * Anular una venta y ver el motivo de una anulada, con sus modales.
 * Se usa en el Inicio y en el historial de Ventas.
 */
export function useAnulacion(alTerminar: () => void) {
  const notificar = useNotificar();
  const { refrescar } = useEstadoNegocio();
  const [aAnular, setAAnular] = useState<Venta | null>(null);
  const [verMotivo, setVerMotivo] = useState<Venta | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  /** La lista no trae los productos de cada venta: se pide el detalle antes de abrir el modal. */
  const conDetalle = async (v: Pick<Venta, 'id'>) => (await ventasApi.obtener(v.id)).venta;

  const iniciar = async (v: Pick<Venta, 'id'>) => {
    try {
      setMotivo('');
      setAAnular(await conDetalle(v));
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  };

  const mostrarMotivo = async (v: Pick<Venta, 'id'>) => {
    try {
      setVerMotivo(await conDetalle(v));
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  };

  const confirmar = async () => {
    if (!aAnular) return;
    setProcesando(true);
    try {
      await ventasApi.anular(aAnular.id, motivo.trim());
      notificar('exito', `Venta #${aAnular.numero} anulada. El stock volvió al inventario.`);
      setAAnular(null);
      alTerminar();
      void refrescar();
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const modales = (
    <>
      {aAnular && (
        <AnularVentaModal
          venta={aAnular}
          motivo={motivo}
          procesando={procesando}
          onMotivo={setMotivo}
          onConfirmar={confirmar}
          onCancelar={() => setAAnular(null)}
        />
      )}
      {verMotivo && <MotivoAnulacionModal venta={verMotivo} onCerrar={() => setVerMotivo(null)} />}
    </>
  );

  return { iniciar, mostrarMotivo, procesando, modales };
}
