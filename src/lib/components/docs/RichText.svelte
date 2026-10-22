<!--
	RichText — renders the segments `tx()` returns for a message with inline tags.

	Tags map to elements: <b> -> <strong>, <grad> -> <span class="grad">,
	<solid> -> <span class="solid"> (the Introduction lead styles both in every
	skin), <link> -> <a>. Nothing is rendered as HTML: text segments are plain
	text nodes, so a translation can never inject markup.

	Usage:
		<RichText segments={tx("intro.cta.body")} />
		<RichText segments={tx("tg.intro")} links="/docs/getting-started/theming" />
-->
<script lang="ts">
	import type { Segment } from "$lib/i18n/format.js";

	interface Props {
		segments: Segment[];
		/** href for `<link>` tags: one value for all of them, or one per tag in order of appearance. */
		links?: string | string[];
		/** Class on the `<a>` elements. */
		linkClass?: string;
	}

	interface Numbered {
		seg: Segment;
		/** Ordinal among the <link> tags, in document order. */
		link?: number;
		kids?: Numbered[];
	}

	let { segments, links = [], linkClass }: Props = $props();

	function hrefFor(index: number): string | undefined {
		return typeof links === "string" ? links : links[index];
	}

	/** Pre-computes each link's ordinal so nested rendering stays pure. */
	const numbered = $derived.by(() => {
		let n = 0;
		const walk = (list: Segment[]): Numbered[] =>
			list.map((s) =>
				s.type === "text"
					? { seg: s }
					: { seg: s, link: s.type === "link" ? n++ : -1, kids: walk(s.children) }
			);
		return walk(segments);
	});
</script>

{#snippet render(nodes: Numbered[])}
	{#each nodes as node, i (i)}
		{#if node.seg.type === "text"}
			{node.seg.text}
		{:else if node.seg.type === "b"}
			<strong>{@render render(node.kids ?? [])}</strong>
		{:else if node.seg.type === "grad"}
			<span class="grad">{@render render(node.kids ?? [])}</span>
		{:else if node.seg.type === "solid"}
			<span class="solid">{@render render(node.kids ?? [])}</span>
		{:else if node.seg.type === "link"}
			<a href={hrefFor(node.link ?? 0)} class={linkClass}>{@render render(node.kids ?? [])}</a>
		{/if}
	{/each}
{/snippet}

{@render render(numbered)}
