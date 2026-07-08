import { apiGet } from '$lib/server/api.js';
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const [{ cotizacion }, clientes] = await Promise.all([
		apiGet(`/api/cotizaciones/${params.id}`, fetch),
		apiGet('/api/clientes', fetch)
	]);

	if (!cotizacion) {
		error(404, 'Cotizacion no encontrada');
	}

	if (cotizacion.estado !== 'BORRADOR') {
		error(400, 'Solo se pueden editar cotizaciones en borrador');
	}

	return {
		cotizacion,
		clientes
	};
}
