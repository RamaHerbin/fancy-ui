<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { Compare } from "$lib/fancy-ui/compare";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="h-full w-full overflow-hidden">
	<Compare
		firstImage="/landing/trail/01.webp"
		secondImage="/landing/trail/02.webp"
		firstImageAlt="Trail, before"
		secondImageAlt="Trail, after"
		slideMode={values.slideMode as "hover" | "drag"}
		initialSliderPercentage={values.initialSliderPercentage as number}
		class="h-full w-full"
	/>
</div>
