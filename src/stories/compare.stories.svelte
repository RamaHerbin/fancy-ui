<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Compare } from "$lib/fancy-ui/compare";

	const { Story } = defineMeta({
		title: "Media/Compare",
		component: Compare,
		tags: ["autodocs"],
		args: {
			firstImage: "https://picsum.photos/seed/forest/800/600",
			secondImage: "https://picsum.photos/seed/mountains/800/600",
			firstImageAlt: "Forest in autumn",
			secondImageAlt: "Mountains at sunrise",
			initialSliderPercentage: 50,
			slideMode: "hover",
			showHandlebar: true,
			autoplay: false,
			autoplayDuration: 5000,
		},
		argTypes: {
			firstImage: { control: "text", description: "URL of the first (left) image" },
			secondImage: { control: "text", description: "URL of the second (right) image" },
			firstImageAlt: { control: "text", description: "Alt text for the first image" },
			secondImageAlt: { control: "text", description: "Alt text for the second image" },
			initialSliderPercentage: {
				control: { type: "number", min: 0, max: 100 },
				description: "Initial slider position (0-100)",
			},
			slideMode: {
				control: "inline-radio",
				options: ["hover", "drag"],
				description: "How the slider is controlled",
			},
			showHandlebar: { control: "boolean", description: "Show the drag handle bar" },
			autoplay: {
				control: "boolean",
				description: "Automatically animate the slider back and forth",
			},
			autoplayDuration: {
				control: { type: "number" },
				description: "Duration of one autoplay cycle in ms",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex justify-center">
		<Compare class="h-64 w-96 rounded-lg" {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Drag Mode" {template} args={{ slideMode: "drag" }} />

<Story name="Autoplay" {template} args={{ autoplay: true, autoplayDuration: 4000 }} />
