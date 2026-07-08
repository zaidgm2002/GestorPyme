<script>
	import { dismissToast, toasts } from '$lib/toast.js';

	const typeClasses = {
		success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
		error: 'border-red-200 bg-red-50 text-red-950',
		warning: 'border-amber-200 bg-amber-50 text-amber-950',
		info: 'border-teal-200 bg-teal-50 text-teal-950'
	};
</script>

<div class="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-3 px-3 sm:items-end sm:px-6">
	{#each $toasts as item (item.id)}
		<div class="pointer-events-auto w-full max-w-md rounded-lg border p-4 shadow-lg {typeClasses[item.type] || typeClasses.info}">
			<div class="flex items-start gap-3">
				<div class="flex-1">
					<p class="font-semibold">{item.title}</p>
					{#if item.message}
						<p class="mt-1 text-sm opacity-80">{item.message}</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-md px-2 text-lg leading-none opacity-60 hover:bg-white/60 hover:opacity-100"
					aria-label="Cerrar notificacion"
					onclick={() => (item.actions?.[0]?.handler ? item.actions[0].handler() : dismissToast(item.id))}
				>
					x
				</button>
			</div>

			{#if item.actions?.length}
				<div class="mt-4 flex justify-end gap-2">
					{#each item.actions as action}
						<button
							type="button"
							class="rounded-md px-3 py-2 text-sm font-medium transition {action.style === 'primary'
								? 'bg-teal-700 text-white hover:bg-teal-800'
								: 'border border-slate-200 bg-white/80 text-slate-700 hover:bg-white'}"
							onclick={action.handler}
						>
							{action.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
