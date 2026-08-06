<script lang="ts" module>
	import type { BlockToken } from "./markdown.js";

	export interface MarkdownProps {
		/** Markdown source. Safe to update on every streamed chunk. */
		text?: string;
		class?: string;
		/**
		 * Already-parsed blocks, used when the component renders itself for a
		 * blockquote. Consumers pass `text`.
		 */
		blocks?: BlockToken[];
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { parseMarkdown } from "./markdown.js";
	import MarkdownInline from "./MarkdownInline.svelte";
	import Self from "./Markdown.svelte";

	let { text = "", class: className, blocks }: MarkdownProps = $props();

	let nodes = $derived(blocks ?? parseMarkdown(text));
</script>

<div class={cn("ft-md", className)}>
	{#each nodes as block}
		{#if block.type === "paragraph"}
			<p class="ft-md-p"><MarkdownInline tokens={block.children} /></p>
		{:else if block.type === "heading"}
			<svelte:element this={`h${block.depth}`} class="ft-md-h" data-depth={block.depth}>
				<MarkdownInline tokens={block.children} />
			</svelte:element>
		{:else if block.type === "code"}
			<pre class="ft-md-pre" data-lang={block.lang || null}><code>{block.text}</code></pre>
		{:else if block.type === "list"}
			{#if block.ordered}
				<ol class="ft-md-ol" start={block.start}>
					{#each block.items as item}
						<li><MarkdownInline tokens={item} /></li>
					{/each}
				</ol>
			{:else}
				<ul class="ft-md-ul">
					{#each block.items as item}
						<li><MarkdownInline tokens={item} /></li>
					{/each}
				</ul>
			{/if}
		{:else if block.type === "blockquote"}
			<blockquote class="ft-md-quote"><Self blocks={block.children} /></blockquote>
		{:else if block.type === "table"}
			<div class="ft-md-table-scroll">
				<table class="ft-md-table">
					<thead>
						<tr>
							{#each block.header as cell, i}
								<th style:text-align={block.align[i] ?? undefined}>
									<MarkdownInline tokens={cell} />
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each block.rows as row}
							<tr>
								{#each row as cell, i}
									<td style:text-align={block.align[i] ?? undefined}>
										<MarkdownInline tokens={cell} />
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if block.type === "hr"}
			<hr class="ft-md-hr" />
		{/if}
	{/each}
</div>

<style>
	/*
	 * Typographic normalization, not a theme. Rendered markdown has to stay
	 * legible in a host app whose reset has stripped list markers and heading
	 * scale, so these defaults restore structure and nothing else — no palette,
	 * no font stack, no spacing opinions beyond the flow rhythm. Every value the
	 * host is likely to disagree with reads from a custom property first, and
	 * colours are mixed from `currentColor` so a dark surface needs no override.
	 *
	 * Styles are scoped. The blockquote branch renders this same component
	 * recursively, and a recursive instance is still this component class, so it
	 * carries the same scoping class and inherits every rule below — no :global
	 * escape needed. Inline marks (code spans, links, emphasis) belong to
	 * MarkdownInline and are styled there.
	 */

	.ft-md {
		line-height: 1.6;
	}

	/* One rhythm for every block, whatever margins the UA or reset supplies. */
	.ft-md > * {
		margin: 0;
	}

	.ft-md > * + * {
		margin-block-start: 0.75em;
	}

	.ft-md > * + .ft-md-h {
		margin-block-start: 1.25em;
	}

	.ft-md > * + .ft-md-hr,
	.ft-md > .ft-md-hr + * {
		margin-block-start: 1em;
	}

	.ft-md-h {
		font-weight: 600;
		line-height: 1.25;
	}

	.ft-md-h[data-depth="1"] {
		font-size: 1.5em;
	}

	.ft-md-h[data-depth="2"] {
		font-size: 1.3em;
	}

	.ft-md-h[data-depth="3"] {
		font-size: 1.15em;
	}

	.ft-md-h[data-depth="4"] {
		font-size: 1.05em;
	}

	.ft-md-h[data-depth="5"] {
		font-size: 1em;
	}

	.ft-md-h[data-depth="6"] {
		font-size: 0.95em;
	}

	.ft-md-ul {
		list-style: disc;
		padding-inline-start: 1.5em;
	}

	.ft-md-ol {
		list-style: decimal;
		padding-inline-start: 1.5em;
	}

	.ft-md-quote {
		border-inline-start: 3px solid
			var(--ft-md-quote-border, color-mix(in oklab, currentColor 25%, transparent));
		padding-inline-start: 0.75em;
		color: var(--ft-md-quote-color, color-mix(in oklab, currentColor 75%, transparent));
	}

	.ft-md-pre {
		background: var(--ft-md-code-bg, color-mix(in oklab, currentColor 8%, transparent));
		border-radius: 6px;
		padding: 0.75em 1em;
		overflow-x: auto;
		font-size: 0.9em;
		line-height: 1.5;
	}

	/* The wrapper scrolls so a wide table never widens the whole message. */
	.ft-md-table-scroll {
		overflow-x: auto;
	}

	.ft-md-table {
		border-collapse: collapse;
	}

	.ft-md-table th,
	.ft-md-table td {
		border: 1px solid var(--ft-md-border, color-mix(in oklab, currentColor 15%, transparent));
		padding: 0.35em 0.6em;
	}

	.ft-md-table th {
		font-weight: 600;
	}

	.ft-md-hr {
		border: 0;
		border-block-start: 1px solid
			var(--ft-md-border, color-mix(in oklab, currentColor 15%, transparent));
	}
</style>
