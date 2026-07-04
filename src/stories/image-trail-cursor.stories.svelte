<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ImageTrailCursor } from "$lib/fancy-ui/image-trail-cursor";

	const images = [
		"https://picsum.photos/seed/trail1/400/440",
		"https://picsum.photos/seed/trail2/400/440",
		"https://picsum.photos/seed/trail3/400/440",
		"https://picsum.photos/seed/trail4/400/440",
		"https://picsum.photos/seed/trail5/400/440",
		"https://picsum.photos/seed/trail6/400/440",
		"https://picsum.photos/seed/trail7/400/440",
		"https://picsum.photos/seed/trail8/400/440",
	];

	// The trail is confined to its (relative) parent container, so it stays inside
	// the sized demo area below rather than hijacking the whole canvas.
	const { Story } = defineMeta({
		title: "Effects/ImageTrailCursor",
		component: ImageTrailCursor,
		tags: ["autodocs"],
		args: {
			images,
			variant: "type1",
		},
		argTypes: {
			images: { control: "object", description: "Array of image URLs to show in the trail" },
			variant: {
				control: "select",
				options: ["type1", "type2", "type3", "type4", "type5", "type6", "type7", "type8"],
				description: "Animation variant controlling how images appear and move",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative h-[500px] w-full cursor-crosshair overflow-hidden rounded-lg border">
		<ImageTrailCursor {...args} />
		<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
			<p class="text-muted-foreground text-lg font-medium select-none">Move your cursor here</p>
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Rotation" {template} args={{ variant: "type5" }} />

<Story name="Perspective 3D" {template} args={{ variant: "type8" }} />
