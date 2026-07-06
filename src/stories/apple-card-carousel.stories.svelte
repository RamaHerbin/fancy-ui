<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AppleCardCarousel } from "$lib/fancy-ui/apple-card-carousel";
	import type { AppleCardData } from "$lib/fancy-ui/apple-card-carousel";

	const cards: AppleCardData[] = [
		{
			category: "Nature",
			title: "Misty Mountains",
			src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60",
			description:
				"A breathtaking view of misty mountains at dawn, where layers of fog weave between ancient peaks.",
		},
		{
			category: "Architecture",
			title: "Brutalist Forms",
			src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&auto=format&fit=crop&q=60",
			description: "Raw concrete and bold geometry define this brutalist landmark.",
		},
		{
			category: "Ocean",
			title: "Deep Blue",
			src: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop&q=60",
			description: "Beneath the surface, an entire world exists in silence.",
		},
		{
			category: "Urban",
			title: "City Lights",
			src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop&q=60",
			description: "The city never sleeps. From dusk to dawn, millions of lives intersect.",
		},
		{
			category: "Desert",
			title: "Sand & Silence",
			src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&auto=format&fit=crop&q=60",
			description:
				"The desert teaches patience. Endless dunes shift imperceptibly under a relentless sun.",
		},
	];

	const { Story } = defineMeta({
		title: "Cards/AppleCardCarousel",
		component: AppleCardCarousel,
		tags: ["autodocs"],
		args: {
			cards,
		},
		argTypes: {
			cards: { control: "object", description: "Cards to display in the carousel" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="overflow-hidden py-8">
		<AppleCardCarousel {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Two Cards" {template} args={{ cards: cards.slice(0, 2) }} />
