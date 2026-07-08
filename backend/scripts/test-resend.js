const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const { sendEmail } = require('../lib/email.js');
const { templateCotizacionEnviada } = require('../lib/emailTemplates.js');

const to = process.argv[2] || process.env.RESEND_TEST_TO;

if (!to) {
	console.error('Missing recipient. Use: npm run test:resend -- correo@ejemplo.com');
	process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
	console.error('Missing RESEND_API_KEY');
	process.exit(1);
}

if (!process.env.FROM_EMAIL) {
	console.error('Missing FROM_EMAIL');
	process.exit(1);
}

const html = templateCotizacionEnviada({
	cliente: {
		nombre: 'Cliente de Prueba Resend',
		correo: to
	},
	cotizacion: {
		numero: `TEST-${Date.now()}`,
		subtotal: 1500,
		iva: 240,
		total: 1740,
		vencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		notas: 'Este es un correo de prueba de GestorPyme. No requiere accion.'
	},
	conceptos: [
		{
			descripcion: 'Servicio contable mensual',
			cantidad: 1,
			precioUnitario: 1500,
			subtotal: 1500
		}
	]
});

sendEmail({
	to,
	subject: 'Prueba Resend - GestorPyme',
	html
}).then((result) => {
	if (!result.ok) {
		console.error('Resend test failed:', result.error);
		process.exit(1);
	}

	console.log(`Resend test sent. id=${result.id}`);
}).catch((error) => {
	console.error('Resend test crashed:', error);
	process.exit(1);
});
