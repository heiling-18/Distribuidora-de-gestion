'use client';

import React, { useState } from 'react';
import { Bird, Egg, type LucideIcon } from 'lucide-react';
import { Alert, Button, Field, Modal, cn } from '@/components/ui';
import {
  GRAMOS_GALLINA_POSTURA,
  KG_POR_BULTO,
  alimentoSugeridoKg,
  costoAlimento,
  formatoBultos,
  formatoEntero,
  formatoKg,
  formatoPesos,
  formatoPesosFino,
  hoyLocal,
  kgABultos,
  precioGramo,
  precioKilo,
  type Galpon,
  type TipoGalpon,
} from '@/lib/galpones';

export interface DatosGalpon {
  nombre: string;
  tipo: TipoGalpon;
  aves_iniciales: number;
  fecha_llegada: string;
  edad_semanas_llegada: number;
  gramos_ave_dia: number;
  precio_bulto: number;
  activo: boolean;
}

interface GalponFormModalProps {
  galpon: Galpon | null;
  procesando: boolean;
  onGuardar: (datos: DatosGalpon) => void;
  onCerrar: () => void;
}

const TIPOS: { valor: TipoGalpon; titulo: string; detalle: string; Icono: LucideIcon }[] = [
  { valor: 'postura', titulo: 'Postura', detalle: 'Ponen huevos', Icono: Egg },
  { valor: 'levante', titulo: 'Levante', detalle: 'Pollitas, sin huevos', Icono: Bird },
];

/** Título de cada bloque del formulario */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 text-[13px] font-bold uppercase tracking-[0.06em] text-tinta-suave">{titulo}</legend>
      {children}
    </fieldset>
  );
}

export function GalponFormModal({ galpon, procesando, onGuardar, onCerrar }: GalponFormModalProps) {
  const [nombre, setNombre] = useState(galpon?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoGalpon>(galpon?.tipo ?? 'postura');
  const [aves, setAves] = useState(galpon ? String(galpon.aves_iniciales) : '');
  const [llegada, setLlegada] = useState(galpon?.fecha_llegada ?? hoyLocal());
  const [edad, setEdad] = useState(galpon ? String(galpon.edad_semanas_llegada) : '0');
  const [gramos, setGramos] = useState(galpon ? String(galpon.gramos_ave_dia) : String(GRAMOS_GALLINA_POSTURA));
  const [precio, setPrecio] = useState(galpon && galpon.precio_bulto > 0 ? String(galpon.precio_bulto) : '');
  const [activo, setActivo] = useState(galpon?.activo ?? true);
  const [error, setError] = useState('');

  const levante = tipo === 'levante';
  const nAves = Number(aves) || 0;
  const nEdad = Number(edad) || 0;
  const nGramos = Number(gramos) || 0;
  const nPrecio = Number(precio) || 0;
  const kgDia = alimentoSugeridoKg(nAves, nGramos);

  const elegirTipo = (t: TipoGalpon) => {
    setTipo(t);
    // En un galpón nuevo, los gramos de referencia cambian con el tipo
    if (!galpon) setGramos(t === 'postura' ? String(GRAMOS_GALLINA_POSTURA) : '');
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('Escribe el nombre del galpón.');
    if (!/^\d+$/.test(aves.trim())) return setError('La cantidad de aves debe ser un número entero.');
    if (!/^\d+$/.test(edad.trim())) return setError('La edad debe ser un número entero de semanas.');
    if (!(nGramos > 0)) return setError('Los gramos por ave deben ser mayores que 0 (usa punto para decimales).');
    if (precio.trim() !== '' && !(Number(precio) >= 0)) return setError('El precio del bulto debe ser un número (sin puntos ni signo $).');
    onGuardar({
      nombre: nombre.trim(),
      tipo,
      aves_iniciales: Number(aves),
      fecha_llegada: llegada,
      edad_semanas_llegada: Number(edad),
      gramos_ave_dia: nGramos,
      precio_bulto: Math.round(nPrecio),
      activo,
    });
  };

  return (
    <Modal
      titulo={galpon ? `Editar ${galpon.nombre}` : 'Nuevo galpón'}
      descripcion="Las aves vivas se calculan solas restando las muertas de cada día."
      onCerrar={onCerrar}
      ancho="md"
    >
      <form onSubmit={enviar} className="flex flex-col gap-7">
        <div className="flex flex-col gap-4">
          <Field etiqueta="Nombre" required placeholder="Ej.: Galpón 1" value={nombre} onChange={(e) => setNombre(e.target.value)} />

          {/* Tipo: dos tarjetas grandes, fáciles de tocar en el celular */}
          <div role="radiogroup" aria-label="Tipo de galpón" className="grid grid-cols-2 gap-2.5">
            {TIPOS.map((t) => {
              const sel = tipo === t.valor;
              return (
                <button
                  key={t.valor}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => elegirTipo(t.valor)}
                  className={cn(
                    'flex min-h-[76px] cursor-pointer touch-manipulation items-center gap-3 rounded-campo border-2 p-3 text-left transition-colors sm:p-4',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
                    sel ? 'border-rojo bg-rojo-fondo' : 'border-neutro-hover bg-superficie hover:border-tinta-tenue'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      sel ? 'bg-rojo text-white' : 'bg-neutro text-tinta-suave'
                    )}
                  >
                    <t.Icono className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <strong className={cn('text-base leading-tight', sel ? 'text-rojo-oscuro' : 'text-tinta')}>{t.titulo}</strong>
                    <span className="text-[13px] leading-snug text-tinta-suave">{t.detalle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Seccion titulo={levante ? 'Las pollitas' : 'Las aves'}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Field
              etiqueta={levante ? 'Llegaron' : 'Aves que llegaron'}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              required
              placeholder="3200"
              value={aves}
              onChange={(e) => setAves(e.target.value)}
              className="tabular"
            />
            <Field
              etiqueta="Edad (semanas)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              ayuda="0 = recién nacidas"
              className="tabular"
            />
          </div>
          <Field etiqueta="Fecha de llegada" type="date" required max={hoyLocal()} value={llegada} onChange={(e) => setLlegada(e.target.value)} />
        </Seccion>

        <Seccion titulo="Alimento">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Field
              etiqueta="Gramos por ave al día"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              required
              placeholder={levante ? 'Ej.: 12' : undefined}
              value={gramos}
              onChange={(e) => setGramos(e.target.value)}
              ayuda={levante ? 'Súbelo cada semana según la guía' : `Gallina en postura: ${GRAMOS_GALLINA_POSTURA} g`}
              className="tabular"
            />
            <Field
              etiqueta={`Precio del bulto (${KG_POR_BULTO} kg)`}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="Ej.: 98000"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              ayuda={nPrecio > 0 ? `${formatoPesos(precioKilo(nPrecio))} el kilo · ${formatoPesosFino(precioGramo(nPrecio))} el gramo` : 'Opcional: para saber cuánto se gasta'}
              className="tabular"
            />
          </div>

          {/* Cuenta del día con lo que se va escribiendo */}
          <div className="flex flex-col gap-1 rounded-campo bg-hundido px-4 py-3.5">
            <span className="text-sm font-semibold text-tinta-suave">Cada día tocaría echar</span>
            {kgDia > 0 ? (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <strong className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] tabular">{formatoKg(kgDia)}</strong>
                  <span className="text-[15px] text-tinta-suave tabular">≈ {formatoBultos(kgABultos(kgDia))}</span>
                  {nPrecio > 0 && <span className="text-[15px] font-bold text-tinta tabular">· {formatoPesos(costoAlimento(kgDia, nPrecio))}</span>}
                </div>
                <span className="text-[13px] text-tinta-suave tabular">
                  {formatoEntero(nAves)} aves × {formatoEntero(nGramos)} g
                </span>
              </>
            ) : (
              <span className="text-[15px] text-tinta-suave">Escribe las aves y los gramos por ave para ver la cuenta.</span>
            )}
          </div>
        </Seccion>

        {nEdad < 18 && !levante && (
          <Alert tono="aviso">Si todavía no ponen huevos, elige Levante: no te pedirá huevos y llevará el gasto en alimento.</Alert>
        )}

        {galpon && (
          <label className="flex cursor-pointer items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 shrink-0 accent-rojo" />
            Galpón activo (se muestra en Inicio y en el registro diario)
          </label>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variante="secundario" tamano="lg" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" tamano="lg" cargando={procesando}>
            {galpon ? 'Guardar' : 'Crear galpón'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
