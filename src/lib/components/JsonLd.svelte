<script lang="ts">
	interface Props {
		/** A schema.org node, or a `@graph` wrapper holding several. */
		data: Record<string, unknown>;
	}

	let { data }: Props = $props();

	/**
	 * Every `<` becomes its JSON unicode escape, so a closing tag hidden in a
	 * string value cannot end the block early — still valid JSON, inert as markup.
	 */
	const json = $derived(JSON.stringify(data).replace(/</g, "\\u003c"));
</script>

<!--
	The tag is written through {@html} rather than as an element: Svelte treats
	the body of a nested <script> as raw text, so an expression placed inside one
	would be emitted verbatim instead of interpolated.
-->
<svelte:head>
	{@html `<script type="application/ld+json">${json}<\/script>`}
</svelte:head>
