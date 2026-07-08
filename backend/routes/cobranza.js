const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma.js');
const { sendEmail } = require('../lib/email.js');
const { templateRecordatorioPago } = require('../lib/emailTemplates.js');

router.get('/', async (req, res) => {
	try {
		const cotizaciones = await prisma.cotizacion.findMany({
			where: {
				estado: 'FACTURADA'
			},
			include: {
				cliente: true,
				pagos: true
			},
			orderBy: { fecha: 'asc' }
		});

		const carteraPendiente = cotizaciones
			.map(cot => {
				const pagado = cot.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
				const pendiente = Number(cot.total) - pagado;
				const diasTranscurridos = Math.floor((new Date() - new Date(cot.fecha)) / (1000 * 60 * 60 * 24));

				return {
					...cot,
					pagado,
					pendiente,
					diasTranscurridos
				};
			})
			.filter(cot => cot.pendiente > 0)
			.sort((a, b) => b.diasTranscurridos - a.diasTranscurridos);

		const totalCartera = carteraPendiente.reduce((sum, cot) => sum + cot.pendiente, 0);

		res.json({ carteraPendiente, totalCartera });
	} catch (error) {
		console.error('Error al obtener cobranza:', error);
		res.json({
			carteraPendiente: [],
			totalCartera: 0
		});
	}
});

router.post('/:id/recordatorio', async (req, res) => {
	try {
		const cotizacion = await prisma.cotizacion.findUnique({
			where: { id: req.params.id },
			include: {
				cliente: true,
				pagos: true
			}
		});

		if (!cotizacion) {
			return res.status(404).json({ error: 'Cotización no encontrada' });
		}

		if (cotizacion.estado !== 'FACTURADA') {
			return res.status(400).json({ error: 'Solo se pueden enviar recordatorios de cotizaciones facturadas' });
		}

		const pagado = cotizacion.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
		const saldoPendiente = Number(cotizacion.total) - pagado;

		if (saldoPendiente <= 0) {
			return res.status(400).json({ error: 'La cotización no tiene saldo pendiente' });
		}

		const html = templateRecordatorioPago({
			cliente: cotizacion.cliente,
			cotizacion,
			saldoPendiente,
			pagado
		});

		const result = await sendEmail({
			to: cotizacion.cliente.correo,
			subject: `Recordatorio de pago - ${cotizacion.numero}`,
			html
		});

		await prisma.historialCot.create({
			data: {
				cotizacionId: cotizacion.id,
				estadoNuevo: cotizacion.estado,
				nota: result.ok
					? `Recordatorio de pago enviado a ${cotizacion.cliente.correo}`
					: `Error al enviar recordatorio: ${result.error?.message || result.error || 'desconocido'}`
			}
		});

		if (!result.ok) {
			return res.status(502).json({
				error: 'Error al enviar recordatorio',
				detail: result.error
			});
		}

		res.json({
			ok: true,
			id: result.id,
			to: cotizacion.cliente.correo
		});
	} catch (error) {
		console.error('Error al enviar recordatorio:', error);
		res.status(500).json({ error: 'Error al enviar recordatorio' });
	}
});

module.exports = router;
