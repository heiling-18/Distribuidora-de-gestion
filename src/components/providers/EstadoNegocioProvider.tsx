'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cajaApi, productosApi } from '@/lib/api/servicios';
import type { Caja } from '@/types/api';

interface EstadoNegocio {
  /** Caja abierta, o null si está cerrada. undefined mientras carga. */
  caja: Caja | null | undefined;
  /** Productos en o por debajo del stock mínimo (aviso en el menú). */
  stockBajo: number;
  /** Volver a consultar caja y alertas (después de vender, abrir o cerrar caja, ajustar stock…). */
  refrescar: () => Promise<void>;
}

const EstadoNegocioContext = createContext<EstadoNegocio | null>(null);

/** Estado compartido por todas las pantallas de la Distribuidora: la caja y las alertas de stock. */
export function EstadoNegocioProvider({ children }: { children: React.ReactNode }) {
  const [caja, setCaja] = useState<Caja | null | undefined>(undefined);
  const [stockBajo, setStockBajo] = useState(0);

  const refrescar = useCallback(async () => {
    const [actual, bajos] = await Promise.all([
      cajaApi.actual().catch(() => ({ caja: null })),
      productosApi.listar({ stockBajo: true, limite: 1 }).catch(() => ({ total: 0 })),
    ]);
    setCaja(actual.caja);
    setStockBajo(bajos.total);
  }, []);

  useEffect(() => {
    // Carga inicial de datos al abrir la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refrescar();
  }, [refrescar]);

  const valor = useMemo(() => ({ caja, stockBajo, refrescar }), [caja, stockBajo, refrescar]);
  return <EstadoNegocioContext.Provider value={valor}>{children}</EstadoNegocioContext.Provider>;
}

export function useEstadoNegocio(): EstadoNegocio {
  const ctx = useContext(EstadoNegocioContext);
  if (!ctx) throw new Error('useEstadoNegocio debe usarse dentro de EstadoNegocioProvider');
  return ctx;
}
