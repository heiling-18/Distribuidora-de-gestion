# DYM'S · Sistema POS y gestión agropecuaria

Punto de venta, inventario, caja, clientes, gastos, reportes y galpones de la distribuidora DYM'S.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide Icons

Los datos y las reglas de negocio viven en la API [Distribuidora-de-gestion-backend](https://github.com/heiling-18/Distribuidora-de-gestion-backend) (Node + PostgreSQL). Este proyecto ya **no usa Supabase**.

> La carpeta `supabase/migrations` se conserva solo como referencia del esquema anterior, para importar los datos a la nueva base. No se ejecuta.

---

## Funcionalidades

- **Caja:** apertura y cierre con arqueo; el efectivo esperado y la diferencia los calcula el servidor.
- **Punto de venta:** detal y por mayor, cliente registrado o general, ticket con número consecutivo y aviso al dueño por WhatsApp.
- **Ventas:** historial con búsqueda, filtros y paginación; anulación (solo administrador) con devolución al stock.
- **Inventario:** precios por margen e IVA (incluido en el precio), alertas de stock mínimo, historial de movimientos.
- **Clientes y gastos** (gastos solo administrador).
- **Reportes:** resumen por mes, histórico, cierre de mes y exportación a Excel (CSV).
- **Galpones:** registro diario de huevos, mortalidad y alimento.

### Roles

| Rol | Puede usar |
|---|---|
| Administrador | Todo, incluidos costos, gastos, reportes y Galpones |
| Vendedor | Inicio, POS, ventas, inventario (sin costos), caja y clientes |
| Galponero | Solo Galpones |

---

## Puesta en marcha (desarrollo)

1. Levanta la API (ver su README). Por defecto queda en `http://localhost:4000`.
2. En este proyecto:

```bash
npm install
npm run dev                   # http://localhost:3000
```

Si la API está en otra dirección, créala en `.env.local`:

```
API_URL=http://localhost:4000
```

El navegador llama a `/api/...` en el mismo dominio del frontend y Next lo reenvía a `API_URL` (ver `next.config.ts`). Así la cookie de sesión es del propio sitio y no hace falta CORS.

Para entrar en desarrollo usa los usuarios de prueba que crea `npm run db:seed` en la API.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción y servidor |
| `npm run lint` | ESLint |

---

## Estructura

```
src/
  app/
    login/                 pantalla de ingreso
    (distribuidora)/       layout con menú y caja + una carpeta por módulo:
                           page.tsx (inicio), pos, ventas, inventario, caja, clientes, gastos, reportes
    galpones/              sección de Galpones
  features/<módulo>/       vistas, modales y hooks de cada módulo
  components/
    ui/                    botones, campos (dinero, fecha, lista), tablas, modales…
    layout/                menú lateral, barra móvil, avisos
    providers/             sesión, notificaciones y estado de la caja
  lib/
    api/                   cliente HTTP y funciones por módulo (único lugar que llama a la API)
    fechas.ts, formato.ts, ventas.ts, exportar.ts, …
  types/api.ts             tipos de las respuestas de la API
  proxy.ts                 manda al login si no hay sesión
```

**Convenciones:**
- Las pantallas nunca usan `fetch` directo: llaman a `src/lib/api/servicios.ts`.
- Los montos en pesos usan el campo `moneda` (`<Field moneda />`): muestra `118.000` y entrega `118000`.
- "Hoy" siempre es el día en Colombia (`hoyNegocio()` en `src/lib/fechas.ts`).
- Este proyecto usa una versión de Next.js con cambios importantes: antes de escribir código, revisa la guía en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

---

## Pendiente

- Pantallas de **usuarios**, **configuración** (NIT y WhatsApp) y **cambiar mi clave** (la API ya las soporta).
- Importar los datos de Supabase y desplegar API y frontend.
