<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FallingStarsBg } from "$lib/fancy-ui/bg-falling-stars";

	const { Story } = defineMeta({
		title: "Backgrounds/FallingStarsBg",
		component: FallingStarsBg,
		tags: ["autodocs"],
		args: {
			color: "#FFF",
			count: 200,
		},
		argTypes: {
			color: { control: "color", description: "Star color as hex string" },
			count: {
				control: { type: "range", min: 20, max: 600, step: 20 },
				description: "Number of stars",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative h-72 w-[480px] overflow-hidden rounded-lg border bg-black">
		<FallingStarsBg {...args} />
		<div class="relative z-10 flex h-full items-center justify-center">
			<h2 class="text-4xl font-bold text-white">Falling Stars</h2>
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Cyan Stars" {template} args={{ color: "#22d3ee" }} />

<Story name="Dense Field" {template} args={{ count: 500 }} />

<Story name="Sparse Amber" {template} args={{ color: "#fbbf24", count: 80 }} />
