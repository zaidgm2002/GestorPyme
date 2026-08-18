<script>
	import { apiPath } from '$lib/api.js';
	import { page } from '$app/stores';

	let open = $state(false);
	let input = $state('');
	let loading = $state(false);
	let messages = $state([
		{ role: 'assistant', content: 'Hola, soy el asistente de GestorPyme. Puedo orientarte y ayudarte a encontrar opciones.' }
	]);
	let messageList = $state();

	const routeLabels = {
		'/dashboard': 'Ir al Dashboard',
		'/clientes': 'Ir a Clientes',
		'/cotizaciones': 'Ir a Cotizaciones',
		'/cotizaciones/nueva': 'Crear cotizacion',
		'/cobranza': 'Ir a Cobranza'
	};

	async function sendMessage() {
		const question = input.trim();
		if (!question || loading) return;

		messages = [...messages, { role: 'user', content: question }];
		input = '';
		loading = true;
		setTimeout(() => messageList?.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' }));

		try {
			const response = await fetch(apiPath('/api/asistente'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					messages: messages.map(({ role, content }) => ({ role, content })),
					currentPath: $page.url.pathname
				})
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'No se pudo obtener una respuesta.');
			messages = [...messages, {
				role: 'assistant',
				content: data.message,
				suggestedPath: data.suggestedPath
			}];
		} catch (error) {
			messages = [...messages, { role: 'error', content: error.message }];
		} finally {
			loading = false;
			setTimeout(() => messageList?.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' }));
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<div class="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
	{#if open}
		<section class="mb-3 flex h-[min(38rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" aria-label="Asistente de GestorPyme">
			<header class="flex items-center justify-between bg-teal-800 px-4 py-3 text-white">
				<div>
					<p class="font-semibold">Asistente GestorPyme</p>
					<p class="text-xs text-teal-100">Impulsado por Claude</p>
				</div>
				<button type="button" class="rounded-md p-2 hover:bg-teal-700" onclick={() => (open = false)} aria-label="Cerrar asistente">✕</button>
			</header>

			<div bind:this={messageList} class="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
				{#each messages as message}
					<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm {message.role === 'user' ? 'bg-teal-700 text-white' : message.role === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-slate-200 bg-white text-slate-700'}">
							{message.content}
							{#if message.suggestedPath && routeLabels[message.suggestedPath]}
								<a href={message.suggestedPath} class="mt-2 block rounded-md bg-teal-50 px-3 py-2 text-center font-semibold text-teal-800 hover:bg-teal-100">
									{routeLabels[message.suggestedPath]} →
								</a>
							{/if}
						</div>
					</div>
				{/each}
				{#if loading}
					<div class="text-sm text-slate-500">Claude esta pensando…</div>
				{/if}
			</div>

			<div class="border-t border-slate-200 bg-white p-3">
				<div class="flex items-end gap-2">
					<textarea bind:value={input} onkeydown={handleKeydown} rows="2" maxlength="4000" placeholder="¿En que te ayudo?" class="min-h-11 flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none" disabled={loading}></textarea>
					<button type="button" onclick={sendMessage} disabled={loading || !input.trim()} class="h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">Enviar</button>
				</div>
				<p class="mt-2 text-center text-[11px] text-slate-400">Verifica informacion importante antes de actuar.</p>
			</div>
		</section>
	{/if}

	<button type="button" onclick={() => (open = !open)} class="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-800 text-white shadow-lg transition hover:bg-teal-900 focus:outline-none focus:ring-4 focus:ring-teal-200" aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'} aria-expanded={open}>
		{#if open}<span class="text-xl">✕</span>{:else}<span class="text-xl font-bold">AI</span>{/if}
	</button>
</div>
