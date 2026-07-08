<script>
	import { apiPath } from '$lib/api.js';
	import { toast } from '$lib/toast.js';

	let { data } = $props();

	let clientes = $state([]);
	let cotizacion = $state(null);
	let clienteId = $state('');
	let numero = $state('');
	let fecha = $state('');
	let vencimiento = $state('');
	let notas = $state('');
	let conceptos = $state([]);
	let guardando = $state(false);
	let inicializado = $state(false);

	$effect(() => {
		if (inicializado) return;

		cotizacion = data.cotizacion;
		clientes = data.clientes;
		clienteId = cotizacion.clienteId;
		numero = cotizacion.numero;
		fecha = new Date(cotizacion.fecha).toISOString().split('T')[0];
		vencimiento = cotizacion.vencimiento ? new Date(cotizacion.vencimiento).toISOString().split('T')[0] : '';
		notas = cotizacion.notas || '';
		conceptos = cotizacion.conceptos.map((concepto) => ({
			descripcion: concepto.descripcion,
			cantidad: Number(concepto.cantidad),
			precioUnitario: Number(concepto.precioUnitario)
		}));
		inicializado = true;
	});

	const formatMXN = (monto) => new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(monto);

	let subtotal = $derived(conceptos.reduce((sum, concepto) => {
		return sum + Number(concepto.cantidad || 0) * Number(concepto.precioUnitario || 0);
	}, 0));
	let iva = $derived(subtotal * 0.16);
	let total = $derived(subtotal + iva);

	function agregarConcepto() {
		conceptos = [...conceptos, { descripcion: '', cantidad: 1, precioUnitario: 0 }];
	}

	function eliminarConcepto(index) {
		conceptos = conceptos.filter((_, i) => i !== index);
	}

	async function guardarCotizacion() {
		if (!clienteId) {
			toast({ type: 'warning', title: 'Selecciona un cliente', message: 'La cotizacion necesita un cliente antes de guardarse.' });
			return;
		}

		if (conceptos.length === 0 || conceptos.every((concepto) => !concepto.descripcion.trim())) {
			toast({ type: 'warning', title: 'Agrega un concepto', message: 'Incluye al menos una descripcion de servicio.' });
			return;
		}

		guardando = true;

		try {
			const response = await fetch(apiPath(`/api/cotizaciones/${cotizacion.id}`), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					numero,
					clienteId,
					fecha,
					vencimiento: vencimiento || null,
					subtotal,
					iva,
					total,
					notas,
					conceptos: conceptos.map((concepto) => ({
						...concepto,
						subtotal: Number(concepto.cantidad || 0) * Number(concepto.precioUnitario || 0)
					}))
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.error || 'Error al guardar la cotizacion');
			}

			toast({ type: 'success', title: 'Borrador actualizado' });
			window.location.href = `/cotizaciones/${cotizacion.id}`;
		} catch (error) {
			console.error('Error al guardar cotizacion:', error);
			toast({ type: 'error', title: 'No se pudo guardar', message: error.message });
		} finally {
			guardando = false;
		}
	}
</script>

{#if !cotizacion}
	<div class="p-6 text-gray-500">Cargando cotizacion...</div>
{:else}
<div class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<p class="text-sm font-semibold uppercase text-teal-700">Edicion de borrador</p>
			<h1 class="text-2xl font-bold text-gray-900">{numero}</h1>
		</div>
		<a href={`/cotizaciones/${cotizacion.id}`} class="text-gray-600 hover:text-gray-900">
			Cancelar
		</a>
	</div>

	<form onsubmit={(event) => event.preventDefault()} class="space-y-6">
		<div class="bg-white rounded-lg shadow p-4 space-y-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900">Datos Generales</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label for="editar-cotizacion-numero" class="block text-sm font-medium text-gray-700 mb-1">Numero</label>
					<input
						id="editar-cotizacion-numero"
						type="text"
						bind:value={numero}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="editar-cotizacion-cliente" class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
					<select
						id="editar-cotizacion-cliente"
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
					<label for="editar-cotizacion-fecha" class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
					<input
						id="editar-cotizacion-fecha"
						type="date"
						bind:value={fecha}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="editar-cotizacion-vencimiento" class="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
					<input
						id="editar-cotizacion-vencimiento"
						type="date"
						bind:value={vencimiento}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
			</div>
			<div>
				<label for="editar-cotizacion-notas" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
				<textarea
					id="editar-cotizacion-notas"
					bind:value={notas}
					rows="2"
					class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
				></textarea>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-4 sm:p-6">
			<h2 class="text-lg font-bold text-gray-900 mb-4">Conceptos</h2>
			<div class="space-y-4">
				{#each conceptos as concepto, index}
					<div class="grid grid-cols-1 gap-4 rounded-lg border border-gray-100 p-3 md:grid-cols-12 md:items-end md:border-0 md:p-0">
						<div class="md:col-span-5">
							<label for={`editar-concepto-descripcion-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
							<input
								id={`editar-concepto-descripcion-${index}`}
								type="text"
								bind:value={concepto.descripcion}
								class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div class="md:col-span-2">
							<label for={`editar-concepto-cantidad-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
							<input
								id={`editar-concepto-cantidad-${index}`}
								type="number"
								bind:value={concepto.cantidad}
								min="0"
								step="0.01"
								class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div class="md:col-span-2">
							<label for={`editar-concepto-precio-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Precio Unit.</label>
							<input
								id={`editar-concepto-precio-${index}`}
								type="number"
								bind:value={concepto.precioUnitario}
								min="0"
								step="0.01"
								class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
						</div>
						<div class="md:col-span-2">
							<label for={`editar-concepto-subtotal-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
							<input
								id={`editar-concepto-subtotal-${index}`}
								type="text"
								value={formatMXN(Number(concepto.cantidad || 0) * Number(concepto.precioUnitario || 0))}
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
								x
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

		<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
			<a
				href={`/cotizaciones/${cotizacion.id}`}
				class="w-full rounded-lg border px-6 py-2 text-center hover:bg-gray-50 transition sm:w-auto"
			>
				Cancelar
			</a>
			<button
				type="button"
				onclick={guardarCotizacion}
				disabled={guardando}
				class="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
			>
				{guardando ? 'Guardando...' : 'Guardar cambios'}
			</button>
		</div>
	</form>
</div>
{/if}
