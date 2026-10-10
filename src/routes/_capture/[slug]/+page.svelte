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

	// Lazy glob: each demo is its own chunk, fetched only once the load has
	// passed, and only in the browser (the route server-renders for its gate).
	type DemoComponent = Component<{ values: PlaygroundValues }>;
	const demos = import.meta.glob<{ default: DemoComponent }>("$lib/inspiration/demos/*.svelte");
	let Demo = $state<DemoComponent | null>(null);
	$effect(() => {
		const loadDemo = demos[`/src/lib/inspiration/demos/${data.entry.demo.module}.svelte`];
		let alive = true;
		void loadDemo?.().then((mod) => {
			if (alive) Demo = mod.default;
		});
		return () => {
			alive = false;
		};
	});
	const values = $derived<PlaygroundValues>({ ...(data.entry.demo.defaults ?? {}) });
</script>

{#if Fonts}<Fonts />{/if}

<div class="{rootClass} grid min-h-screen place-items-center">
	{#if Demo}
		<div
			data-inspiration-stage
			class="relative overflow-hidden"
			style="width: 400px; height: 250px; background: #0f0f12; border-radius: 12px;"
		>
			<Demo {values} />
		</div>
	{/if}
</div>
