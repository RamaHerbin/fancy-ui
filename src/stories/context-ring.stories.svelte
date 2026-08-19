<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ContextRing } from "$lib/fancy-ui/context-ring";

	const { Story } = defineMeta({
		title: "AI Chat/ContextRing",
		component: ContextRing,
		tags: ["autodocs"],
		args: {
			usage: { used: 12_400, max: 200_000 },
		},
		argTypes: {
			usage: { description: "Tokens used, out of how many, and optionally of what" },
			size: {
				control: { type: "range", min: 12, max: 72, step: 2 },
				description: "Outer diameter of the ring, in pixels",
			},
			strokeWidth: {
				control: { type: "range", min: 1, max: 10, step: 0.5 },
				description: "Thickness of the track and the arc, in pixels",
			},
			showLabel: { control: "boolean", description: "Show the compact figure beside the ring" },
			warnAt: {
				control: { type: "range", min: 0, max: 1, step: 0.05 },
				description: "Fraction at which the ring leaves the quiet band",
			},
			criticalAt: {
				control: { type: "range", min: 0, max: 1, step: 0.05 },
				description: "Fraction at which the ring turns to the error colour",
			},
			label: { control: "text", description: "Accessible name for the meter" },
			expandable: {
				control: "boolean",
				description: "Clicking the ring opens a popover listing usage.breakdown",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="p-8">
		<ContextRing {...args} />
	</div>
{/snippet}

<Story name="Comfortable" {template} />

<Story name="Warning" {template} args={{ usage: { used: 164_000, max: 200_000 } }} />

<Story name="Critical" {template} args={{ usage: { used: 192_500, max: 200_000 } }} />

<Story name="Over Budget" {template} args={{ usage: { used: 260_000, max: 200_000 } }} />

<Story name="Ring Only" {template} args={{ showLabel: false, size: 40, strokeWidth: 5 }} />

<Story
	name="Expandable"
	{template}
	args={{
		size: 34,
		strokeWidth: 4,
		expandable: true,
		usage: {
			used: 84_300,
			max: 200_000,
			breakdown: [
				{ label: "System prompt", tokens: 1850 },
				{ label: "Transcript", tokens: 61_200 },
				{ label: "Tool results", tokens: 18_400 },
				{ label: "Attachments", tokens: 2850 },
			],
		},
	}}
/>
