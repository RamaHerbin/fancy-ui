<script lang="ts">
	import { onMount } from "svelte";
	import { ReasoningPanel } from "$lib/fancy-ui/reasoning-panel";

	const TRACE = [
		"The user wants the total per region, but the orders table only stores a city.",
		" So I need the city → region mapping before anything else can be aggregated.",
		" There is a `regions` lookup table with a `city_id` foreign key — that joins cleanly.",
		" One catch: cities with no region row would vanish under an inner join.",
		" A left join keeps them and buckets them as “Unassigned”, which is the safer default.",
		" Grouping on the region name rather than its id keeps the output readable.",
	];

	/** How long a finished trace rests before the loop starts over. */
	const REST_MS = 1200;
	const CHUNK_MS = 220;

	let text = $state("");
	let streaming = $state(false);
	let since = $state<number | undefined>(undefined);
	let open = $state<boolean | undefined>(undefined);

	onMount(() => {
		// A looping demo that keeps re-animating is exactly what reduced motion is
		// asking us not to do, so it gets the finished trace, expanded and still.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			text = TRACE.join("");
			open = true;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < TRACE.length) {
				text += TRACE[i];
				i += 1;
				timer = setTimeout(tick, CHUNK_MS);
				return;
			}
			streaming = false;
			timer = setTimeout(restart, REST_MS);
		}

		function restart() {
			text = "";
			i = 0;
			streaming = true;
			since = Date.now();
			timer = setTimeout(tick, CHUNK_MS);
		}

		restart();
		return () => clearTimeout(timer);
	});
</script>

<div class="w-full max-w-xl">
	<ReasoningPanel {text} {streaming} {since} bind:open label="Reasoning" />
	<p class="text-muted-foreground mt-3 text-xs">
		Streams while it thinks, then folds itself into a summary. Click the header at any point and it
		stays exactly where you left it.
	</p>
</div>
