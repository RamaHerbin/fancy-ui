<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * LiquidGlass - glass-like refraction built on an SVG displacement filter
 *
 * The element measures itself with a ResizeObserver, paints a displacement map
 * as an inline SVG data URI at that exact size, and points `backdrop-filter` at
 * a filter that displaces the red, green and blue channels by slightly
 * different amounts, which is what produces the chromatic edge.
 */
export interface LiquidGlassProps {
	/** Border radius in px */
	radius?: number;
	/** Border thickness factor */
	border?: number;
	/** HSL lightness of fill */
	lightness?: number;
	/** Gaussian blur std deviation */
	displace?: number;
	/** SVG blend mode */
	blend?: string;
	/** X displacement channel */
	xChannel?: "R" | "G" | "B";
	/** Y displacement channel */
	yChannel?: "R" | "G" | "B";
	/** Fill opacity */
	alpha?: number;
	/** Inner blur */
	blur?: number;
	/** Red channel offset */
	rOffset?: number;
	/** Green channel offset */
	gOffset?: number;
	/** Blue channel offset */
	bOffset?: number;
	/** Displacement scale */
	scale?: number;
	/** Frosted overlay opacity */
	frost?: number;
	/** Backdrop blur in pixels for the Safari fallback */
	fallbackBlur?: number;
	/** Backdrop saturation percentage for the Safari fallback */
	fallbackSaturation?: number;
	/** CSS classes for the inner container */
	class?: HTMLAttributes["class"];
	/** CSS classes for the outer container */
	containerClass?: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, type CSSProperties } from "vue";
import { cn } from "../../utils.js";
import { uid } from "../../internals/id.js";

defineOptions({ name: "LiquidGlass", inheritAttrs: false });

const {
	radius = 16,
	border: borderProp = 0.07,
	lightness = 50,
	displace,
	blend = "difference",
	xChannel = "R",
	yChannel = "B",
	alpha = 0.93,
	blur = 11,
	rOffset = 0,
	gOffset = 10,
	bOffset = 20,
	scale = -180,
	frost = 0.05,
	fallbackBlur = 20,
	fallbackSaturation = 180,
	class: className = "",
	containerClass = "",
} = defineProps<LiquidGlassProps>();

defineSlots<{ default?(): unknown }>();

const liquidGlassRoot = useTemplateRef<HTMLDivElement>("liquidGlassRoot");
const dimensions = ref({ width: 0, height: 0 });
const filterId = ref("");

// A `computed` is lazy and cached, so the kilobyte string and its URI encoding
// run only when the filter that reads them is on screen and only when one of
// their inputs actually changed — the laziness the Svelte source gets from a
// `$derived.by` read inside its `{#if filterId}` block.
const displacementDataUri = computed(() => {
	if (!filterId.value) return "";

	const brd = Math.min(dimensions.value.width, dimensions.value.height) * (borderProp * 0.5);

	const displacementImage = `<svg viewBox="0 0 ${dimensions.value.width} ${dimensions.value.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="red-${filterId.value}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="blue-${filterId.value}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect x="0" y="0" width="${dimensions.value.width}" height="${dimensions.value.height}" fill="black"/><rect x="0" y="0" width="${dimensions.value.width}" height="${dimensions.value.height}" rx="${radius}" fill="url(#red-${filterId.value})"/><rect x="0" y="0" width="${dimensions.value.width}" height="${dimensions.value.height}" rx="${radius}" fill="url(#blue-${filterId.value})" style="mix-blend-mode:${blend}"/><rect x="${brd}" y="${brd}" width="${dimensions.value.width - brd * 2}" height="${dimensions.value.height - brd * 2}" rx="${radius}" fill="hsl(0 0% ${lightness}% / ${alpha})" style="filter:blur(${blur}px)"/></svg>`;

	return `data:image/svg+xml,${encodeURIComponent(displacementImage)}`;
});

// Same declaration order as the Svelte source's style string, and the same two
// shapes: `backdrop-filter` only appears once the filter it points at does.
// An object, not a string: a style string goes through `cssText`, which drops
// custom properties.
const backdropStyle = computed<CSSProperties>(() => ({
	"--frost": frost,
	borderRadius: `${radius}px`,
	...(filterId.value ? { backdropFilter: `url(#displacementFilter-${filterId.value})` } : null),
	"--lg-fallback-blur": `${fallbackBlur}px`,
	"--lg-fallback-saturation": `${fallbackSaturation}%`,
}));

onMounted(() => {
	// The filter id is minted here, after mount, exactly where the Svelte source
	// mints it in `onMount`. It is what keeps two instances on one page from
	// sharing a filter, and it must never reach the server HTML — an id the
	// client alone ever sees cannot disagree with a server render. `uid()` is the
	// counter kept for exactly that case (it throws when called on the server),
	// so nothing random runs and no two instances can collide.
	filterId.value = uid("lg");

	const node = liquidGlassRoot.value;
	if (!node) return;

	const observer = new ResizeObserver((entries) => {
		const entry = entries[0];
		if (!entry) return;

		let width = 0;
		let height = 0;

		if (entry.borderBoxSize && entry.borderBoxSize.length) {
			width = entry.borderBoxSize[0]!.inlineSize;
			height = entry.borderBoxSize[0]!.blockSize;
		} else if (entry.contentRect) {
			width = entry.contentRect.width;
			height = entry.contentRect.height;
		}

		dimensions.value = { width, height };
	});

	observer.observe(node);

	onBeforeUnmount(() => observer.disconnect());
});
</script>

<template>
	<div
		ref="liquidGlassRoot"
		:class="cn('liquid-glass-effect', containerClass)"
		:style="backdropStyle"
	>
		<div :class="cn('liquid-glass-slot', className)">
			<slot />
		</div>

		<svg v-if="filterId" class="liquid-glass-filter" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<filter :id="`displacementFilter-${filterId}`" color-interpolation-filters="sRGB">
					<feImage
						x="0"
						y="0"
						width="100%"
						height="100%"
						:href="displacementDataUri"
						result="map"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="map"
						:xChannelSelector="xChannel"
						:yChannelSelector="yChannel"
						:scale="scale + rOffset"
						result="dispRed"
					/>
					<feColorMatrix
						in="dispRed"
						type="matrix"
						values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
						result="red"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="map"
						:xChannelSelector="xChannel"
						:yChannelSelector="yChannel"
						:scale="scale + gOffset"
						result="dispGreen"
					/>
					<feColorMatrix
						in="dispGreen"
						type="matrix"
						values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
						result="green"
					/>
					<feDisplacementMap
						in="SourceGraphic"
						in2="map"
						:xChannelSelector="xChannel"
						:yChannelSelector="yChannel"
						:scale="scale + bOffset"
						result="dispBlue"
					/>
					<feColorMatrix
						in="dispBlue"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
						result="blue"
					/>
					<feBlend in="red" in2="green" mode="screen" result="rg" />
					<feBlend in="rg" in2="blue" mode="screen" result="output" />
					<feGaussianBlur v-if="displace !== undefined" :stdDeviation="displace" />
				</filter>
			</defs>
		</svg>
	</div>
</template>

<style scoped>
.liquid-glass-effect {
	position: relative;
	display: block;
	opacity: 1;
	border-radius: inherit;
	background: light-dark(hsl(0 0% 100% / var(--frost, 0)), hsl(0 0% 0% / var(--frost, 0)));
	box-shadow:
		0 0 2px 1px
			light-dark(
				color-mix(in oklch, canvasText, #0000 85%),
				color-mix(in oklch, canvasText, #0000 90%)
			)
			inset,
		0 0 10px 4px
			light-dark(
				color-mix(in oklch, canvasText, #0000 90%),
				color-mix(in oklch, canvasText, #0000 95%)
			)
			inset,
		0px 4px 16px rgba(17, 17, 26, 0.05),
		0px 8px 24px rgba(17, 17, 26, 0.05),
		0px 16px 56px rgba(17, 17, 26, 0.05),
		0px 4px 16px rgba(17, 17, 26, 0.05) inset,
		0px 8px 24px rgba(17, 17, 26, 0.05) inset,
		0px 16px 56px rgba(17, 17, 26, 0.05) inset;
}

/* Safari cannot resolve SVG url() references inside backdrop-filter, so it needs a
   plain-blur fallback. -webkit-named-image is a WebKit-only feature query (Chromium
   and Firefox return false), so this never overrides Chromium's working SVG filter.
   Ship the -webkit- prefixed backdrop-filter too for Safari and iOS 17 and older. */
@supports (background: -webkit-named-image(i)) {
	.liquid-glass-effect {
		-webkit-backdrop-filter: blur(var(--lg-fallback-blur)) saturate(var(--lg-fallback-saturation)) !important;
		backdrop-filter: blur(var(--lg-fallback-blur)) saturate(var(--lg-fallback-saturation)) !important;
	}
}

.liquid-glass-slot {
	width: 100%;
	height: 100%;
	overflow: hidden;
	border-radius: inherit;
}

.liquid-glass-filter {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
}
</style>
