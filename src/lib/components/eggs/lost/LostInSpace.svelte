<script lang="ts">
	import { onMount } from "svelte";
	import { createMotionState } from "$lib/stores";
	import { FallingStarsBg } from "$lib/fancy-ui/bg-falling-stars/index.js";
	import { Meteors } from "$lib/fancy-ui/meteors/index.js";
	import { EGGS, EGG_TOTAL } from "../registry.js";
	import { createEggsState, markFound } from "../discovery.svelte.js";
	import { slugsFromSitemap } from "./slugs.js";

	const motion = createMotionState();
	// Hidden eggs stay out of the count, or the line could read 8 / 7.
	const eggs = createEggsState(
		EGG_TOTAL,
		EGGS.filter((e) => !e.hidden).map((e) => e.id)
	);

	// SSR and the first client render agree on the index href; the random
	// destination and the counter only appear after mount (no hydration mismatch).
	let target = $state("/docs/components");
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		// Best effort: offline or a failed fetch keeps the index as the destination.
		void fetch("/sitemap.xml")
			.then((res) => (res.ok ? res.text() : ""))
			.then((xml) => {
				const slugs = slugsFromSitemap(xml);
				if (slugs.length > 0) {
					target = "/docs/components/" + slugs[Math.floor(Math.random() * slugs.length)];
				}
			})
			.catch(() => {});
	});
</script>

<!-- Behind the error copy (the page wrapper is `isolate`), masked clear around it so the
     streaks never cross the heading or the links. -->
<div aria-hidden="true" class="lost-sky pointer-events-none absolute inset-0 -z-10 overflow-hidden">
	{#if mounted && !motion.paused}
		<FallingStarsBg color="currentColor" count={140} class="opacity-30 dark:opacity-60" />
		<Meteors count={12} seed={404} />
	{:else}
		<div class="lost-glow absolute inset-0"></div>
	{/if}
</div>

<!-- In normal flow below the error copy: an absolute strip overlapped the report link on
     short viewports. -->
<div class="relative flex justify-center px-4 pb-10">
	<div class="flex flex-col items-center gap-2 text-center">
		<a data-egg="teleport" href={target} class="lost-action" onclick={() => markFound("lost")}>
			Teleport me somewhere ✦
		</a>
		{#if mounted}
			<p data-egg-count class="lost-muted text-xs">{eggs.count} / {eggs.total} secrets found</p>
		{/if}
	</div>
</div>

<style>
	.lost-sky {
		mask-image: radial-gradient(ellipse 55% 45% at 50% 40%, transparent 0%, black 70%);
	}
	/* Static stand-in for the starfield when decorative motion is paused. */
	.lost-glow {
		background: radial-gradient(
			ellipse 60% 50% at 50% 40%,
			color-mix(in oklab, var(--foreground) 10%, transparent),
			transparent 70%
		);
	}
	/* Same look as the error page's secondary action, scoped here so a skin's
	   global `a { color }` rule cannot recolour it. */
	.lost-action,
	.lost-action:hover {
		display: inline-flex;
		align-items: center;
		border-radius: 0.75rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		text-decoration: none;
		border: 1px solid var(--border);
		color: var(--foreground);
		transition: background-color 0.15s;
	}
	.lost-action {
		background: var(--card);
	}
	.lost-action:hover {
		background: var(--accent);
	}
	.lost-action:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}
	.lost-muted {
		color: color-mix(in oklab, var(--foreground) 72%, transparent);
	}
</style>
