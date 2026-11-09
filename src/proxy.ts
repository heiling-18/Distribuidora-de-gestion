import { NextResponse, type NextRequest } from 'next/server';

/** Misma cookie que pone el backend al iniciar sesión. */
const COOKIE_SESION = 'dyms_sesion';

/**
 * Revisión rápida antes de mostrar una página: sin cookie de sesión, al login.
 * Es solo para no mostrar pantallas vacías; la verificación real (firma, rol, sesión vigente)
 * la hace la API en cada petición.
 *
 * No se redirige de /login a / cuando hay cookie: la cookie puede existir y ya no ser válida
 * (clave cambiada, usuario desactivado) y eso causaría un bucle entre / y /login.
 * La pantalla de login manda al inicio si la sesión de verdad es válida.
 */
export function proxy(request: NextRequest) {
  const tieneSesion = request.cookies.has(COOKIE_SESION);
  if (!tieneSesion && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos la API (la protege el backend), archivos de Next e imágenes/íconos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp|jpg)$).*)'],
};
