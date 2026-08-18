const express = require('express');
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma.js');

const router = express.Router();
const requestWindows = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const systemPrompt = fs.readFileSync(
	path.resolve(__dirname, '..', 'prompts', 'assistant-system.md'),
	'utf8'
);

const allowedRoutes = new Set([
	'/dashboard',
	'/clientes',
	'/cotizaciones',
	'/cotizaciones/nueva',
	'/cobranza'
]);
const APP_PATH_PATTERN = /^\/(?:dashboard|clientes(?:\/[^/?#]+)?|cotizaciones(?:\/nueva|\/[^/?#]+(?:\/editar)?)?|cobranza)\/?$/;

function assistantRateLimit(req, res, next) {
	const now = Date.now();
	const key = req.ip || 'unknown';
	const recent = (requestWindows.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
	if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
		return res.status(429).json({ error: 'Has enviado muchas consultas. Intenta de nuevo en unos minutos.' });
	}
	recent.push(now);
	requestWindows.set(key, recent);
	if (requestWindows.size > 1000) {
		for (const [storedKey, timestamps] of requestWindows) {
			if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) requestWindows.delete(storedKey);
		}
	}
	next();
}

async function getOperationalContext() {
	try {
		const [clientesActivos, cotizacionesActivas, cotizacionesFacturadas] = await Promise.all([
			prisma.cliente.count({ where: { activo: true } }),
			prisma.cotizacion.count({
				where: { estado: { in: ['ENVIADA', 'APROBADA', 'FACTURADA'] } }
			}),
			prisma.cotizacion.findMany({
				where: { estado: 'FACTURADA' },
				select: { total: true, pagos: { select: { monto: true } } }
			})
		]);

		const carteraPendiente = cotizacionesFacturadas.reduce((total, cotizacion) => {
			const pagado = cotizacion.pagos.reduce((suma, pago) => suma + Number(pago.monto), 0);
			return total + Math.max(0, Number(cotizacion.total) - pagado);
		}, 0);

		return { clientesActivos, cotizacionesActivas, carteraPendiente };
	} catch (error) {
		console.error('No se pudo preparar el contexto del asistente:', error);
		return { disponible: false };
	}
}

router.post('/', assistantRateLimit, async (req, res) => {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return res.status(503).json({
			error: 'El asistente aun no esta configurado. Agrega ANTHROPIC_API_KEY en el backend.'
		});
	}

	const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
	const messages = rawMessages
		.filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
		.slice(-10)
		.map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));

	if (!messages.length || messages[messages.length - 1].role !== 'user') {
		return res.status(400).json({ error: 'Escribe una pregunta para el asistente.' });
	}

	const requestedPath = typeof req.body?.currentPath === 'string'
		? req.body.currentPath.slice(0, 200)
		: '';
	// La ruta viene del navegador: solo incluimos rutas que pertenecen a la app.
	const currentPath = APP_PATH_PATTERN.test(requestedPath) ? requestedPath : '/dashboard';
	const operationalContext = await getOperationalContext();
	const context = `\n\nCONTEXTO ACTUAL (datos de solo lectura):\n${JSON.stringify({
		pantallaActual: currentPath,
		resumen: operationalContext
	})}`;

	try {
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
				max_tokens: 700,
				system: systemPrompt + context,
				messages
			}),
			signal: AbortSignal.timeout(30_000)
		});

		const data = await response.json();
		if (!response.ok) {
			console.error('Error de Anthropic:', data?.error?.message || response.statusText);
			const errorType = data?.error?.type;
			let publicMessage = 'Claude no pudo responder en este momento. Intenta nuevamente.';
			if (response.status === 401 || response.status === 403) {
				publicMessage = 'La clave de Anthropic no es valida o no tiene permisos.';
			} else if (response.status === 400 && errorType === 'invalid_request_error') {
				publicMessage = 'La configuracion del modelo de Claude no es valida. Revisa ANTHROPIC_MODEL.';
			} else if (response.status === 429) {
				publicMessage = 'Claude alcanzo temporalmente su limite de uso. Intenta mas tarde.';
			}
			return res.status(response.status >= 500 ? 502 : response.status).json({ error: publicMessage });
		}

		const fullText = (data.content || [])
			.filter((block) => block.type === 'text')
			.map((block) => block.text)
			.join('\n')
			.trim();
		const navigationMatch = fullText.match(/(?:^|\n)NAVEGAR:\s*(\/[^\s]+)\s*$/i);
		const suggestedPath = navigationMatch && allowedRoutes.has(navigationMatch[1])
			? navigationMatch[1]
			: null;
		const message = fullText.replace(/(?:^|\n)NAVEGAR:\s*\/[^\s]+\s*$/i, '').trim();

		return res.json({ message, suggestedPath });
	} catch (error) {
		console.error('Error al consultar Anthropic:', error);
		return res.status(502).json({ error: 'No fue posible conectar con Claude.' });
	}
});

module.exports = router;
