<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { LiquidText } from "$lib/fancy-ui/liquid-text";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="relative flex h-full w-full items-center justify-center overflow-hidden px-8">
	<!-- fontSize 0 auto-fits the word to the card's width; staticBelow 0 keeps
	     the sim live whatever the viewport width, since the card is small anyway. -->
	<LiquidText
		text="Liquid"
		fontSize={0}
		fontWeight={750}
		darkColor="#f2f1ec"
		lightColor="#f2f1ec"
		staticBelow={0}
		strength={values.strength as number}
		radius={values.radius as number}
		chromaticRatio={values.chromaticRatio as number}
	/>
</div>
