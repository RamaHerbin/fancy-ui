<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { DirectionAwareHover } from "$lib/fancy-ui/direction-aware-hover";

	const { Story } = defineMeta({
		title: "Cards/DirectionAwareHover",
		component: DirectionAwareHover,
		tags: ["autodocs"],
		args: {
			imageUrl: "https://picsum.photos/seed/peak/800/600",
		},
		argTypes: {
			imageUrl: { control: "text", description: "URL of the background image" },
			imageAlt: { control: "text", description: "Alt text for the image" },
			childrenClass: {
				control: "text",
				description: "CSS classes for the overlay content wrapper",
			},
			imageClass: { control: "text", description: "CSS classes for the image element" },
		},
	});
</script>

{#snippet template(args: any)}
	<DirectionAwareHover {...args}>
		<p class="text-xl font-bold">Mountain Peak</p>
		<p class="text-sm font-normal">Swiss Alps, Switzerland</p>
	</DirectionAwareHover>
{/snippet}

<Story name="Default" {template} />

{#snippet callToAction(args: any)}
	<DirectionAwareHover {...args}>
		<p class="text-xl font-bold">Autumn Trail</p>
		<p class="mt-1 text-sm font-normal">Discover the season &rarr;</p>
	</DirectionAwareHover>
{/snippet}

<Story
	name="Alternate Image"
	template={callToAction}
	args={{ imageUrl: "https://picsum.photos/seed/autumn/800/600" }}
/>
