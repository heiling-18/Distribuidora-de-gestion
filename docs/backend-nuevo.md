# Nuevo backend de DYM'S: especificación

Este documento describe qué debe tener el backend propio que reemplazará el acceso directo a Supabase desde el navegador. Está basado en una revisión del repositorio al 7 de noviembre de 2026.

## Objetivo

Hoy el navegador habla directamente con las tablas de Postgres a través de Supabase, y la seguridad depende de que cada política RLS esté bien escrita. El nuevo backend concentra toda la lógica de negocio en el servidor. El cliente solo pide acciones ("cerrar caja", "registrar venta"); el servidor valida el rol, calcula y escribe.

**Arquitectura propuesta:** Next.js (Route Handlers / Server Actions) con Drizzle ORM, zod y Postgres. El código vive en `src/server/` y puede sacarse más adelante a un servicio aparte (Fastify o NestJS) sin reescribirse.

## 1. Lo que hoy hace Supabase

| Pieza | Dónde está hoy |
|---|---|
| Login, sesión y logout (6 llamadas a `supabase.auth`) | `src/app/page.tsx:215-413` |
| Perfil y rol desde la tabla `usuarios` (admin, vendedor, galponero) | `src/app/page.tsx:47` |
| Unas 30 consultas directas a 11 tablas | `src/app/page.tsx`, `src/features/galpones/GalponesApp.tsx` |
| Venta atómica: toma el precio de la base y descuenta stock con bloqueo de fila | RPC `registrar_venta` |
| Anulación de venta: devuelve stock y la bloquea si el mes está cerrado | RPC `anular_venta` |
| Cierre mensual | RPC `cerrar_mes` |
| Bloqueo de gastos en meses cerrados | trigger `gastos_bloquear_mes_cerrado` |
| Permisos por rol | más de 30 políticas RLS |
| Fecha en hora de Colombia | `hoy_colombia()`, `mes_colombia()` |

Tablas actuales: `usuarios`, `productos`, `clientes`, `ventas`, `gastos`, `caja`, `cierres_caja`, `cierres_mensuales`, `gal_galpones`, `gal_registros`.

## 2. Endpoints por módulo

### Auth y usuarios

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (devuelve perfil y rol).
- Gestión de usuarios, solo admin: crear, cambiar rol, desactivar y resetear clave. Hoy se hace a mano desde el panel de Supabase.

### Productos

- `GET /productos`: todo el personal, con búsqueda y paginación.
- `POST`, `PATCH`, `DELETE`: solo admin.
- El borrado es lógico (`activo = false`), porque hay ventas que apuntan al producto.
- `POST /productos/:id/ajuste-stock` (admin), con motivo obligatorio y registro en `inventario_movimientos`. Hoy el admin edita el stock directamente y no queda rastro.

### Clientes

- `GET`, `POST`, `PATCH`: todo el personal.
- `DELETE`: solo admin, con borrado lógico.

### Ventas

- `POST /ventas`:
  - Reemplaza la lógica de `registrar_venta`.
  - El precio siempre sale del servidor.
  - Exige una caja abierta. Hoy no lo exige.
  - Recibe una clave de idempotencia, para que un doble clic o un reintento no registre la venta dos veces.
- `GET /ventas`: paginado, con filtros por fecha, vendedor, método de pago y estado.
- `GET /ventas/:id`.
- `POST /ventas/:id/anular`:
  - Solo admin. Hoy puede cualquier rol del personal, aunque el README dice lo contrario.
  - Motivo obligatorio y mes no cerrado.
  - El stock se devuelve por `producto_id`, nunca por nombre.

### Caja

- `GET /caja/actual`.
- `GET /caja/actual/resumen`: totales de efectivo, transferencias y gastos calculados en el servidor.
- `POST /caja/abrir`: solo puede haber una caja abierta, y la fecha la pone el servidor en hora de Colombia.
- `POST /caja/cerrar`:
  - El cliente solo envía el dinero contado y las observaciones.
  - El servidor calcula lo esperado y la diferencia.
  - Inserta el cierre y cierra la caja en una sola transacción.
- `GET /cierres-caja`: paginado.

### Gastos

- CRUD solo para admin, bloqueado en meses cerrados.
- El vendedor no necesita ver la lista de gastos; el total del día ya va en el resumen de caja.

### Reportes y dashboard

- `GET /dashboard`: indicadores del día y productos con stock bajo.
- `GET /reportes/mes?mes=` y `GET /reportes/historico`, con los totales agregados en SQL.
- `POST /cierres-mensuales` (admin) y `GET /cierres-mensuales`.

### Galpones

- `GET /galpones`: admin y galponero.
- `POST`, `PATCH`, `DELETE` de galpones: solo admin. El borrado solo funciona si el galpón no tiene registros.
- `GET /galpones/registros`: con rango de fechas.
- `PUT /galpones/:id/registros/:fecha`: upsert. El galponero solo puede registrar el día de hoy; el admin, cualquier día.
- `DELETE` de registros: solo admin.

## 3. Requisitos transversales

- **Todo denegado por defecto.** Cada ruta declara el rol que acepta, con un guard central. Al final de la migración, el navegador no tiene acceso directo a la base de datos.
- **Sesión en cookie httpOnly.** Si la auth es propia: claves con argon2 y límite de intentos en el login. Para empezar, se puede seguir con Supabase Auth y solo verificar el JWT en el servidor.
- **Transacciones con `SELECT … FOR UPDATE`** en venta, anulación, cierre de caja y cierre de mes.
- **Validación con zod en cada entrada.** Los montos se manejan en pesos enteros o `numeric`, nunca con decimales de JavaScript.
- **Hora de Colombia en el servidor.** Columnas `timestamptz`; "hoy" y "mes" los calcula siempre el servidor con `America/Bogota`.
- **Auditoría.** Tabla `auditoria` con quién, qué, cuándo, y el antes y después. Cubre anulaciones, cambios de precio y stock, borrados y cierres.
- **Paginación obligatoria y agregados en SQL.** Nunca `select *` de una tabla completa.
- **Configuración en una tabla.** El teléfono de WhatsApp (hoy fijo en `page.tsx`) y el nombre del negocio.
- **Observabilidad.** Logs estructurados (pino) y alertas de errores (por ejemplo, Sentry).

## 4. Cambios al modelo de datos

- **`ventas` como cabecera y `venta_items` como detalle.** Hoy cada producto de una venta es una fila aparte.
  - Cabecera: `numero` consecutivo real, `cliente_id`, `vendedor_id`, `caja_id`, `metodo_pago`, totales, `estado`, `motivo_anulacion`, `anulada_por`, `anulada_en`.
  - Ítems: `producto_id`, nombre como copia histórica, cantidad, tipo de precio, precio, costo e IVA.
- **`caja_id` en ventas y gastos**, para que el resumen de caja salga exacto sin depender de fechas.
- **`cierres_caja.caja_id`** como FK única.
- **Usuarios por FK** (`vendedor_id`, `cerrado_por`, `registrado_por`) en vez de nombres como texto.
- **Un `estado` real.** Hoy la anulación se guarda como texto `'anulada: motivo'` dentro de `estado_pago`.
- **Nuevas tablas:** `inventario_movimientos`, `auditoria`, `configuracion`.
- **Migración de los datos actuales:**
  - Convertir `estado_pago 'anulada…'` a la columna `estado`.
  - Dejar cada venta antigua como una cabecera con un solo ítem. No hay forma segura de reagruparlas en tickets.

## 5. Infraestructura

- Postgres administrado con backups automáticos y restauración a un punto en el tiempo (PITR).
- Migraciones versionadas con Drizzle, empezando por un `pg_dump` del esquema actual.
- Tests de integración contra un Postgres real para venta, anulación, cierre de caja y cierre de mes, incluyendo ventas simultáneas sobre el mismo stock.
- CI con lint, typecheck, tests y build.
- Un entorno de staging antes de producción.
- Estructura de carpetas:

```
src/server/
  modules/
    auth/       routes.ts  service.ts  repo.ts  schema.ts
    productos/
    clientes/
    ventas/
    caja/
    gastos/
    reportes/
    galpones/
  db/           cliente Drizzle, esquema, migraciones
  lib/          guard de roles, fecha Colombia, errores, logger
```

## 6. Errores actuales que no hay que copiar

1. **La caja se abre con fecha UTC.** Usa `new Date().toISOString()` (`src/app/page.tsx:475`), así que después de las 7 p. m. queda con la fecha de mañana.
2. **`registrar_venta` no exige una caja abierta.**
3. **Un vendedor puede hacer `update` directo a `caja`**, y el cierre se calcula en el navegador.
4. **Cualquier rol del personal puede anular ventas.**
5. **La anulación devuelve el stock buscando el producto por nombre** cuando falta `producto_id`.
6. **El límite de 1.000 filas** de Supabase corta en silencio ventas, gastos y cierres.
7. **El caché en `localStorage`** puede mostrar datos viejos.
8. **El número de ticket sale de `Math.random`** y no se guarda.

## 7. Orden de migración

Cada módulo se cambia en producción por separado, sin una migración grande de una sola vez.

1. Backups y esquema actual en el repo.
2. Auth y guard de roles.
3. Caja.
4. Ventas.
5. Productos y clientes.
6. Gastos y reportes.
7. Galpones.
8. Quitar el acceso directo del navegador a las tablas (revocar permisos del rol `authenticated`).
