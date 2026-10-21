<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { VariantType } from "./trail-variants.js";

/**
 * ImageTrailCursor - Cursor-following image trail with 18 animation variants.
 *
 * The trail images are rendered by the template; the motion is driven
 * imperatively by a variant class that owns its own pointer listeners, rAF
 * loop and animation timelines. Only the variant switch tears that instance
 * down and rebuilds it.
 */
export interface ImageTrailCursorProps {
	/** Array of image URLs for the trail */
	images?: string[];
	/**
	 * Animation variant: `type1` through `type8`, `pixelated`, the physical
	 * `scale` / `fall` / `gravity` / `flame`, or the fragment reveals
	 * `venetian` / `curtain` / `hexagon` / `liquid` / `zoom-split`. `fall` and
	 * `gravity` measure the container's height.
	 */
	variant?: VariantType;
	/** Additional CSS classes for the container */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
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
let currentVariant: VariantType | null = null;
// Live, not just read at mount: flipping the OS setting mid-session starts or
// stops the trail without remounting the component.
const reduced = useReducedMotion();

/**
 * Clears the inline styles the animation library wrote on the trail elements
 * so a newly constructed variant starts from the stylesheet's own values. The
 * inner element's `background-image` is written by the render, not by the
 * animation, so it is restored after the wipe. Fragment children a reveal
 * variant appended are removed too.
 */
function resetImageStyles() {
	const container = containerRef.value;
	if (!container) return;
	const imgEls = container.querySelectorAll<HTMLDivElement>(".content__img");
	for (const el of imgEls) {
		el.style.cssText = "";
		// reveal variants add fragment children; drop any left behind
		for (const frag of el.querySelectorAll(".content__img-frag")) frag.remove();
		const inner = el.querySelector<HTMLDivElement>(".content__img-inner");
		if (inner) {
			// Preserve background-image set by the render, only clear animation residue
			const bgImage = inner.style.backgroundImage;
			inner.style.cssText = "";
			if (bgImage) inner.style.backgroundImage = bgImage;
		}
	}
}

function teardownVariant() {
	if (currentInstance) {
		currentInstance.destroy();
		currentInstance = null;
	}
	// Wipe what the instance wrote, so a trail stopped by the preference
	// leaves no frozen image on screen.
	resetImageStyles();
}

/**
 * Brings the running instance in line with `variant` and the reduced-motion
 * preference. Under reduced motion no instance exists at all: no pointer
 * listeners, no rAF loop, no timelines, and the trail images stay hidden. An
 * instance already running for the current variant is left alone, so a call
 * that changes nothing never restarts the trail.
 */
function syncVariant() {
	const container = containerRef.value;
	const wanted = !!container && !reduced.value;
	if (wanted && currentInstance && currentVariant === variant) return;

	teardownVariant();
	if (!container || !wanted) return;

	const Variant = variantMap[variant] || variantMap.type1;
	currentInstance = new Variant(container);
	currentVariant = variant;
}

onMounted(() => {
	syncVariant();
});

onBeforeUnmount(() => {
	if (currentInstance) {
		currentInstance.destroy();
		currentInstance = null;
	}
});

// `variant` and the reduced-motion preference are the only dependencies,
// exactly as on the source side: a changed `images` array adds or removes
// trail elements without rebuilding the running instance (which keeps the
// element list it captured at construction). Reproduced rather than corrected
// — the source behaviour is the contract. A non-immediate watch skips the
// first run; the mount itself is handled by `onMounted`. The getter returns a
// fresh tuple on purpose: a preference that flips and flips back before the
// watcher flushes (the first real answer lands at mount) still reaches
// `syncVariant`, which decides from the live state instead of the diff.
watch(
	() => [variant, reduced.value],
	() => {
		syncVariant();
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
