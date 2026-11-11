'use client';

import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Field, Fila, PageHeader, Panel, Tabla, Td, Th, cn } from '@/components/ui';
import {
  alimentoSugeridoKg,
  costoAlimento,
  formatoBultos,
  formatoDia,
  formatoEntero,
  formatoKg,
  formatoPesos,
  formatoPesosFino,
  gramosPorAve,
  hoyLocal,
  kgABultos,
  precioDelRegistro,
  textoCartones,
  type Galpon,
  type RegistroGalpon,
} from '@/lib/galpones';

export interface DatosRegistro {
  galpon_id: number;
  fecha: string;
  huevos: number;
  muertas: number;
  alimento_kg: number;
  /** Precio del bulto con el que se calcula el gasto de ese día */
  precio_bulto: number;
  notas: string | null;
}

interface RegistroDiarioViewProps {
  esAdmin: boolean;
  galpones: Galpon[];
  registros: RegistroGalpon[];
  galponInicial: number | null;
  procesando: boolean;
  onGuardar: (datos: DatosRegistro) => Promise<boolean>;
  onEliminar: (r: RegistroGalpon) => void;
}

export function RegistroDiarioView(p: RegistroDiarioViewProps) {
  const hoy = hoyLocal();
  const activos = p.galpones.filter((g) => g.activo);
  const [galponId, setGalponId] = useState<number | null>(
    p.galponInicial && activos.some((g) => g.id === p.galponInicial) ? p.galponInicial : activos[0]?.id ?? null
  );
  const [fecha, setFecha] = useState(hoy);
  const [filtro, setFiltro] = useState<number | 'todos'>('todos');

  const galpon = activos.find((g) => g.id === galponId) ?? null;
  const existente = galpon ? p.registros.find((r) => r.galpon_id === galpon.id && r.fecha === fecha) ?? null : null;

  // Aves vivas al empezar ese día (sin contar las muertas de ese mismo día)
  const vivasInicioDia = galpon
    ? Math.max(
        0,
        galpon.aves_iniciales -
          p.registros.filter((r) => r.galpon_id === galpon.id && r.fecha < fecha).reduce((acc, r) => acc + r.muertas, 0)
      )
    : 0;
  const sugerido = galpon ? alimentoSugeridoKg(vivasInicioDia, galpon.gramos_ave_dia) : 0;

  const editar = (r: RegistroGalpon) => {
    setGalponId(r.galpon_id);
    setFecha(r.fecha);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lista = p.registros.filter((r) => filtro === 'todos' || r.galpon_id === filtro);
  const galponDe = (id: number) => p.galpones.find((g) => g.id === id);
  const nombreGalpon = (id: number) => galponDe(id)?.nombre ?? '—';
  // Las columnas de huevos solo se muestran si en la lista hay algún galpón de postura
  const conHuevos = lista.some((r) => galponDe(r.galpon_id)?.tipo !== 'levante');

  if (activos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader titulo="Registro diario" />
        <EmptyState titulo="No hay galpones activos" descripcion="El administrador debe crear los galpones en el menú Galpones." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader titulo="Registro diario" descripcion="Alimento echado y aves muertas de cada galpón; en los de postura, también los huevos." />

      <Panel className="flex flex-col gap-5 p-6">
        {/* Galpón */}
        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-tinta">Galpón</span>
          <div role="radiogroup" aria-label="Galpón" className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {activos.map((g) => {
              const sel = g.id === galponId;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setGalponId(g.id)}
                  className={cn(
                    'h-12 cursor-pointer rounded-control px-5 text-base font-bold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
                    sel ? 'bg-rojo text-white' : 'bg-neutro text-tinta hover:bg-neutro-hover'
                  )}
                >
                  {g.nombre}
                  {g.tipo === 'levante' && <span className="ml-1.5 text-sm font-semibold opacity-80">· levante</span>}
                </button>
              );
            })}
          </div>
        </div>

        {p.esAdmin ? (
          <Field etiqueta="Fecha" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} className="sm:max-w-[240px]" />
        ) : (
          <p className="text-[15px] text-tinta-suave">
            Fecha: <strong className="text-tinta">{formatoDia(hoy)}</strong>
          </p>
        )}

        {galpon && (
          <FormularioDia
            key={`${galpon.id}-${fecha}-${existente?.id ?? 'nuevo'}`}
            galpon={galpon}
            fecha={fecha}
            existente={existente}
            vivasInicioDia={vivasInicioDia}
            sugeridoKg={sugerido}
            procesando={p.procesando}
            onGuardar={p.onGuardar}
          />
        )}
      </Panel>

      {/* Historial */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
          <h2 className="text-xl font-bold">Historial</h2>
          {p.galpones.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {(['todos', ...p.galpones.map((g) => g.id)] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltro(id)}
                  aria-pressed={filtro === id}
                  className={cn(
                    'h-9 cursor-pointer rounded-control px-3 text-sm font-bold',
                    filtro === id ? 'bg-noche text-crema' : 'bg-neutro text-tinta hover:bg-neutro-hover'
                  )}
                >
                  {id === 'todos' ? 'Todos' : nombreGalpon(id)}
                </button>
              ))}
            </div>
          )}
        </div>
        {lista.length === 0 ? (
          <EmptyState className="m-6" titulo="Todavía no hay registros" descripcion="Cada día anotado aparecerá aquí." />
        ) : (
          <Tabla minAncho={820} className="mt-4">
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Galpón</Th>
                {conHuevos && <Th alinear="der">Huevos</Th>}
                {conHuevos && <Th>Cartones</Th>}
                <Th alinear="der">Muertas</Th>
                <Th alinear="der">Alimento</Th>
                <Th alinear="der">Gasto</Th>
                <Th>Anotó</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const puedeEditar = p.esAdmin || r.fecha === hoy;
                const g = galponDe(r.galpon_id);
                const levante = g?.tipo === 'levante';
                const precio = precioDelRegistro(r, g);
                return (
                  <Fila key={r.id}>
                    <Td className="whitespace-nowrap tabular">
                      {formatoDia(r.fecha)} {r.fecha === hoy && <Badge tono="exito" className="ml-1">Hoy</Badge>}
                    </Td>
                    <Td className="font-semibold">{nombreGalpon(r.galpon_id)}</Td>
                    {conHuevos && <Td alinear="der" className="font-bold tabular">{levante ? '—' : formatoEntero(r.huevos)}</Td>}
                    {conHuevos && <Td className="whitespace-nowrap text-tinta-suave tabular">{levante ? 'Levante' : textoCartones(r.huevos)}</Td>}
                    <Td alinear="der" className={cn('tabular', r.muertas > 0 && 'font-bold text-rojo-oscuro')}>{r.muertas}</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">{formatoKg(r.alimento_kg)}</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">{precio > 0 ? formatoPesos(costoAlimento(r.alimento_kg, precio)) : '—'}</Td>
                    <Td className="text-tinta-suave">{r.registrado_por || '—'}</Td>
                    <Td alinear="der" className="whitespace-nowrap">
                      {puedeEditar && (
                        <Button variante="fantasma" tamano="sm" onClick={() => editar(r)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Corregir
                        </Button>
                      )}
                      {p.esAdmin && (
                        <Button variante="peligro" tamano="sm" onClick={() => p.onEliminar(r)} aria-label={`Eliminar registro del ${formatoDia(r.fecha)}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </Td>
                  </Fila>
                );
              })}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  );
}

interface FormularioDiaProps {
  galpon: Galpon;
  fecha: string;
  existente: RegistroGalpon | null;
  vivasInicioDia: number;
  sugeridoKg: number;
  procesando: boolean;
  onGuardar: (datos: DatosRegistro) => Promise<boolean>;
}

/** Formulario de un día; se reinicia al cambiar de galpón o de fecha */
function FormularioDia({ galpon, fecha, existente, vivasInicioDia, sugeridoKg, procesando, onGuardar }: FormularioDiaProps) {
  const [huevos, setHuevos] = useState(existente ? String(existente.huevos) : '');
  const [muertas, setMuertas] = useState(existente ? String(existente.muertas) : '0');
  const [alimento, setAlimento] = useState(existente ? String(existente.alimento_kg) : String(sugeridoKg));
  const [notas, setNotas] = useState(existente?.notas ?? '');
  const [error, setError] = useState('');

  const levante = galpon.tipo === 'levante';
  // Corregir un día viejo conserva el precio de ese día; uno nuevo usa el precio actual del galpón
  const precio = existente?.precio_bulto ?? galpon.precio_bulto;
  const nHuevos = levante ? 0 : Number(huevos) || 0;
  const nMuertas = Number(muertas) || 0;
  const nAlimento = Number(alimento) || 0;
  const vivasDespues = Math.max(0, vivasInicioDia - nMuertas);
  const kgManana = alimentoSugeridoKg(vivasDespues, galpon.gramos_ave_dia);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const enteros = levante ? [muertas || '0'] : [huevos || '0', muertas || '0'];
    if (enteros.some((v) => !/^\d+$/.test(v.trim()))) {
      setError(levante ? 'Las aves muertas deben ser un número entero (sin puntos ni comas).' : 'Huevos y gallinas muertas deben ser números enteros (sin puntos ni comas).');
      return;
    }
    if (nMuertas > vivasInicioDia) {
      setError(`No pueden morir más aves de las que hay (${formatoEntero(vivasInicioDia)}).`);
      return;
    }
    if (!(nAlimento >= 0) || Number.isNaN(Number(alimento))) {
      setError('Escribe los kilos de alimento echados (usa punto para decimales, ej. 12.5).');
      return;
    }
    await onGuardar({
      galpon_id: galpon.id,
      fecha,
      huevos: nHuevos,
      muertas: nMuertas,
      alimento_kg: Math.round(nAlimento * 100) / 100,
      precio_bulto: precio,
      notas: notas.trim() || null,
    });
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      {existente && (
        <Alert tono="info">
          Este día ya está anotado{existente.registrado_por ? ` por ${existente.registrado_por}` : ''}. Si cambias algo y guardas, se corrige.
        </Alert>
      )}

      <div className={cn('grid grid-cols-1 gap-4', levante ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {!levante && (
        <Field
          etiqueta="Huevos recogidos"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="0"
          value={huevos}
          onChange={(e) => setHuevos(e.target.value)}
          ayuda={nHuevos > 0 ? `= ${textoCartones(nHuevos)}` : 'Se pasan solos a cartones de 30'}
          className="tabular"
        />
        )}
        <Field
          etiqueta={levante ? 'Aves muertas' : 'Gallinas muertas'}
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={muertas}
          onChange={(e) => setMuertas(e.target.value)}
          ayuda={`Había ${formatoEntero(vivasInicioDia)} aves al empezar el día`}
          className="tabular"
        />
        <Field
          etiqueta="Alimento echado (kg)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={alimento}
          onChange={(e) => setAlimento(e.target.value)}
          ayuda={`Tocaba ${formatoKg(sugeridoKg)} (≈ ${formatoBultos(kgABultos(sugeridoKg))})`}
          className="tabular"
        />
      </div>

      <Field etiqueta="Notas (opcional)" placeholder="Ej.: se cambió el agua, llegó el veterinario" value={notas} onChange={(e) => setNotas(e.target.value)} />

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-campo bg-hundido px-5 py-4 text-[15px] sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-tinta-suave">Aves vivas</dt>
          <dd className="font-bold tabular">{formatoEntero(vivasDespues)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-tinta-suave">Comió cada ave</dt>
          <dd className="font-bold tabular">{formatoEntero(gramosPorAve(nAlimento, vivasInicioDia))} g</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-tinta-suave">Gasto del día</dt>
          <dd className="font-bold tabular">{precio > 0 ? formatoPesos(costoAlimento(nAlimento, precio)) : 'Sin precio'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-tinta-suave">Gasto por ave</dt>
          <dd className="font-bold tabular">
            {precio > 0 && vivasInicioDia > 0 ? formatoPesosFino(costoAlimento(nAlimento, precio) / vivasInicioDia) : '—'}
          </dd>
        </div>
      </dl>
      {precio <= 0 && (
        <p className="-mt-2 text-sm text-tinta-suave">Para ver el gasto, el administrador debe poner el precio del bulto en el menú Galpones → Editar.</p>
      )}

      <div className="rounded-campo bg-hundido px-5 py-4 text-[15px]">
        <span className="text-tinta-suave">Para el día siguiente: </span>
        <strong className="tabular">{formatoEntero(vivasDespues)} aves → echar {formatoKg(kgManana)}</strong>
        <span className="text-tinta-suave tabular"> (≈ {formatoBultos(kgABultos(kgManana))})</span>
      </div>

      {error && <Alert tono="error">{error}</Alert>}

      <Button type="submit" tamano="lg" anchoCompleto cargando={procesando}>
        {existente ? 'Guardar corrección' : 'Guardar el día'}
      </Button>
    </form>
  );
}
