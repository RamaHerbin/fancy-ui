<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ReasoningPanel } from "$lib/fancy-ui/reasoning-panel";

	const TRACE =
		"The user wants the total per region, but the orders table only stores a city. " +
		"There is a `regions` lookup table with a `city_id` foreign key — that joins cleanly. " +
		"An inner join would drop cities with no region row, so a left join it is, bucketing " +
		"the leftovers as “Unassigned”.";

	const { Story } = defineMeta({
		title: "AI Agents/ReasoningPanel",
		component: ReasoningPanel,
		tags: ["autodocs"],
		args: {
			text: TRACE,
			streaming: false,
			label: "Reasoning",
			maxHeight: "12rem",
			durationMs: 12000,
		},
		argTypes: {
			text: { control: "text", description: "The reasoning trace so far" },
			streaming: {
				control: "boolean",
				description:
					"Whether the trace is still growing — drives the timer, shimmer, and autoscroll",
			},
			open: {
				control: "boolean",
				description: "Expanded state; left undefined the panel manages it itself",
			},
			label: { control: "text", description: "Header text" },
			since: {
				control: "number",
				description: "Epoch ms the current burst started at, pinning the live timer",
			},
			durationMs: {
				control: "number",
				description: "Final duration for the summary line",
			},
			maxHeight: { control: "text", description: "Scroll height of the trace once expanded" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<ReasoningPanel {...args} />
	</div>
{/snippet}

<Story name="Collapsed" {template} />

<Story name="Open" {template} args={{ open: true }} />

<Story
	name="Streaming"
	{template}
	args={{ streaming: true, since: Date.now() - 8000, durationMs: undefined }}
/>

<Story
	name="Long Trace"
	{template}
	args={{ open: true, text: `${TRACE}\n\n${TRACE}\n\n${TRACE}`, maxHeight: "8rem" }}
/>
