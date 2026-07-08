const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma.js');
const { validarClienteInput } = require('../lib/validators.js');

// GET /api/clientes - Obtener todos los clientes
router.get('/', async (req, res) => {
	try {
		const orderBy = req.query.orderBy === 'nombre'
			? { nombre: 'asc' }
			: { creadoEn: 'desc' };

		const incluirInactivos = req.query.incluirInactivos === 'true';

		const clientes = await prisma.cliente.findMany({
			where: incluirInactivos ? {} : { activo: true },
			orderBy
		});
		res.json(clientes);
	} catch (error) {
		console.error('Error al obtener clientes:', error);
		res.status(500).json({ error: 'Error al obtener clientes' });
	}
});

// GET /api/clientes/:id - Obtener un cliente
router.get('/:id', async (req, res) => {
	try {
		const cliente = await prisma.cliente.findUnique({
			where: { id: req.params.id },
			include: {
				cotizaciones: {
					include: { pagos: true },
					orderBy: { fecha: 'desc' }
				}
			}
		});

		if (!cliente) {
			return res.status(404).json({ error: 'Cliente no encontrado' });
		}

		res.json(cliente);
	} catch (error) {
		console.error('Error al obtener cliente:', error);
		res.status(500).json({ error: 'Error al obtener cliente' });
	}
});

// POST /api/clientes - Crear cliente
router.post('/', async (req, res) => {
	try {
		const { errors, data } = validarClienteInput(req.body);

		if (errors.length > 0) {
			return res.status(400).json({ error: 'Datos de cliente inválidos', errors });
		}

		const nuevoCliente = await prisma.cliente.create({
			data
		});
		res.json(nuevoCliente);
	} catch (error) {
		console.error('Error al crear cliente:', error);
		res.status(500).json({ error: 'Error al crear cliente' });
	}
});

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', async (req, res) => {
	try {
		const { errors, data } = validarClienteInput(req.body);

		if (errors.length > 0) {
			return res.status(400).json({ error: 'Datos de cliente inválidos', errors });
		}

		const clienteActualizado = await prisma.cliente.update({
			where: { id: req.params.id },
			data
		});
		res.json(clienteActualizado);
	} catch (error) {
		console.error('Error al actualizar cliente:', error);
		res.status(500).json({ error: 'Error al actualizar cliente' });
	}
});

// DELETE /api/clientes/:id - Desactivar cliente
router.delete('/:id', async (req, res) => {
	try {
		await prisma.cliente.update({
			where: { id: req.params.id },
			data: { activo: false }
		});
		res.json({ success: true });
	} catch (error) {
		console.error('Error al desactivar cliente:', error);
		res.status(500).json({ error: 'Error al desactivar cliente' });
	}
});

module.exports = router;
