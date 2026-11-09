'use client';

import { Egg } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CajaCerradaBanner } from '@/components/layout/CajaCerradaBanner';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { EstadoNegocioProvider, useEstadoNegocio } from '@/components/providers/EstadoNegocioProvider';
import { CargandoModulo } from '@/components/ui';
import { inicioDe, useSesion } from '@/features/auth/SesionProvider';
import { MODULOS, MODULOS_BARRA_MOVIL, RUTA_MODULO, moduloDeRuta, modulosVisibles, type Modulo } from '@/lib/modulos';

/** Marco de la Distribuidora: menú, estado de la caja y protección por rol. */
export default function DistribuidoraLayout({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const modulo = moduloDeRuta(pathname);
  const soloAdmin = MODULOS.find((m) => m.id === modulo)?.soloAdmin;

  // El galponero vive en /galpones; el vendedor no entra a módulos de administrador.
  const permitido = !!usuario && usuario.rol !== 'galponero' && (!soloAdmin || usuario.rol === 'admin');

  useEffect(() => {
    if (cargando) return;
    if (!usuario) router.replace('/login');
    else if (!permitido) router.replace(inicioDe(usuario));
  }, [cargando, usuario, permitido, router]);

  if (!usuario || !permitido) return <CargandoModulo />;

  return (
    <EstadoNegocioProvider>
      <Marco modulo={modulo}>{children}</Marco>
    </EstadoNegocioProvider>
  );
}

function Marco({ modulo, children }: { modulo: Modulo; children: React.ReactNode }) {
  const { usuario, cerrarSesion } = useSesion();
  const { caja, stockBajo } = useEstadoNegocio();
  const router = useRouter();
  const esAdmin = usuario!.rol === 'admin';
  const modulos = modulosVisibles(esAdmin);
  const ir = (m: Modulo) => router.push(RUTA_MODULO[m]);
  const irAGalpones = esAdmin ? { etiqueta: 'Ir a Galpones', Icono: Egg, onClick: () => router.push('/galpones') } : undefined;
  const cajaAbierta = !!caja;

  return (
    <div className="min-h-dvh bg-papel text-tinta lg:flex">
      <Sidebar
        modulos={modulos}
        moduloActivo={modulo}
        onCambiar={ir}
        usuario={usuario!}
        onSalir={cerrarSesion}
        avisos={{ inventario: stockBajo }}
        seccion={irAGalpones ? 'Distribuidora' : undefined}
        cambioSeccion={irAGalpones}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          modulos={modulos}
          barraMovil={MODULOS_BARRA_MOVIL}
          moduloActivo={modulo}
          onCambiar={ir}
          usuario={usuario!}
          onSalir={cerrarSesion}
          avisos={{ inventario: stockBajo }}
          cambioSeccion={irAGalpones}
          estado={
            caja !== undefined && (
              <span className={cajaAbierta ? 'rounded-lg bg-[#23402F] px-2.5 py-1 text-[13px] font-bold text-[#BFE6CC]' : 'rounded-lg bg-rojo px-2.5 py-1 text-[13px] font-bold text-white'}>
                {cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}
              </span>
            )
          }
        />

        {caja === null && modulo !== 'caja' && <CajaCerradaBanner onAbrir={() => ir('caja')} />}

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
