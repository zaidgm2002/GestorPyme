import { apiGet } from '$lib/server/api.js';
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const cliente = await apiGet(`/api/clientes/${params.id}`, fetch);

	if (!cliente) {
		error(404, 'Cliente no encontrado');
	}

	const totalFacturado = cliente.cotizaciones.reduce((sum, cot) => sum + Number(cot.total), 0);
	const totalCobrado = cliente.cotizaciones.reduce((sum, cot) => {
		return sum + cot.pagos.reduce((sumPag, pag) => sumPag + Number(pag.monto), 0);
	}, 0);
	const saldoPendiente = totalFacturado - totalCobrado;

	return {
		cliente,
		totalFacturado,
		totalCobrado,
		saldoPendiente
	};
}
