# Plan de construcción del backend de DYM'S

Proyecto: `D:\Documentos\Distribuidora-de-gestion-backend` (Node + Express 5 + TypeScript + Drizzle + PostgreSQL).
Especificación funcional: [backend-nuevo.md](backend-nuevo.md).

**Decisión (7 de noviembre de 2026):** el backend se construye sobre un PostgreSQL propio y **limpio**, con el modelo de datos nuevo desde el principio. Los datos de Supabase se importan **al final**, en una fase dedicada. Supabase no se toca durante el desarrollo: la app actual sigue funcionando sobre él hasta el día del cambio.

---

## Reglas de seguridad de los datos

1. **Supabase no se modifica nunca** desde este proyecto. Ni migraciones, ni scripts, ni borrados. Solo se lee una vez, en la Fase 9.
2. **Tres bases separadas:** `dyms_dev` (desarrollo), `dyms_test` (los tests la vacían en cada corrida) y, al final, la de producción. Los tests nunca apuntan a otra base que no sea `dyms_test`.
3. **Las credenciales no van en el repo.** Solo en `.env`, que está en `.gitignore`. El repo tiene `.env.example`.
4. **Migraciones solo con `drizzle-kit generate` + revisión manual del SQL.** Prohibido `drizzle-kit push` fuera de desarrollo.
5. **Producción con backups automáticos diarios** y una restauración de prueba antes de abrir al negocio.
6. **La importación de datos es repetible:** se puede correr muchas veces sobre una base vacía, tiene modo `--dry-run` y termina comparando conteos y totales con el origen.

**Pendiente urgente fuera de este proyecto:** quien tenga acceso a Supabase debe sacar un backup cuanto antes. En el plan gratis no hay backups automáticos, y hoy esos datos no tienen ninguna otra copia. El script `D:\Documentos\DYMS-respaldos\respaldar.sh` ya está listo para eso; solo necesita la cadena de conexión.

---

## Fase 0: PostgreSQL local

- PostgreSQL 17 instalado en Windows (servicio `postgresql-x64-17`, puerto `5432`). Docker Desktop no arranca en esta máquina.
- `scripts/crear-bd-local.ps1` crea el rol `dyms` y las bases `dyms_dev` y `dyms_test`.
- `.env` con `DATABASE_URL` y `DATABASE_URL_TEST`.

**Hecho cuando:** el rol `dyms` se conecta a las dos bases.

## Fase 1: Base del proyecto

- `config/env.ts`: variables de entorno validadas con zod. Si falta una, la API no arranca.
- `utils/`: logger (pino), `AppError`, fecha y hora de Colombia (`America/Bogota`).
- `database/`: conexión `pg` + Drizzle y helper de transacciones.
- `middlewares/`: errores, ruta no encontrada, validación con zod, helmet, CORS, rate limit.
- `routes/index.ts` y `/health`, que comprueba la conexión a la base.
- vitest + supertest contra `dyms_test`.

**Hecho cuando:** `npm run dev` arranca, `/health` responde con la base conectada y `npm test` pasa.

## Fase 2: Modelo de datos nuevo

Como la base es limpia, se diseña directamente el modelo correcto (ver sección 4 de `backend-nuevo.md`):

- `usuarios` (con `password_hash`, `rol`, `activo`).
- `productos`, `clientes` (borrado lógico con `activo`).
- `cajas`, `cierres_caja` (con `caja_id` único).
- `ventas` (cabecera con consecutivo real, `cliente_id`, `vendedor_id`, `caja_id`, `estado`) y `venta_items`.
- `gastos` (con `caja_id` opcional), `cierres_mensuales`.
- `inventario_movimientos`, `auditoria`, `configuracion`.
- `galpones`, `galpon_registros` (único por `galpon_id` + `fecha`).
- Montos en `numeric(14,2)` o pesos enteros; fechas en `timestamptz`.

Script `seed` para desarrollo: un usuario por rol, productos y clientes de ejemplo.

**Hecho cuando:** `npm run db:migrate` crea todo desde cero en una base vacía, y el seed corre sin errores.

## Fase 3: Autenticación y roles

- Login con argon2. Además acepta hashes bcrypt, para que en la Fase 9 los usuarios importados de Supabase entren con su contraseña de siempre; al entrar, se vuelve a guardar con argon2.
- JWT en cookie `httpOnly`, `secure`, `sameSite`. `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Middlewares `autenticar` y `requerirRol(...)`. Todo denegado por defecto.
- Límite de intentos en el login.
- Gestión de usuarios para el admin.

## Fase 4: Caja

- Abrir, resumen, cerrar (en una transacción con bloqueo de fila), historial de cierres.
- Una sola caja abierta; fechas de Colombia calculadas en el servidor.
- Tests: diferencia de caja, doble cierre, cierre sin caja abierta, cierres simultáneos.

## Fase 5: Ventas

- Registrar venta: precio desde la base, stock con bloqueo de fila, caja abierta obligatoria, clave de idempotencia, consecutivo real.
- Listado paginado con filtros, detalle, anulación solo admin (stock devuelto por `producto_id`, mes no cerrado).
- Tests: ventas simultáneas sobre el mismo stock, stock insuficiente, anulación doble, anulación en mes cerrado.

## Fase 6: Productos, clientes y gastos

- CRUD con paginación, búsqueda y borrado lógico.
- Ajustes de stock con motivo en `inventario_movimientos`.
- Gastos solo admin, bloqueados en meses cerrados. Auditoría de cambios sensibles.

## Fase 7: Reportes, dashboard, cierre mensual y galpones

- Dashboard y reportes agregados en SQL; cierre mensual.
- Galpones: CRUD y registros diarios (el galponero solo el día de hoy).

## Fase 8: Frontend sobre la API

- En el frontend, reemplazar todas las llamadas `supabase.*` por llamadas a la API, módulo por módulo, probando contra `dyms_dev`.
- Aprovechar para partir `page.tsx` en rutas reales.
- Desplegar API, base y frontend en un entorno de staging.

## Fase 9: Importación de datos de Supabase y cambio

1. Conseguir un backup completo de Supabase (`pg_dump -Fc`) con quien tenga acceso.
2. Restaurarlo en una base local aparte (`supabase_copia`), nunca en Supabase.
3. Script de importación `supabase_copia → modelo nuevo`:
   - usuarios, con sus hashes bcrypt de `auth.users`;
   - productos, clientes, gastos, cajas, cierres, cierres mensuales, galpones;
   - ventas: cada fila antigua pasa a una cabecera con un solo ítem; la anulación se lee de `estado_pago 'anulada…'`; el cliente se enlaza por documento o nombre cuando se pueda.
4. Conciliación: conteos por tabla, y ventas, gastos y utilidad por mes iguales al peso entre origen y destino.
5. Día del cambio: pausar ventas unos minutos, sacar el backup final, importar, conciliar, apuntar el frontend a la API.
6. Supabase queda intacto y en solo lectura un tiempo como respaldo.

**Hecho cuando:** la conciliación cuadra al peso y el negocio opera sobre la API.
