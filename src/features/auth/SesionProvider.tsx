'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, EVENTO_SESION_EXPIRADA } from '@/lib/api/cliente';
import { authApi } from '@/lib/api/servicios';
import type { Usuario } from '@/types/api';

interface Sesion {
  usuario: Usuario | null;
  /** true mientras se consulta /auth/me al cargar la app. */
  cargando: boolean;
  iniciarSesion: (email: string, clave: string) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

/** Pantalla de inicio según el rol. */
export const inicioDe = (u: Usuario) => (u.rol === 'galponero' ? '/galpones' : '/');

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    authApi
      .yo()
      .then(({ usuario }) => setUsuario(usuario))
      .catch((err) => {
        setUsuario(null);
        // Cookie que ya no vale: se borra para que el navegador no la siga enviando.
        if (err instanceof ApiError && err.status === 401) void authApi.logout().catch(() => undefined);
      })
      .finally(() => setCargando(false));
  }, []);

  // Si la API dice que la sesión ya no vale (expiró, cambió el rol, se desactivó), volver al login.
  useEffect(() => {
    const alExpirar = () => {
      setUsuario(null);
      void authApi.logout().catch(() => undefined);
      if (pathname !== '/login') router.replace('/login');
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, [pathname, router]);

  const iniciarSesion = useCallback(async (email: string, clave: string) => {
    const { usuario } = await authApi.login(email, clave);
    setUsuario(usuario);
    return usuario;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUsuario(null);
    router.replace('/login');
  }, [router]);

  const valor = useMemo(() => ({ usuario, cargando, iniciarSesion, cerrarSesion }), [usuario, cargando, iniciarSesion, cerrarSesion]);
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return ctx;
}

/** Usuario autenticado (para pantallas que ya están detrás del layout protegido). */
export function useUsuario(): Usuario {
  const { usuario } = useSesion();
  if (!usuario) throw new Error('No hay sesión');
  return usuario;
}
