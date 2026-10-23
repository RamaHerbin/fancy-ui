<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { Compare } from "$lib/fancy-ui/compare";
	import HdrBadge from "$lib/components/inspiration/HdrBadge.svelte";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="relative h-full w-full overflow-hidden">
	<Compare
		firstImage="/landing/trail/01.webp"
		secondImage="/landing/trail/02.webp"
		firstImageAlt="Trail, before"
		secondImageAlt="Trail, after"
		slideMode={values.slideMode as "hover" | "drag"}
		initialSliderPercentage={values.initialSliderPercentage as number}
		hdr={values.hdr === true}
		class="h-full w-full"
	/>
	<HdrBadge />
</div>
