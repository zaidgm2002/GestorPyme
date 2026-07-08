<script>
	import './layout.css';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { page } from '$app/stores';
	import ToastHost from '$lib/ToastHost.svelte';
	import {
		ClerkLoaded,
		ClerkProvider,
		RedirectToSignIn,
		Show,
		SignOutButton,
		UserButton
	} from 'svelte-clerk/client';

	let { children } = $props();
	let sidebarOpen = $state(true);
	let mobileMenuOpen = $state(false);

	const publishableKey = PUBLIC_CLERK_PUBLISHABLE_KEY;
	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', mark: 'D' },
		{ href: '/clientes', label: 'Clientes', mark: 'C' },
		{ href: '/cotizaciones', label: 'Cotizaciones', mark: 'Q' },
		{ href: '/cobranza', label: 'Cobranza', mark: '$' }
	];
	let activeItem = $derived(navItems.find((item) => $page.url.pathname.startsWith(item.href)));
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
	<title>GestorPyme - Sistema de Gestion</title>
</svelte:head>

<ClerkProvider {publishableKey}>
	<ClerkLoaded>
		{#if $page.url.pathname === '/sign-in'}
			{@render children()}
		{:else}
			{#snippet redirectToSignIn()}
				<RedirectToSignIn signInUrl="/sign-in" />
			{/snippet}

			<Show when="signed-in" fallback={redirectToSignIn}>
				<div class="app-shell min-h-screen lg:flex">
					{#if sidebarOpen || mobileMenuOpen}
						<button
							type="button"
							class="fixed inset-0 z-30 bg-black/40 lg:hidden {mobileMenuOpen ? '' : 'hidden'}"
							aria-label="Cerrar menu"
							onclick={() => (mobileMenuOpen = false)}
						></button>
						<aside class="fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-slate-200 bg-white text-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 {mobileMenuOpen ? 'translate-x-0' : ''}">
							<div class="border-b border-slate-200 p-5">
								<div class="flex items-center gap-3">
									<div class="flex h-11 w-11 items-center justify-center rounded-md bg-teal-700 text-sm font-bold text-white">
										GP
									</div>
									<div>
										<h1 class="text-lg font-bold tracking-normal text-slate-950">GestorPyme</h1>
										<p class="text-xs text-slate-500">Operacion y cobranza</p>
									</div>
								</div>
							</div>

							<nav class="flex-1 p-4">
								<ul class="space-y-1">
									{#each navItems as item}
										<li>
											<a
												href={item.href}
												onclick={() => (mobileMenuOpen = false)}
												class="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition {$page.url.pathname.startsWith(item.href)
													? 'bg-teal-50 text-teal-900 ring-1 ring-teal-100'
													: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}"
											>
												<span class="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold {$page.url.pathname.startsWith(item.href)
													? 'bg-teal-700 text-white'
													: 'bg-slate-100 text-slate-500 group-hover:bg-white'}">
													{item.mark}
												</span>
												<span>
													{item.label}
												</span>
											</a>
										</li>
									{/each}
								</ul>
							</nav>

							<div class="border-t border-slate-200 p-4">
								<div class="mb-4 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
									<div class="font-semibold text-slate-700">Ambiente local</div>
									<div>v1.0 MVP</div>
								</div>
								<div class="flex items-center justify-between gap-3">
									<UserButton />
									<SignOutButton>
										<button
											type="button"
											class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
										>
											Cerrar sesion
										</button>
									</SignOutButton>
								</div>
							</div>
						</aside>
					{/if}

					<div class="flex min-h-screen min-w-0 flex-1 flex-col">
						<header class="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 p-3 backdrop-blur sm:p-4">
							<div class="flex items-center gap-3">
								<button
									type="button"
									onclick={() => {
										if (window.innerWidth < 1024) {
											mobileMenuOpen = !mobileMenuOpen;
										} else {
											sidebarOpen = !sidebarOpen;
										}
									}}
									class="rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-950 focus:outline-none"
									aria-label="Alternar menu"
								>
									{#if sidebarOpen && !mobileMenuOpen}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
											></path>
										</svg>
									{:else}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 5l7 7-7 7M5 5l7 7-7 7"
											></path>
										</svg>
									{/if}
								</button>
								<div>
									<p class="text-xs font-medium uppercase text-slate-400">Modulo</p>
									<p class="text-sm font-semibold text-slate-900 sm:text-base">{activeItem?.label || 'GestorPyme'}</p>
								</div>
							</div>

							<span class="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 sm:text-sm">GestorPyme v1.0</span>
						</header>

						<main class="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
							{@render children()}
						</main>
					</div>
				</div>
				<ToastHost />
			</Show>
		{/if}
	</ClerkLoaded>
</ClerkProvider>
