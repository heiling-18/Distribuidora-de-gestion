/** Error devuelto por la API: { error: { codigo, mensaje, detalles } }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

/** Se dispara cuando la API responde 401: la sesión venció o fue cerrada desde el servidor. */
export const EVENTO_SESION_EXPIRADA = 'dyms:sesion-expirada';

type Consulta = Record<string, string | number | boolean | undefined | null>;

interface Opciones {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Consulta;
  /** No avisar de sesión expirada (para /auth/me y /auth/login). */
  silencioso401?: boolean;
}

function armarUrl(ruta: string, query?: Consulta): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `/api${ruta}${qs ? `?${qs}` : ''}`;
}

/** Llama a la API del backend. La sesión viaja sola en la cookie httpOnly. */
export async function api<T>(ruta: string, { method = 'GET', body, query, silencioso401 }: Opciones = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(armarUrl(ruta, query), {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'SIN_CONEXION', 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }

  if (res.status === 204) return undefined as T;

  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !silencioso401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    }
    const e = datos?.error;
    throw new ApiError(res.status, e?.codigo ?? 'ERROR', e?.mensaje ?? 'Ocurrió un error inesperado', e?.detalles);
  }
  return datos as T;
}

/** Mensaje para mostrar al usuario a partir de cualquier error. */
export function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.codigo === 'VALIDACION' && Array.isArray(err.detalles) && err.detalles[0]?.mensaje) {
      return `${err.message}: ${err.detalles[0].mensaje}`;
    }
    return err.message;
  }
  return 'Ocurrió un error inesperado';
}
