<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TextRoll } from "$lib/fancy-ui/text-roll";

	const { Story } = defineMeta({
		title: "Text/TextRoll",
		component: TextRoll,
		tags: ["autodocs"],
		args: {
			value: "1,204",
			direction: "auto",
			duration: 300,
			stagger: 15,
			from: "first",
			tabular: false,
			live: "off",
		},
		argTypes: {
			value: {
				control: "text",
				description: "The text to display; a change after mount rolls to it",
			},
			direction: {
				control: "select",
				options: ["auto", "up", "down"],
				description: '"auto" compares the trimmed old/new values as numbers (up for an increase)',
			},
			duration: { control: "number", description: "Roll duration in ms" },
			stagger: {
				control: "number",
				description: "Per-cell delay step in ms, before compression to a 200ms total",
			},
			from: {
				control: "select",
				options: ["first", "last", "center"],
				description: "Stagger origin",
			},
			tabular: {
				control: "boolean",
				description: "font-variant-numeric: tabular-nums on both internal layers",
			},
			live: {
				control: "select",
				options: ["off", "polite", "assertive"],
				description: "role/aria-live pair on the real text layer only",
			},
		},
	});
</script>

<script lang="ts">
	let tickerValue = $state(1204);
</script>

{#snippet template(args: any)}
	<div class="flex h-32 w-full items-center justify-center">
		<TextRoll {...args} class="text-foreground text-4xl font-semibold" />
	</div>
{/snippet}

{#snippet tickerTemplate(args: any)}
	<div class="flex h-32 w-full flex-col items-center justify-center gap-4">
		<TextRoll
			{...args}
			value={String(tickerValue)}
			class="text-foreground text-4xl font-semibold"
		/>
		<button
			type="button"
			class="border-border text-foreground rounded-md border px-3 py-1.5 text-sm"
			onclick={() => (tickerValue += 1)}
		>
			+1
		</button>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Count down" {template} args={{ value: "42", direction: "down" }} />

<Story name="Tabular numbers" {template} args={{ value: "$1,204", tabular: true }} />

<Story
	name="Slow stagger from center"
	{template}
	args={{ duration: 600, stagger: 60, from: "center" }}
/>

<Story name="Live announcement" {template} args={{ live: "polite" }} />

<Story name="Interactive counter" template={tickerTemplate} args={{ tabular: true }} />
