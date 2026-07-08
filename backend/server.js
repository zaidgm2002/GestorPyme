const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true });
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
	origin: process.env.FRONTEND_URL || process.env.ORIGIN || true
}));
app.use(express.json());

// Routes
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/cotizaciones', require('./routes/cotizaciones'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/cobranza', require('./routes/cobranza'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		res.json({ status: 'ok', database: 'connected' });
	} catch (error) {
		console.error('Database health check failed:', error);
		res.status(500).json({
			status: 'error',
			database: 'unavailable',
			message: error.message
		});
	}
});

app.listen(PORT, () => {
	console.log(`Backend server running on port ${PORT}`);
});
