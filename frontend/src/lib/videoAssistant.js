import { writable } from 'svelte/store';
import { apiPath } from '$lib/api.js';
import { toast } from '$lib/toast.js';

const MAX_CALL_SECONDS = 600;
const initialState = { loading: false, ending: false, conversationId: null, conversationUrl: null, error: '', remainingSeconds: MAX_CALL_SECONDS, minimized: false, historyVersion: 0 };
const store = writable(initialState);
let timer;
let current = initialState;
store.subscribe((value) => (current = value));
const update = (values) => store.update((state) => ({ ...state, ...values }));

function startTimer() {
	clearInterval(timer);
	update({ remainingSeconds: MAX_CALL_SECONDS });
	timer = setInterval(() => {
		const next = Math.max(0, current.remainingSeconds - 1);
		update({ remainingSeconds: next });
		if (next === 0) {
			clearInterval(timer);
			endConversation();
		}
	}, 1000);
}

async function startConversation() {
	if (current.loading || current.conversationId) return;
	update({ loading: true, error: '', minimized: false });
	try {
		const response = await fetch(apiPath('/api/tavus/conversations'), { method: 'POST' });
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(data.error || 'No fue posible iniciar la conversación.');
		update({ conversationId: data.conversationId, conversationUrl: data.conversationUrl, historyVersion: current.historyVersion + 1 });
		startTimer();
	} catch (value) {
		const message = value.message || 'No fue posible iniciar la conversación.';
		update({ error: message });
		toast({ title: 'Asistente no disponible', message, type: 'error' });
	} finally {
		update({ loading: false });
	}
}

async function endConversation({ notify = true } = {}) {
	if (!current.conversationId || current.ending) return;
	const id = current.conversationId;
	update({ ending: true });
	try {
		const response = await fetch(apiPath(`/api/tavus/conversations/${id}/end`), { method: 'POST', keepalive: !notify });
		if (!response.ok && response.status !== 404) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || 'No fue posible finalizar la conversación.');
		}
		if (notify) toast({ title: 'Conversación finalizada', type: 'success' });
	} catch (value) {
		if (notify) toast({ title: 'No se pudo confirmar el cierre', message: value.message, type: 'warning' });
	} finally {
		clearInterval(timer);
		store.set({ ...initialState, historyVersion: current.historyVersion + 1 });
	}
}

export const videoAssistant = {
	subscribe: store.subscribe,
	start: startConversation,
	end: endConversation,
	setMinimized: (minimized) => update({ minimized })
};
