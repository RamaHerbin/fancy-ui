<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { VariantType } from "./trail-variants.js";

/**
 * ImageTrailCursor - Cursor-following image trail with 9 animation variants.
 *
 * The trail images are rendered by the template; the motion is driven
 * imperatively by a variant class that owns its own pointer listeners, rAF
 * loop and animation timelines. Only the variant switch tears that instance
 * down and rebuilds it.
 */
export interface ImageTrailCursorProps {
	/** Array of image URLs for the trail */
	images?: string[];
	/** Animation variant (`type1` through `type8`, or `pixelated`) */
	variant?: VariantType;
	/** Additional CSS classes for the container */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { variantMap, type ImageTrailVariant } from "./trail-variants.js";

defineOptions({ name: "ImageTrailCursor", inheritAttrs: false });

const {
	images = [],
	variant = "type1",
	class: className = "",
} = defineProps<ImageTrailCursorProps>();

const containerRef = useTemplateRef<HTMLDivElement>("container");
let currentInstance: ImageTrailVariant | null = null;

/**
 * Clears the inline styles the animation library wrote on the trail elements
 * so a newly constructed variant starts from the stylesheet's own values. The
 * inner element's `background-image` is written by the render, not by the
 * animation, so it is restored after the wipe.
 */
function resetImageStyles() {
	const container = containerRef.value;
	if (!container) return;
	const imgEls = container.querySelectorAll<HTMLDivElement>(".content__img");
	for (const el of imgEls) {
		el.style.cssText = "";
		const inner = el.querySelector<HTMLDivElement>(".content__img-inner");
		if (inner) {
			// Preserve background-image set by the render, only clear animation residue
			const bgImage = inner.style.backgroundImage;
			inner.style.cssText = "";
			if (bgImage) inner.style.backgroundImage = bgImage;
		}
	}
}

function initializeVariant() {
	if (!containerRef.value) return;

	if (currentInstance) {
		currentInstance.destroy();
		currentInstance = null;
	}

	resetImageStyles();

	const Variant = variantMap[variant] || variantMap.type1;
	currentInstance = new Variant(containerRef.value);
}

onMounted(() => {
	initializeVariant();
});

onBeforeUnmount(() => {
	if (currentInstance) {
		currentInstance.destroy();
		currentInstance = null;
	}
});

// `variant` is the only dependency, exactly as on the source side: the effect
// there tracks `variant` and nothing else, so a changed `images` array adds or
// removes trail elements without rebuilding the running instance (which keeps
// the element list it captured at construction). Reproduced rather than
// corrected — the source behaviour is the contract. A non-immediate watch
// skips the first run the way the source's `mounted` flag does.
watch(
	() => variant,
	() => {
		initializeVariant();
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="container"
		:class="
			cn('relative z-[100] h-full w-full overflow-visible rounded-lg bg-transparent', className)
		"
		:style="{ touchAction: 'none' }"
	>
		<!--
			Keyed on `variant + i` like the source's each block: switching variant
			remounts every trail element, so no animation-written inline style
			survives the switch.
		-->
		<div
			v-for="(image, i) in images"
			:key="variant + i"
			class="content__img absolute top-0 left-0 aspect-[1.1] w-[120px] overflow-hidden rounded-[10px] opacity-0 [will-change:transform,filter] sm:w-[190px] sm:rounded-[15px]"
		>
			<div
				class="content__img-inner absolute top-[-10px] left-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)] bg-cover bg-center"
				:style="{ backgroundImage: `url(${image})` }"
			></div>
		</div>
	</div>
</template>
