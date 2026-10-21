'use client';

import React, { useState } from 'react';
import { HenMascot } from '@/components/brand/HenMascot';
import { DymsMark } from '@/components/brand/DymsMark';
import { Alert, Button, Field } from '@/components/ui';

interface LoginScreenProps {
  email: string;
  password: string;
  error: string;
  cargando: boolean;
  onEmailChange: (valor: string) => void;
  onPasswordChange: (valor: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

// Granos de maíz que flotan en el fondo: [izquierda %, arriba %, tamaño px, retraso s]
const GRANOS: Array<[number, number, number, number]> = [
  [6, 14, 10, 0], [18, 78, 8, 1.2], [34, 8, 7, 2.4], [47, 88, 11, 0.6],
  [58, 18, 6, 3.1], [9, 52, 6, 1.8], [40, 60, 5, 4], [26, 34, 8, 2.9],
];

export function LoginScreen({ email, password, error, cargando, onEmailChange, onPasswordChange, onSubmit }: LoginScreenProps) {
  const [verClave, setVerClave] = useState(false);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-noche selection:bg-rojo selection:text-white">
      {/* Brillo cálido detrás de la gallina */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(242,179,61,0.20),transparent_55%),radial-gradient(ellipse_at_85%_90%,rgba(210,58,30,0.22),transparent_50%)]"
      />
      {GRANOS.map(([izq, arriba, tam, retraso], i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute animate-flotar rounded-[50%] bg-maiz/60"
          style={{ left: `${izq}%`, top: `${arriba}%`, width: tam, height: tam * 0.7, animationDelay: `${retraso}s` }}
        />
      ))}

      <div className="relative mx-auto grid min-h-dvh max-w-[1400px] items-center gap-6 px-5 py-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:px-12">
        {/* Gallina */}
        <div className="animate-subir flex justify-center [animation-delay:100ms]">
          <HenMascot className="h-auto w-full max-w-[340px] sm:max-w-[480px] lg:max-w-[700px]" />
        </div>

        {/* Tarjeta de ingreso */}
        <section className="animate-subir w-full max-w-[440px] justify-self-center rounded-[28px] bg-superficie p-8 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] sm:p-10 lg:justify-self-start [animation-delay:250ms]">
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
              <DymsMark tamano={44} className="text-tinta" />
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display text-[36px] font-extrabold leading-tight tracking-[-0.03em] text-tinta">
                  Bienvenido
                </h1>
                <p className="text-base text-tinta-suave">Ingresa tu correo y contraseña para continuar.</p>
              </div>
            </div>

            <Field
              etiqueta="Correo"
              type="email"
              required
              autoComplete="username"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />

            <Field
              etiqueta="Contraseña"
              type={verClave ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              accesorio={
                <Button
                  variante="fantasma"
                  tamano="sm"
                  className="h-10 font-semibold text-tinta-suave"
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verClave}
                  onClick={() => setVerClave((v) => !v)}
                >
                  {verClave ? 'Ocultar' : 'Mostrar'}
                </Button>
              }
            />

            {error && <Alert tono="error">{error}</Alert>}

            <Button type="submit" tamano="lg" anchoCompleto cargando={cargando} className="mt-1">
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
