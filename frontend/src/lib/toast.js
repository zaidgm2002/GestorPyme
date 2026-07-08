import { writable } from 'svelte/store';

export const toasts = writable([]);

function removeToast(id) {
	toasts.update((items) => items.filter((item) => item.id !== id));
}

export function dismissToast(id) {
	removeToast(id);
}

export function toast({ title, message = '', type = 'info', timeout = 4200, actions = [] }) {
	const id = crypto.randomUUID();

	toasts.update((items) => [
		...items,
		{ id, title, message, type, actions }
	]);

	if (timeout > 0) {
		setTimeout(() => removeToast(id), timeout);
	}

	return id;
}

export function confirmToast({ title, message = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', type = 'warning' }) {
	return new Promise((resolve) => {
		const id = crypto.randomUUID();

		const close = (value) => {
			removeToast(id);
			resolve(value);
		};

		toasts.update((items) => [
			...items,
			{
				id,
				title,
				message,
				type,
				actions: [
					{ label: cancelLabel, style: 'secondary', handler: () => close(false) },
					{ label: confirmLabel, style: 'primary', handler: () => close(true) }
				]
			}
		]);
	});
}
