// Límite de tiempo para llamadas a Supabase: en redes móviles lentas una
// petición puede quedarse colgada; así la app muestra un mensaje en vez de cargar sin fin.
export class TiempoAgotadoError extends Error {
  constructor() {
    super('El servidor tardó demasiado en responder');
    this.name = 'TiempoAgotadoError';
  }
}

export function conLimiteDeTiempo<T>(promesa: PromiseLike<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new TiempoAgotadoError()), ms);
  });
  return Promise.race([Promise.resolve(promesa), limite]).finally(() => clearTimeout(temporizador));
}

// Tiempos máximos (ms): generosos para datos móviles, pero sin quedarse cargando para siempre
export const LIMITE_LOGIN = 20000;
export const LIMITE_PERFIL = 15000;
export const LIMITE_AVISO_DATOS = 20000;
