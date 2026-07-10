<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { MatrixRain } from "$lib/fancy-ui/matrix-rain";

	const { Story } = defineMeta({
		title: "Backgrounds/MatrixRain",
		component: MatrixRain,
		tags: ["autodocs"],
		args: {
			color: "#00ff41",
			speed: 1.0,
			density: 1.0,
			glyphSize: 16,
			fadeOpacity: 0.05,
		},
		argTypes: {
			color: { control: "color", description: "Glyph color (the classic Matrix green)" },
			speed: { control: "number", description: "Fall speed multiplier (< 1 slower, > 1 faster)" },
			density: { control: "number", description: "Column density multiplier" },
			glyphSize: { control: "number", description: "Font size of each glyph in pixels" },
			fadeOpacity: {
				control: "number",
				description: "Opacity of the black overlay used to create trailing fade effect",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="h-64 w-96 overflow-hidden rounded-lg bg-neutral-950">
		<MatrixRain class="h-full w-full" {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Amber Fast" {template} args={{ color: "#ffb000", speed: 2 }} />

<Story name="Dense Small Glyphs" {template} args={{ density: 2, glyphSize: 12 }} />
