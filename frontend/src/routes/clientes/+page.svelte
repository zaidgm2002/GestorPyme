<script>
	import { apiPath } from '$lib/api.js';
	import { toast } from '$lib/toast.js';

	let clientes = $state([]);
	let busqueda = $state('');
	let paginaActual = $state(1);
	let mostrarInactivos = $state(false);
	let showModal = $state(false);
	let clienteEditando = $state(null);
	const clientesPorPagina = 20;

	$effect(() => {
		mostrarInactivos;
		cargarClientes();
	});

	async function cargarClientes() {
		try {
			const response = await fetch(apiPath(`/api/clientes?incluirInactivos=${mostrarInactivos}`));
			if (response.ok) {
				clientes = await response.json();
			}
		} catch (error) {
			console.error('Error al cargar clientes:', error);
		}
	}

	let clientesFiltrados = $derived(clientes.filter(c =>
		c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
		c.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
		c.rfc?.toLowerCase().includes(busqueda.toLowerCase())
	));
	let totalPaginas = $derived(Math.max(1, Math.ceil(clientesFiltrados.length / clientesPorPagina)));
	let clientesPaginados = $derived(clientesFiltrados.slice(
		(paginaActual - 1) * clientesPorPagina,
		paginaActual * clientesPorPagina
	));

	$effect(() => {
		busqueda;
		paginaActual = 1;
	});

	$effect(() => {
		if (paginaActual > totalPaginas) {
			paginaActual = totalPaginas;
		}
	});

	function abrirModalCrear() {
		clienteEditando = null;
		showModal = true;
	}

	function abrirModalEditar(cliente) {
		clienteEditando = cliente;
		showModal = true;
	}

	function cerrarModal() {
		showModal = false;
		clienteEditando = null;
	}

	function normalizarRfcInput(event) {
		event.currentTarget.value = event.currentTarget.value
			.toUpperCase()
			.replace(/[^A-Z0-9Ñ&]/g, '')
			.slice(0, 13);
	}

	async function guardarCliente(event) {
		event.preventDefault();
		const formData = new FormData(event.target);
		const datos = Object.fromEntries(formData);

		try {
			let guardado = false;

			if (clienteEditando) {
				// Editar cliente existente
				const response = await fetch(apiPath(`/api/clientes/${clienteEditando.id}`), {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(datos)
				});
				if (response.ok) {
					const actualizado = await response.json();
					clientes = clientes.map(c => c.id === actualizado.id ? actualizado : c);
					guardado = true;
					toast({ type: 'success', title: 'Cliente actualizado', message: 'Los cambios se guardaron correctamente.' });
				} else {
					toast({ type: 'error', title: 'No se pudo actualizar', message: 'Revisa los datos del cliente e intentalo de nuevo.' });
				}
			} else {
				// Crear nuevo cliente
				const response = await fetch(apiPath('/api/clientes'), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(datos)
				});
				if (response.ok) {
					const nuevo = await response.json();
					clientes = [nuevo, ...clientes];
					guardado = true;
					toast({ type: 'success', title: 'Cliente creado', message: 'El cliente ya esta disponible para cotizaciones.' });
				} else {
					toast({ type: 'error', title: 'No se pudo crear', message: 'Revisa los datos del cliente e intentalo de nuevo.' });
				}
			}
			if (guardado) cerrarModal();
		} catch (error) {
			console.error('Error al guardar cliente:', error);
			toast({ type: 'error', title: 'Error al guardar', message: 'Ocurrio un problema al conectar con el servidor.' });
		}
	}
</script>

<div class="space-y-6">
	<div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
		<button 
			onclick={abrirModalCrear}
			class="w-full shrink-0 bg-indigo-600 px-4 py-2 text-white rounded-lg hover:bg-indigo-700 transition sm:w-auto"
		>
			+ Nuevo Cliente
		</button>
	</div>

	<div class="min-w-0 bg-white rounded-lg shadow">
		<div class="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
			<input 
				type="text" 
				placeholder="Buscar por nombre, empresa o RFC..." 
				bind:value={busqueda}
				class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:flex-1"
			/>
			<label class="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
				<input
					type="checkbox"
					bind:checked={mostrarInactivos}
					class="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
				/>
				Mostrar inactivos
			</label>
		</div>
		<div class="space-y-3 p-4 lg:hidden">
			{#each clientesPaginados as cliente}
				<div class="rounded-lg border border-slate-200 bg-white p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate font-semibold text-slate-950">{cliente.nombre}</p>
							<p class="truncate text-sm text-slate-500">{cliente.empresa || 'Sin empresa'}</p>
						</div>
						<span class="shrink-0 rounded-full px-2 py-1 text-xs font-medium {cliente.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
							{cliente.activo ? 'Activo' : 'Inactivo'}
						</span>
					</div>
					<div class="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
						<p><span class="font-medium text-slate-800">RFC:</span> {cliente.rfc || '-'}</p>
						<p><span class="font-medium text-slate-800">Telefono:</span> {cliente.telefono || '-'}</p>
						<p class="truncate sm:col-span-2"><span class="font-medium text-slate-800">Correo:</span> {cliente.correo}</p>
						<p><span class="font-medium text-slate-800">Alta:</span> {new Date(cliente.creadoEn).toLocaleDateString('es-MX')}</p>
					</div>
					<div class="mt-4 flex justify-end gap-4 text-sm font-medium">
						<button type="button" onclick={() => abrirModalEditar(cliente)} class="text-teal-700 hover:text-teal-900">
							Editar
						</button>
						<a href={`/clientes/${cliente.id}`} class="text-slate-700 hover:text-slate-950">Ver</a>
					</div>
				</div>
			{/each}
			{#if clientesFiltrados.length === 0}
				<p class="py-6 text-center text-gray-500">No se encontraron clientes</p>
			{/if}
		</div>

		<div class="hidden overflow-x-auto lg:block">
			<table class="w-full table-fixed">
				<thead class="bg-gray-50">
					<tr>
						<th class="w-[21%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
						<th class="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
						<th class="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFC</th>
						<th class="w-[24%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Alta</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each clientesPaginados as cliente}
						<tr class="hover:bg-gray-50">
							<td class="truncate px-4 py-4">{cliente.nombre}</td>
							<td class="truncate px-4 py-4">{cliente.empresa || '-'}</td>
							<td class="truncate px-4 py-4">{cliente.rfc || '-'}</td>
							<td class="truncate px-4 py-4">{cliente.correo}</td>
							<td class="truncate px-4 py-4">{cliente.telefono || '-'}</td>
							<td class="truncate px-4 py-4">
								{new Date(cliente.creadoEn).toLocaleDateString('es-MX')}
							</td>
							<td class="px-4 py-4">
								<span class="rounded-full px-2 py-1 text-xs font-medium {cliente.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
									{cliente.activo ? 'Activo' : 'Inactivo'}
								</span>
							</td>
							<td class="px-4 py-4">
								<button 
									onclick={() => abrirModalEditar(cliente)}
									class="mr-3 text-teal-700 hover:text-teal-900"
								>
									Editar
								</button>
								<a 
									href={`/clientes/${cliente.id}`}
									class="text-gray-600 hover:text-gray-900"
								>
									Ver
								</a>
							</td>
						</tr>
					{/each}
					{#if clientesFiltrados.length === 0}
						<tr>
							<td colspan="8" class="px-6 py-4 text-center text-gray-500">
								No se encontraron clientes
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
		<div class="flex flex-col gap-3 border-t p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
			<p>
				Mostrando
				<span class="font-semibold text-slate-900">{clientesFiltrados.length === 0 ? 0 : (paginaActual - 1) * clientesPorPagina + 1}</span>
				-
				<span class="font-semibold text-slate-900">{Math.min(paginaActual * clientesPorPagina, clientesFiltrados.length)}</span>
				de
				<span class="font-semibold text-slate-900">{clientesFiltrados.length}</span>
				clientes
			</p>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (paginaActual = Math.max(1, paginaActual - 1))}
					disabled={paginaActual === 1}
					class="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Anterior
				</button>
				<span class="rounded-md bg-slate-50 px-3 py-2 font-medium text-slate-700">
					{paginaActual} / {totalPaginas}
				</span>
				<button
					type="button"
					onclick={() => (paginaActual = Math.min(totalPaginas, paginaActual + 1))}
					disabled={paginaActual === totalPaginas}
					class="rounded-md border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Siguiente
				</button>
			</div>
		</div>
	</div>
</div>

{#if showModal}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 p-3 sm:items-center">
		<div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
			<div class="border-b p-4 sm:p-6">
				<h2 class="text-xl font-bold">
					{clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
				</h2>
			</div>
			<form onsubmit={guardarCliente} class="space-y-4 p-4 sm:p-6">
				<div>
					<label for="cliente-nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
					<input 
						id="cliente-nombre"
						type="text" 
						name="nombre" 
						required
						value={clienteEditando?.nombre || ''}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="cliente-empresa" class="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
					<input 
						id="cliente-empresa"
						type="text" 
						name="empresa" 
						value={clienteEditando?.empresa || ''}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="cliente-rfc" class="block text-sm font-medium text-gray-700 mb-1">RFC</label>
					<input 
						id="cliente-rfc"
						type="text" 
						name="rfc" 
						value={clienteEditando?.rfc || ''}
						oninput={normalizarRfcInput}
						minlength="12"
						maxlength="13"
						pattern={"[A-Za-z0-9Ññ&]{12,13}"}
						title="RFC debe tener 12 o 13 caracteres alfanuméricos"
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="cliente-correo" class="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
					<input 
						id="cliente-correo"
						type="email" 
						name="correo" 
						required
						value={clienteEditando?.correo || ''}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="cliente-telefono" class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
					<input 
						id="cliente-telefono"
						type="tel" 
						name="telefono" 
						value={clienteEditando?.telefono || ''}
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="cliente-direccion" class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
					<textarea 
						id="cliente-direccion"
						name="direccion" 
						rows="2"
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>{clienteEditando?.direccion || ''}</textarea>
				</div>
				<div>
					<label for="cliente-notas" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
					<textarea 
						id="cliente-notas"
						name="notas" 
						rows="2"
						class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>{clienteEditando?.notas || ''}</textarea>
				</div>
				<div class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
					<button 
						type="button"
						onclick={cerrarModal}
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
