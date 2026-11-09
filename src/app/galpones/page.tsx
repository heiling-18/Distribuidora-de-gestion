'use client';

import { Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useNotificar } from '@/components/providers/NotificacionesProvider';
import { CargandoModulo } from '@/components/ui';
import { inicioDe, useSesion } from '@/features/auth/SesionProvider';
import { GalponesApp } from '@/features/galpones/GalponesApp';

/** Sección Galpones: administrador y galponero. */
export default function GalponesPage() {
  const { usuario, cargando, cerrarSesion } = useSesion();
  const notificar = useNotificar();
  const router = useRouter();
  const permitido = usuario?.rol === 'admin' || usuario?.rol === 'galponero';

  useEffect(() => {
    if (cargando) return;
    if (!usuario) router.replace('/login');
    else if (!permitido) router.replace(inicioDe(usuario));
  }, [cargando, usuario, permitido, router]);

  if (!usuario || !permitido) return <CargandoModulo />;

  return (
    <GalponesApp
      usuario={usuario}
      onSalir={cerrarSesion}
      notificar={notificar}
      cambioSeccion={usuario.rol === 'admin' ? { etiqueta: 'Ir a Distribuidora', Icono: Store, onClick: () => router.push('/') } : undefined}
    />
  );
}
