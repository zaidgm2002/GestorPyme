function templateCotizacionEnviada({ cliente, cotizacion, conceptos }) {
	const formatMXN = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

	const filasConceptos = conceptos.map(c => `
		<tr>
			<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${c.descripcion}</td>
			<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${c.cantidad}</td>
			<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMXN(c.precioUnitario)}</td>
			<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMXN(c.subtotal)}</td>
		</tr>
	`).join('');

	return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
	<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
		<div style="background:#4F46E5;padding:24px 32px;">
			<h1 style="color:#ffffff;margin:0;font-size:22px;">Cotización ${cotizacion.numero}</h1>
		</div>
		<div style="padding:32px;">
			<p style="color:#374151;font-size:15px;">Estimado/a <strong>${cliente.nombre}</strong>,</p>
			<p style="color:#374151;font-size:15px;">Le enviamos la cotización <strong>${cotizacion.numero}</strong> con el siguiente desglose de servicios:</p>
			<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
				<thead>
					<tr style="background:#f3f4f6;">
						<th style="padding:10px 12px;text-align:left;color:#6b7280;">Descripción</th>
						<th style="padding:10px 12px;text-align:center;color:#6b7280;">Cant.</th>
						<th style="padding:10px 12px;text-align:right;color:#6b7280;">Precio Unit.</th>
						<th style="padding:10px 12px;text-align:right;color:#6b7280;">Subtotal</th>
					</tr>
				</thead>
				<tbody>${filasConceptos}</tbody>
			</table>
			<div style="text-align:right;margin-top:16px;padding:16px;background:#eef2ff;border-radius:6px;">
				<p style="margin:4px 0;color:#6b7280;font-size:13px;">Subtotal: ${formatMXN(cotizacion.subtotal)}</p>
				<p style="margin:4px 0;color:#6b7280;font-size:13px;">IVA (16%): ${formatMXN(cotizacion.iva)}</p>
				<p style="margin:0;color:#4F46E5;font-size:20px;font-weight:bold;">Total: ${formatMXN(cotizacion.total)}</p>
			</div>
			${cotizacion.vencimiento ? `<p style="color:#6b7280;font-size:13px;margin-top:16px;">Esta cotización tiene vigencia hasta el <strong>${new Date(cotizacion.vencimiento).toLocaleDateString('es-MX')}</strong>.</p>` : ''}
			${cotizacion.notas ? `<div style="background:#f9fafb;border-left:3px solid #4F46E5;padding:12px 16px;margin-top:16px;"><p style="margin:0;font-size:13px;color:#374151;">${cotizacion.notas}</p></div>` : ''}
		</div>
		<div style="background:#f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center;">
			<p style="margin:0;">Para cualquier duda, contáctenos al correo o teléfono del despacho.</p>
		</div>
	</div>
</body>
</html>`;
}

function templateRecordatorioPago({ cliente, cotizacion, saldoPendiente, pagado }) {
	const formatMXN = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
	const fecha = new Date(cotizacion.fecha).toLocaleDateString('es-MX');

	return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
	<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
		<div style="background:#1F2937;padding:24px 32px;">
			<h1 style="color:#ffffff;margin:0;font-size:22px;">Recordatorio de pago</h1>
		</div>
		<div style="padding:32px;">
			<p style="color:#374151;font-size:15px;">Estimado/a <strong>${cliente.nombre}</strong>,</p>
			<p style="color:#374151;font-size:15px;">Le recordamos que la cotización <strong>${cotizacion.numero}</strong>, emitida el <strong>${fecha}</strong>, tiene saldo pendiente.</p>
			<div style="background:#fef3c7;border-radius:8px;padding:24px;margin:20px 0;text-align:center;">
				<p style="margin:0;color:#92400e;font-size:13px;">Saldo pendiente</p>
				<p style="margin:8px 0 0;color:#92400e;font-size:30px;font-weight:bold;">${formatMXN(saldoPendiente)}</p>
			</div>
			<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
				<tbody>
					<tr>
						<td style="padding:8px 0;color:#6b7280;">Total</td>
						<td style="padding:8px 0;text-align:right;color:#111827;font-weight:bold;">${formatMXN(cotizacion.total)}</td>
					</tr>
					<tr>
						<td style="padding:8px 0;color:#6b7280;">Pagado</td>
						<td style="padding:8px 0;text-align:right;color:#047857;font-weight:bold;">${formatMXN(pagado)}</td>
					</tr>
					<tr>
						<td style="padding:8px 0;color:#6b7280;border-top:1px solid #e5e7eb;">Pendiente</td>
						<td style="padding:8px 0;text-align:right;color:#b45309;font-weight:bold;border-top:1px solid #e5e7eb;">${formatMXN(saldoPendiente)}</td>
					</tr>
				</tbody>
			</table>
			<p style="color:#374151;font-size:14px;">Si ya realizó el pago, puede ignorar este mensaje. Para cualquier aclaración, contáctenos respondiendo a este correo.</p>
		</div>
		<div style="background:#f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center;">
			<p style="margin:0;">Gracias por su preferencia.</p>
		</div>
	</div>
</body>
</html>`;
}

function templateCambioEstadoCotizacion({ cliente, cotizacion, estado }) {
	const formatMXN = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
	const config = {
		APROBADA: {
			titulo: 'Cotización aprobada',
			color: '#047857',
			mensaje: `La cotización ${cotizacion.numero} fue marcada como aprobada. Nuestro equipo continuará con el siguiente paso del servicio.`,
			nota: 'Gracias por confirmar la aprobación de la cotización.'
		},
		FACTURADA: {
			titulo: 'Cotización facturada',
			color: '#6D28D9',
			mensaje: `La cotización ${cotizacion.numero} fue marcada como facturada. A continuación encontrará el resumen del importe registrado.`,
			nota: 'Si requiere información adicional para el pago, puede responder a este correo.'
		}
	}[estado] || {
		titulo: 'Actualización de cotización',
		color: '#4F46E5',
		mensaje: `La cotización ${cotizacion.numero} cambió de estado a ${estado}.`,
		nota: 'Este mensaje fue generado automáticamente por GestorPyme.'
	};

	return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
	<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
		<div style="background:${config.color};padding:24px 32px;">
			<h1 style="color:#ffffff;margin:0;font-size:22px;">${config.titulo}</h1>
		</div>
		<div style="padding:32px;">
			<p style="color:#374151;font-size:15px;">Estimado/a <strong>${cliente.nombre}</strong>,</p>
			<p style="color:#374151;font-size:15px;">${config.mensaje}</p>
			<div style="background:#f9fafb;border-radius:8px;padding:18px;margin:20px 0;">
				<p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Cotización</p>
				<p style="margin:0;color:#111827;font-size:20px;font-weight:bold;">${cotizacion.numero}</p>
				<p style="margin:12px 0 0;color:#6b7280;font-size:13px;">Total</p>
				<p style="margin:0;color:${config.color};font-size:24px;font-weight:bold;">${formatMXN(cotizacion.total)}</p>
			</div>
			<p style="color:#374151;font-size:14px;">${config.nota}</p>
		</div>
		<div style="background:#f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center;">
			<p style="margin:0;">GestorPyme - Sistema de gestión de clientes, cotizaciones y cobranza.</p>
		</div>
	</div>
</body>
</html>`;
}

module.exports = {
	templateCotizacionEnviada,
	templateRecordatorioPago,
	templateCambioEstadoCotizacion
};
