<script lang="ts">
	import { page } from '$app/stores';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import {
		categories,
		categoryLabels,
		getComponentsGroupedByCategory,
		getComponent
	} from '$lib/fancy-ui/registry.js';

	let { children } = $props();

	let sidebarOpen = $state(false);

	const grouped = getComponentsGroupedByCategory();

	// Derive current component slug from URL
	let currentSlug = $derived.by(() => {
		const path = $page.url.pathname;
		const match = path.match(/^\/demo\/([^/]+)/);
		return match ? match[1] : null;
	});

	let currentComponent = $derived(currentSlug ? getComponent(currentSlug) : null);

	function closeSidebar() {
		sidebarOpen = false;
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

	<!-- Sidebar nav -->
	<nav class="flex-1 overflow-y-auto px-3 py-4">
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
