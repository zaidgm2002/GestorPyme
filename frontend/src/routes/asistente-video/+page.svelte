<script>
	import { onMount } from 'svelte';
	import { apiPath } from '$lib/api.js';
	import { videoAssistant } from '$lib/videoAssistant.js';

	let history = $state([]);
	let historyLoading = $state(true);
	let historyError = $state('');

	async function loadHistory() {
		historyLoading = true;
		historyError = '';
		try {
			const response = await fetch(apiPath('/api/tavus/conversations/history?limit=10'));
			const data = await response.json().catch(() => []);
			if (!response.ok) throw new Error(data.error || 'No fue posible consultar el historial.');
			history = data;
		} catch (value) {
			historyError = value.message || 'No fue posible consultar el historial.';
		} finally {
			historyLoading = false;
		}
	}

	function formatDate(value) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('es-MX', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'America/Mexico_City'
		}).format(new Date(value));
	}

	function formatDuration(seconds) {
		if (!Number.isInteger(seconds)) return 'En curso';
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	}

	onMount(() => {
		loadHistory();
		let previousVersion = $videoAssistant.historyVersion;
		return videoAssistant.subscribe((state) => {
			if (state.historyVersion !== previousVersion) {
				previousVersion = state.historyVersion;
				loadHistory();
			}
		});
	});
</script>

<svelte:head><title>Asistente virtual | GestorPyme</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-6">
	<section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
			<div>
				<span class="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">Conversación con IA</span>
				<h1 class="mt-4 text-3xl font-bold text-slate-950">Asistente virtual de GestorPyme</h1>
				<p class="mt-3 max-w-2xl text-slate-600">Conversa con un asistente que puede orientarte mientras navegas por clientes, cotizaciones, pagos, dashboard y cobranza.</p>
			</div>
			<div class="rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm text-teal-950">
				<p class="font-semibold">Antes de comenzar</p>
				<ul class="mt-3 list-disc space-y-2 pl-5 text-teal-900">
					<li>Permite el acceso al micrófono y la cámara.</li>
					<li>Evita compartir contraseñas o información bancaria.</li>
					<li>La conversación tiene una duración máxima de 10 minutos.</li>
					<li>Minimiza el panel para consultar otros módulos sin terminar la llamada.</li>
				</ul>
			</div>
		</div>
	</section>

	<section class="flex min-h-80 flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center sm:px-10 sm:py-16">
		<div class="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-800">AI</div>
		{#if $videoAssistant.conversationUrl}
			<h2 class="text-xl font-bold text-slate-950">La conversación continúa activa</h2>
			<p class="max-w-xl text-sm leading-6 text-slate-600">Usa el panel flotante para conversar o minimizarlo mientras recorres GestorPyme.</p>
			<button type="button" onclick={() => videoAssistant.setMinimized(false)} class="rounded-md bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-600">Abrir panel de video</button>
		{:else}
			<h2 class="text-xl font-bold text-slate-950">Inicia una nueva conversación</h2>
			<p class="max-w-xl text-sm leading-6 text-slate-600">El asistente recibe un resumen operativo de solo lectura y no puede modificar información.</p>
			{#if $videoAssistant.error}<p class="max-w-xl rounded-md bg-red-50 p-3 text-sm text-red-700">{$videoAssistant.error}</p>{/if}
			<button type="button" disabled={$videoAssistant.loading} onclick={() => videoAssistant.start()} class="rounded-md bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60">{$videoAssistant.loading ? 'Conectando con Tavus...' : 'Iniciar conversación por video'}</button>
		{/if}
	</section>

	<section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 px-6 py-5">
			<h2 class="text-lg font-bold text-slate-950">Historial de conversaciones</h2>
			<p class="mt-1 text-sm text-slate-600">Registro operativo de las últimas sesiones en horario de Ciudad de México. No se almacenan audio ni video.</p>
		</div>
		{#if historyLoading}
			<p class="p-6 text-sm text-slate-500">Cargando historial...</p>
		{:else if historyError}
			<div class="p-6"><p class="text-sm text-amber-700">{historyError}</p><button type="button" onclick={loadHistory} class="mt-3 text-sm font-semibold text-teal-700">Reintentar</button></div>
		{:else if history.length === 0}
			<p class="p-6 text-sm text-slate-500">Todavía no hay conversaciones registradas.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-6 py-3">Inicio</th><th class="px-6 py-3">Estado</th><th class="px-6 py-3">Duración</th><th class="px-6 py-3">Cierre</th></tr></thead>
					<tbody class="divide-y divide-slate-100">
						{#each history as item}
							<tr>
								<td class="whitespace-nowrap px-6 py-4">{formatDate(item.iniciadaEn)}</td>
								<td class="px-6 py-4"><span class="rounded-full px-2.5 py-1 text-xs font-semibold {item.estado === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-700' : item.estado === 'ERROR' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}">{item.estado}</span></td>
								<td class="px-6 py-4">{formatDuration(item.duracionSegundos)}</td>
								<td class="px-6 py-4">{item.motivoCierre || '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
