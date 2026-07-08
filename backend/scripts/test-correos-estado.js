const path = require('path');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const to = process.argv[2] || process.env.RESEND_TEST_TO;
const prisma = new PrismaClient();
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

let clienteId;
let cotizacionId;

async function request(path, options = {}) {
	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers: {
			'content-type': 'application/json',
			...(options.headers || {})
		}
	});
	const text = await response.text();
	const body = text ? JSON.parse(text) : null;

	if (!response.ok) {
		throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text}`);
	}

	return body;
}

async function cleanup() {
	if (cotizacionId) {
		await prisma.pago.deleteMany({ where: { cotizacionId } });
		await prisma.historialCot.deleteMany({ where: { cotizacionId } });
		await prisma.cotizacion.delete({ where: { id: cotizacionId } }).catch(() => {});
	}

	if (clienteId) {
		await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {});
	}
}

async function main() {
	if (!to) {
		throw new Error('Missing recipient. Use: npm run test:correos-estado -- correo@ejemplo.com');
	}

	const cliente = await prisma.cliente.create({
		data: {
			nombre: `Cliente Estado Codex ${stamp}`,
			empresa: 'QA Codex',
			rfc: `EST${stamp}`,
			correo: to,
			notas: 'Cliente temporal de prueba de correos por estado'
		}
	});
	clienteId = cliente.id;

	const cotizacion = await prisma.cotizacion.create({
		data: {
			numero: `EST-${stamp}`,
			clienteId: cliente.id,
			estado: 'ENVIADA',
			fecha: new Date(),
			subtotal: 1500,
			iva: 240,
			total: 1740,
			notas: 'Cotización temporal para probar correos por estado',
			conceptos: {
				create: [
					{
						descripcion: 'Servicio contable mensual',
						cantidad: 1,
						precioUnitario: 1500,
						subtotal: 1500
					}
				]
			}
		}
	});
	cotizacionId = cotizacion.id;

	const aprobada = await request(`/api/cotizaciones/${cotizacionId}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado: 'APROBADA' })
	});
	console.log(`Correo APROBADA solicitado para ${aprobada.cotizacion.cliente.correo}`);

	const facturada = await request(`/api/cotizaciones/${cotizacionId}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado: 'FACTURADA' })
	});
	console.log(`Correo FACTURADA solicitado para ${facturada.cotizacion.cliente.correo}`);
}

main()
	.catch((error) => {
		console.error(`FAIL ${error.message}`);
		if (error.cause) {
			console.error('CAUSE', error.cause);
		}
		process.exitCode = 1;
	})
	.finally(async () => {
		await cleanup();
		await prisma.$disconnect();
	});
