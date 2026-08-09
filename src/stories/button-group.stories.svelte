<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Button } from "$lib/fancy-ui/button";
	import { ButtonGroup } from "$lib/fancy-ui/button-group";

	const { Story } = defineMeta({
		title: "Actions/ButtonGroup",
		component: ButtonGroup,
		tags: ["autodocs"],
		args: {
			orientation: "horizontal",
		},
		argTypes: {
			orientation: {
				control: "select",
				options: ["horizontal", "vertical"],
				description: "Stacking axis for the joined items",
			},
			label: { control: "text", description: "Accessible name for the group" },
		},
	});

	let active = $state("Day");
</script>

{#snippet basic(args: any)}
	<ButtonGroup {...args} label="Clipboard actions">
		<Button variant="outline">Cut</Button>
		<Button variant="outline">Copy</Button>
		<Button variant="outline">Paste</Button>
	</ButtonGroup>
{/snippet}

{#snippet segmented(args: any)}
	<ButtonGroup {...args} label="Time range">
		{#each ["Day", "Week", "Month"] as range (range)}
			<Button variant={range === active ? "secondary" : "ghost"} onclick={() => (active = range)}>
				{range}
			</Button>
		{/each}
	</ButtonGroup>
{/snippet}

{#snippet split(args: any)}
	<ButtonGroup {...args} label="Save document">
		<Button variant="secondary">Save</Button>
		<Button variant="secondary" class="px-[10px]" label="More save options">▼</Button>
	</ButtonGroup>
{/snippet}

{#snippet vertical(args: any)}
	<ButtonGroup {...args} orientation="vertical" label="Panel position">
		<Button variant="outline">Top</Button>
		<Button variant="outline">Middle</Button>
		<Button variant="outline">Bottom</Button>
	</ButtonGroup>
{/snippet}

<Story name="Basic" template={basic} />

<Story name="Segmented Control" template={segmented} />

<Story name="Split Button" template={split} />

<Story name="Vertical" template={vertical} />
