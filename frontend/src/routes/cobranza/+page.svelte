<script>
	import { apiPath } from '$lib/api.js';
	import { confirmToast, toast } from '$lib/toast.js';
	import { onMount } from 'svelte';

	let carteraPendiente = $state([]);
	let totalCartera = $state(0);
	let enviandoRecordatorio = $state(null);

	onMount(async () => {
		await cargarCobranza();
	});

	async function cargarCobranza() {
		try {
			const response = await fetch(apiPath('/api/cobranza'));
			if (response.ok) {
				const data = await response.json();
				carteraPendiente = data.carteraPendiente;
				totalCartera = data.totalCartera;
			}
		} catch (error) {
			console.error('Error al cargar cobranza:', error);
		}
	}

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	function getRowClass(dias) {
		if (dias > 30) return 'bg-red-50';
		if (dias > 15) return 'bg-yellow-50';
		return '';
	}

	function getBadgeClass(dias) {
		if (dias > 30) return 'bg-red-100 text-red-800';
		if (dias > 15) return 'bg-yellow-100 text-yellow-800';
		return 'bg-green-100 text-green-800';
	}

	function getBadgeText(dias) {
		if (dias > 30) return 'Vencido';
		if (dias > 15) return 'Próximo';
		return 'Al día';
	}
	async function enviarRecordatorio(cotizacion) {
		const confirmado = await confirmToast({
			title: 'Enviar recordatorio',
			message: `Se enviara a ${cotizacion.cliente.correo}.`,
			confirmLabel: 'Enviar'
		});
		if (!confirmado) return;

		enviandoRecordatorio = cotizacion.id;

		try {
			const response = await fetch(apiPath(`/api/cobranza/${cotizacion.id}/recordatorio`), {
				method: 'POST'
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error al enviar recordatorio');
			}

			toast({ type: 'success', title: 'Recordatorio enviado', message: `Se envio a ${data.to}.` });
		} catch (error) {
			console.error('Error al enviar recordatorio:', error);
			toast({ type: 'error', title: 'No se pudo enviar', message: error.message });
		} finally {
			enviandoRecordatorio = null;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold text-gray-900">Cobranza</h1>
	</div>

	<!-- Total cartera -->
	<div class="bg-white rounded-lg shadow p-4 sm:p-6">
		<h2 class="text-lg font-bold text-gray-900 mb-2">Cartera Pendiente Total</h2>
		<p class="text-3xl font-bold text-indigo-600">{formatMXN(totalCartera)}</p>
	</div>

	<!-- Tabla de cobranza -->
	<div class="bg-white rounded-lg shadow">
		<div class="border-b p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Cotizaciones con Saldo Pendiente</h2>
			<p class="text-sm text-gray-600">Ordenadas por antigüedad (mayor a menor)</p>
		</div>
		{#if carteraPendiente.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[980px]">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pendiente</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each carteraPendiente as cotizacion}
							<tr class={getRowClass(cotizacion.diasTranscurridos)}>
								<td class="px-6 py-4 font-medium">{cotizacion.cliente.nombre}</td>
								<td class="px-6 py-4">{cotizacion.numero}</td>
								<td class="px-6 py-4">
									{new Date(cotizacion.fecha).toLocaleDateString('es-MX')}
								</td>
								<td class="px-6 py-4">{formatMXN(cotizacion.total)}</td>
								<td class="px-6 py-4 text-green-600">{formatMXN(cotizacion.pagado)}</td>
								<td class="px-6 py-4 font-bold text-orange-600">{formatMXN(cotizacion.pendiente)}</td>
								<td class="px-6 py-4">{cotizacion.diasTranscurridos}</td>
								<td class="px-6 py-4">
									<span class="px-2 py-1 text-xs font-medium rounded-full {getBadgeClass(cotizacion.diasTranscurridos)}">
										{getBadgeText(cotizacion.diasTranscurridos)}
									</span>
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center gap-3">
										<a
											href={`/cotizaciones/${cotizacion.id}`}
											class="text-indigo-600 hover:text-indigo-900"
										>
											Ver
										</a>
										<button
											type="button"
											onclick={() => enviarRecordatorio(cotizacion)}
											disabled={enviandoRecordatorio === cotizacion.id}
											class="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
										>
											{enviandoRecordatorio === cotizacion.id ? 'Enviando...' : 'Recordatorio'}
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="p-6 text-center text-gray-500">
				<p>No hay cotizaciones con saldo pendiente</p>
			</div>
		{/if}
	</div>
</div>
