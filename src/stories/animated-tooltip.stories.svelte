<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AnimatedTooltip, type TooltipItem } from "$lib/fancy-ui/animated-tooltip";

	const people: TooltipItem[] = [
		{
			id: 1,
			name: "John Doe",
			designation: "Software Engineer",
			image: "https://picsum.photos/seed/john/100/100",
		},
		{
			id: 2,
			name: "Jane Smith",
			designation: "Product Manager",
			image: "https://picsum.photos/seed/jane/100/100",
		},
		{
			id: 3,
			name: "Robert Johnson",
			designation: "UX Designer",
			image: "https://picsum.photos/seed/robert/100/100",
		},
		{
			id: 4,
			name: "Emily Brown",
			designation: "Data Scientist",
			image: "https://picsum.photos/seed/emily/100/100",
		},
	];

	const pair: TooltipItem[] = people.slice(0, 2);

	const { Story } = defineMeta({
		title: "Feedback/AnimatedTooltip",
		component: AnimatedTooltip,
		tags: ["autodocs"],
		args: {
			items: people,
		},
		argTypes: {
			items: {
				control: "object",
				description: "Array of items with id, name, designation, and image URL",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex justify-center p-6">
		<AnimatedTooltip {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Two Members" {template} args={{ items: pair }} />
