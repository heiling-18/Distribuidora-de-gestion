import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Fila, PageHeader, Panel, Tabla, Td, Th } from '@/components/ui';
import {
  alimentoSugeridoKg,
  avesVivas,
  costoAlimento,
  edadSemanas,
  formatoDia,
  formatoEntero,
  formatoKg,
  formatoPesos,
  type Galpon,
  type RegistroGalpon,
} from '@/lib/galpones';

interface GalponesAdminViewProps {
  galpones: Galpon[];
  registros: RegistroGalpon[];
  onNuevo: () => void;
  onEditar: (g: Galpon) => void;
  onEliminar: (g: Galpon) => void;
}

/** Administración de galpones (solo admin): tipo, aves, edad, alimento por ave y precio del bulto */
export function GalponesAdminView({ galpones, registros, onNuevo, onEditar, onEliminar }: GalponesAdminViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Galpones"
        descripcion={`${galpones.length} ${galpones.length === 1 ? 'galpón' : 'galpones'}`}
        acciones={
          <Button onClick={onNuevo}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nuevo galpón
          </Button>
        }
      />

      <Panel>
        {galpones.length === 0 ? (
          <EmptyState
            className="m-6"
            titulo="Todavía no hay galpones"
            descripcion="Crea cada galpón con su tipo (postura o levante), la cantidad de aves que llegaron, su edad, cuánto come cada una al día y el precio del bulto."
          />
        ) : (
          <Tabla minAncho={1040}>
            <thead>
              <tr>
                <Th>Galpón</Th>
                <Th>Tipo</Th>
                <Th>Llegada</Th>
                <Th alinear="der">Edad</Th>
                <Th alinear="der">Aves vivas</Th>
                <Th alinear="der">Alimento por ave</Th>
                <Th alinear="der">Alimento al día</Th>
                <Th alinear="der">Precio bulto</Th>
                <Th alinear="der"><span className="sr-only">Acciones</span></Th>
              </tr>
            </thead>
            <tbody>
              {galpones.map((g) => {
                const vivas = avesVivas(g, registros);
                const kg = alimentoSugeridoKg(vivas, g.gramos_ave_dia);
                return (
                  <Fila key={g.id}>
                    <Td className="font-semibold">
                      {g.nombre} {!g.activo && <Badge className="ml-1">Inactivo</Badge>}
                    </Td>
                    <Td>{g.tipo === 'levante' ? <Badge tono="mayor">Levante</Badge> : <Badge>Postura</Badge>}</Td>
                    <Td className="whitespace-nowrap text-tinta-suave tabular">{formatoDia(g.fecha_llegada)}</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">Semana {edadSemanas(g)}</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">
                      <strong>{formatoEntero(vivas)}</strong> <span className="text-tinta-suave">de {formatoEntero(g.aves_iniciales)}</span>
                    </Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">{formatoEntero(g.gramos_ave_dia)} g</Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">
                      <strong>{formatoKg(kg)}</strong>
                      {g.precio_bulto > 0 && <span className="block text-sm text-tinta-suave">{formatoPesos(costoAlimento(kg, g.precio_bulto))}</span>}
                    </Td>
                    <Td alinear="der" className="whitespace-nowrap tabular">{g.precio_bulto > 0 ? formatoPesos(g.precio_bulto) : <span className="text-tinta-suave">Sin precio</span>}</Td>
                    <Td alinear="der" className="whitespace-nowrap">
                      <Button variante="fantasma" tamano="sm" onClick={() => onEditar(g)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button variante="peligro" tamano="sm" onClick={() => onEliminar(g)} aria-label={`Eliminar ${g.nombre}`} title="Eliminar galpón">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
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
