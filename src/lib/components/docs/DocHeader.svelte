<script lang="ts">
	import { page } from "$app/stores";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";

	interface Props {
		onMenuClick?: () => void;
		onSearchClick?: () => void;
	}

	let { onMenuClick, onSearchClick }: Props = $props();

	let breadcrumbs = $derived.by(() => {
		const path = $page.url.pathname;
		const parts = path.replace("/docs/", "").split("/").filter(Boolean);
		return parts.map((part, i) => ({
			label: part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
			href: "/docs/" + parts.slice(0, i + 1).join("/"),
			current: i === parts.length - 1,
		}));
	});
</script>

<header
	class="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur"
>
	<!-- Mobile hamburger -->
	<button
		class="border-border text-foreground flex h-9 w-9 items-center justify-center rounded-md border lg:hidden"
		onclick={onMenuClick}
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
		<a href="/docs" class="text-muted-foreground hover:text-foreground transition-colors">Docs</a>
		{#each breadcrumbs as crumb}
			<span class="text-muted-foreground/50">/</span>
			{#if crumb.current}
				<span class="text-foreground font-medium">{crumb.label}</span>
			{:else}
				<a href={crumb.href} class="text-muted-foreground hover:text-foreground transition-colors">
					{crumb.label}
				</a>
			{/if}
		{/each}
	</nav>

	<!-- Right side -->
	<div class="flex flex-1 items-center justify-end gap-2">
		<!-- Search trigger -->
		<button
			onclick={onSearchClick}
			class="border-border bg-muted/50 text-muted-foreground hover:bg-muted hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors sm:flex"
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
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			Search...
			<kbd class="border-border bg-background rounded border px-1.5 py-0.5 font-mono text-[10px]">
				{"\u2318"}K
			</kbd>
		</button>

		<!-- GitHub -->
		<a
			href="https://github.com/ramaherbin/fancy-ui"
			target="_blank"
			rel="noopener noreferrer"
			class="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
			aria-label="GitHub"
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
				/>
			</svg>
		</a>

		<ThemeToggle />
	</div>
</header>
