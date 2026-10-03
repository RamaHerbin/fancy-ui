<script lang="ts">
	import type { Component } from "svelte";
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	// The site shell is moving from the landing stylesheet to the site one;
	// globs tolerate whichever of the two exists, so this route survives both.
	const siteCss = import.meta.glob("$lib/components/site/site.css", { eager: true });
	import.meta.glob("$lib/components/landing/landing.css", { eager: true });
	const fonts = import.meta.glob<{ default: Component }>(
		["$lib/components/site/*Fonts.svelte", "$lib/components/site/SiteFonts.svelte"],
		{ eager: true }
	);
	const Fonts = Object.values(fonts)[0]?.default;
	const rootClass = Object.keys(siteCss).length > 0 ? "fx-root dark" : "lp-root dark";

	const demos = import.meta.glob<{ default: Component<{ values: PlaygroundValues }> }>(
		"$lib/inspiration/demos/*.svelte",
		{ eager: true }
	);
	const Demo = $derived(
		demos[`/src/lib/inspiration/demos/${data.entry.demo.module}.svelte`]?.default
	);
	const values = $derived<PlaygroundValues>({ ...(data.entry.demo.defaults ?? {}) });
</script>

{#if Fonts}<Fonts />{/if}

<div class="{rootClass} grid min-h-screen place-items-center">
	<div
		data-inspiration-stage
		class="relative overflow-hidden"
		style="width: 400px; height: 250px; background: #0f0f12; border-radius: 12px;"
	>
		{#if Demo}<Demo {values} />{/if}
	</div>
</div>
