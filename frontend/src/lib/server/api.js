import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

const apiBaseUrl = env.API_URL || env.PUBLIC_API_URL || 'http://localhost:3001';

export async function apiGet(path, fetchFn = fetch) {
	const response = await fetchFn(`${apiBaseUrl}${path}`);

	if (!response.ok) {
		error(response.status, `Error al consultar ${path}`);
	}

	return response.json();
}
