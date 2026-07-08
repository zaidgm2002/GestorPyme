const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma.js');
const { sendEmail } = require('../lib/email.js');
const {
	templateCotizacionEnviada,
	templateCambioEstadoCotizacion
} = require('../lib/emailTemplates.js');
const {
	ESTADOS_COTIZACION,
	tieneTransicionPermitida,
	validarCotizacionInput,
	validarPagoInput
} = require('../lib/validators.js');

function describirErrorEmail(error) {
	if (!error) return 'desconocido';
	if (typeof error === 'string') return error;
	return error.message || error.name || JSON.stringify(error);
}

async function enviarCorreoCotizacion(cotizacion) {
	try {
		const templatesPorEstado = {
			ENVIADA: {
				html: templateCotizacionEnviada({
					cliente: cotizacion.cliente,
					cotizacion,
					conceptos: cotizacion.conceptos
				}),
				subject: `Cotizacion ${cotizacion.numero} - ${cotizacion.total} MXN`,
				successNote: `Correo de cotización enviada a ${cotizacion.cliente.correo}`,
				errorNote: 'Error al enviar correo de cotización'
			},
			APROBADA: {
				html: templateCambioEstadoCotizacion({
					cliente: cotizacion.cliente,
					cotizacion,
					estado: 'APROBADA'
				}),
				subject: `Cotizacion aprobada - ${cotizacion.numero}`,
				successNote: `Correo de aprobación enviado a ${cotizacion.cliente.correo}`,
				errorNote: 'Error al enviar correo de aprobación'
			},
			FACTURADA: {
				html: templateCambioEstadoCotizacion({
					cliente: cotizacion.cliente,
					cotizacion,
					estado: 'FACTURADA'
				}),
				subject: `Cotizacion facturada - ${cotizacion.numero}`,
				successNote: `Correo de facturación enviado a ${cotizacion.cliente.correo}`,
				errorNote: 'Error al enviar correo de facturación'
			}
		};

		const emailConfig = templatesPorEstado[cotizacion.estado];

		if (!emailConfig) {
			return;
		}

		const { ok, error } = await sendEmail({
			to: cotizacion.cliente.correo,
			subject: emailConfig.subject,
			html: emailConfig.html
		});

		await prisma.historialCot.create({
			data: {
				cotizacionId: cotizacion.id,
				estadoNuevo: cotizacion.estado,
				nota: ok
					? emailConfig.successNote
					: `${emailConfig.errorNote}: ${describirErrorEmail(error)}`
			}
		});
	} catch (emailError) {
		console.error('Error al enviar correo:', emailError);
	}
}

// GET /api/cotizaciones - Obtener todas las cotizaciones
router.get('/', async (req, res) => {
	try {
		const cotizaciones = await prisma.cotizacion.findMany({
			include: {
				cliente: true,
				pagos: true
			},
			orderBy: { fecha: 'desc' }
		});
		res.json(cotizaciones);
	} catch (error) {
		console.error('Error al obtener cotizaciones:', error);
		res.status(500).json({ error: 'Error al obtener cotizaciones' });
	}
});

// GET /api/cotizaciones/next-number - Obtener siguiente numero
router.get('/next-number', async (req, res) => {
	try {
		const year = new Date().getFullYear();
		const prefix = `COT-${year}-`;
		const ultimaCotizacion = await prisma.cotizacion.findFirst({
			where: { numero: { startsWith: prefix } },
			orderBy: { numero: 'desc' }
		});

		let siguienteNumero = `${prefix}001`;
		if (ultimaCotizacion) {
			const ultimoNum = parseInt(ultimaCotizacion.numero.split('-')[2], 10);
			siguienteNumero = `${prefix}${String(ultimoNum + 1).padStart(3, '0')}`;
		}

		res.json({ siguienteNumero });
	} catch (error) {
		console.error('Error al obtener siguiente numero:', error);
		res.status(500).json({ error: 'Error al obtener siguiente numero' });
	}
});

// GET /api/cotizaciones/:id - Obtener una cotización
router.get('/:id', async (req, res) => {
	try {
		const cotizacion = await prisma.cotizacion.findUnique({
			where: { id: req.params.id },
			include: {
				cliente: true,
				conceptos: true,
				pagos: {
					orderBy: { fecha: 'desc' }
				},
				historial: {
					orderBy: { creadoEn: 'desc' }
				}
			}
		});

		if (!cotizacion) {
			return res.status(404).json({ error: 'Cotización no encontrada' });
		}

		const pagado = cotizacion.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
		const pendiente = Number(cotizacion.total) - pagado;

		res.json({ cotizacion, pagado, pendiente });
	} catch (error) {
		console.error('Error al obtener cotización:', error);
		res.status(500).json({ error: 'Error al obtener cotización' });
	}
});

// POST /api/cotizaciones - Crear cotización
router.post('/', async (req, res) => {
	try {
		const { errors, data } = validarCotizacionInput(req.body);

		if (errors.length > 0) {
			return res.status(400).json({ error: 'Datos de cotización inválidos', errors });
		}

		const cliente = await prisma.cliente.findUnique({
			where: { id: data.clienteId }
		});

		if (!cliente || !cliente.activo) {
			return res.status(400).json({ error: 'El cliente no existe o está inactivo' });
		}

		const nuevaCotizacion = await prisma.cotizacion.create({
			data: {
				numero: data.numero,
				clienteId: data.clienteId,
				fecha: data.fecha,
				vencimiento: data.vencimiento,
				subtotal: data.subtotal,
				iva: data.iva,
				total: data.total,
				notas: data.notas,
				estado: data.estado,
				conceptos: {
					create: data.conceptos
				}
			},
			include: {
				cliente: true,
				conceptos: true
			}
		});

		// Crear registro en historial
		await prisma.historialCot.create({
			data: {
				cotizacionId: nuevaCotizacion.id,
				estadoNuevo: data.estado,
				nota: 'Cotización creada'
			}
		});

		if (data.estado === 'ENVIADA') {
			await enviarCorreoCotizacion(nuevaCotizacion);
		}

		res.json(nuevaCotizacion);
	} catch (error) {
		console.error('Error al crear cotización:', error);
		res.status(500).json({ error: 'Error al crear cotización' });
	}
});

// PUT /api/cotizaciones/:id - Editar cotizacion en borrador
router.put('/:id', async (req, res) => {
	try {
		const { errors, data } = validarCotizacionInput({ ...req.body, estado: 'BORRADOR' });

		if (errors.length > 0) {
			return res.status(400).json({ error: 'Datos de cotizacion invalidos', errors });
		}

		const cotizacion = await prisma.cotizacion.findUnique({
			where: { id: req.params.id },
			include: { conceptos: true }
		});

		if (!cotizacion) {
			return res.status(404).json({ error: 'Cotizacion no encontrada' });
		}

		if (cotizacion.estado !== 'BORRADOR') {
			return res.status(400).json({ error: 'Solo se pueden editar cotizaciones en borrador' });
		}

		const cliente = await prisma.cliente.findUnique({
			where: { id: data.clienteId }
		});

		if (!cliente || !cliente.activo) {
			return res.status(400).json({ error: 'El cliente no existe o esta inactivo' });
		}

		const actualizada = await prisma.$transaction(async (tx) => {
			await tx.concepto.deleteMany({
				where: { cotizacionId: req.params.id }
			});

			return tx.cotizacion.update({
				where: { id: req.params.id },
				data: {
					numero: data.numero,
					clienteId: data.clienteId,
					fecha: data.fecha,
					vencimiento: data.vencimiento,
					subtotal: data.subtotal,
					iva: data.iva,
					total: data.total,
					notas: data.notas,
					conceptos: {
						create: data.conceptos
					}
				},
				include: {
					cliente: true,
					conceptos: true,
					pagos: true,
					historial: {
						orderBy: { creadoEn: 'desc' }
					}
				}
			});
		});

		await prisma.historialCot.create({
			data: {
				cotizacionId: req.params.id,
				estadoNuevo: 'BORRADOR',
				nota: 'Cotizacion en borrador actualizada'
			}
		});

		res.json({ cotizacion: actualizada });
	} catch (error) {
		console.error('Error al editar cotizacion:', error);
		res.status(500).json({ error: 'Error al editar cotizacion' });
	}
});

// PUT /api/cotizaciones/:id/estado - Cambiar estado
router.put('/:id/estado', async (req, res) => {
	try {
		const estado = typeof req.body.estado === 'string' ? req.body.estado.trim().toUpperCase() : '';

		if (!ESTADOS_COTIZACION.includes(estado)) {
			return res.status(400).json({ error: 'Estado de cotización inválido' });
		}

		// Obtener estado actual con datos completos
		const cotizacion = await prisma.cotizacion.findUnique({
			where: { id: req.params.id },
			include: {
				cliente: true,
				conceptos: true,
				pagos: true
			}
		});

		if (!cotizacion) {
			return res.status(404).json({ error: 'Cotización no encontrada' });
		}

		if (!tieneTransicionPermitida(cotizacion.estado, estado)) {
			return res.status(400).json({
				error: `Transición de estado no permitida: ${cotizacion.estado} -> ${estado}`
			});
		}

		if (estado === 'PAGADA') {
			const pagado = cotizacion.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
			const pendiente = Number(cotizacion.total) - pagado;

			if (pendiente > 0) {
				return res.status(400).json({ error: 'No se puede marcar como PAGADA mientras exista saldo pendiente' });
			}
		}

		// Actualizar estado
		const actualizada = await prisma.cotizacion.update({
			where: { id: req.params.id },
			data: { estado },
			include: {
				cliente: true,
				conceptos: true,
				pagos: true,
				historial: {
					orderBy: { creadoEn: 'desc' }
				}
			}
		});

		// Crear registro en historial
		await prisma.historialCot.create({
			data: {
				cotizacionId: req.params.id,
				estadoAnterior: cotizacion.estado,
				estadoNuevo: estado,
				nota: `Estado cambiado de ${cotizacion.estado} a ${estado}`
			}
		});

		if (['ENVIADA', 'APROBADA', 'FACTURADA'].includes(estado)) {
			await enviarCorreoCotizacion(actualizada);
		}

		res.json({ cotizacion: actualizada });
	} catch (error) {
		console.error('Error al cambiar estado:', error);
		res.status(500).json({ error: 'Error al cambiar estado' });
	}
});

// POST /api/cotizaciones/:id/pagos - Registrar pago
router.post('/:id/pagos', async (req, res) => {
	try {
		const { errors, data } = validarPagoInput(req.body);

		if (errors.length > 0) {
			return res.status(400).json({ error: 'Datos de pago inválidos', errors });
		}

		const cotizacionExistente = await prisma.cotizacion.findUnique({
			where: { id: req.params.id },
			include: { pagos: true }
		});

		if (!cotizacionExistente) {
			return res.status(404).json({ error: 'Cotización no encontrada' });
		}

		if (cotizacionExistente.estado !== 'FACTURADA') {
			return res.status(400).json({ error: 'Solo se pueden registrar pagos en cotizaciones facturadas' });
		}

		const pagadoActual = cotizacionExistente.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
		const pendienteActual = Number(cotizacionExistente.total) - pagadoActual;

		if (data.monto > pendienteActual) {
			return res.status(400).json({ error: 'El pago no puede ser mayor al saldo pendiente' });
		}

		const nuevoPago = await prisma.pago.create({
			data: {
				cotizacionId: req.params.id,
				monto: data.monto,
				fecha: data.fecha,
				metodo: data.metodo,
				referencia: data.referencia
			}
		});

		// Obtener cotización actualizada
		const cotizacion = await prisma.cotizacion.findUnique({
			where: { id: req.params.id },
			include: {
				cliente: true,
				conceptos: true,
				pagos: true
			}
		});

		// Calcular nuevos totales
		const pagado = cotizacion.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
		const pendiente = Number(cotizacion.total) - pagado;

		// Si el saldo es 0, cambiar estado a PAGADA
		if (pendiente === 0 && cotizacion.estado !== 'PAGADA') {
			await prisma.cotizacion.update({
				where: { id: req.params.id },
				data: { estado: 'PAGADA' }
			});

			await prisma.historialCot.create({
				data: {
					cotizacionId: req.params.id,
					estadoAnterior: cotizacion.estado,
					estadoNuevo: 'PAGADA',
					nota: 'Estado cambiado a PAGADA automáticamente (saldo liquidado)'
				}
			});

			cotizacion.estado = 'PAGADA';
		}

		res.json({ cotizacion, pagado, pendiente });
	} catch (error) {
		console.error('Error al registrar pago:', error);
		res.status(500).json({ error: 'Error al registrar pago' });
	}
});

module.exports = router;
