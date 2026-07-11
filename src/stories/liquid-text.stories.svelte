<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { LiquidText } from "$lib/fancy-ui/liquid-text";

	const { Story } = defineMeta({
		title: "Text/LiquidText",
		component: LiquidText,
		tags: ["autodocs"],
		args: {
			text: "Liquid",
			font: "",
			fontSize: 160,
			fontWeight: 700,
			lightColor: "#000000",
			darkColor: "#ffffff",
			strength: 0.5,
			radius: 160,
			forceGain: 17,
			dissipation: 0.98,
			viscosity: 4,
			chromaticRatio: 0.2,
			staticBelow: 1024,
			interactive: true,
			pauseWhenHidden: true,
		},
		argTypes: {
			text: { control: "text", description: "Text to display" },
			font: {
				control: "text",
				description: "Font family; empty string resolves via getComputedStyle(host).fontFamily",
			},
			fontSize: {
				control: "number",
				description: "Font size in pixels; 0 auto-fits to the container width",
			},
			fontWeight: { control: "text", description: "Font weight" },
			lightColor: { control: "color", description: "Text color in light mode" },
			darkColor: { control: "color", description: "Text color in dark mode" },
			strength: { control: "number", description: "Geometric UV warp gain" },
			radius: { control: "number", description: "Splat radius in screen pixels" },
			forceGain: { control: "number", description: "Mouse-delta to force multiplier" },
			dissipation: { control: "number", description: "Per-frame velocity decay factor" },
			viscosity: {
				control: "number",
				description: "Jacobi viscous diffusion strength (8 iterations)",
			},
			chromaticRatio: {
				control: "number",
				description: "Chromatic offset as a ratio of the warp",
			},
			staticBelow: {
				control: "number",
				description: "innerWidth at/below which the component renders as static DOM text",
			},
			interactive: {
				control: "boolean",
				description: "Whether pointer movement drives the fluid simulation",
			},
			pauseWhenHidden: {
				control: "boolean",
				description: "Pause the render loop while the document is hidden",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex h-64 w-full items-center justify-center">
		<LiquidText {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Strong Warp" {template} args={{ text: "Warp", strength: 0.9, chromaticRatio: 0.4 }} />

<Story name="Large" {template} args={{ text: "Flow", fontSize: 220 }} />
