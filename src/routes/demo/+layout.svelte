<script lang="ts">
	import { page } from "$app/stores";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import DemoCredits from "$lib/components/DemoCredits.svelte";

	const SITE_URL = "https://fancy-ui.rama.app";
	import {
		categories,
		categoryLabels,
		getComponentsGroupedByCategory,
		getComponent,
		getAllComponents,
	} from "$lib/fancy-ui/registry.js";

	let { children } = $props();

	let sidebarOpen = $state(false);
	let searchQuery = $state("");

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
	let searchResults = $derived.by(() => {
		if (!isSearching) return [];
		const query = searchQuery.toLowerCase();
		return allComponents.filter(
			(c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
		);
	});

	function closeSidebar() {
		sidebarOpen = false;
	}

	function clearSearch() {
		searchQuery = "";
	}

	function selectResult() {
		closeSidebar();
		clearSearch();
	}
</script>

<svelte:head>
	{#if currentComponent}
		<title>{currentComponent.name} — FancyUI</title>
		<meta name="description" content={currentComponent.description} />
		<meta property="og:title" content="{currentComponent.name} — FancyUI" />
		<meta property="og:description" content={currentComponent.description} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content="{SITE_URL}/demo/{currentComponent.slug}" />
		<meta property="og:image" content="{SITE_URL}/og-image.png" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="{currentComponent.name} — FancyUI" />
		<meta name="twitter:description" content={currentComponent.description} />
		<meta name="twitter:image" content="{SITE_URL}/og-image.png" />
		<link rel="canonical" href="{SITE_URL}/demo/{currentComponent.slug}" />
	{:else}
		<title>Components — FancyUI</title>
		<meta
			name="description"
			content="Browse 50+ animated Svelte 5 UI components — effects, buttons, cards, text animations, backgrounds, and more."
		/>
		<meta property="og:title" content="Components — FancyUI" />
		<meta
			property="og:description"
			content="Browse 50+ animated Svelte 5 UI components — effects, buttons, cards, text animations, backgrounds, and more."
		/>
		<meta property="og:type" content="website" />
		<meta property="og:url" content="{SITE_URL}/demo" />
		<meta property="og:image" content="{SITE_URL}/og-image.png" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="Components — FancyUI" />
		<meta name="twitter:description" content="Browse 50+ animated Svelte 5 UI components." />
		<meta name="twitter:image" content="{SITE_URL}/og-image.png" />
		<link rel="canonical" href="{SITE_URL}/demo" />
	{/if}
</svelte:head>

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
	class="border-sidebar-border bg-sidebar text-sidebar-foreground fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r transition-transform duration-300 lg:translate-x-0 {sidebarOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<!-- Sidebar header -->
	<div class="border-sidebar-border flex h-14 shrink-0 items-center border-b px-4">
		<a href="/demo" class="text-lg font-semibold tracking-tight" onclick={closeSidebar}>
			FancyUI
		</a>
	</div>

	<!-- Search -->
	<div class="px-3 pt-3">
		<div class="relative">
			<svg
				class="text-sidebar-foreground/40 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
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
				class="border-sidebar-border bg-sidebar text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:border-sidebar-ring h-8 w-full rounded-md border pr-8 pl-8 text-sm focus:outline-none"
			/>
			{#if searchQuery}
				<button
					onclick={clearSearch}
					class="text-sidebar-foreground/40 hover:text-sidebar-foreground absolute top-1/2 right-2 -translate-y-1/2"
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
								onclick={selectResult}
								class="block rounded-md px-2 py-1.5 text-sm transition-colors {isActive
									? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
									: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
							>
								{comp.name}
								<span class="text-sidebar-foreground/40 block text-xs">{comp.category}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sidebar-foreground/50 px-2 text-sm">No results</p>
			{/if}
		{:else}
			{#each categories as category}
				{@const items = grouped[category]}
				{#if items.length > 0}
					<div class="mb-4">
						<h3
							class="text-sidebar-foreground/50 mb-1 px-2 text-xs font-semibold tracking-wider uppercase"
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
											? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
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
		class="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur"
	>
		<!-- Mobile hamburger -->
		<button
			class="border-border text-foreground flex h-9 w-9 items-center justify-center rounded-md border lg:hidden"
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
				<span class="text-foreground font-medium">{currentComponent.name}</span>
			{/if}
		</nav>

		<!-- Spacer -->
		<div class="flex flex-1 justify-end">
			<ThemeToggle />
		</div>
	</header>

	<!-- Page content -->
	<main>
		{@render children()}
		{#if currentComponent}
			<div class="container mx-auto max-w-4xl px-4 pb-12">
				<DemoCredits component={currentComponent} />
			</div>
		{/if}
	</main>
</div>
