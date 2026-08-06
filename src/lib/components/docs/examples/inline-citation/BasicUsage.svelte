<script lang="ts">
	import { InlineCitation } from "$lib/fancy-ui/inline-citation";
	import type { SourceData } from "$lib/fancy-ui/_internals/ai-types.js";

	const decoding: SourceData = {
		id: "s1",
		title: "Constrained decoding for structured tool calls",
		url: "https://www.example.com/papers/constrained-decoding",
		snippet:
			"Sampling under a grammar removes the parse-and-retry loop entirely: an invalid token is never drawn, so there is nothing left to repair downstream.",
	};

	const reranking: SourceData = {
		id: "s2",
		title: "Measuring retrieval quality after reranking",
		url: "https://research.example.org/notes/rerank-metrics",
		domain: "research.example.org",
		snippet:
			"Recall at k stops being informative once a reranker sits between retrieval and the model; what matters is whether the passage survived into the context window.",
	};

	const latency: SourceData = {
		id: "s3",
		title: "Latency budgets in agent loops",
		url: "https://www.example.net/blog/agent-latency",
		snippet:
			"Every tool round trip costs a full forward pass over the growing transcript, so the second call is never as cheap as the first.",
	};

	// `onOpen` fires once per appearance rather than once per hover event, which
	// is what turns it into "which sources did the reader actually open" instead
	// of a raw pointer count.
	let opened = $state<string[]>([]);

	function markOpened(id: string) {
		if (opened.includes(id)) return;
		opened = [...opened, id];
	}
</script>

<div class="w-full max-w-xl p-6">
	<p class="text-sm leading-7">
		Structured output is a decoding constraint rather than a prompting technique<InlineCitation
			source={decoding}
			index={1}
			onOpen={() => markOpened(decoding.id)}
		/>, which is why the guarantee survives a raised temperature. Retrieval is the half that stays
		stubbornly empirical: recall at k says less than you would hope once a reranker sits in the
		middle<InlineCitation source={reranking} index={2} onOpen={() => markOpened(reranking.id)} />.
		And each extra tool call is paid for twice — once in the round trip, once in the longer
		transcript the next forward pass has to read<InlineCitation
			source={latency}
			index={3}
			onOpen={() => markOpened(latency.id)}
		/>.
	</p>

	<p class="text-muted-foreground mt-5 border-t pt-3 text-xs">
		Hover a marker, or press <kbd class="bg-muted rounded px-1 py-0.5 font-mono">Tab</kbd> to reach
		one and watch its card open on focus;
		<kbd class="bg-muted rounded px-1 py-0.5 font-mono">Esc</kbd> dismisses it.
		{#if opened.length > 0}
			<span class="text-foreground">Opened {opened.length} of 3.</span>
		{/if}
	</p>
</div>
