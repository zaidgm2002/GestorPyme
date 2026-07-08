<script>
	import { apiPath } from '$lib/api.js';
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';

	let totalFacturado = $state(0);
	let totalCobrado = $state(0);
	let carteraPendiente = $state(0);
	let cotsActivas = $state(0);
	let ingresosPorMes = $state([]);
	let cotsPorEstado = $state([]);
	let ultimasCots = $state([]);
	let topClientes = $state([]);

	let ingresosChart = null;
	let estadoChart = null;

	onMount(async () => {
		await cargarDashboard();
		await renderCharts();
	});

	async function cargarDashboard() {
		try {
			const response = await fetch(apiPath('/api/dashboard'));
			if (response.ok) {
				const data = await response.json();
				totalFacturado = data.totalFacturado;
				totalCobrado = data.totalCobrado;
				carteraPendiente = data.carteraPendiente;
				cotsActivas = data.cotsActivas;
				ingresosPorMes = data.ingresosPorMes;
				cotsPorEstado = data.cotsPorEstado;
				ultimasCots = data.ultimasCots;
				topClientes = data.topClientes;
			}
		} catch (error) {
			console.error('Error al cargar dashboard:', error);
		}
	}

	async function renderCharts() {
		// Gráfica de ingresos por mes
		const ctxIngresos = document.getElementById('ingresosChart');
		if (ctxIngresos) {
			ingresosChart = new Chart(ctxIngresos, {
				type: 'bar',
				data: {
					labels: ingresosPorMes.map(i => i.mes),
					datasets: [{
						label: 'Ingresos',
						data: ingresosPorMes.map(i => i.total),
						backgroundColor: '#0F766E',
						borderRadius: 6
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false }
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: (value) => formatMXN(value)
							}
						}
					}
				}
			});
		}

		// Gráfica de cotizaciones por estado
		const ctxEstado = document.getElementById('estadoChart');
		if (ctxEstado) {
			const colores = {
				BORRADOR: '#94A3B8',
				ENVIADA: '#F59E0B',
				APROBADA: '#10B981',
				RECHAZADA: '#EF4444',
				FACTURADA: '#2563EB',
				PAGADA: '#0F766E'
			};

			estadoChart = new Chart(ctxEstado, {
				type: 'doughnut',
				data: {
					labels: cotsPorEstado.map(c => c.estado),
					datasets: [{
						data: cotsPorEstado.map(c => c._count),
						backgroundColor: cotsPorEstado.map(c => colores[c.estado] || '#6B7280')
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							position: 'bottom'
						}
					}
				}
			});
		}
	}

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	function getEstadoColor(estado) {
		const colores = {
			BORRADOR: 'bg-gray-100 text-gray-800',
			ENVIADA: 'bg-yellow-100 text-yellow-800',
			APROBADA: 'bg-green-100 text-green-800',
			RECHAZADA: 'bg-red-100 text-red-800',
			FACTURADA: 'bg-purple-100 text-purple-800',
			PAGADA: 'bg-teal-100 text-teal-800'
		};
		return colores[estado] || 'bg-gray-100 text-gray-800';
	}
</script>

<div class="space-y-6">
	<section class="rounded-lg border border-teal-100 bg-white p-5 shadow-sm sm:p-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<p class="text-sm font-semibold uppercase text-teal-700">Resumen operativo</p>
				<h1 class="mt-1 text-2xl font-bold text-slate-950">Dashboard</h1>
				<p class="mt-1 text-sm text-slate-500">
					Facturacion, cobranza y estado comercial en una sola vista.
				</p>
			</div>
			<div class="grid grid-cols-2 gap-3 text-sm sm:flex">
				<a href="/clientes" class="rounded-md border border-slate-200 px-4 py-2 text-center font-medium text-slate-700 hover:bg-slate-50">
					Clientes
				</a>
				<a href="/cotizaciones/nueva" class="rounded-md bg-teal-700 px-4 py-2 text-center font-medium text-white hover:bg-teal-800">
					Nueva cotizacion
				</a>
			</div>
		</div>
	</section>

	<!-- KPIs -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<div class="mb-4 flex items-center justify-between">
				<span class="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">FAC</span>
				<span class="h-2 w-2 rounded-full bg-teal-600"></span>
			</div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Facturado este mes</h3>
			<p class="text-2xl font-bold text-slate-950">{formatMXN(totalFacturado)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<div class="mb-4 flex items-center justify-between">
				<span class="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">COB</span>
				<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
			</div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Cobrado este mes</h3>
			<p class="text-2xl font-bold text-slate-950">{formatMXN(totalCobrado)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<div class="mb-4 flex items-center justify-between">
				<span class="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">PEN</span>
				<span class="h-2 w-2 rounded-full bg-amber-500"></span>
			</div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Cartera pendiente</h3>
			<p class="text-2xl font-bold text-slate-950">{formatMXN(carteraPendiente)}</p>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<div class="mb-4 flex items-center justify-between">
				<span class="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">COT</span>
				<span class="h-2 w-2 rounded-full bg-blue-500"></span>
			</div>
			<h3 class="text-sm font-medium text-gray-500 mb-2">Cotizaciones activas</h3>
			<p class="text-2xl font-bold text-slate-950">{cotsActivas}</p>
		</div>
	</div>

	<!-- Gráficas -->
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900 mb-4">Ingresos últimos 6 meses</h2>
			<div class="h-72">
				<canvas id="ingresosChart"></canvas>
			</div>
		</div>
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900 mb-4">Cotizaciones por estado</h2>
			<div class="h-72">
				<canvas id="estadoChart"></canvas>
			</div>
		</div>
	</div>

	<!-- Últimas cotizaciones y Top clientes -->
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
		<div class="bg-white rounded-lg shadow">
			<div class="border-b p-4 sm:p-6">
				<h2 class="text-lg font-bold text-gray-900">Últimas cotizaciones</h2>
			</div>
			<div class="p-4 sm:p-6">
				{#if ultimasCots.length > 0}
					<div class="space-y-4">
						{#each ultimasCots as cotizacion}
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div class="min-w-0">
									<p class="font-medium">{cotizacion.numero}</p>
									<p class="truncate text-sm text-gray-600">{cotizacion.cliente.nombre}</p>
								</div>
								<div class="sm:text-right">
									<p class="font-medium">{formatMXN(cotizacion.total)}</p>
									<span class="text-xs px-2 py-1 rounded-full {getEstadoColor(cotizacion.estado)}">
										{cotizacion.estado}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500 text-center">No hay cotizaciones</p>
				{/if}
			</div>
		</div>

		<div class="bg-white rounded-lg shadow">
			<div class="border-b p-4 sm:p-6">
				<h2 class="text-lg font-bold text-gray-900">Top clientes con saldo pendiente</h2>
			</div>
			<div class="p-4 sm:p-6">
				{#if topClientes.length > 0}
					<div class="space-y-4">
						{#each topClientes as cliente}
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div class="min-w-0">
									<p class="font-medium">{cliente.nombre}</p>
									{#if cliente.empresa}
										<p class="truncate text-sm text-gray-600">{cliente.empresa}</p>
									{/if}
								</div>
								<p class="font-bold text-orange-600">{formatMXN(cliente.saldo)}</p>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500 text-center">No hay saldos pendientes</p>
				{/if}
			</div>
		</div>
	</div>
</div>
