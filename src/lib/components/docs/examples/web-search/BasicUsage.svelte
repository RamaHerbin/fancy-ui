<script lang="ts">
	import { onMount } from "svelte";
	import { WebSearch } from "$lib/fancy-ui/web-search";

	const QUERY = "postgres connection pool exhausted under load";

	const HITS = [
		{
			id: "h1",
			title: "Why your pool runs dry before your database does",
			url: "https://www.example.dev/posts/pool-exhaustion",
			snippet:
				"Connection limits are usually reached by leaked handles rather than by traffic. The give-away is a pool that never recovers after the spike passes.",
		},
		{
			id: "h2",
			title: "Sizing a connection pool",
			url: "https://notes.example.org/pool-sizing",
			snippet:
				"A pool larger than the server's max_connections turns a queue you can observe into an error you cannot.",
		},
		{
			id: "h3",
			title: "Tracking down a leaked transaction",
			url: "https://example.net/guides/leaked-transactions",
			snippet:
				"pg_stat_activity tells you which query is holding a connection open and for how long it has been idle in transaction.",
		},
		{
			id: "h4",
			title: "Backpressure beats a bigger pool",
			url: "https://blog.example.com/backpressure",
			snippet: "Queueing at the edge fails a request in milliseconds instead of in thirty seconds.",
		},
	];

	/** The beat between two hits arriving. */
	const HIT_MS = 700;
	/** How long the finished list sits before the search runs again. */
	const REPLAY_MS = 2600;

	let results = $state<typeof HITS>([]);
	let searching = $state(true);

	let timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		// Nothing to stage when motion is reduced: the finished list is the state
		// the whole sequence was building towards anyway.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			results = HITS;
			searching = false;
			return;
		}

		tick();
		return () => clearTimeout(timer);
	});

	function tick() {
		// Whether this is the last hit or the pause before starting over is decided
		// before the wait, since it is what sets the wait's length.
		const done = results.length === HITS.length;

		timer = setTimeout(
			() => {
				if (done) {
					results = [];
					searching = true;
				} else {
					results = HITS.slice(0, results.length + 1);
					// The last hit landing is also the end of the search.
					searching = results.length < HITS.length;
				}
				tick();
			},
			done ? REPLAY_MS : HIT_MS
		);
	}
</script>

<!--
	The loop empties the list to start over, which without a floor under the block
	would drop the page by the height of four rows and pull everything below it up
	— once every cycle, forever. The floor is the full state's height, so the
	sequence plays inside a box that never changes size.
-->
<div class="min-h-[24rem] w-full max-w-xl">
	<WebSearch sound query={QUERY} {results} {searching} />
</div>
