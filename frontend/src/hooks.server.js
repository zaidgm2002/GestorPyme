import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(async ({ event, resolve }) => {
	// Clerk middleware se manejará en el layout
	return resolve(event);
});
