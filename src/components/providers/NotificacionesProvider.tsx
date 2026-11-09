'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toasts, type Notificacion } from '@/components/layout/Toasts';

type Notificar = (tipo: Notificacion['tipo'], mensaje: string) => void;

const NotificacionesContext = createContext<Notificar | null>(null);

/** Notificaciones flotantes disponibles en toda la app con useNotificar(). */
export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const cerrar = useCallback((id: number) => setNotificaciones((prev) => prev.filter((n) => n.id !== id)), []);

  const notificar = useCallback<Notificar>(
    (tipo, mensaje) => {
      const id = Date.now() + Math.random();
      setNotificaciones((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => cerrar(id), tipo === 'error' ? 7000 : 4000);
    },
    [cerrar],
  );

  const valor = useMemo(() => notificar, [notificar]);

  return (
    <NotificacionesContext.Provider value={valor}>
      <Toasts notificaciones={notificaciones} onCerrar={cerrar} />
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificar(): Notificar {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificar debe usarse dentro de NotificacionesProvider');
  return ctx;
}
