<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { Sparkles } from "$lib/fancy-ui/sparkles/index.js";
	import type { EggContext } from "../types.js";

	/** How long the sparkle layer plays before handing over to party mode. */
	const BURST_MS = 1500;

	let { ctx }: { ctx: EggContext } = $props();

	let chainTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		// Reduced motion: caption only, no particles and no chained confetti.
		if (ctx.reducedMotion) return;
		chainTimer = setTimeout(() => {
			chainTimer = undefined;
			void ctx.trigger("cheatcode");
		}, BURST_MS);
	});

	onDestroy(() => {
		if (chainTimer !== undefined) clearTimeout(chainTimer);
	});
</script>

<div class="absolute inset-0" data-logo-burst>
	{#if !ctx.reducedMotion}
		<Sparkles
			background="transparent"
			particleColor="#fde68a"
			minSize={0.6}
			maxSize={2.4}
			speed={3}
			particleDensity={60}
			class="absolute inset-0"
		/>
	{/if}
	<p
		aria-hidden="true"
		class="bg-popover text-popover-foreground border-border absolute bottom-6 left-1/2 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-lg"
	>
		✦ You found the spark.
	</p>
</div>
