const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma.js');

// DELETE /api/pagos/:id - Eliminar pago
router.delete('/:id', async (req, res) => {
	try {
		// Obtener pago para saber la cotización
		const pago = await prisma.pago.findUnique({
			where: { id: req.params.id },
			include: { cotizacion: true }
		});

		if (!pago) {
			return res.status(404).json({ error: 'Pago no encontrado' });
		}

		// No permitir eliminar si la cotización está pagada
		if (pago.cotizacion.estado === 'PAGADA') {
			return res.status(400).json({ error: 'No se puede eliminar pago de una cotización pagada' });
		}

		// Eliminar pago
		await prisma.pago.delete({
			where: { id: req.params.id }
		});

		// Obtener cotización actualizada
		const cotizacion = await prisma.cotizacion.findUnique({
			where: { id: pago.cotizacionId },
			include: {
				cliente: true,
				conceptos: true,
				pagos: true
			}
		});

		// Calcular nuevos totales
		const pagado = cotizacion.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
		const pendiente = Number(cotizacion.total) - pagado;

		res.json({ cotizacion, pagado, pendiente });
	} catch (error) {
		console.error('Error al eliminar pago:', error);
		res.status(500).json({ error: 'Error al eliminar pago' });
	}
});

module.exports = router;
