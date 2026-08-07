<script lang="ts" module>
	import type { InlineToken } from "./markdown.js";

	export interface MarkdownInlineProps {
		tokens: InlineToken[];
	}
</script>

<script lang="ts">
	import Self from "./MarkdownInline.svelte";

	let { tokens }: MarkdownInlineProps = $props();
</script>

<!--
	Whitespace between the branches below would show up in the rendered text, so
	the markup stays tightly packed.
-->
{#each tokens as token}{#if token.type === "text"}{token.text}{:else if token.type === "code"}<code
			class="ft-md-code">{token.text}</code
		>{:else if token.type === "strong"}<strong><Self tokens={token.children} /></strong
		>{:else if token.type === "em"}<em><Self tokens={token.children} /></em
		>{:else if token.type === "del"}<del><Self tokens={token.children} /></del
		>{:else if token.type === "link" && token.href !== null}<a
			class="ft-md-link"
			href={token.href}
			rel="noopener noreferrer nofollow ugc"
			target="_blank"><Self tokens={token.children} /></a
		>{:else}<Self tokens={token.children} />{/if}{/each}

<style>
	/*
	 * The inline half of the markdown defaults; block elements are styled in
	 * Markdown.svelte. Both marks below go invisible under a reset that strips
	 * link underlines and code backgrounds, which is what makes them worth
	 * shipping. Colours mix from `currentColor` so they follow the surface, and
	 * both read from a custom property first so a host can restyle them.
	 */

	.ft-md-code {
		background: var(--ft-md-code-bg, color-mix(in oklab, currentColor 8%, transparent));
		border-radius: 4px;
		padding: 0.1em 0.35em;
		font-size: 0.9em;
	}

	.ft-md-link {
		color: var(--ft-md-link, inherit);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.ft-md-link:hover {
		opacity: 0.8;
	}
</style>
