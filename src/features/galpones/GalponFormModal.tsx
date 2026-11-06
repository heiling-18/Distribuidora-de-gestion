'use client';

import React, { useState } from 'react';
import { Alert, Button, Field, Modal } from '@/components/ui';
import { GRAMOS_GALLINA_POSTURA, hoyLocal, type Galpon } from '@/lib/galpones';

export interface DatosGalpon {
  nombre: string;
  aves_iniciales: number;
  fecha_llegada: string;
  edad_semanas_llegada: number;
  gramos_ave_dia: number;
  activo: boolean;
}

interface GalponFormModalProps {
  galpon: Galpon | null;
  procesando: boolean;
  onGuardar: (datos: DatosGalpon) => void;
  onCerrar: () => void;
}

export function GalponFormModal({ galpon, procesando, onGuardar, onCerrar }: GalponFormModalProps) {
  const [nombre, setNombre] = useState(galpon?.nombre ?? '');
  const [aves, setAves] = useState(galpon ? String(galpon.aves_iniciales) : '');
  const [llegada, setLlegada] = useState(galpon?.fecha_llegada ?? hoyLocal());
  const [edad, setEdad] = useState(galpon ? String(galpon.edad_semanas_llegada) : '0');
  const [gramos, setGramos] = useState(galpon ? String(galpon.gramos_ave_dia) : String(GRAMOS_GALLINA_POSTURA));
  const [activo, setActivo] = useState(galpon?.activo ?? true);
  const [error, setError] = useState('');

  const nEdad = Number(edad) || 0;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('Escribe el nombre del galpón.');
    if (!/^\d+$/.test(aves.trim())) return setError('La cantidad de aves debe ser un número entero.');
    if (!/^\d+$/.test(edad.trim())) return setError('La edad debe ser un número entero de semanas.');
    const g = Number(gramos);
    if (!(g > 0)) return setError('Los gramos por ave deben ser mayores que 0 (usa punto para decimales).');
    onGuardar({
      nombre: nombre.trim(),
      aves_iniciales: Number(aves),
      fecha_llegada: llegada,
      edad_semanas_llegada: Number(edad),
      gramos_ave_dia: g,
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            etiqueta="Aves que llegaron"
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
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            ayuda={`Gallina en postura: ${GRAMOS_GALLINA_POSTURA} g`}
            className="tabular"
          />
        </div>

        {nEdad < 18 && (
          <Alert tono="aviso">
            Las pollitas comen mucho menos que una gallina en postura y su consumo sube cada semana. Ajusta los gramos por ave
            semana a semana según la guía del alimento o del veterinario.
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
