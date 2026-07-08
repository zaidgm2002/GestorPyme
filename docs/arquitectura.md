# Arquitectura de GestorPyme

## Contexto academico

GestorPyme es un proyecto para la materia Programacion Asistida con IA. El objetivo funcional es construir un sistema web para un despacho contable o consultoria pequena que permita administrar clientes, cotizaciones, pagos y cobranza.

La propuesta original del documento de alcance contemplaba una app SvelteKit full-stack con rutas de servidor internas. Durante la implementacion se decidio separar frontend y backend para dejar responsabilidades mas claras y facilitar pruebas, despliegue y mantenimiento.

## Decision de separacion

La arquitectura final se divide en dos aplicaciones:

- `frontend/`: aplicacion SvelteKit con la interfaz de usuario, Clerk y consumo de API.
- `backend/`: API REST con Express, Prisma, conexion a PostgreSQL/Supabase y envio de correos con Resend.

Esta separacion mantiene el stack principal del proyecto, pero mueve la logica sensible de base de datos y correos fuera del cliente web.

## Beneficios

- Seguridad: Prisma, `DATABASE_URL`, `RESEND_API_KEY` y la logica de correo viven solo en el backend.
- Mantenibilidad: las vistas y la API evolucionan por separado.
- Despliegue independiente: Render puede publicar dos servicios, uno para frontend y otro para backend.
- Claridad academica: se puede explicar la frontera entre capa de presentacion, capa de API y capa de datos.

## Flujo de datos

1. El usuario abre `frontend/` en SvelteKit.
2. Clerk gestiona autenticacion en el navegador.
3. Las paginas SvelteKit consultan al backend con `API_URL` durante `load`.
4. Las acciones del usuario crean o modifican datos llamando a `PUBLIC_API_URL`.
5. Express valida la peticion, usa Prisma para leer/escribir en Supabase y responde JSON.
6. Cuando aplica, el backend usa Resend para enviar correos transaccionales.

## Variables de entorno

Frontend:

- `PUBLIC_API_URL`
- `API_URL`
- `PUBLIC_CLERK_PUBLISHABLE_KEY`

Backend:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `FRONTEND_URL`

Compartidas o requeridas por despliegue:

- `CLERK_SECRET_KEY`
- `ORIGIN`

## Servicios locales

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- DB check: `http://localhost:3001/health/db`
