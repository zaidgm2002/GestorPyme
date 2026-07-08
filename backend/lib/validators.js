const ESTADOS_COTIZACION = ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'FACTURADA', 'PAGADA'];
const ESTADOS_CREACION = ['BORRADOR', 'ENVIADA'];
const METODOS_PAGO = ['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA'];

const TRANSICIONES_ESTADO = {
	BORRADOR: ['ENVIADA'],
	ENVIADA: ['APROBADA', 'RECHAZADA'],
	APROBADA: ['FACTURADA'],
	RECHAZADA: [],
	FACTURADA: ['PAGADA'],
	PAGADA: []
};

function normalizarTexto(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function validarEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarTexto(value));
}

function validarRFC(value) {
	const rfc = normalizarTexto(value).toUpperCase();
	return !rfc || /^[A-Z0-9Ñ&]{12,13}$/.test(rfc);
}

function numeroPositivo(value) {
	const number = Number(value);
	return Number.isFinite(number) && number > 0;
}

function numeroNoNegativo(value) {
	const number = Number(value);
	return Number.isFinite(number) && number >= 0;
}

function fechaValida(value) {
	return value && !Number.isNaN(new Date(value).getTime());
}

function tieneTransicionPermitida(estadoActual, estadoNuevo) {
	return (TRANSICIONES_ESTADO[estadoActual] || []).includes(estadoNuevo);
}

function validarClienteInput(body) {
	const errors = [];
	const nombre = normalizarTexto(body.nombre);
	const correo = normalizarTexto(body.correo);
	const rfc = normalizarTexto(body.rfc).toUpperCase();

	if (!nombre) errors.push('El nombre es obligatorio');
	if (!correo) errors.push('El correo es obligatorio');
	if (correo && !validarEmail(correo)) errors.push('El correo no tiene un formato válido');
	if (!validarRFC(rfc)) errors.push('El RFC debe tener 12 o 13 caracteres alfanuméricos');

	return {
		errors,
		data: {
			nombre,
			empresa: normalizarTexto(body.empresa) || null,
			rfc: rfc || null,
			correo,
			telefono: normalizarTexto(body.telefono) || null,
			direccion: normalizarTexto(body.direccion) || null,
			notas: normalizarTexto(body.notas) || null
		}
	};
}

function validarCotizacionInput(body) {
	const errors = [];
	const estado = normalizarTexto(body.estado || 'BORRADOR').toUpperCase();
	const conceptos = Array.isArray(body.conceptos) ? body.conceptos : [];

	if (!normalizarTexto(body.numero)) errors.push('El número de cotización es obligatorio');
	if (!normalizarTexto(body.clienteId)) errors.push('El cliente es obligatorio');
	if (!fechaValida(body.fecha)) errors.push('La fecha es obligatoria y debe ser válida');
	if (body.vencimiento && !fechaValida(body.vencimiento)) errors.push('La fecha de vencimiento debe ser válida');
	if (!ESTADOS_CREACION.includes(estado)) errors.push('Una cotización solo puede crearse como BORRADOR o ENVIADA');
	if (!numeroNoNegativo(body.subtotal)) errors.push('El subtotal debe ser un número no negativo');
	if (!numeroNoNegativo(body.iva)) errors.push('El IVA debe ser un número no negativo');
	if (!numeroPositivo(body.total)) errors.push('El total debe ser mayor a cero');
	if (conceptos.length === 0) errors.push('Debe agregar al menos un concepto');

	const conceptosValidos = conceptos.map((concepto, index) => {
		const descripcion = normalizarTexto(concepto.descripcion);
		const cantidad = Number(concepto.cantidad);
		const precioUnitario = Number(concepto.precioUnitario);

		if (!descripcion) errors.push(`El concepto ${index + 1} requiere descripción`);
		if (!numeroPositivo(cantidad)) errors.push(`El concepto ${index + 1} requiere cantidad mayor a cero`);
		if (!numeroNoNegativo(precioUnitario)) errors.push(`El concepto ${index + 1} requiere precio unitario no negativo`);

		return {
			descripcion,
			cantidad,
			precioUnitario,
			subtotal: cantidad * precioUnitario
		};
	});

	return {
		errors,
		data: {
			numero: normalizarTexto(body.numero),
			clienteId: normalizarTexto(body.clienteId),
			fecha: new Date(body.fecha),
			vencimiento: body.vencimiento ? new Date(body.vencimiento) : null,
			subtotal: Number(body.subtotal),
			iva: Number(body.iva),
			total: Number(body.total),
			notas: normalizarTexto(body.notas) || null,
			estado,
			conceptos: conceptosValidos
		}
	};
}

function validarPagoInput(body) {
	const errors = [];
	const metodo = normalizarTexto(body.metodo).toUpperCase();

	if (!numeroPositivo(body.monto)) errors.push('El monto debe ser mayor a cero');
	if (!fechaValida(body.fecha)) errors.push('La fecha de pago es obligatoria y debe ser válida');
	if (!METODOS_PAGO.includes(metodo)) errors.push('El método de pago no es válido');

	return {
		errors,
		data: {
			monto: Number(body.monto),
			fecha: new Date(body.fecha),
			metodo,
			referencia: normalizarTexto(body.referencia) || null
		}
	};
}

module.exports = {
	ESTADOS_COTIZACION,
	METODOS_PAGO,
	tieneTransicionPermitida,
	validarClienteInput,
	validarCotizacionInput,
	validarPagoInput
};
