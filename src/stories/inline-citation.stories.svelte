<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { InlineCitation } from "$lib/fancy-ui/inline-citation";

	const source = {
		id: "s1",
		title: "Constrained decoding for structured tool calls",
		url: "https://www.example.com/papers/constrained-decoding",
		snippet:
			"Sampling under a grammar removes the parse-and-retry loop entirely: an invalid token is never drawn, so there is nothing to repair downstream.",
	};

	const { Story } = defineMeta({
		title: "AI Chat/InlineCitation",
		component: InlineCitation,
		tags: ["autodocs"],
		args: {
			source,
			index: 1,
		},
		argTypes: {
			index: { control: "number", description: "The reference number; 3 renders [3]" },
			href: {
				control: "text",
				description: 'Link target; defaults to source.url, "" renders an unlinked marker',
			},
		},
	});
</script>

{#snippet template(args: any)}
	<p class="max-w-md p-6 text-sm leading-relaxed">
		Structured output is a decoding constraint rather than a prompting technique<InlineCitation
			{...args}
		/>, which is why the guarantee survives a raised temperature. Hover the marker, or tab to it.
	</p>
{/snippet}

<Story name="In Paragraph" {template} />

<Story name="Unlinked" {template} args={{ href: "", index: 2 }} />
