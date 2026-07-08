import { apiGet } from '$lib/server/api.js';
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const { cotizacion, pagado, pendiente } = await apiGet(`/api/cotizaciones/${params.id}`, fetch);

	if (!cotizacion) {
		error(404, 'Cotizacion no encontrada');
	}

	return {
		cotizacion,
		pagado,
		pendiente
	};
}
