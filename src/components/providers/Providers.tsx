'use client';

import { SesionProvider } from '@/features/auth/SesionProvider';
import { NotificacionesProvider } from './NotificacionesProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NotificacionesProvider>
      <SesionProvider>{children}</SesionProvider>
    </NotificacionesProvider>
  );
}
