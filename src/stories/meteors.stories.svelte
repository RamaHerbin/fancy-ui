<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Meteors } from "$lib/fancy-ui/meteors";

	const { Story } = defineMeta({
		title: "Effects/Meteors",
		component: Meteors,
		tags: ["autodocs"],
		args: {
			count: 20,
		},
		argTypes: {
			count: {
				control: { type: "range", min: 5, max: 60, step: 5 },
				description: "Number of meteors to render",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div
		class="relative flex h-64 w-[480px] items-center justify-center overflow-hidden rounded-xl border bg-neutral-950 p-6"
	>
		<p class="z-10 text-center text-white">Meteor shower</p>
		<Meteors {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Sparse" {template} args={{ count: 8 }} />

<Story name="Dense" {template} args={{ count: 50 }} />
