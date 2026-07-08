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
		throw new Error('Missing recipient. Use: npm run test:recordatorio -- correo@ejemplo.com');
	}

	const cliente = await prisma.cliente.create({
		data: {
			nombre: `Cliente Recordatorio Codex ${stamp}`,
			empresa: 'QA Codex',
			rfc: `REM${stamp}`,
			correo: to,
			notas: 'Cliente temporal de prueba de recordatorio'
		}
	});
	clienteId = cliente.id;

	const cotizacion = await prisma.cotizacion.create({
		data: {
			numero: `REM-${stamp}`,
			clienteId: cliente.id,
			estado: 'APROBADA',
			fecha: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
			subtotal: 1500,
			iva: 240,
			total: 1740,
			notas: 'Cotización temporal para probar recordatorio',
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

	await prisma.pago.create({
		data: {
			cotizacionId,
			monto: 500,
			fecha: new Date(),
			metodo: 'TRANSFERENCIA',
			referencia: `REM-${stamp}`
		}
	});

	const result = await request(`/api/cobranza/${cotizacionId}/recordatorio`, { method: 'POST' });
	console.log(`Recordatorio enviado. id=${result.id} to=${result.to}`);
}

main()
	.catch((error) => {
		console.error(`FAIL ${error.message}`);
		process.exitCode = 1;
	})
	.finally(async () => {
		await cleanup();
		await prisma.$disconnect();
	});
