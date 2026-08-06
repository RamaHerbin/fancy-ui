<script lang="ts">
	import { onMount } from "svelte";
	import { ToolCall } from "$lib/fancy-ui/tool-call";
	import type { ToolCallData } from "$lib/fancy-ui";

	/** How often the running call's stopwatch refreshes. */
	const TICK_MS = 250;
	/** How long a pretend call runs before another one takes its place. */
	const CYCLE_MS = 9000;
	/** What reduced motion sees instead of a clock that never settles. */
	const STILL_MS = 4200;

	let elapsedMs = $state(0);

	const search: ToolCallData = {
		id: "call_1",
		name: "search_docs",
		status: "done",
		input: { query: "retry policy", limit: 3 },
		output: { hits: 3, top: "billing/retries.md", tookMs: 812 },
		durationMs: 1400,
	};

	const fetching: ToolCallData = $derived({
		id: "call_2",
		name: "fetch_changelog",
		status: "running",
		input: { repo: "acme/billing", since: "2026-07-01" },
		durationMs: elapsedMs,
	});

	const posting: ToolCallData = {
		id: "call_3",
		name: "post_summary",
		status: "error",
		input: { channel: "#releases", blocks: 4 },
		error: "429 Too Many Requests — that channel is rate limited for another 38s.",
		durationMs: 240,
	};

	onMount(() => {
		// A clock that never stops is exactly what reduced motion is asking us not
		// to run, so it gets one plausible reading and no timer at all.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			elapsedMs = STILL_MS;
			return;
		}

		const started = Date.now();
		// Wrapping at the cycle keeps the demo honest: a tool call left open on a
		// docs page for an hour should not claim to have been running for one.
		const timer = setInterval(() => {
			elapsedMs = (Date.now() - started) % CYCLE_MS;
		}, TICK_MS);
		return () => clearInterval(timer);
	});
</script>

<div class="flex w-full max-w-xl flex-col gap-2 p-6">
	<ToolCall call={search} />
	<ToolCall call={fetching} />
	<ToolCall call={posting} />

	<p class="text-muted-foreground mt-2 text-xs">
		Click any header to see what went out and what came back. The failed call opened itself — but
		close it and it stays closed.
	</p>
</div>
