# DYM'S · Sistema POS y Gestión Agropecuaria

Aplicación web de punto de venta, inventario, caja y reportes para **Distribuidora DYM'S**, una distribuidora de concentrados Purina que también maneja galpones de gallinas y venta de huevos.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

🔗 **Demo en vivo:** https://distribuidora-de-gestion.vercel.app

---

## 🧩 El problema

La distribuidora llevaba las ventas, el inventario y el cuadre de caja en cuaderno y hojas de cálculo. Eso causaba:

- Diferencias de dinero al cerrar la caja sin saber de dónde venían.
- Productos agotados sin aviso.
- Ventas anuladas que no devolvían el producto al inventario.
- Ninguna forma rápida de saber cuánto se vendió y cuánto se ganó en el mes.
- Producción de huevos de los galpones anotada a mano.

Este sistema centraliza todo en una sola aplicación, con usuarios y permisos por rol.

## ✨ Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Punto de venta (POS)** | Carrito de venta rápida, ticket para el cliente y envío por WhatsApp. |
| **Caja** | Apertura y cierre con arqueo de efectivo, y comprobante de cierre. |
| **Inventario** | Productos y categorías, con alertas de stock mínimo. |
| **Ventas** | Historial de ventas; anulación con motivo y devolución automática al stock (solo administrador). |
| **Clientes** | Registro y gestión de clientes. |
| **Gastos** | Registro de gastos para descontarlos de la ganancia. |
| **Reportes** | Resumen diario y mensual, cierre de mes y exportación a CSV (Excel). |
| **Galpones** | Registro diario de producción por galpón (postura y levante). |
| **Huevos** | Inventario por tipo y tamaño, carrito de venta e historial de movimientos. |
| **Usuarios** | Inicio de sesión y permisos por rol (administrador, vendedor, galponero) con Row Level Security. |

## 🛠️ Tecnologías

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide Icons.
- **Backend y base de datos:** Supabase (PostgreSQL, Auth y Row Level Security).
- **Despliegue:** Vercel.

## 🗂️ Estructura

```
src/
├── app/            # Página principal y layout (App Router)
├── features/       # Un módulo por área: pos, caja, inventario, ventas,
│                   # clientes, gastos, reportes, galpones, huevos, auth
├── components/     # Componentes compartidos (ui, layout, marca)
├── lib/            # Cliente de Supabase
└── types/          # Tipos de TypeScript
supabase/
└── migrations/     # Esquema de la base de datos y políticas RLS
```

## 🚀 Cómo ejecutarlo

**Requisitos:** Node.js 20 o superior y un proyecto en [Supabase](https://supabase.com).

```bash
git clone https://github.com/heiling-18/Distribuidora-de-gestion.git
cd Distribuidora-de-gestion
npm install
```

Crea un archivo `.env.local` en la raíz con los datos de tu proyecto de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Aplica las migraciones de `supabase/migrations/` en tu proyecto (con la CLI de Supabase, `supabase db push`, o pegándolas en el SQL Editor) y arranca:

```bash
npm run dev
```

Abre http://localhost:3000.

## 📚 Lo que aprendí

- Diseñar una base de datos real en PostgreSQL y protegerla con **Row Level Security** según el rol del usuario.
- Organizar una app grande por **módulos de funcionalidad** (`features/`) en lugar de un solo archivo.
- Manejar reglas de negocio reales: precios con IVA incluido, arqueo de caja, anulaciones que devuelven stock y cierres mensuales.
- Trabajar con **ramas y pull requests** para cada cambio, y desplegar continuamente en Vercel.
- Escuchar al usuario final (el dueño del negocio) y convertir sus necesidades en funcionalidades.

## 👤 Autor

**Heiling** · [github.com/heiling-18](https://github.com/heiling-18)
