<script lang="ts">
	import { onMount } from "svelte";
	import { Sources } from "$lib/fancy-ui/sources";
	import type { SourceData } from "$lib/fancy-ui/_internals/ai-types.js";

	const answer =
		"Readers rarely click a citation — they look at it. So the pill has to carry enough signal on its own to say where an answer came from, and open into something scannable for the one time in ten that looking is not enough.";

	const sources: SourceData[] = [
		{
			id: "s1",
			title: "Designing citation surfaces for generated answers",
			url: "https://docs.example.dev/patterns/citations",
			domain: "docs.example.dev",
			snippet: "A citation is a promise that the answer can be checked, not a footnote.",
		},
		{
			id: "s2",
			title: "Retrieval quality and the illusion of grounding",
			url: "https://research.example.org/papers/grounding",
			domain: "research.example.org",
			snippet: "Four plausible sources under a wrong answer make it read as a right one.",
		},
		{
			id: "s3",
			title: "Why readers glance at sources instead of opening them",
			url: "https://notes.example.net/reading-citations",
			domain: "notes.example.net",
			snippet: "The host name does most of the work; the title does the rest.",
		},
		{
			id: "s4",
			title: "A field guide to attribution in assistant answers",
			url: "https://handbook.example.io/attribution",
			domain: "handbook.example.io",
			snippet: "Say where it came from before anyone has to ask.",
		},
	];

	let open = $state(false);
	// Set by the pill's own onToggle, which only fires on a real click — the rig
	// drives `open` through the binding and so never trips it. Plain let: nothing
	// renders from it.
	let readerTookOver = false;

	onMount(() => {
		// The preview opens itself once so the expansion is visible without a
		// click; reduced motion gets the pill at rest instead, still interactive.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let timer: ReturnType<typeof setTimeout>;

		function cycle(next: boolean, after: number) {
			timer = setTimeout(() => {
				if (readerTookOver) return;
				open = next;
				cycle(!next, next ? 5200 : 1600);
			}, after);
		}

		cycle(true, 1200);
		return () => clearTimeout(timer);
	});
</script>

<div class="bg-card flex w-full max-w-xl flex-col gap-3 rounded-lg border p-5">
	<p class="text-sm leading-relaxed">{answer}</p>

	<Sources {sources} bind:open onToggle={() => (readerTookOver = true)} />
</div>
