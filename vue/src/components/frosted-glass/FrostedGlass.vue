<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * FrostedGlass — frosted glass surface with an organic, wavy refraction of
 * whatever sits behind it.
 *
 * Four layers stack inside a rounded container:
 *
 * 1. Filter layer — `backdrop-filter: blur(0)` pulls the backdrop into this
 *    element's own rendering, then `filter: url(#...)` pointing at the inline
 *    SVG filter distorts it (`feTurbulence` → `feGaussianBlur` →
 *    `feDisplacementMap`).
 * 2. Overlay — translucent tint (`tint`).
 * 3. Specular — inset highlights simulating a lit glass rim (`highlight`).
 * 4. Content — the default slot.
 *
 * An optional conic-gradient border (`border`) frames the container.
 */
export interface FrostedGlassProps {
	/** Border radius in pixels */
	radius?: number;
	/** Turbulence noise frequency (lower = wider waves) */
	baseFrequency?: number;
	/** Turbulence octaves (detail of the noise) */
	numOctaves?: number;
	/** Turbulence random seed */
	seed?: number;
	/** Gaussian blur softening the noise before displacement */
	noiseBlur?: number;
	/** Displacement intensity */
	scale?: number;
	/** Overlay tint color */
	tint?: string;
	/** Specular rim highlight color */
	highlight?: string;
	/** Show the conic-gradient glass border */
	border?: boolean;
	/** Backdrop blur (px) for the WebKit fallback */
	fallbackBlur?: number;
	/** Backdrop saturation (%) for the WebKit fallback */
	fallbackSaturation?: number;
	/** CSS classes for the content layer */
	class?: HTMLAttributes["class"];
	/** CSS classes for the outer container */
	containerClass?: string;
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { cn } from "../../utils.js";
import { uid } from "../../internals/id.js";

defineOptions({ name: "FrostedGlass", inheritAttrs: false });

const {
	radius = 24,
	baseFrequency = 0.008,
	numOctaves = 2,
	seed = 92,
	noiseBlur = 2,
	scale = 70,
	tint = "hsla(0, 0%, 100%, 0.25)",
	highlight = "hsla(0, 0%, 100%, 0.75)",
	border = true,
	fallbackBlur = 20,
	fallbackSaturation = 180,
	class: className = "",
	containerClass = "",
} = defineProps<FrostedGlassProps>();

defineSlots<{
	/** Content rendered on top of the glass */
	default?(): unknown;
}>();

// The filter id is minted after mount, exactly as the source does: the SVG
// filter and the layer referencing it are absent from the server HTML and
// appear on the first client tick. `uid()` replaces the source's
// `Math.random()` suffix — a monotonic counter cannot collide, and it keeps
// the id ASCII-clean for the `url(#...)` reference below. It is client-only,
// which `onMounted` guarantees.
const filterId = ref("");

const containerStyle = computed(() => ({
	borderRadius: `${radius}px`,
	"--fg-tint": tint,
	"--fg-highlight": highlight,
	"--fg-fallback-blur": `${fallbackBlur}px`,
	"--fg-fallback-saturation": `${fallbackSaturation}%`,
}));

onMounted(() => {
	filterId.value = uid("fg-dist");
});
</script>

<template>
	<div
		:class="cn('frosted-glass', border && 'frosted-glass-border', containerClass)"
		:style="containerStyle"
	>
		<template v-if="filterId">
			<div class="frosted-glass-filter" :style="{ filter: `url(#${filterId})` }"></div>

			<svg class="frosted-glass-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<defs>
					<filter
						:id="filterId"
						x="-50%"
						y="-50%"
						width="200%"
						height="200%"
						filterUnits="objectBoundingBox"
						primitiveUnits="userSpaceOnUse"
						color-interpolation-filters="linearRGB"
					>
						<feTurbulence
							type="fractalNoise"
							:baseFrequency="`${baseFrequency} ${baseFrequency}`"
							:numOctaves="numOctaves"
							:seed="seed"
							stitchTiles="stitch"
							result="noise"
						/>
						<feGaussianBlur in="noise" :stdDeviation="noiseBlur" result="blurred" />
						<feDisplacementMap
							in="SourceGraphic"
							in2="blurred"
							:scale="scale"
							xChannelSelector="R"
							yChannelSelector="G"
						/>
					</filter>
				</defs>
			</svg>
		</template>

		<div class="frosted-glass-overlay"></div>
		<div class="frosted-glass-specular"></div>

		<div :class="cn('frosted-glass-content', className)">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.frosted-glass {
	position: relative;
	display: flex;
	background: transparent;
	overflow: hidden;
	contain: layout paint;
	box-shadow:
		0 2px 4px rgba(0, 0, 0, 0.1),
		0 0 8px rgba(0, 0, 0, 0.05);
}

.frosted-glass-border::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: 4;
	border-radius: inherit;
	padding: 1px;
	background:
		conic-gradient(
			from -75deg at 50% 50%,
			rgba(20, 60, 120, 0.5),
			rgba(150, 200, 255, 0.1) 5% 40%,
			rgba(20, 60, 120, 0.5) 50%,
			rgba(150, 200, 255, 0.1) 60% 95%,
			rgba(20, 60, 120, 0.5)
		),
		linear-gradient(180deg, rgba(220, 240, 255, 0.5), rgba(240, 250, 255, 0.5));
	box-shadow: inset 0 0 0 0.5px rgba(220, 240, 255, 0.5);
	pointer-events: none;
	mask:
		linear-gradient(#fff 0 0) content-box,
		linear-gradient(#fff 0 0);
	mask-composite: exclude;
}

/* backdrop-filter: blur(0) pulls the backdrop into this layer so the SVG
   displacement filter can distort it */
.frosted-glass-filter {
	position: absolute;
	inset: 0;
	z-index: 0;
	backdrop-filter: blur(0);
	isolation: isolate;
	transform: translateZ(0);
	will-change: filter;
	animation: frosted-glass-settle 0.22s ease-out;
}

@keyframes frosted-glass-settle {
	0% {
		opacity: 0;
	}
}

/* Safari can't combine filter:url() with backdrop-filter, so it needs a plain-blur
   fallback. -webkit-named-image is a WebKit-only feature query (Chromium and Firefox
   return false). Ship the -webkit- prefixed backdrop-filter too for Safari and iOS 17 and older. */
@supports (background: -webkit-named-image(i)) {
	.frosted-glass-filter {
		filter: none !important;
		-webkit-backdrop-filter: blur(var(--fg-fallback-blur)) saturate(var(--fg-fallback-saturation));
		backdrop-filter: blur(var(--fg-fallback-blur)) saturate(var(--fg-fallback-saturation));
	}

	.frosted-glass-overlay {
		background: hsla(0, 0%, 100%, 0.5);
	}
}

.frosted-glass-defs {
	position: absolute;
	width: 0;
	height: 0;
}

.frosted-glass-overlay {
	position: absolute;
	inset: 0;
	z-index: 1;
	background: var(--fg-tint);
}

.frosted-glass-specular {
	position: absolute;
	inset: 0;
	z-index: 2;
	border-radius: inherit;
	overflow: hidden;
	box-shadow:
		inset 1px 1px 0 var(--fg-highlight),
		inset 0 0 5px var(--fg-highlight);
}

.frosted-glass-content {
	position: relative;
	z-index: 3;
	display: flex;
	align-items: center;
	width: 100%;
}
</style>
