<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { DisplacementText } from "$lib/fancy-ui/displacement-text";

	const { Story } = defineMeta({
		title: "Text/DisplacementText",
		component: DisplacementText,
		tags: ["autodocs"],
		args: {
			text: "Hover Me",
			fontSize: 160,
			font: "Inter, sans-serif",
			lightColor: "#000000",
			darkColor: "#ffffff",
		},
		argTypes: {
			text: { control: "text", description: "Text to display" },
			fontSize: { control: "number", description: "Font size in pixels" },
			font: { control: "text", description: "Font family" },
			color: { control: "color", description: "Fixed text color (overrides theme colors)" },
			lightColor: { control: "color", description: "Text color in light mode" },
			darkColor: { control: "color", description: "Text color in dark mode" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex h-64 w-full items-center justify-center">
		<DisplacementText {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Fixed Color" {template} args={{ text: "Liquid", color: "#8b5cf6" }} />

<Story name="Large" {template} args={{ text: "Warp", fontSize: 220 }} />
