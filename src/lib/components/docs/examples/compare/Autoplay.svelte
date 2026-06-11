<script lang="ts">
	import { Compare } from "$lib/fancy-ui/compare";
</script>

<div class="flex justify-center">
	<Compare
		firstImage="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
		secondImage="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80"
		firstImageAlt="Mountain peak"
		secondImageAlt="Mountain range"
		autoplay
		autoplayDuration={3000}
		class="rounded-lg"
	/>
</div>
