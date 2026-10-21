<script lang="ts">
	import type { Snippet } from "svelte";
	import { documentTitle, strings, type ScreenId } from "$lib/strings.js";

	let { screen, actions }: { screen: ScreenId; actions?: Snippet } = $props();
	const copy = $derived(strings.screens[screen]);
</script>

<svelte:head>
	<title>{documentTitle(screen)}</title>
</svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
	<div class="min-w-0">
		<h1 class="text-2xl font-semibold tracking-tight">{copy.title}</h1>
		<p class="text-muted-foreground mt-1 text-sm">{copy.description}</p>
	</div>
	{#if actions}
		<div class="flex shrink-0 gap-2">{@render actions()}</div>
	{/if}
</header>
