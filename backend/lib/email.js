const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html }) {
	try {
		const { data, error } = await resend.emails.send({
			from: process.env.FROM_EMAIL,
			to: [to],
			subject,
			html
		});

		if (error) {
			console.error('[Resend] Error al enviar:', error);
			return { ok: false, error };
		}

		console.log('[Resend] Correo enviado. ID:', data.id);
		return { ok: true, id: data.id };
	} catch (err) {
		console.error('[Resend] Excepción:', err);
		return { ok: false, error: err.message };
	}
}

module.exports = { sendEmail };
