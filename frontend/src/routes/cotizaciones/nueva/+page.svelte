<script>
	import { apiPath } from '$lib/api.js';
	import { toast } from '$lib/toast.js';
	import { onMount } from 'svelte';

	let clientes = $state([]);
	let siguienteNumero = $state('');

	let clienteId = $state('');
	let fecha = $state(new Date().toISOString().split('T')[0]);
	let vencimiento = $state('');
	let notas = $state('');
	let conceptos = $state([
		{ descripcion: '', cantidad: 1, precioUnitario: 0 }
	]);

	onMount(async () => {
		await cargarDatos();
	});

	async function cargarDatos() {
		try {
			const clientesRes = await fetch(apiPath('/api/clientes'));
			if (clientesRes.ok) {
				clientes = await clientesRes.json();
			}

			// Generar siguiente número de cotización
			const cotizacionesRes = await fetch(apiPath('/api/cotizaciones'));
			if (cotizacionesRes.ok) {
				const cotizaciones = await cotizacionesRes.json();
				const year = new Date().getFullYear();
				const cotizacionesYear = cotizaciones.filter(c => c.numero.startsWith(`COT-${year}-`));
				const maxNum = cotizacionesYear.length > 0
					? Math.max(...cotizacionesYear.map(c => parseInt(c.numero.split('-')[2])))
					: 0;
				siguienteNumero = `COT-${year}-${String(maxNum + 1).padStart(3, '0')}`;
			}
		} catch (error) {
			console.error('Error al cargar datos:', error);
		}
	}

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	let subtotal = $derived(conceptos.reduce((sum, c) => {
		return sum + c.cantidad * c.precioUnitario;
	}, 0));

	let iva = $derived(subtotal * 0.16);
	let total = $derived(subtotal + iva);

	function agregarConcepto() {
		conceptos = [...conceptos, { descripcion: '', cantidad: 1, precioUnitario: 0 }];
	}

	function eliminarConcepto(index) {
		conceptos = conceptos.filter((_, i) => i !== index);
	}

	async function guardarBorrador() {
		await guardarCotizacion('BORRADOR');
	}

	async function enviarCliente() {
		await guardarCotizacion('ENVIADA');
	}

	async function guardarCotizacion(estado) {
		if (!clienteId) {
			toast({ type: 'warning', title: 'Selecciona un cliente', message: 'La cotizacion necesita un cliente antes de guardarse.' });
			return;
		}

		if (conceptos.length === 0 || conceptos.every(c => !c.descripcion)) {
			toast({ type: 'warning', title: 'Agrega un concepto', message: 'Incluye al menos una descripcion de servicio.' });
			return;
		}

		try {
			const response = await fetch(apiPath('/api/cotizaciones'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					numero: siguienteNumero,
					clienteId,
					fecha,
					vencimiento: vencimiento || null,
					subtotal,
					iva,
					total,
					notas,
					estado,
					conceptos: conceptos.map((concepto) => ({
						...concepto,
						subtotal: concepto.cantidad * concepto.precioUnitario
					}))
				})
			});

			if (response.ok) {
				toast({ type: 'success', title: estado === 'ENVIADA' ? 'Cotizacion enviada' : 'Borrador guardado' });
				window.location.href = '/cotizaciones';
			} else {
				toast({ type: 'error', title: 'No se pudo guardar', message: 'Revisa los datos de la cotizacion e intentalo de nuevo.' });
			}
		} catch (error) {
			console.error('Error al guardar cotización:', error);
			toast({ type: 'error', title: 'Error al guardar', message: 'Ocurrio un problema al conectar con el servidor.' });
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Nueva Cotización</h1>
		<a 
			href="/cotizaciones"
			class="text-gray-600 hover:text-gray-900"
		>
			Cancelar
		</a>
	</div>

	<form onsubmit={(e) => e.preventDefault()} class="space-y-6">
		<!-- Datos generales -->
		<div class="bg-white rounded-lg shadow p-4 space-y-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Datos Generales</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="cotizacion-numero" class="block text-sm font-medium text-gray-700 mb-1">Número</label>
					<input 
						id="cotizacion-numero"
						type="text" 
						value={siguienteNumero}
						disabled
						class="w-full px-3 py-2 border rounded-lg bg-gray-50"
					/>
				</div>
				<div>
					<label for="cotizacion-cliente" class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
					<select 
						id="cotizacion-cliente"
						bind:value={clienteId}
						required
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">Seleccionar cliente</option>
						{#each clientes as cliente}
							<option value={cliente.id}>{cliente.nombre} {cliente.empresa ? `(${cliente.empresa})` : ''}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="cotizacion-fecha" class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
					<input 
						id="cotizacion-fecha"
						type="date" 
						bind:value={fecha}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="cotizacion-vencimiento" class="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
					<input 
						id="cotizacion-vencimiento"
						type="date" 
						bind:value={vencimiento}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
			</div>
			<div>
				<label for="cotizacion-notas" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
				<textarea 
					id="cotizacion-notas"
					bind:value={notas}
					rows="2"
					class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
				></textarea>
			</div>
		</div>

		<!-- Conceptos -->
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900 mb-4">Conceptos</h2>
			<div class="space-y-4">
				{#each conceptos as concepto, index}
					<div class="grid grid-cols-1 gap-4 rounded-lg border border-gray-100 p-3 md:grid-cols-12 md:items-end md:border-0 md:p-0">
						<div class="md:col-span-5">
							<label for={`concepto-descripcion-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
							<input 
								id={`concepto-descripcion-${index}`}
								type="text" 
								bind:value={concepto.descripcion}
								class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div class="md:col-span-2">
							<label for={`concepto-cantidad-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
							<input 
								id={`concepto-cantidad-${index}`}
								type="number" 
								bind:value={concepto.cantidad}
								min="0"
								step="0.01"
								class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div class="md:col-span-2">
							<label for={`concepto-precio-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Precio Unit.</label>
							<input 
								id={`concepto-precio-${index}`}
								type="number" 
								bind:value={concepto.precioUnitario}
								min="0"
								step="0.01"
								class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div class="md:col-span-2">
							<label for={`concepto-subtotal-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
							<input 
								id={`concepto-subtotal-${index}`}
								type="text" 
								value={formatMXN(concepto.cantidad * concepto.precioUnitario)}
								disabled
								class="w-full px-3 py-2 border rounded-lg bg-gray-50"
							/>
						</div>
						<div class="md:col-span-1">
							<button 
								type="button"
								onclick={() => eliminarConcepto(index)}
								class="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
							>
								×
							</button>
						</div>
					</div>
				{/each}
			</div>
			<button 
				type="button"
				onclick={agregarConcepto}
				class="mt-4 text-indigo-600 hover:text-indigo-900 font-medium"
			>
				+ Agregar concepto
			</button>
		</div>

		<!-- Totales -->
		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900 mb-4">Totales</h2>
			<div class="space-y-2">
				<div class="flex justify-between">
					<span class="text-gray-600">Subtotal:</span>
					<span class="font-medium">{formatMXN(subtotal)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-600">IVA (16%):</span>
					<span class="font-medium">{formatMXN(iva)}</span>
				</div>
				<div class="flex justify-between text-xl font-bold border-t pt-2">
					<span>Total:</span>
					<span class="text-indigo-600">{formatMXN(total)}</span>
				</div>
			</div>
		</div>

		<!-- Botones -->
		<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
			<button 
				type="button"
				onclick={guardarBorrador}
				class="w-full px-6 py-2 border rounded-lg hover:bg-gray-50 transition sm:w-auto"
			>
				Guardar Borrador
			</button>
			<button 
				type="button"
				onclick={enviarCliente}
				class="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition sm:w-auto"
			>
				Guardar y Enviar
			</button>
		</div>
	</form>
</div>
