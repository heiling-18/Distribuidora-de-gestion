import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, Tabla, Td, Th } from '@/components/ui';
import { formatoFecha, formatoMoneda } from '@/lib/formato';
import { textoCategoriaGasto } from '@/lib/gastos';
import type { Gasto } from '@/types';

interface GastosViewProps {
  gastos: Gasto[];
  onNuevo: () => void;
  onEditar: (g: Gasto) => void;
  onEliminar: (g: Gasto) => void;
}

export function GastosView({ gastos, onNuevo, onEditar, onEliminar }: GastosViewProps) {
  const total = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Gastos"
        descripcion={`${gastos.length} ${gastos.length === 1 ? 'gasto registrado' : 'gastos registrados'} · ${formatoMoneda(total)} en total`}
        acciones={
          <Button onClick={onNuevo}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Registrar gasto
          </Button>
        }
      />

      <Panel>
        {gastos.length === 0 ? (
          <EmptyState
            className="m-6"
            titulo="Todavía no hay gastos"
            descripcion="Registra aquí el arriendo, los fletes, los servicios y las compras de bultos que salgan de la caja."
          />
        ) : (
          <Tabla minAncho={760}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Categoría</Th>
                <Th>Descripción</Th>
                <Th alinear="der">Monto</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <Fila key={g.id}>
                  <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoFecha(g.fecha)}</Td>
                  <Td><Badge>{textoCategoriaGasto(g.categoria)}</Badge></Td>
                  <Td className="font-semibold">{g.descripcion}</Td>
                  <Td alinear="der" className="whitespace-nowrap font-bold text-rojo-oscuro tabular">−{formatoMoneda(g.monto)}</Td>
                  <Td alinear="der" className="whitespace-nowrap">
                    <Button variante="fantasma" tamano="sm" onClick={() => onEditar(g)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Button>
                    <Button variante="peligro" tamano="sm" onClick={() => onEliminar(g)} aria-label={`Eliminar gasto ${g.descripcion}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Td>
                </Fila>
              ))}
            </tbody>
          </Tabla>
        )}
      </Panel>
    </div>
  );
}
