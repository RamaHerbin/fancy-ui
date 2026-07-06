<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FlipCard } from "$lib/fancy-ui/flip-card";

	const { Story } = defineMeta({
		title: "Cards/FlipCard",
		component: FlipCard,
		tags: ["autodocs"],
		args: {
			rotate: "y",
		},
		argTypes: {
			rotate: {
				control: "inline-radio",
				options: ["x", "y"],
				description: "Axis of rotation for the flip effect",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<FlipCard {...args}>
		<div
			class="flex size-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
		>
			<p class="text-2xl font-bold text-white">Front</p>
		</div>
		{#snippet back()}
			<div class="flex size-full flex-col items-center justify-center bg-neutral-900">
				<p class="text-lg font-semibold text-white">Back Side</p>
				<p class="mt-2 text-sm text-slate-400">Hover to flip</p>
			</div>
		{/snippet}
	</FlipCard>
{/snippet}

<Story name="Default" {template} />

<Story name="X Axis Rotation" {template} args={{ rotate: "x" }} />
