<script>
	import { apiPath } from '$lib/api.js';
	import { onMount } from 'svelte';

	let cotizaciones = $state([]);
	let clientes = $state([]);
	let filtroEstado = $state('');
	let filtroCliente = $state('');
	let fechaDesde = $state('');
	let fechaHasta = $state('');

	onMount(async () => {
		await cargarDatos();
	});

	async function cargarDatos() {
		try {
			const [cotizacionesRes, clientesRes] = await Promise.all([
				fetch(apiPath('/api/cotizaciones')),
				fetch(apiPath('/api/clientes'))
			]);

			if (cotizacionesRes.ok) {
				cotizaciones = await cotizacionesRes.json();
			}
			if (clientesRes.ok) {
				clientes = await clientesRes.json();
			}
		} catch (error) {
			console.error('Error al cargar datos:', error);
		}
	}

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	let cotizacionesFiltradas = $derived.by(() => {
		return cotizaciones.filter(cot => {
			const fechaCotizacion = new Date(cot.fecha);
			if (filtroEstado && cot.estado !== filtroEstado) return false;
			if (filtroCliente && cot.clienteId !== filtroCliente) return false;
			if (fechaDesde && fechaCotizacion < new Date(`${fechaDesde}T00:00:00`)) return false;
			if (fechaHasta && fechaCotizacion > new Date(`${fechaHasta}T23:59:59`)) return false;
			return true;
		});
	});

	function limpiarFiltros() {
		filtroEstado = '';
		filtroCliente = '';
		fechaDesde = '';
		fechaHasta = '';
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Cotizaciones</h1>
		<a 
			href="/cotizaciones/nueva"
			class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-white transition hover:bg-indigo-700 sm:w-auto"
		>
			+ Nueva Cotización
		</a>
	</div>

	<div class="bg-white rounded-lg shadow">
		<div class="grid grid-cols-1 gap-4 border-b p-4 md:grid-cols-2 xl:grid-cols-5">
			<div class="flex-1">
				<label for="filtro-estado" class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
				<select 
					id="filtro-estado"
					bind:value={filtroEstado}
					class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Todos</option>
					<option value="BORRADOR">Borrador</option>
					<option value="ENVIADA">Enviada</option>
					<option value="APROBADA">Aprobada</option>
					<option value="RECHAZADA">Rechazada</option>
					<option value="FACTURADA">Facturada</option>
					<option value="PAGADA">Pagada</option>
				</select>
			</div>
			<div class="flex-1">
				<label for="filtro-cliente" class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
				<select 
					id="filtro-cliente"
					bind:value={filtroCliente}
					class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Todos</option>
					{#each clientes as cliente}
						<option value={cliente.id}>{cliente.nombre}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="filtro-fecha-desde" class="block text-sm font-medium text-gray-700 mb-1">Desde</label>
				<input
					id="filtro-fecha-desde"
					type="date"
					bind:value={fechaDesde}
					class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
			<div>
				<label for="filtro-fecha-hasta" class="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
				<input
					id="filtro-fecha-hasta"
					type="date"
					bind:value={fechaHasta}
					class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
			<div class="flex items-end">
				<button
					type="button"
					onclick={limpiarFiltros}
					class="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
				>
					Limpiar
				</button>
			</div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[900px]">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pendiente</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each cotizacionesFiltradas as cotizacion}
						{@const pagado = cotizacion.pagos.reduce((sum, p) => sum + Number(p.monto), 0)}
						{@const pendiente = Number(cotizacion.total) - pagado}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap font-medium">{cotizacion.numero}</td>
							<td class="px-6 py-4 whitespace-nowrap">{cotizacion.cliente.nombre}</td>
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
								{#if cotizacion.estado === 'BORRADOR'}
									<a
										href={`/cotizaciones/${cotizacion.id}/editar`}
										class="mr-3 text-teal-700 hover:text-teal-900"
									>
										Editar
									</a>
								{/if}
								<a 
									href={`/cotizaciones/${cotizacion.id}`}
									class="text-indigo-600 hover:text-indigo-900"
								>
									Ver
								</a>
							</td>
						</tr>
					{/each}
					{#if cotizacionesFiltradas.length === 0}
						<tr>
							<td colspan="8" class="px-6 py-4 text-center text-gray-500">
								No se encontraron cotizaciones
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
