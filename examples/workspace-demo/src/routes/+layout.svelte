<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import Menu from "@lucide/svelte/icons/menu";
	import { afterNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import { IconButton, Sheet, Toaster } from "fancy-ui-svelte";
	import { api, parseApiConfig } from "$lib/data/api.js";
	import { strings } from "$lib/strings.js";
	import ThemeToggle from "$lib/shell/ThemeToggle.svelte";
	import WorkspaceNav from "$lib/shell/WorkspaceNav.svelte";

	let { children } = $props();

	let navOpen = $state(false);
	const pathname = $derived(page.url.pathname);

	// Any navigation, including a link tapped inside the sheet, closes it.
	afterNavigate(() => {
		navOpen = false;
	});

	onMount(() => {
		// The simulation switches (?fail=once, ?latency=slow, ?scenario=empty…)
		// are read in the browser: the prerendered HTML has no query string.
		api.configure(parseApiConfig(window.location.search));
		// The e2e spec waits for this before it clicks anything.
		document.documentElement.dataset.hydrated = "true";
	});
</script>

<a
	href="#main"
	class="bg-background text-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:ring-2"
>
	{strings.nav.skipToContent}
</a>

<div class="bg-background text-foreground min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
	<aside class="border-border sticky top-0 hidden h-dvh flex-col border-r md:flex">
		<div class="flex h-14 shrink-0 items-center px-5 text-sm font-semibold">
			{strings.app.name}
		</div>
		<WorkspaceNav {pathname} class="w-full flex-1 overflow-y-auto" />
	</aside>

	<div class="flex min-w-0 flex-col">
		<header
			class="border-border bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6"
		>
			<IconButton
				variant="ghost"
				label={strings.nav.open}
				class="md:hidden"
				aria-expanded={navOpen}
				aria-controls={navOpen ? "workspace-nav-sheet" : undefined}
				onclick={() => (navOpen = true)}
			>
				<Menu class="size-4" aria-hidden="true" />
			</IconButton>
			<span class="truncate text-sm font-semibold md:hidden">{strings.app.name}</span>
			<div class="ml-auto flex items-center gap-1">
				<ThemeToggle />
			</div>
		</header>

		<main
			id="main"
			tabindex="-1"
			class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 outline-none md:px-8 md:py-10"
		>
			{@render children()}
		</main>
	</div>
</div>

<Sheet
	bind:open={navOpen}
	id="workspace-nav-sheet"
	side="left"
	size="sm"
	title={strings.nav.sheetTitle}
>
	<WorkspaceNav {pathname} class="w-full p-0" />
</Sheet>

<Toaster position="bottom-center" />
