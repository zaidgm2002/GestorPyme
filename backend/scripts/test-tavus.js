const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const required = ['TAVUS_API_KEY', 'TAVUS_PAL_ID', 'TAVUS_FACE_ID'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
	console.error(`Faltan variables de Tavus: ${missing.join(', ')}`);
	process.exit(1);
}

async function testTavus() {
	const response = await fetch('https://tavusapi.com/v2/conversations', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': process.env.TAVUS_API_KEY
		},
		body: JSON.stringify({
			pal_id: process.env.TAVUS_PAL_ID,
			face_id: process.env.TAVUS_FACE_ID,
			conversation_name: 'Prueba tecnica de GestorPyme',
			test_mode: true,
			properties: { language: 'spanish' }
		}),
		signal: AbortSignal.timeout(30_000)
	});

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(data.message || data.error || `Tavus respondio con HTTP ${response.status}`);
	}

	console.log('Conexion con Tavus verificada en test_mode.');
	console.log(`Conversation ID: ${data.conversation_id}`);
	console.log(`Status: ${data.status}`);
}

testTavus().catch((error) => {
	console.error(`La prueba de Tavus fallo: ${error.message}`);
	process.exit(1);
});
