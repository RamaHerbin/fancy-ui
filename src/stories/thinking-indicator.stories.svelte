<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ThinkingIndicator } from "$lib/fancy-ui/thinking-indicator";

	const { Story } = defineMeta({
		title: "AI Agents/ThinkingIndicator",
		component: ThinkingIndicator,
		tags: ["autodocs"],
		args: {
			status: "Reading files",
			running: true,
			variant: "inline",
			showElapsed: true,
		},
		argTypes: {
			status: { control: "text", description: "What the agent is doing right now" },
			running: {
				control: "boolean",
				description: "Whether the activity is in flight: drives the shimmer and the live timer",
			},
			variant: {
				control: "inline-radio",
				options: ["inline", "pill"],
				description: "Bare text row, or a bordered chip with a leading pulse dot",
			},
			since: {
				control: "number",
				description: "Epoch ms the activity started; the internal stopwatch ticks from it",
			},
			elapsedMs: {
				control: "number",
				description: "Externally-driven elapsed time in ms; overrides the internal stopwatch",
			},
			showElapsed: { control: "boolean", description: "Show the elapsed duration" },
		},
	});

	// Stories with a live timer start it when the module loads rather than baking
	// a fixed timestamp into their args, which would drift further off on reload.
	const startedAt = Date.now();
</script>

{#snippet template(args: any)}
	<div class="flex min-h-24 w-full items-center justify-center">
		<ThinkingIndicator {...args} />
	</div>
{/snippet}

<!-- The `done` snippet cannot travel through args, so the finished state gets its own template. -->
{#snippet finished(args: any)}
	<div class="flex min-h-24 w-full items-center justify-center">
		<ThinkingIndicator {...args}>
			{#snippet done()}
				Thought for 12s
			{/snippet}
		</ThinkingIndicator>
	</div>
{/snippet}

<Story name="Default" {template} args={{ since: startedAt }} />

<Story name="Pill" {template} args={{ variant: "pill", status: "Searching the web" }} />

<Story
	name="Pill With Live Timer"
	{template}
	args={{ variant: "pill", status: "Running tests", since: startedAt - 45_000 }}
/>

<Story
	name="External Elapsed"
	{template}
	args={{ status: "Editing files", elapsedMs: 3_780_000 }}
/>

<Story
	name="No Elapsed"
	{template}
	args={{ status: "Planning the next step", showElapsed: false }}
/>

<Story
	name="Finished"
	template={finished}
	args={{ status: "Reading files", running: false, showElapsed: false }}
/>
