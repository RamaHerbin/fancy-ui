<script lang="ts">
	import { page } from '$app/stores';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import {
		categories,
		categoryLabels,
		getComponentsGroupedByCategory,
		getComponent,
		getAllComponents
	} from '$lib/fancy-ui/registry.js';

	let { children } = $props();

	let sidebarOpen = $state(false);
	let searchQuery = $state('');

	const grouped = getComponentsGroupedByCategory();
	const allComponents = getAllComponents();

	// Derive current component slug from URL
	let currentSlug = $derived.by(() => {
		const path = $page.url.pathname;
		const match = path.match(/^\/demo\/([^/]+)/);
		return match ? match[1] : null;
	});

	let currentComponent = $derived(currentSlug ? getComponent(currentSlug) : null);

	// Filter components when searching
	let isSearching = $derived(searchQuery.trim().length > 0);
	let searchResults = $derived(
		isSearching
			? allComponents.filter(
					(c) =>
						c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						c.description.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: []
	);

	function closeSidebar() {
		sidebarOpen = false;
	}

	function clearSearch() {
		searchQuery = '';
	}
</script>

<!-- Mobile overlay -->
{#if sidebarOpen}
	<button
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		onclick={closeSidebar}
		aria-label="Close sidebar"
	></button>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 {sidebarOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<!-- Sidebar header -->
	<div class="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
		<a href="/demo" class="text-lg font-semibold tracking-tight" onclick={closeSidebar}>
			FancyUI
		</a>
	</div>

	<!-- Search -->
	<div class="px-3 pt-3">
		<div class="relative">
			<svg
				class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/40"
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<input
				type="text"
				placeholder="Search components..."
				bind:value={searchQuery}
				class="h-8 w-full rounded-md border border-sidebar-border bg-sidebar pl-8 pr-8 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:border-sidebar-ring focus:outline-none"
			/>
			{#if searchQuery}
				<button
					onclick={clearSearch}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground"
					aria-label="Clear search"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Sidebar nav -->
	<nav class="flex-1 overflow-y-auto px-3 py-4">
		{#if isSearching}
			{#if searchResults.length > 0}
				<ul>
					{#each searchResults as comp}
						{@const isActive = currentSlug === comp.slug}
						<li>
							<a
								href="/demo/{comp.slug}"
								onclick={() => { closeSidebar(); clearSearch(); }}
								class="block rounded-md px-2 py-1.5 text-sm transition-colors {isActive
									? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
									: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
							>
								{comp.name}
								<span class="block text-xs text-sidebar-foreground/40">{comp.category}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-2 text-sm text-sidebar-foreground/50">No results</p>
			{/if}
		{:else}
			{#each categories as category}
				{@const items = grouped[category]}
				{#if items.length > 0}
					<div class="mb-4">
						<h3
							class="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50"
						>
							{categoryLabels[category]}
						</h3>
						<ul>
							{#each items as comp}
								{@const isActive = currentSlug === comp.slug}
								<li>
									<a
										href="/demo/{comp.slug}"
										onclick={closeSidebar}
										class="block rounded-md px-2 py-1.5 text-sm transition-colors {isActive
											? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
											: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
									>
										{comp.name}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/each}
		{/if}
	</nav>
</aside>

<!-- Main area -->
<div class="lg:pl-64">
	<!-- Header -->
	<header
		class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<!-- Mobile hamburger -->
		<button
			class="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground lg:hidden"
			onclick={() => (sidebarOpen = !sidebarOpen)}
			aria-label="Toggle sidebar"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="4" x2="20" y1="12" y2="12" />
				<line x1="4" x2="20" y1="6" y2="6" />
				<line x1="4" x2="20" y1="18" y2="18" />
			</svg>
		</button>

		<!-- Breadcrumbs -->
		<nav class="flex items-center gap-1.5 text-sm">
			<a href="/demo" class="text-muted-foreground hover:text-foreground transition-colors">
				Components
			</a>
			{#if currentComponent}
				<span class="text-muted-foreground/50">/</span>
				<span class="font-medium text-foreground">{currentComponent.name}</span>
			{/if}
		</nav>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Theme toggle -->
		<ThemeToggle />
	</header>

	<!-- Page content -->
	<main>
		{@render children()}
	</main>
</div>
