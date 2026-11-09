'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo } from '@/components/ui';
import { useUsuario } from '@/features/auth/SesionProvider';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { AlertasStockModal } from '@/features/inventario/AlertasStockModal';
import { useAnulacion } from '@/features/ventas/useAnulacion';
import { mensajeDeError } from '@/lib/api/cliente';
import { cajaApi, productosApi, reportesApi, ventasApi } from '@/lib/api/servicios';
import { exportarVentasCsv } from '@/lib/exportar';
import type { Dashboard, Producto, ResumenCaja, Venta } from '@/types/api';

export default function InicioPage() {
  const usuario = useUsuario();
  const router = useRouter();
  const notificar = useNotificar();
  const { caja } = useEstadoNegocio();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([]);
  const [actualizando, setActualizando] = useState(false);
  const [alertas, setAlertas] = useState<Producto[] | null>(null);

  const cargar = useCallback(async () => {
    setActualizando(true);
    try {
      const d = await reportesApi.dashboard();
      const [r, v] = await Promise.all([
        d.caja ? cajaApi.resumen().then((x) => x.resumen) : Promise.resolve(null),
        ventasApi.listar({ desde: d.fecha, hasta: d.fecha, conItems: true, limite: 100 }),
      ]);
      setDashboard(d);
      setResumen(r);
      setVentasHoy(v.datos);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setActualizando(false);
    }
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar, caja?.id]);

  const anulacion = useAnulacion(cargar);

  const verAlertas = async () => {
    try {
      setAlertas((await productosApi.listar({ stockBajo: true, limite: 100 })).datos);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  };

  if (!dashboard) return <CargandoModulo />;

  return (
    <>
      <DashboardView
        nombreUsuario={usuario.nombre}
        esAdmin={usuario.rol === 'admin'}
        dashboard={dashboard}
        resumenCaja={resumen}
        ventasHoy={ventasHoy}
        procesandoAnulacion={anulacion.procesando}
        actualizando={actualizando}
        onActualizar={cargar}
        onNuevaVenta={() => router.push('/pos')}
        onIrCaja={() => router.push('/caja')}
        onVerVentas={() => router.push('/ventas')}
        onExportarHoy={() =>
          ventasHoy.length
            ? exportarVentasCsv(ventasHoy, `Ventas_DYMS_${dashboard.fecha}`)
            : notificar('advertencia', 'No hay ventas para exportar.')
        }
        onVerAlertas={verAlertas}
        onAnular={anulacion.iniciar}
        onVerMotivo={anulacion.mostrarMotivo}
      />
      {anulacion.modales}
      {alertas && (
        <AlertasStockModal
          productos={alertas}
          esAdmin={usuario.rol === 'admin'}
          onReponer={() => router.push('/inventario')}
          onCerrar={() => setAlertas(null)}
        />
      )}
    </>
  );
}
