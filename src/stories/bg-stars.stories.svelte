<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { StarsBackground } from "$lib/fancy-ui/bg-stars";

	const { Story } = defineMeta({
		title: "Backgrounds/StarsBackground",
		component: StarsBackground,
		tags: ["autodocs"],
		args: {
			factor: 0.05,
			speed: 50,
			stiffness: 50,
			damping: 20,
			starColor: "#fff",
		},
		argTypes: {
			factor: {
				control: { type: "range", min: 0, max: 0.3, step: 0.01 },
				description: "Parallax factor for mouse movement",
			},
			speed: {
				control: { type: "range", min: 10, max: 120, step: 5 },
				description: "Base animation speed in seconds",
			},
			stiffness: {
				control: { type: "range", min: 10, max: 200, step: 10 },
				description: "Spring stiffness for parallax",
			},
			damping: {
				control: { type: "range", min: 5, max: 60, step: 5 },
				description: "Spring damping for parallax",
			},
			starColor: { control: "color", description: "Color of the stars" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-[480px] overflow-hidden rounded-lg border">
		<StarsBackground {...args} class="h-72">
			<div class="relative z-10 flex h-full items-center justify-center">
				<h2 class="text-4xl font-bold text-white">Move your mouse</h2>
			</div>
		</StarsBackground>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Cyan Stars" {template} args={{ starColor: "#67e8f9" }} />

<Story name="Strong Parallax" {template} args={{ factor: 0.15, stiffness: 120 }} />

<Story name="Slow Drift" {template} args={{ speed: 100 }} />
