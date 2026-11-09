'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { Alert, CargandoModulo } from '@/components/ui';
import { CajaView } from '@/features/caja/CajaView';
import { CierreCajaModal } from '@/features/caja/CierreCajaModal';
import { ComprobanteCierreModal } from '@/features/caja/ComprobanteCierreModal';
import { mensajeDeError } from '@/lib/api/cliente';
import { cajaApi } from '@/lib/api/servicios';
import { formatoMoneda } from '@/lib/formato';
import type { CierreCaja, ResumenCaja } from '@/types/api';

export default function CajaPage() {
  const notificar = useNotificar();
  const { caja, refrescar } = useEstadoNegocio();

  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [historial, setHistorial] = useState<CierreCaja[]>([]);
  const [montoApertura, setMontoApertura] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [contado, setContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [comprobante, setComprobante] = useState<CierreCaja | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [r, h] = await Promise.all([
        caja ? cajaApi.resumen().then((x) => x.resumen) : Promise.resolve(null),
        cajaApi.cierres({ limite: 20 }),
      ]);
      setResumen(r);
      setHistorial(h.datos);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  }, [caja, notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (caja !== undefined) void cargar();
  }, [caja, cargar]);

  const abrir = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(montoApertura);
    if (!Number.isFinite(monto) || monto < 0) return notificar('advertencia', 'Escribe un monto de apertura válido.');
    setProcesando(true);
    try {
      await cajaApi.abrir(monto);
      notificar('exito', `Caja abierta con ${formatoMoneda(monto)}.`);
      setMontoApertura('');
      await refrescar();
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const cerrar = async () => {
    const real = Number(contado);
    if (contado.trim() === '' || !Number.isFinite(real) || real < 0) {
      return notificar('advertencia', 'Ingresa el dinero físico contado en la caja.');
    }
    setProcesando(true);
    try {
      // Lo esperado y la diferencia los calcula el servidor.
      const { cierre } = await cajaApi.cerrar(real, observaciones.trim() || undefined);
      setCerrando(false);
      setContado('');
      setObservaciones('');
      setComprobante(cierre);
      notificar(cierre.diferencia === 0 ? 'exito' : 'advertencia', cierre.diferencia === 0 ? 'Caja cerrada. ¡Cuadró exacto!' : `Caja cerrada con diferencia de ${formatoMoneda(cierre.diferencia)}.`);
      await refrescar();
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setProcesando(false);
    }
  };

  if (caja === undefined) return <CargandoModulo />;

  const totales = {
    efectivoHoy: resumen?.ventasEfectivo ?? 0,
    transferenciaHoy: resumen?.ventasTransferencia ?? 0,
    gastosHoy: resumen?.gastosEfectivo ?? 0,
    efectivoEnCaja: resumen?.dineroEsperado ?? 0,
    disponible: (resumen?.dineroEsperado ?? 0) + (resumen?.ventasTransferencia ?? 0),
  };

  return (
    <>
      {caja?.esDeOtroDia && (
        <Alert tono="aviso" className="mb-5">
          Esta caja se abrió el {caja.fecha} y sigue abierta. Ciérrala para cuadrar ese día antes de abrir la de hoy.
        </Alert>
      )}
      <CajaView
        caja={caja}
        totales={totales}
        historial={historial}
        montoApertura={montoApertura}
        onMontoApertura={setMontoApertura}
        onAbrir={abrir}
        procesando={procesando}
        onCerrarCaja={() => setCerrando(true)}
        onVerComprobante={setComprobante}
      />
      {cerrando && resumen && (
        <CierreCajaModal
          base={resumen.montoInicial}
          efectivoHoy={resumen.ventasEfectivo}
          gastosHoy={resumen.gastosEfectivo}
          esperado={resumen.dineroEsperado}
          contado={contado}
          observaciones={observaciones}
          procesando={procesando}
          onContado={setContado}
          onObservaciones={setObservaciones}
          onConfirmar={cerrar}
          onCancelar={() => setCerrando(false)}
        />
      )}
      {comprobante && <ComprobanteCierreModal cierre={comprobante} onCerrar={() => setComprobante(null)} />}
    </>
  );
}
