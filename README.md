# GestorPyme

Sistema de gestion para una pyme, construido como proyecto academico para la materia Programacion Asistida con IA.

El proyecto esta dividido en frontend y backend separados. Esta decision esta documentada en [`docs/arquitectura.md`](docs/arquitectura.md).

## Funcionalidad Principal

- Autenticacion con Clerk.
- Gestion de clientes activos e inactivos.
- Paginacion de clientes de 20 en 20.
- Cotizaciones con conceptos, IVA, totales y edicion cuando estan en borrador.
- Flujo formal de estados: `BORRADOR -> ENVIADA -> APROBADA -> FACTURADA -> PAGADA`.
- Estado `RECHAZADA` como salida desde `ENVIADA`.
- Pagos permitidos solo en cotizaciones `FACTURADA`.
- Historial de cambios por cotizacion.
- Dashboard con metricas y graficas.
- Cobranza con cartera pendiente y recordatorios por correo.
- Correos con Resend para cotizacion enviada, aprobada, facturada y recordatorio de pago.
- Validaciones de backend para payloads, montos y transiciones de estado.
- Interfaz responsive con toasts de confirmacion y error.

## Tecnologias

Frontend:

- SvelteKit
- Svelte 5
- SvelteKit adapter-node para deploy en Render
- Tailwind CSS
- Clerk
- Chart.js / svelte-chartjs

Backend:

- Node.js
- Express
- Prisma
- PostgreSQL / Supabase
- Resend

## Estructura

```txt
GestorPyme/
  backend/      API Express, Prisma, rutas y scripts de prueba
  frontend/     Aplicacion SvelteKit
  docs/         Documentacion del proyecto
  render.yaml   Blueprint de Render para frontend y backend
  package.json  Scripts de ayuda desde la raiz
```

## Requisitos

- Node.js `>=20.19 <23`
- npm
- Proyecto de Supabase con PostgreSQL
- Proyecto de Clerk
- API key de Resend

## Variables de Entorno

Los archivos `.env` no deben subirse al repositorio. Estan protegidos en `.gitignore`:

- `.env`
- `backend/.env`
- `frontend/.env`

### Backend

Crear `backend/.env`:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=disable"
FRONTEND_URL="http://localhost:5173"
RESEND_API_KEY="re_..."
FROM_EMAIL="onboarding@resend.dev"
```

Notas:

- El backend tambien carga `.env` de la raiz si existe, y despues `backend/.env`.
- Para Supabase/Prisma usar una URL valida para PostgreSQL. En este proyecto funciono el pooler de Supabase con puerto `5432` y `sslmode=disable`.
- En Resend sandbox solo se puede enviar a tu correo verificado. Para enviar a cualquier cliente hay que verificar un dominio en Resend y cambiar `FROM_EMAIL`.

### Frontend

Crear `frontend/.env`:

```env
PUBLIC_API_URL="http://localhost:3001"
API_URL="http://localhost:3001"
PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

## Instalacion

Instalar dependencias por proyecto:

```sh
npm install --prefix backend
npm install --prefix frontend
```

Generar Prisma Client:

```sh
npx prisma generate --schema backend/prisma/schema.prisma
```

## Desarrollo Local

Levantar backend:

```sh
npm run dev:backend
```

Levantar frontend:

```sh
npm run dev:frontend
```

URLs locales:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- DB check: `http://localhost:3001/health/db`

## Scripts

Desde la raiz:

```sh
npm run dev:backend
npm run dev:frontend
npm run build:frontend
npm run start:backend
npm run start:frontend
```

Backend:

```sh
npm run test:smoke --prefix backend
npm run test:resend --prefix backend
npm run test:recordatorio --prefix backend
npm run test:correos-estado --prefix backend
```

Frontend:

```sh
npm run build --prefix frontend
npm run preview --prefix frontend
```

## API

Endpoints principales:

Clientes:

- `GET /api/clientes`
- `GET /api/clientes?incluirInactivos=true`
- `POST /api/clientes`
- `GET /api/clientes/:id`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

Cotizaciones:

- `GET /api/cotizaciones`
- `GET /api/cotizaciones/next-number`
- `POST /api/cotizaciones`
- `GET /api/cotizaciones/:id`
- `PUT /api/cotizaciones/:id`
- `PUT /api/cotizaciones/:id/estado`
- `POST /api/cotizaciones/:id/pagos`

Pagos:

- `DELETE /api/pagos/:id`

Dashboard y cobranza:

- `GET /api/dashboard`
- `GET /api/cobranza`
- `POST /api/cobranza/:id/recordatorio`

Health:

- `GET /health`
- `GET /health/db`

## Reglas de Negocio

Estados permitidos:

```txt
BORRADOR -> ENVIADA
ENVIADA -> APROBADA
ENVIADA -> RECHAZADA
APROBADA -> FACTURADA
FACTURADA -> PAGADA
```

Reglas importantes:

- Solo se puede editar una cotizacion en `BORRADOR`.
- Solo se pueden registrar pagos cuando la cotizacion esta `FACTURADA`.
- No se permite pagar mas del saldo pendiente.
- `PAGADA` solo se permite cuando el saldo pendiente es `0`.
- Cada cambio importante queda registrado en `HistorialCot`.

## Pruebas Manuales Recomendadas

1. Iniciar sesion con Clerk.
2. Crear cliente.
3. Crear cotizacion como `BORRADOR`.
4. Editar el borrador.
5. Enviar cotizacion.
6. Aprobar cotizacion.
7. Facturar cotizacion.
8. Registrar pago parcial.
9. Enviar recordatorio desde cobranza.
10. Registrar pago final.
11. Confirmar que pasa a `PAGADA`.
12. Revisar dashboard, detalle de cliente e historial de cambios.

## Deploy en Render

El archivo [`render.yaml`](render.yaml) define dos servicios:

- `gestorpyme-backend`, con `rootDir: backend`.
- `gestorpyme-frontend`, con `rootDir: frontend`.

Variables para configurar en Render:

Backend:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `FRONTEND_URL`

Frontend:

- `PUBLIC_API_URL`
- `API_URL`
- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Despues de desplegar:

- `PUBLIC_API_URL` y `API_URL` deben apuntar a la URL publica del backend.
- `FRONTEND_URL` debe apuntar a la URL publica del frontend para CORS.
- En Clerk hay que agregar la URL publica del frontend como dominio/origen permitido.
- En Resend hay que verificar dominio si se quieren enviar correos a clientes reales.

## Notas de Seguridad

- No subir archivos `.env`.
- No poner claves reales en el README.
- Rotar claves si accidentalmente se suben a GitHub.
- Usar variables de entorno en Render, no archivos `.env` en produccion.
