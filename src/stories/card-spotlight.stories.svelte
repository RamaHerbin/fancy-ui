<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { CardSpotlight } from "$lib/fancy-ui/card-spotlight";

	const { Story } = defineMeta({
		title: "Cards/CardSpotlight",
		component: CardSpotlight,
		tags: ["autodocs"],
		args: {
			gradientSize: 200,
			gradientColor: "#262626",
			gradientOpacity: 0.8,
		},
		argTypes: {
			gradientSize: {
				control: { type: "number" },
				description: "Size of the spotlight gradient in pixels",
			},
			gradientColor: { control: "color", description: "Color of the spotlight gradient" },
			gradientOpacity: {
				control: { type: "number", min: 0, max: 1, step: 0.1 },
				description: "Opacity of the spotlight gradient",
			},
			slotClass: { control: "text", description: "CSS classes for the inner content wrapper" },
		},
	});
</script>

{#snippet template(args: any)}
	<CardSpotlight class="h-64 w-80" {...args}>
		<div class="p-6">
			<h3 class="text-lg font-bold text-white">Spotlight Card</h3>
			<p class="mt-2 text-sm text-neutral-400">
				Hover to see the spotlight effect following your cursor.
			</p>
		</div>
	</CardSpotlight>
{/snippet}

<Story name="Default" {template} />

<Story name="Blue Spotlight" {template} args={{ gradientColor: "#1d4ed8", gradientSize: 260 }} />

<Story name="Subtle" {template} args={{ gradientOpacity: 0.4 }} />
