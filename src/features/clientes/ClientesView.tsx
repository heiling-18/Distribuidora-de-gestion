'use client';

import React, { useMemo, useState } from 'react';
import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, Fila, PageHeader, Panel, SearchInput, Tabla, Td, Th } from '@/components/ui';
import type { Cliente } from '@/types';

interface ClientesViewProps {
  clientes: Cliente[];
  esAdmin: boolean;
  onNuevo: () => void;
  onEditar: (c: Cliente) => void;
  onEliminar: (c: Cliente) => void;
}

export function ClientesView({ clientes, esAdmin, onNuevo, onEditar, onEliminar }: ClientesViewProps) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.documento.includes(q) || c.nombre.toLowerCase().includes(q));
  }, [clientes, busqueda]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Clientes"
        descripcion={`${clientes.length} ${clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}`}
        acciones={
          <Button onClick={onNuevo}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Nuevo cliente
          </Button>
        }
      />

      <SearchInput etiqueta="Buscar cliente" placeholder="Buscar por cédula o nombre" valor={busqueda} onCambiar={setBusqueda} />

      <Panel>
        {filtrados.length === 0 ? (
          <EmptyState
            className="m-6"
            titulo={clientes.length === 0 ? 'Todavía no hay clientes' : 'Ningún cliente coincide'}
            descripcion={clientes.length === 0 ? 'Registra a tus clientes para venderles más rápido y enviarles el ticket por WhatsApp.' : 'Prueba con otra cédula o parte del nombre.'}
          />
        ) : (
          <Tabla minAncho={760}>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>WhatsApp</Th>
                <Th>Dirección</Th>
                {esAdmin && <Th alinear="der"><span className="sr-only">Acciones</span></Th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => {
                const tel = (c.telefono || '').replace(/[^0-9]/g, '');
                return (
                  <Fila key={c.id}>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <strong className="font-semibold">{c.nombre}</strong>
                        <span className="text-[13px] text-tinta-suave tabular">C.C. / NIT {c.documento}</span>
                      </div>
                    </Td>
                    <Td>
                      {tel ? (
                        <a
                          href={`https://wa.me/57${tel}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-exito-texto hover:underline tabular"
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          {c.telefono}
                        </a>
                      ) : (
                        <span className="text-tinta-tenue">Sin teléfono</span>
                      )}
                    </Td>
                    <Td className="text-tinta-suave">{c.direccion || '—'}</Td>
                    {esAdmin && (
                      <Td alinear="der" className="whitespace-nowrap">
                        <Button variante="fantasma" tamano="sm" onClick={() => onEditar(c)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </Button>
                        <Button variante="peligro" tamano="sm" onClick={() => onEliminar(c)} aria-label={`Eliminar a ${c.nombre}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </Td>
                    )}
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
