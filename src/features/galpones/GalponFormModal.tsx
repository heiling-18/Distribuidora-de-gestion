'use client';

import React, { useState } from 'react';
import { Alert, Button, Field, Modal, cn } from '@/components/ui';
import {
  GRAMOS_GALLINA_POSTURA,
  KG_POR_BULTO,
  formatoPesos,
  formatoPesosFino,
  hoyLocal,
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

const TIPOS: { valor: TipoGalpon; titulo: string; detalle: string }[] = [
  { valor: 'postura', titulo: 'Postura', detalle: 'Gallinas que ponen: huevos, muertas y alimento' },
  { valor: 'levante', titulo: 'Levante', detalle: 'Pollitas desde chiquitas: solo alimento y muertas' },
];

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

  const nEdad = Number(edad) || 0;
  const nPrecio = Number(precio) || 0;

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
    const g = Number(gramos);
    if (!(g > 0)) return setError('Los gramos por ave deben ser mayores que 0 (usa punto para decimales).');
    if (precio.trim() !== '' && !(Number(precio) >= 0)) return setError('El precio del bulto debe ser un número (sin puntos ni signo $).');
    onGuardar({
      nombre: nombre.trim(),
      tipo,
      aves_iniciales: Number(aves),
      fecha_llegada: llegada,
      edad_semanas_llegada: Number(edad),
      gramos_ave_dia: g,
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
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Field etiqueta="Nombre" required placeholder="Ej.: Galpón 1" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <div className="flex flex-col gap-2">
          <span id="tipo-galpon" className="text-[15px] font-semibold">Tipo de galpón</span>
          <div role="radiogroup" aria-labelledby="tipo-galpon" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                    'flex cursor-pointer flex-col items-start gap-0.5 rounded-campo border-2 px-4 py-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rojo/25',
                    sel ? 'border-rojo bg-rojo-fondo' : 'border-transparent bg-neutro hover:bg-neutro-hover'
                  )}
                >
                  <strong className={cn('text-base', sel ? 'text-rojo' : 'text-tinta')}>{t.titulo}</strong>
                  <span className="text-sm text-tinta-suave">{t.detalle}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            etiqueta={tipo === 'levante' ? 'Pollitas que llegaron' : 'Aves que llegaron'}
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
          <Field etiqueta="Fecha de llegada" type="date" required value={llegada} onChange={(e) => setLlegada(e.target.value)} />
          <Field
            etiqueta="Edad al llegar (semanas)"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            ayuda="0 si son recién nacidas"
            className="tabular"
          />
          <Field
            etiqueta="Alimento por ave al día (g)"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            required
            placeholder={tipo === 'levante' ? 'Ej.: 12' : undefined}
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            ayuda={tipo === 'levante' ? 'Súbelo cada semana según la guía del alimento' : `Gallina en postura: ${GRAMOS_GALLINA_POSTURA} g`}
            className="tabular"
          />
          <Field
            etiqueta={`Precio del bulto de ${KG_POR_BULTO} kg`}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="Ej.: 98000"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            ayuda={
              nPrecio > 0
                ? `= ${formatoPesos(precioKilo(nPrecio))} el kilo · ${formatoPesosFino(precioGramo(nPrecio))} el gramo`
                : 'Para calcular cuánto se gasta en alimento cada día'
            }
            className="tabular"
          />
        </div>

        {nEdad < 18 && tipo === 'postura' && (
          <Alert tono="aviso">
            Las pollitas comen mucho menos que una gallina en postura y su consumo sube cada semana. Si todavía no ponen,
            créalo como galpón de levante.
          </Alert>
        )}

        {galpon && (
          <label className="flex cursor-pointer items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-rojo" />
            Galpón activo (se muestra en Inicio y en el registro diario)
          </label>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <Button type="submit" tamano="lg" anchoCompleto cargando={procesando} className="mt-1">
          {galpon ? 'Guardar cambios' : 'Crear galpón'}
        </Button>
      </form>
    </Modal>
  );
}
