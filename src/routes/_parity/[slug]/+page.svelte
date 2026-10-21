<script lang="ts">
	import type { Component } from "svelte";
	import DemoRenderer from "$lib/components/docs/DemoRenderer.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	const variants = import.meta.glob<{ default: Component }>("./variants/*.svelte");
	const loadVariant = $derived(
		data.variant ? variants[`./variants/${data.slug}--${data.variant}.svelte`] : undefined
	);

	// Same random stream in all three stages, whatever the page drew so far
	// (capture.mjs defines the hook; outside a capture it is absent).
	(globalThis as { __parityReseed?: () => void }).__parityReseed?.();

	// The theme comes from the URL so a capture never depends on stored state.
	$effect(() => {
		document.documentElement.classList.toggle("dark", data.theme === "dark");
		document.documentElement.toggleAttribute("data-parity-fill", data.fill);
	});
</script>

<div class="bg-background grid min-h-screen place-items-center">
	<div
		data-parity-stage
		class="bg-background relative flex items-center justify-center overflow-hidden"
		style={data.fill ? "width: 100%; height: 100vh;" : "width: 800px; height: 500px;"}
	>
		{#if !data.variant}
			<DemoRenderer slug={data.slug} />
		{:else if loadVariant}
			{#await loadVariant() then mod}
				<mod.default />
			{/await}
		{:else}
			<div data-parity-missing class="text-muted-foreground text-sm">
				No Svelte variant "{data.slug}--{data.variant}"
			</div>
		{/if}
	</div>
</div>
