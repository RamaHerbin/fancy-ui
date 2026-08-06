<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { StreamingText } from "$lib/fancy-ui/streaming-text";

	const markdownSource = `**Markdown mode** re-parses the whole document on every chunk:

- structure appears as soon as a line is complete
- inline \`code\` and **emphasis** resolve mid-sentence

There is no delta tint in this mode.`;

	const { Story } = defineMeta({
		title: "AI Chat/StreamingText",
		component: StreamingText,
		tags: ["autodocs"],
		args: {
			text: "The consumer hands over the whole text so far; only what grew since the last update animates.",
			streaming: false,
			markdown: false,
			settleMs: 350,
			tintColor: "",
		},
		argTypes: {
			text: {
				control: "text",
				description: "Accumulated text so far — reassign with a longer string as chunks arrive",
			},
			streaming: {
				control: "boolean",
				description: "Show a soft block cursor after the last character",
			},
			markdown: {
				control: "boolean",
				description: "Render as markdown instead of the tinted plain-text stream",
			},
			settleMs: {
				control: "number",
				description: "How long a newly arrived chunk stays tinted, in ms (plain mode only)",
			},
			tintColor: {
				control: "color",
				description: "Colour a chunk fades from, and the cursor's fill",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="max-w-xl p-6 text-sm leading-relaxed">
		<StreamingText {...args} />
	</div>
{/snippet}

<Story name="Static" {template} />

<Story name="Streaming" {template} args={{ streaming: true }} />

<Story
	name="Tinted"
	{template}
	args={{
		text: "Set tintColor and the arriving chunk fades in from it, cursor included.",
		streaming: true,
		tintColor: "#6366f1",
	}}
/>

<Story name="Markdown" {template} args={{ text: markdownSource, markdown: true }} />
