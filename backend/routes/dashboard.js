const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma.js');

router.get('/', async (req, res) => {
	try {
		const ahora = new Date();
		const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

		const cotizacionesMes = await prisma.cotizacion.findMany({
			where: {
				estado: { not: 'BORRADOR' },
				creadoEn: { gte: inicioMes }
			}
		});
		const totalFacturado = cotizacionesMes.reduce((s, c) => s + Number(c.total), 0);

		const pagosMes = await prisma.pago.findMany({
			where: { fecha: { gte: inicioMes } }
		});
		const totalCobrado = pagosMes.reduce((s, p) => s + Number(p.monto), 0);

		const cotsPendientes = await prisma.cotizacion.findMany({
			where: { estado: 'FACTURADA' },
			include: { pagos: true }
		});
		const carteraPendiente = cotsPendientes.reduce((s, c) => {
			const pagado = c.pagos.reduce((sp, p) => sp + Number(p.monto), 0);
			return s + (Number(c.total) - pagado);
		}, 0);

		const cotsActivas = await prisma.cotizacion.count({
			where: { estado: { in: ['ENVIADA', 'APROBADA', 'FACTURADA'] } }
		});

		const ingresosPorMes = [];
		for (let i = 5; i >= 0; i--) {
			const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
			const finMes = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0);
			const pagos = await prisma.pago.findMany({
				where: {
					fecha: { gte: fecha, lte: finMes }
				}
			});

			ingresosPorMes.push({
				mes: fecha.toLocaleDateString('es-MX', { month: 'short' }),
				total: pagos.reduce((s, p) => s + Number(p.monto), 0)
			});
		}

		const cotsPorEstado = await prisma.cotizacion.groupBy({
			by: ['estado'],
			_count: true
		});

		const ultimasCots = await prisma.cotizacion.findMany({
			include: { cliente: true },
			orderBy: { creadoEn: 'desc' },
			take: 5
		});

		const topClientes = await prisma.cliente.findMany({
			where: { activo: true },
			include: {
				cotizaciones: {
					where: { estado: 'FACTURADA' },
					include: { pagos: true }
				}
			}
		});

		const clientesConSaldo = topClientes
			.map(cliente => {
				const saldo = cliente.cotizaciones.reduce((s, c) => {
					const pagado = c.pagos.reduce((sp, p) => sp + Number(p.monto), 0);
					return s + (Number(c.total) - pagado);
				}, 0);
				return { ...cliente, saldo };
			})
			.filter(c => c.saldo > 0)
			.sort((a, b) => b.saldo - a.saldo)
			.slice(0, 3);

		res.json({
			totalFacturado,
			totalCobrado,
			carteraPendiente,
			cotsActivas,
			ingresosPorMes,
			cotsPorEstado,
			ultimasCots,
			topClientes: clientesConSaldo
		});
	} catch (error) {
		console.error('Error al obtener dashboard:', error);
		res.json({
			totalFacturado: 0,
			totalCobrado: 0,
			carteraPendiente: 0,
			cotsActivas: 0,
			ingresosPorMes: [],
			cotsPorEstado: [],
			ultimasCots: [],
			topClientes: []
		});
	}
});

module.exports = router;
