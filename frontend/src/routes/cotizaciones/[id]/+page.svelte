<script>
	import { apiPath } from '$lib/api.js';
	import { confirmToast, toast } from '$lib/toast.js';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let { data } = $props();

	let cotizacion = $state(null);
	let pagado = $state(0);
	let pendiente = $state(0);
	let showPagoModal = $state(false);

	$effect(() => {
		cotizacion = data.cotizacion;
		pagado = data.pagado;
		pendiente = data.pendiente;
	});

	onMount(async () => {
		await cargarCotizacion();
	});

	async function cargarCotizacion() {
		try {
			const response = await fetch(apiPath(`/api/cotizaciones/${$page.params.id}`));
			if (response.ok) {
				const data = await response.json();
				cotizacion = data.cotizacion;
				pagado = data.pagado;
				pendiente = data.pendiente;
			}
		} catch (error) {
			console.error('Error al cargar cotización:', error);
		}
	}

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	async function cambiarEstado(nuevoEstado) {
		const confirmado = await confirmToast({
			title: `Cambiar estado a ${nuevoEstado}`,
			message: 'Esta accion quedara registrada en el historial.',
			confirmLabel: 'Cambiar'
		});
		if (!confirmado) return;

		try {
			const response = await fetch(apiPath(`/api/cotizaciones/${cotizacion.id}/estado`), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ estado: nuevoEstado })
			});

			if (response.ok) {
				await cargarCotizacion();
				toast({ type: 'success', title: 'Estado actualizado', message: `La cotizacion ahora esta en ${nuevoEstado}.` });
			} else {
				const data = await response.json().catch(() => ({}));
				toast({ type: 'error', title: 'No se pudo cambiar el estado', message: data.error || 'La transicion no esta permitida.' });
			}
		} catch (error) {
			console.error('Error al cambiar estado:', error);
			toast({ type: 'error', title: 'Error al cambiar estado', message: 'Ocurrio un problema al conectar con el servidor.' });
		}
	}

	async function registrarPago(event) {
		event.preventDefault();
		const formData = new FormData(event.target);
		const datos = Object.fromEntries(formData);

		try {
			const response = await fetch(apiPath(`/api/cotizaciones/${cotizacion.id}/pagos`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(datos)
			});

			if (response.ok) {
				showPagoModal = false;
				await cargarCotizacion();
				toast({ type: 'success', title: 'Pago registrado', message: 'El saldo fue actualizado.' });
			} else {
				const data = await response.json().catch(() => ({}));
				toast({ type: 'error', title: 'No se pudo registrar el pago', message: data.error || 'Revisa el monto y el estado de la cotizacion.' });
			}
		} catch (error) {
			console.error('Error al registrar pago:', error);
			toast({ type: 'error', title: 'Error al registrar pago', message: 'Ocurrio un problema al conectar con el servidor.' });
		}
	}

	async function eliminarPago(pagoId) {
		const confirmado = await confirmToast({
			title: 'Eliminar pago',
			message: 'El saldo pendiente se recalculara al eliminarlo.',
			confirmLabel: 'Eliminar',
			type: 'warning'
		});
		if (!confirmado) return;

		try {
			const response = await fetch(apiPath(`/api/pagos/${pagoId}`), {
				method: 'DELETE'
			});

			if (response.ok) {
				await cargarCotizacion();
				toast({ type: 'success', title: 'Pago eliminado', message: 'El historial y saldo fueron actualizados.' });
			} else {
				const data = await response.json().catch(() => ({}));
				toast({ type: 'error', title: 'No se pudo eliminar', message: data.error || 'Intentalo nuevamente.' });
			}
		} catch (error) {
			console.error('Error al eliminar pago:', error);
			toast({ type: 'error', title: 'Error al eliminar pago', message: 'Ocurrio un problema al conectar con el servidor.' });
		}
	}
</script>

{#if !cotizacion}
	<div class="p-6 text-gray-500">Cargando cotización...</div>
{:else}
<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">{cotizacion.numero}</h1>
			<p class="text-gray-600">{cotizacion.cliente.nombre}</p>
		</div>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			{#if cotizacion.estado === 'BORRADOR'}
				<a
					href={`/cotizaciones/${cotizacion.id}/editar`}
					class="rounded-md bg-teal-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-teal-800"
				>
					Editar borrador
				</a>
			{/if}
			<a 
				href="/cotizaciones"
				class="text-gray-600 hover:text-gray-900"
			>
				Volver
			</a>
		</div>
	</div>

	<!-- Estado y totales -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Estado</h3>
			<span class="px-3 py-1 text-sm font-medium rounded-full
				{cotizacion.estado === 'BORRADOR' ? 'bg-gray-100 text-gray-800' : ''}
				{cotizacion.estado === 'ENVIADA' ? 'bg-yellow-100 text-yellow-800' : ''}
				{cotizacion.estado === 'APROBADA' ? 'bg-green-100 text-green-800' : ''}
				{cotizacion.estado === 'RECHAZADA' ? 'bg-red-100 text-red-800' : ''}
				{cotizacion.estado === 'FACTURADA' ? 'bg-purple-100 text-purple-800' : ''}
				{cotizacion.estado === 'PAGADA' ? 'bg-teal-100 text-teal-800' : ''}
			">
				{cotizacion.estado}
			</span>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Total</h3>
			<p class="text-2xl font-bold text-gray-900">{formatMXN(cotizacion.total)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Pagado</h3>
			<p class="text-2xl font-bold text-green-600">{formatMXN(pagado)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h3 class="text-sm font-medium text-gray-500 mb-2">Pendiente</h3>
			<p class="text-2xl font-bold {pendiente > 0 ? 'text-orange-600' : 'text-green-600'}">
				{formatMXN(pendiente)}
			</p>
		</div>
	</div>

	<!-- Cambio de estado -->
	<div class="bg-white rounded-lg shadow p-4 sm:p-6">
		<h2 class="text-lg font-bold text-gray-900 mb-4">Cambiar Estado</h2>
		<div class="flex flex-wrap gap-2">
			{#if cotizacion.estado === 'BORRADOR'}
				<button 
					onclick={() => cambiarEstado('ENVIADA')}
					class="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition sm:w-auto"
				>
					Enviar al Cliente
				</button>
			{/if}
			{#if cotizacion.estado === 'ENVIADA'}
				<button 
					onclick={() => cambiarEstado('APROBADA')}
					class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition sm:w-auto"
				>
					Aprobar
				</button>
				<button 
					onclick={() => cambiarEstado('RECHAZADA')}
					class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition sm:w-auto"
				>
					Rechazar
				</button>
			{/if}
			{#if cotizacion.estado === 'APROBADA'}
				<button 
					onclick={() => cambiarEstado('FACTURADA')}
					class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition sm:w-auto"
				>
					Facturar
				</button>
			{/if}
			{#if cotizacion.estado === 'FACTURADA' && pendiente === 0}
				<button 
					onclick={() => cambiarEstado('PAGADA')}
					class="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition sm:w-auto"
				>
					Marcar como Pagada
				</button>
			{/if}
		</div>
	</div>

	<!-- Conceptos -->
	<div class="bg-white rounded-lg shadow">
		<div class="border-b p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Conceptos</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[620px]">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each cotizacion.conceptos as concepto}
						<tr>
							<td class="px-6 py-4">{concepto.descripcion}</td>
							<td class="px-6 py-4">{concepto.cantidad}</td>
							<td class="px-6 py-4">{formatMXN(concepto.precioUnitario)}</td>
							<td class="px-6 py-4">{formatMXN(concepto.subtotal)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagos -->
	<div class="bg-white rounded-lg shadow">
		<div class="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Pagos</h2>
			{#if cotizacion.estado === 'FACTURADA'}
				<button 
					onclick={() => showPagoModal = true}
					class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition sm:w-auto"
				>
					+ Registrar Pago
				</button>
			{/if}
		</div>
		{#if cotizacion.pagos.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[700px]">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each cotizacion.pagos as pago}
							<tr>
								<td class="px-6 py-4">{new Date(pago.fecha).toLocaleDateString('es-MX')}</td>
								<td class="px-6 py-4 text-green-600">{formatMXN(pago.monto)}</td>
								<td class="px-6 py-4">{pago.metodo}</td>
								<td class="px-6 py-4">{pago.referencia || '-'}</td>
								<td class="px-6 py-4">
									{#if cotizacion.estado !== 'PAGADA'}
										<button 
											onclick={() => eliminarPago(pago.id)}
											class="text-red-600 hover:text-red-900"
										>
											Eliminar
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="p-6 text-center text-gray-500">
				No hay pagos registrados
			</div>
		{/if}
	</div>

	<!-- Historial -->
	<div class="bg-white rounded-lg shadow">
		<div class="border-b p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Historial de Cambios</h2>
		</div>
		<div class="space-y-4 p-4 sm:p-6">
			{#each cotizacion.historial as cambio}
				<div class="flex items-start space-x-3">
					<div class="flex-1">
						<p class="text-sm">
							{#if cambio.estadoAnterior}
								<span class="font-medium">{cambio.estadoAnterior}</span> → 
							{/if}
							<span class="font-medium text-indigo-600">{cambio.estadoNuevo}</span>
						</p>
						{#if cambio.nota}
							<p class="text-sm text-gray-600">{cambio.nota}</p>
						{/if}
						<p class="text-xs text-gray-400">
							{new Date(cambio.creadoEn).toLocaleString('es-MX')}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
{/if}

{#if showPagoModal && cotizacion}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 p-3 sm:items-center">
		<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
			<div class="border-b p-4 sm:p-6">
				<h2 class="text-xl font-bold">Registrar Pago</h2>
			</div>
			<form onsubmit={registrarPago} class="space-y-4 p-4 sm:p-6">
				<div>
					<label for="pago-monto" class="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
					<input 
						id="pago-monto"
						type="number" 
						name="monto" 
						required
						min="0"
						step="0.01"
						max={pendiente}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="pago-fecha" class="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
					<input 
						id="pago-fecha"
						type="date" 
						name="fecha" 
						required
						value={new Date().toISOString().split('T')[0]}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="pago-metodo" class="block text-sm font-medium text-gray-700 mb-1">Método *</label>
					<select 
						id="pago-metodo"
						name="metodo" 
						required
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="TRANSFERENCIA">Transferencia</option>
						<option value="EFECTIVO">Efectivo</option>
						<option value="CHEQUE">Cheque</option>
						<option value="TARJETA">Tarjeta</option>
					</select>
				</div>
				<div>
					<label for="pago-referencia" class="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
					<input 
						id="pago-referencia"
						type="text" 
						name="referencia" 
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
					<button 
						type="button"
						onclick={() => showPagoModal = false}
						class="w-full px-4 py-2 border rounded-lg hover:bg-gray-50 transition sm:w-auto"
					>
						Cancelar
					</button>
					<button 
						type="submit"
						class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition sm:w-auto"
					>
						Guardar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
