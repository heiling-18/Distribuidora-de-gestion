import React from 'react';

/** Encabezado de cada módulo: título grande, resumen y acciones a la derecha */
export function PageHeader({ titulo, descripcion, acciones }: { titulo: string; descripcion?: React.ReactNode; acciones?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-tinta sm:text-[40px]">{titulo}</h1>
        {descripcion && <p className="text-[15px] text-tinta-suave tabular">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2.5">{acciones}</div>}
    </header>
  );
}
