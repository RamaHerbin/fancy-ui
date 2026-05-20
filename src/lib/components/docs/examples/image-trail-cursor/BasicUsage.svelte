<script lang="ts">
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
</script>

<div class="relative h-[500px] cursor-crosshair overflow-hidden rounded-lg border">
	<ImageTrailCursor {images} variant="type1" />
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		<p class="text-muted-foreground/50 text-lg select-none">Move your cursor here</p>
	</div>
</div>
