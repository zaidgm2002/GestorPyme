<script>
	import { onDestroy } from 'svelte';
	import { videoAssistant } from '$lib/videoAssistant.js';
	let remainingTime = $derived(`${Math.floor($videoAssistant.remainingSeconds / 60)}:${String($videoAssistant.remainingSeconds % 60).padStart(2, '0')}`);
	onDestroy(() => {
		if ($videoAssistant.conversationId) videoAssistant.end({ notify: false });
	});
</script>

{#if $videoAssistant.conversationUrl}
	<section class="fixed right-4 z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl {$videoAssistant.minimized ? 'bottom-20 w-80' : 'bottom-4 h-[min(720px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))]'}" aria-label="Conversación activa con el asistente virtual">
		<div class="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 text-white">
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold">Asistente virtual · {remainingTime}</p>
				<p class="truncate text-xs text-slate-300">{$videoAssistant.minimized ? 'La conversación continúa en segundo plano.' : 'Puedes navegar por todo GestorPyme.'}</p>
			</div>
			<div class="flex shrink-0 gap-2">
				<button type="button" onclick={() => videoAssistant.setMinimized(!$videoAssistant.minimized)} class="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-800">{$videoAssistant.minimized ? 'Abrir' : 'Minimizar'}</button>
				<button type="button" disabled={$videoAssistant.ending} onclick={() => videoAssistant.end()} class="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500 disabled:opacity-60">{$videoAssistant.ending ? 'Finalizando...' : 'Finalizar'}</button>
			</div>
		</div>
		<iframe
			title="Conversación con el asistente virtual de GestorPyme"
			src={$videoAssistant.conversationUrl}
			allow="camera; microphone; fullscreen; display-capture; autoplay"
			aria-hidden={$videoAssistant.minimized}
			class="border-0 {$videoAssistant.minimized
				? 'pointer-events-none absolute h-px w-px opacity-0'
				: 'h-[calc(100%-65px)] w-full'}"
		></iframe>
	</section>
{/if}
