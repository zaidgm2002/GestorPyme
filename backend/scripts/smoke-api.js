const { PrismaClient } = require('@prisma/client');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const testRfc = `S${stamp.slice(2, 14)}`;
const prisma = new PrismaClient();

const created = {
	clienteId: null,
	cotizacionId: null
};

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

async function expectError(name, path, options = {}, expectedStatus = 400) {
	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers: {
			'content-type': 'application/json',
			...(options.headers || {})
		}
	});

	const text = await response.text();

	if (response.status !== expectedStatus) {
		throw new Error(`${name} expected ${expectedStatus}, got ${response.status}: ${text}`);
	}

	ok(name, `status=${response.status}`);
}

function ok(name, detail = '') {
	console.log(`OK ${name}${detail ? ` (${detail})` : ''}`);
}

async function cleanup() {
	if (created.cotizacionId) {
		await prisma.pago.deleteMany({ where: { cotizacionId: created.cotizacionId } });
		await prisma.historialCot.deleteMany({ where: { cotizacionId: created.cotizacionId } });
		await prisma.cotizacion.delete({ where: { id: created.cotizacionId } }).catch(() => {});
	}

	if (created.clienteId) {
		await prisma.cliente.delete({ where: { id: created.clienteId } }).catch(() => {});
	}

	await prisma.cliente.deleteMany({
		where: {
			correo: {
				startsWith: 'codex-smoke-'
			}
		}
	});
}

async function main() {
	await request('/health');
	ok('GET /health');

	await request('/health/db');
	ok('GET /health/db');

	await expectError('POST /api/clientes invalid email', '/api/clientes', {
		method: 'POST',
		body: JSON.stringify({
			nombre: 'Cliente Invalido',
			correo: 'correo-invalido'
		})
	});

	const cliente = await request('/api/clientes', {
		method: 'POST',
		body: JSON.stringify({
			nombre: `Cliente Smoke Codex ${stamp}`,
			empresa: 'QA Codex',
			rfc: testRfc,
			correo: `codex-smoke-${stamp}@example.com`,
			telefono: '5551112222',
			direccion: 'Prueba',
			notas: 'Registro temporal de smoke test'
		})
	});
	created.clienteId = cliente.id;
	ok('POST /api/clientes', cliente.id);

	const clienteDetalle = await request(`/api/clientes/${cliente.id}`);
	ok('GET /api/clientes/:id', clienteDetalle.nombre);

	const siguiente = await request('/api/cotizaciones/next-number');
	ok('GET /api/cotizaciones/next-number', siguiente.siguienteNumero);

	const cotizacion = await request('/api/cotizaciones', {
		method: 'POST',
		body: JSON.stringify({
			numero: siguiente.siguienteNumero,
			clienteId: cliente.id,
			fecha: new Date().toISOString(),
			vencimiento: null,
			subtotal: 100,
			iva: 16,
			total: 116,
			notas: 'Cotizacion temporal de smoke test',
			estado: 'BORRADOR',
			conceptos: [
				{
					descripcion: 'Servicio de prueba',
					cantidad: 1,
					precioUnitario: 100
				}
			]
		})
	});
	created.cotizacionId = cotizacion.id;
	ok('POST /api/cotizaciones', cotizacion.id);

	await request(`/api/cotizaciones/${cotizacion.id}`, {
		method: 'PUT',
		body: JSON.stringify({
			numero: siguiente.siguienteNumero,
			clienteId: cliente.id,
			fecha: new Date().toISOString(),
			vencimiento: null,
			subtotal: 100,
			iva: 16,
			total: 116,
			notas: 'Cotizacion temporal editada en borrador',
			conceptos: [
				{
					descripcion: 'Servicio de prueba editado',
					cantidad: 1,
					precioUnitario: 100
				}
			]
		})
	});
	ok('PUT /api/cotizaciones/:id draft edit');

	const cotizacionDetalle = await request(`/api/cotizaciones/${cotizacion.id}`);
	ok('GET /api/cotizaciones/:id', `pendiente=${cotizacionDetalle.pendiente}`);

	await expectError('PUT /api/cotizaciones/:id/estado invalid jump', `/api/cotizaciones/${cotizacion.id}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado: 'APROBADA' })
	});

	await request(`/api/cotizaciones/${cotizacion.id}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado: 'ENVIADA' })
	});
	ok('PUT /api/cotizaciones/:id/estado ENVIADA');

	await request(`/api/cotizaciones/${cotizacion.id}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado: 'APROBADA' })
	});
	ok('PUT /api/cotizaciones/:id/estado APROBADA');

	await expectError('POST /api/cotizaciones/:id/pagos before invoice', `/api/cotizaciones/${cotizacion.id}/pagos`, {
		method: 'POST',
		body: JSON.stringify({
			monto: 50,
			fecha: new Date().toISOString(),
			metodo: 'TRANSFERENCIA'
		})
	});

	await request(`/api/cotizaciones/${cotizacion.id}/estado`, {
		method: 'PUT',
		body: JSON.stringify({ estado: 'FACTURADA' })
	});
	ok('PUT /api/cotizaciones/:id/estado FACTURADA');

	await expectError('POST /api/cotizaciones/:id/pagos exceeds balance', `/api/cotizaciones/${cotizacion.id}/pagos`, {
		method: 'POST',
		body: JSON.stringify({
			monto: 9999,
			fecha: new Date().toISOString(),
			metodo: 'TRANSFERENCIA'
		})
	});

	const pago = await request(`/api/cotizaciones/${cotizacion.id}/pagos`, {
		method: 'POST',
		body: JSON.stringify({
			monto: 50,
			fecha: new Date().toISOString(),
			metodo: 'TRANSFERENCIA',
			referencia: `SMOKE-${stamp}`
		})
	});
	ok('POST /api/cotizaciones/:id/pagos', `pendiente=${pago.pendiente}`);

	await request('/api/dashboard');
	ok('GET /api/dashboard');

	await request('/api/cobranza');
	ok('GET /api/cobranza');
}

main()
	.catch((error) => {
		console.error(`FAIL ${error.message}`);
		process.exitCode = 1;
	})
	.finally(async () => {
		try {
			await cleanup();
			ok('cleanup');
		} catch (error) {
			console.warn(`WARN cleanup skipped: ${error.message}`);
		} finally {
			await prisma.$disconnect().catch(() => {});
		}
	});
