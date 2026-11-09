'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo } from '@/components/ui';
import { ticketDeVenta } from '@/features/pos/ticket';
import { TicketVentaModal, type TicketVenta } from '@/features/pos/TicketVentaModal';
import { linkWhatsAppCliente, linkWhatsAppDueno } from '@/features/pos/whatsapp';
import { claveMes, nombreMes } from '@/features/reportes/meses';
import { ReportesView } from '@/features/reportes/ReportesView';
import { mensajeDeError } from '@/lib/api/cliente';
import { configuracionApi, reportesApi, ventasApi, type Configuracion } from '@/lib/api/servicios';
import { exportarVentasCsv } from '@/lib/exportar';
import type { CierreMensual, Historico, ReporteMes, Venta } from '@/types/api';

export default function ReportesPage() {
  const notificar = useNotificar();
  const [mesVisto, setMesVisto] = useState(() => claveMes(new Date()));
  const [reporte, setReporte] = useState<ReporteMes | null>(null);
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [cierres, setCierres] = useState<CierreMensual[]>([]);
  const [ultimas, setUltimas] = useState<Venta[]>([]);
  const [config, setConfig] = useState<Configuracion>({ nombreNegocio: "DYM'S", nit: '', telefonoWhatsapp: '' });
  const [ticket, setTicket] = useState<TicketVenta | null>(null);

  const cargarGenerales = useCallback(async () => {
    try {
      const [h, c, u, cfg] = await Promise.all([
        reportesApi.historico(),
        reportesApi.cierresMes(),
        ventasApi.listar({ limite: 50, conItems: true }),
        configuracionApi.obtener(),
      ]);
      setHistorico(h.historico);
      setCierres(c.cierres);
      setUltimas(u.datos);
      setConfig(cfg.configuracion);
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  }, [notificar]);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarGenerales();
  }, [cargarGenerales]);

  useEffect(() => {
    reportesApi
      .mes(mesVisto)
      .then((r) => setReporte(r.reporte))
      .catch((err) => notificar('error', mensajeDeError(err)));
  }, [mesVisto, notificar]);

  const cerrarMes = async (mes: string) => {
    try {
      const { cierre } = await reportesApi.cerrarMes(mes);
      notificar('exito', `Se cerró ${nombreMes(mes)}. Sus ventas y gastos ya no se pueden modificar.`);
      await cargarGenerales();
      if (mes === mesVisto) setReporte((await reportesApi.mes(mes)).reporte);
      return cierre;
    } catch (err) {
      notificar('error', mensajeDeError(err));
      return null;
    }
  };

  /** Descarga todo el historial de ventas, en páginas de 100. */
  const exportar = async () => {
    try {
      const todas: Venta[] = [];
      for (let n = 1; ; n++) {
        const p = await ventasApi.listar({ pagina: n, limite: 100, conItems: true });
        todas.push(...p.datos);
        if (n >= p.totalPaginas) break;
      }
      if (!todas.length) return notificar('advertencia', 'No hay ventas para exportar.');
      exportarVentasCsv(todas, 'Ventas_DYMS_historial');
    } catch (err) {
      notificar('error', mensajeDeError(err));
    }
  };

  if (!reporte || !historico) return <CargandoModulo />;

  return (
    <>
      <ReportesView
        reporte={reporte}
        mesVisto={mesVisto}
        onMesVisto={setMesVisto}
        historico={historico}
        cierres={cierres}
        ultimas={ultimas}
        onExportar={exportar}
        onVerTicket={(v) => setTicket(ticketDeVenta(v))}
        onCerrarMes={cerrarMes}
        telefonoDueno={config.telefonoWhatsapp}
      />
      {ticket && (
        <TicketVentaModal
          ticket={ticket}
          linkWhatsAppCliente={linkWhatsAppCliente(ticket, config.nombreNegocio)}
          linkWhatsAppDueno={linkWhatsAppDueno(ticket, config.telefonoWhatsapp, config.nombreNegocio)}
          nit={config.nit}
          telefonoDueno={config.telefonoWhatsapp}
          onCerrar={() => setTicket(null)}
        />
      )}
    </>
  );
}
