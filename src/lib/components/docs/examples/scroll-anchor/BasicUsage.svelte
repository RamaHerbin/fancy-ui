<script lang="ts">
	import { onMount } from "svelte";
	import { ScrollAnchor } from "$lib/fancy-ui/scroll-anchor";

	/** How long each line waits before the next one lands. */
	const TICK_MS = 800;
	/** How long the finished transcript sits there before the run starts over. */
	const HOLD_MS = 3200;

	const LINES = [
		"Reading the billing schema…",
		"`invoices` has a `status` column, four values.",
		"Only `open` and `past_due` count as owed.",
		"Joining `customers` to get a name per row.",
		"Two customers have no row in `customers` — left join, then.",
		"Grouping by customer, summing `amount_due`.",
		"Ordering by the total, largest first.",
		"Capping at twenty so the answer stays readable.",
		"Running it against the read replica…",
		"18 rows. Two of them are the same customer under different ids.",
		"Folding those together on `email`.",
		"17 rows. That's the answer.",
	];

	let shown = $state(1);
	let streaming = $state(true);

	onMount(() => {
		// A transcript that never stops arriving is exactly what reduced motion is
		// asking us not to run, so it gets the finished thing and no timer at all.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			shown = LINES.length;
			streaming = false;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;

		function step() {
			if (shown < LINES.length) {
				shown += 1;
				timer = setTimeout(step, TICK_MS);
				return;
			}
			// Start over rather than stop: a docs page left open should still have
			// something to scroll away from an hour later.
			timer = setTimeout(() => {
				shown = 1;
				timer = setTimeout(step, TICK_MS);
			}, HOLD_MS);
		}

		timer = setTimeout(step, TICK_MS);
		return () => clearTimeout(timer);
	});
</script>

<div class="flex w-full max-w-lg flex-col gap-3 p-6">
	<ScrollAnchor
		active={streaming}
		maxHeight="13rem"
		class="border-border bg-card/50 rounded-lg border"
	>
		<div class="flex flex-col gap-2 p-4 font-mono text-xs leading-relaxed">
			{#each LINES.slice(0, shown) as line, i (`${line}#${i}`)}
				<p class="text-muted-foreground">{line}</p>
			{/each}
		</div>
	</ScrollAnchor>

	<p class="text-muted-foreground text-xs">
		The region stays pinned to the last line while the transcript grows. Scroll up mid-stream and it
		lets go — a “Jump to latest” pill appears, and pressing it hands the region back to the stream.
	</p>
</div>
