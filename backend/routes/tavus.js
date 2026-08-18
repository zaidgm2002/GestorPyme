const express = require('express');
const prisma = require('../lib/prisma.js');

const router = express.Router();
const TAVUS_API_URL = 'https://tavusapi.com/v2';
const CONVERSATION_ID_PATTERN = /^c[a-zA-Z0-9_-]{3,100}$/;
const requestWindows = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_STARTS_PER_WINDOW = 5;

function startRateLimit(req, res, next) {
	const now = Date.now();
	const key = req.ip || 'unknown';
	const recent = (requestWindows.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);

	if (recent.length >= MAX_STARTS_PER_WINDOW) {
		return res.status(429).json({
			error: 'Has iniciado varias conversaciones. Espera unos minutos antes de intentar de nuevo.'
		});
	}

	recent.push(now);
	requestWindows.set(key, recent);
	next();
}

function tavusConfig() {
	return {
		apiKey: process.env.TAVUS_API_KEY,
		palId: process.env.TAVUS_PAL_ID,
		faceId: process.env.TAVUS_FACE_ID
	};
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
		console.error('No se pudo preparar el contexto para Tavus:', error);
		return { disponible: false };
	}
}

function publicTavusError(status) {
	if (status === 401 || status === 403) return 'La configuracion de Tavus no es valida.';
	if (status === 429) return 'Tavus alcanzo temporalmente su limite de uso.';
	return 'No fue posible iniciar la conversacion por video.';
}

async function logFailedConversation({ palId, faceId, error }) {
	try {
		await prisma.conversacionTavus.create({
			data: {
				palId,
				faceId,
				estado: 'ERROR',
				finalizadaEn: new Date(),
				duracionSegundos: 0,
				error: error.slice(0, 500)
			}
		});
	} catch (databaseError) {
		console.error('No se pudo registrar el error de Tavus:', databaseError);
	}
}

async function finishConversationRecord(tavusConversationId, estado, motivoCierre, error = null) {
	try {
		const record = await prisma.conversacionTavus.findUnique({
			where: { tavusConversationId }
		});
		if (!record) return;

		const finalizadaEn = new Date();
		const duracionSegundos = Math.max(
			0,
			Math.round((finalizadaEn.getTime() - record.iniciadaEn.getTime()) / 1000)
		);

		await prisma.conversacionTavus.update({
			where: { id: record.id },
			data: {
				estado,
				finalizadaEn,
				duracionSegundos,
				motivoCierre,
				error: error ? error.slice(0, 500) : null
			}
		});
	} catch (databaseError) {
		console.error('No se pudo actualizar la conversacion Tavus:', databaseError);
	}
}

router.get('/conversations/history', async (req, res) => {
	const requestedLimit = Number.parseInt(req.query.limit, 10);
	const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;

	try {
		const conversations = await prisma.conversacionTavus.findMany({
			orderBy: { iniciadaEn: 'desc' },
			take: limit,
			select: {
				id: true,
				estado: true,
				iniciadaEn: true,
				finalizadaEn: true,
				duracionSegundos: true,
				motivoCierre: true
			}
		});
		return res.json(conversations);
	} catch (error) {
		console.error('No se pudo consultar el historial Tavus:', error);
		return res.status(500).json({ error: 'No fue posible consultar el historial de conversaciones.' });
	}
});

router.post('/conversations', startRateLimit, async (req, res) => {
	const { apiKey, palId, faceId } = tavusConfig();
	if (!apiKey || !palId || !faceId) {
		return res.status(503).json({
			error: 'El asistente por video aun no esta configurado.'
		});
	}

	const operationalContext = await getOperationalContext();
	const conversationalContext = [
		'Eres el asistente virtual de GestorPyme. Responde siempre en espanol claro y profesional.',
		'Orienta al usuario exclusivamente sobre las funciones reales de clientes, cotizaciones, pagos, dashboard y cobranza descritas en tu configuracion y base de conocimiento.',
		'GestorPyme no tiene inventario, productos, existencias, stock ni alertas de inventario. Si el usuario pregunta por cualquiera de esos conceptos, responde exactamente: "La version actual de GestorPyme no incluye un modulo de inventario." No lo dirijas al Dashboard, al menu, a una barra de herramientas, al chatbot ni a otro modulo.',
		'Para registrar un cliente, los unicos campos son Nombre y Correo como obligatorios; Empresa, RFC, Telefono, Direccion y Notas son opcionales. No menciones razon social, identificacion fiscal, regimen fiscal ni otros campos.',
		'La version actual permite desactivar clientes y mostrarlos mediante Mostrar inactivos, pero no tiene una accion para reactivarlos.',
		'La opcion Cerrar sesion se encuentra en la esquina inferior izquierda de la interfaz.',
		'GestorPyme tambien cuenta con un chatbot de IA accesible desde el boton flotante AI; puede usarse como alternativa de texto cuando el usuario no pueda realizar una videollamada.',
		'No afirmes haber modificado datos ni solicites contrasenas, claves o informacion bancaria.',
		`Resumen operativo de solo lectura: ${JSON.stringify(operationalContext)}.`
	].join(' ');

	try {
		const response = await fetch(`${TAVUS_API_URL}/conversations`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': apiKey
			},
			body: JSON.stringify({
				pal_id: palId,
				face_id: faceId,
				conversation_name: 'Asistente virtual de GestorPyme',
				conversational_context: conversationalContext,
				custom_greeting: 'Hola, soy el asistente virtual de GestorPyme. ¿En que puedo ayudarte?',
				properties: {
					language: 'spanish',
					max_call_duration: 600,
					participant_left_timeout: 30,
					participant_absent_timeout: 120
				},
				require_auth: false,
				max_participants: 2
			}),
			signal: AbortSignal.timeout(30_000)
		});

		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			console.error('Error de Tavus al crear conversacion:', data?.message || response.statusText);
			await logFailedConversation({
				palId,
				faceId,
				error: publicTavusError(response.status)
			});
			return res.status(response.status >= 500 ? 502 : response.status).json({
				error: publicTavusError(response.status)
			});
		}

		if (!data.conversation_id || !data.conversation_url) {
			await logFailedConversation({ palId, faceId, error: 'Tavus devolvio una respuesta incompleta.' });
			return res.status(502).json({ error: 'Tavus devolvio una respuesta incompleta.' });
		}

		try {
			await prisma.conversacionTavus.create({
				data: {
					tavusConversationId: data.conversation_id,
					palId,
					faceId,
					estado: 'INICIADA'
				}
			});
		} catch (databaseError) {
			console.error('No se pudo registrar la conversacion Tavus:', databaseError);
		}

		return res.status(201).json({
			conversationId: data.conversation_id,
			conversationUrl: data.conversation_url
		});
	} catch (error) {
		console.error('No se pudo conectar con Tavus:', error);
		await logFailedConversation({ palId, faceId, error: 'No fue posible conectar con Tavus.' });
		return res.status(502).json({ error: 'No fue posible conectar con Tavus.' });
	}
});

router.post('/conversations/:id/end', async (req, res) => {
	const { apiKey } = tavusConfig();
	if (!apiKey) return res.status(503).json({ error: 'El asistente por video aun no esta configurado.' });
	if (!CONVERSATION_ID_PATTERN.test(req.params.id)) {
		return res.status(400).json({ error: 'El identificador de conversacion no es valido.' });
	}

	try {
		const response = await fetch(`${TAVUS_API_URL}/conversations/${req.params.id}/end`, {
			method: 'POST',
			headers: { 'x-api-key': apiKey },
			signal: AbortSignal.timeout(15_000)
		});

		if (!response.ok) {
			console.error('Error de Tavus al finalizar conversacion:', response.statusText);
			await finishConversationRecord(
				req.params.id,
				'ERROR',
				'ERROR_AL_FINALIZAR',
				'No fue posible finalizar la conversacion en Tavus.'
			);
			return res.status(response.status >= 500 ? 502 : response.status).json({
				error: 'No fue posible finalizar la conversacion en Tavus.'
			});
		}

		await finishConversationRecord(req.params.id, 'FINALIZADA', 'USUARIO');
		return res.status(204).end();
	} catch (error) {
		console.error('No se pudo finalizar la conversacion en Tavus:', error);
		await finishConversationRecord(
			req.params.id,
			'ERROR',
			'ERROR_DE_CONEXION',
			'No fue posible conectar con Tavus.'
		);
		return res.status(502).json({ error: 'No fue posible conectar con Tavus.' });
	}
});

module.exports = router;
