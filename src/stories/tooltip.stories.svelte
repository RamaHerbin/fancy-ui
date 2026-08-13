<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Tooltip } from "$lib/fancy-ui/tooltip";

	const { Story } = defineMeta({
		title: "Overlays/Tooltip",
		component: Tooltip,
		tags: ["autodocs"],
		args: {
			content: "Add to favorites",
			side: "top",
			align: "center",
			offset: 6,
			openDelay: 500,
			closeDelay: 0,
			disabled: false,
		},
		argTypes: {
			content: { control: "text", description: "The tooltip's text" },
			side: {
				control: "select",
				options: ["top", "right", "bottom", "left"],
				description: "Side of the trigger to place the tooltip on",
			},
			align: {
				control: "select",
				options: ["start", "center", "end"],
				description: "Alignment along the trigger's cross axis",
			},
			offset: {
				control: "number",
				description: "Gap in pixels between the trigger and the tooltip",
			},
			openDelay: { control: "number", description: "Delay in ms before a hover opens it" },
			closeDelay: { control: "number", description: "Delay in ms before it closes" },
			disabled: { control: "boolean", description: "Suppresses the tooltip entirely" },
		},
	});
</script>

{#snippet template(args: any)}
	<Tooltip {...args}>
		<button
			class="border-border text-foreground rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium"
		>
			Hover or focus me
		</button>
	</Tooltip>
{/snippet}

<Story name="Default" {template} />

<Story name="Bottom" {template} args={{ side: "bottom" }} />

<Story name="No open delay" {template} args={{ openDelay: 0 }} />

<Story name="Disabled" {template} args={{ disabled: true }} />
