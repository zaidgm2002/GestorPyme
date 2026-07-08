import { env } from '$env/dynamic/public';

const apiBaseUrl = env.PUBLIC_API_URL || 'http://localhost:3001';

export function apiPath(path) {
	return `${apiBaseUrl}${path}`;
}
