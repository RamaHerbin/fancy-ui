<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";

	// FluidCursor defaults to `contained`, so the WebGL simulation stays inside its
	// (relative) parent container rather than covering the whole canvas.
	const { Story } = defineMeta({
		title: "Effects/FluidCursor",
		component: FluidCursor,
		tags: ["autodocs"],
		args: {
			splatRadius: 0.2,
			curl: 3,
			colorIntensity: 0.15,
			densityDissipation: 3.5,
		},
		argTypes: {
			splatRadius: { control: "number", description: "Radius of fluid splats" },
			curl: { control: "number", description: "Amount of curl/vorticity" },
			colorIntensity: { control: "number", description: "Intensity of color mixing" },
			densityDissipation: {
				control: "number",
				description: "Rate at which density fades",
			},
			fluidColor: {
				control: "color",
				description: "Override all fluid with a single color",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative h-64 w-full overflow-hidden rounded-lg border">
		<FluidCursor {...args} />
		<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
			<p class="text-muted-foreground text-sm select-none">Move your cursor here</p>
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Custom Color" {template} args={{ fluidColor: "#00ffcc", colorIntensity: 0.4 }} />
