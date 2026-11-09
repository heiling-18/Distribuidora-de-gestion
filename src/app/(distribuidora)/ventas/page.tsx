'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo } from '@/components/ui';
import { useUsuario } from '@/features/auth/SesionProvider';
import { useAnulacion } from '@/features/ventas/useAnulacion';
import { VentasView, type Periodo } from '@/features/ventas/VentasView';
import { mensajeDeError } from '@/lib/api/cliente';
import { ventasApi, type FiltroVentas } from '@/lib/api/servicios';
import { exportarVentasCsv } from '@/lib/exportar';
import { hoyNegocio } from '@/lib/fechas';
import type { Pagina, Venta } from '@/types/api';

const POR_PAGINA = 25;

export default function VentasPage() {
  const usuario = useUsuario();
  const notificar = useNotificar();
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [numPagina, setNumPagina] = useState(1);
  const [pagina, setPagina] = useState<Pagina<Venta> | null>(null);
  const [cargando, setCargando] = useState(false);

  const filtro = useCallback(
    (): FiltroVentas => ({
      ...(periodo === 'hoy' ? { desde: hoyNegocio(), hasta: hoyNegocio() } : {}),
      q: busqueda.trim() || undefined,
      conItems: true,
    }),
    [periodo, busqueda],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setPagina(await ventasApi.listar({ ...filtro(), pagina: numPagina, limite: POR_PAGINA }));
    } catch (err) {
      notificar('error', mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [filtro, numPagina, notificar]);

  // Espera un momento mientras se escribe en el buscador antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => void cargar(), busqueda ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  const anulacion = useAnulacion(cargar);

  /** Exporta todas las ventas del filtro actual (no solo la página visible). */
  const exportar = async () => {
    try {
      const todas: Venta[] = [];
      for (let n = 1; ; n++) {
        const p = await ventasApi.listar({ ...filtro(), pagina: n, limite: 100 });
        todas.push(...p.datos);
        if (n >= p.totalPaginas) break;
      }
      if (!todas.length) return notificar('advertencia', 'No hay ventas para exportar.');
      exportarVentasCsv(todas, `Ventas_DYMS_${periodo === 'hoy' ? hoyNegocio() : 'historial'}`);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  };

  if (!pagina) return <CargandoModulo />;

  return (
    <>
      <VentasView
        pagina={pagina}
        periodo={periodo}
        busqueda={busqueda}
        cargando={cargando}
        esAdmin={usuario.rol === 'admin'}
        procesandoAnulacion={anulacion.procesando}
        onPeriodo={(p) => {
          setPeriodo(p);
          setNumPagina(1);
        }}
        onBusqueda={(q) => {
          setBusqueda(q);
          setNumPagina(1);
        }}
        onPagina={setNumPagina}
        onExportar={exportar}
        onAnular={anulacion.iniciar}
        onVerMotivo={anulacion.mostrarMotivo}
      />
      {anulacion.modales}
    </>
  );
}
