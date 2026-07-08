<script>
	import { apiPath } from '$lib/api.js';
	import { confirmToast, toast } from '$lib/toast.js';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let { data } = $props();

	let cliente = $state(null);
	let totalFacturado = $state(0);
	let totalCobrado = $state(0);
	let saldoPendiente = $state(0);

	$effect(() => {
		cliente = data.cliente;
		totalFacturado = data.totalFacturado;
		totalCobrado = data.totalCobrado;
		saldoPendiente = data.saldoPendiente;
	});

	onMount(async () => {
		await cargarCliente();
	});

	async function cargarCliente() {
		try {
			const response = await fetch(apiPath(`/api/clientes/${$page.params.id}`));
			if (response.ok) {
				const data = await response.json();
				cliente = data;

				// Calcular totales
				totalFacturado = cliente.cotizaciones.reduce((sum, c) => sum + Number(c.total), 0);
				totalCobrado = cliente.cotizaciones.reduce((sum, c) => {
					return sum + c.pagos.reduce((sp, p) => sp + Number(p.monto), 0);
				}, 0);
				saldoPendiente = totalFacturado - totalCobrado;
			}
		} catch (error) {
			console.error('Error al cargar cliente:', error);
		}
	}

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	async function desactivarCliente() {
		const confirmado = await confirmToast({
			title: 'Desactivar cliente',
			message: 'El cliente dejara de aparecer en la lista principal, pero conservara su historial.',
			confirmLabel: 'Desactivar',
			type: 'warning'
		});
		if (!confirmado) return;

		try {
			const response = await fetch(apiPath(`/api/clientes/${cliente.id}`), {
				method: 'DELETE'
			});
			if (response.ok) {
				toast({ type: 'success', title: 'Cliente desactivado' });
				window.location.href = '/clientes';
			} else {
				const data = await response.json().catch(() => ({}));
				toast({ type: 'error', title: 'No se pudo desactivar', message: data.error || 'Intentalo nuevamente.' });
			}
		} catch (error) {
			console.error('Error al desactivar cliente:', error);
			toast({ type: 'error', title: 'Error al desactivar', message: 'Ocurrio un problema al conectar con el servidor.' });
		}
	}
</script>

{#if !cliente}
	<div class="p-6 text-gray-500">Cargando cliente...</div>
{:else}
<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
			{#if cliente.empresa}
				<p class="text-gray-600">{cliente.empresa}</p>
			{/if}
		</div>
		<button 
			onclick={desactivarCliente}
			class="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition sm:w-auto"
		>
			Desactivar Cliente
		</button>
	</div>

	<!-- KPIs -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Total Facturado</h3>
			<p class="text-2xl font-bold text-gray-900">{formatMXN(totalFacturado)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Total Cobrado</h3>
			<p class="text-2xl font-bold text-green-600">{formatMXN(totalCobrado)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Saldo Pendiente</h3>
			<p class="text-2xl font-bold {saldoPendiente > 0 ? 'text-orange-600' : 'text-green-600'}">
				{formatMXN(saldoPendiente)}
			</p>
		</div>
	</div>

	<!-- Información del cliente -->
	<div class="bg-white rounded-lg shadow">
		<div class="border-b p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Información del Cliente</h2>
		</div>
		<div class="space-y-4 p-4 sm:p-6">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<p class="text-sm text-gray-500">RFC</p>
					<p class="font-medium">{cliente.rfc || '-'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-500">Correo</p>
					<p class="font-medium">{cliente.correo}</p>
				</div>
				<div>
					<p class="text-sm text-gray-500">Teléfono</p>
					<p class="font-medium">{cliente.telefono || '-'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-500">Fecha de Alta</p>
					<p class="font-medium">{new Date(cliente.creadoEn).toLocaleDateString('es-MX')}</p>
				</div>
			</div>
			{#if cliente.direccion}
				<div>
					<p class="text-sm text-gray-500">Dirección</p>
					<p class="font-medium">{cliente.direccion}</p>
				</div>
			{/if}
			{#if cliente.notas}
				<div>
					<p class="text-sm text-gray-500">Notas</p>
					<p class="font-medium">{cliente.notas}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Cotizaciones del cliente -->
	<div class="bg-white rounded-lg shadow">
		<div class="border-b p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Cotizaciones</h2>
		</div>
		{#if cliente.cotizaciones.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[780px]">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pendiente</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each cliente.cotizaciones as cotizacion}
							{@const pagado = cotizacion.pagos.reduce((sum, p) => sum + Number(p.monto), 0)}
							{@const pendiente = Number(cotizacion.total) - pagado}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap font-medium">{cotizacion.numero}</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{new Date(cotizacion.fecha).toLocaleDateString('es-MX')}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 py-1 text-xs font-medium rounded-full
										{cotizacion.estado === 'BORRADOR' ? 'bg-gray-100 text-gray-800' : ''}
										{cotizacion.estado === 'ENVIADA' ? 'bg-yellow-100 text-yellow-800' : ''}
										{cotizacion.estado === 'APROBADA' ? 'bg-green-100 text-green-800' : ''}
										{cotizacion.estado === 'RECHAZADA' ? 'bg-red-100 text-red-800' : ''}
										{cotizacion.estado === 'FACTURADA' ? 'bg-purple-100 text-purple-800' : ''}
										{cotizacion.estado === 'PAGADA' ? 'bg-teal-100 text-teal-800' : ''}
									">
										{cotizacion.estado}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">{formatMXN(cotizacion.total)}</td>
								<td class="px-6 py-4 whitespace-nowrap text-green-600">{formatMXN(pagado)}</td>
								<td class="px-6 py-4 whitespace-nowrap {pendiente > 0 ? 'text-orange-600' : 'text-green-600'}">
									{formatMXN(pendiente)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<a 
										href={`/cotizaciones/${cotizacion.id}`}
										class="text-indigo-600 hover:text-indigo-900"
									>
										Ver
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="p-6 text-center text-gray-500">
				<p>Este cliente no tiene cotizaciones aún.</p>
				<a 
					href="/cotizaciones/nueva"
					class="text-indigo-600 hover:text-indigo-900"
				>
					Crear primera cotización
				</a>
			</div>
		{/if}
	</div>
</div>
{/if}
