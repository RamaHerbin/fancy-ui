<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface StarsBackgroundProps {
	/**
	 * Parallax factor for mouse movement (default: 0.05)
	 */
	factor?: number;
	/**
	 * Base animation speed in seconds (default: 50)
	 */
	speed?: number;
	/**
	 * Spring stiffness for parallax (default: 50)
	 */
	stiffness?: number;
	/**
	 * Spring damping for parallax (default: 20)
	 */
	damping?: number;
	/**
	 * Color of the stars (default: #fff)
	 */
	starColor?: string;
	/**
	 * Seed for the star layout. The same seed always produces the same sky.
	 * The Svelte source scatters stars with `Math.random()` in a client-only
	 * effect (its box-shadows start empty and appear after mount), which
	 * would differ between a server render and its hydration; the port
	 * derives the layout from a deterministic PRNG instead, keyed on this
	 * seed (default: 1). Two consequences, both divergences from the Svelte
	 * API: the stars are present in the server-rendered HTML rather than
	 * painted in on mount, and a seed names the same sky here as it does in
	 * the React package for the same `starColor`.
	 */
	seed?: number;
	/**
	 * Additional CSS classes
	 */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createBgStars, generateStars, type BgStarsEngine } from "./bg-stars-core.js";

defineOptions({ name: "StarsBackground", inheritAttrs: false });

defineSlots<{
	/** Content rendered on top of the star field */
	default?(): unknown;
}>();

const {
	factor = 0.05,
	speed = 50,
	stiffness = 50,
	damping = 20,
	starColor = "#fff",
	seed = 1,
	class: className,
} = defineProps<StarsBackgroundProps>();

/**
 * mulberry32 — a tiny deterministic PRNG, replacing `Math.random()` so the
 * star field is identical between a server render and its hydration (see
 * `seed` above).
 */
function mulberry32(value: number): () => number {
	let state = value >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Star box-shadows, regenerated when starColor or seed changes. One PRNG
// stream feeds all three layers, in layer order, so a given `seed` names the
// same sky as the React package's `seed` for the same `starColor`.
const boxShadows = computed(() => {
	const random = mulberry32(seed);
	return [
		generateStars(1000, starColor, random),
		generateStars(400, starColor, random),
		generateStars(200, starColor, random),
	] as const;
});
const boxShadow1 = computed(() => boxShadows.value[0]);
const boxShadow2 = computed(() => boxShadows.value[1]);
const boxShadow3 = computed(() => boxShadows.value[2]);

const hostRef = useTemplateRef<HTMLDivElement>("host");
const parallaxRef = useTemplateRef<HTMLDivElement>("parallax");
let engine: BgStarsEngine | null = null;

onMounted(() => {
	const host = hostRef.value;
	const parallax = parallaxRef.value;
	if (!host || !parallax) return;

	engine = createBgStars({ host, parallax }, { factor, stiffness, damping });
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
});

watch(
	() => ({ factor, stiffness, damping }),
	(next) => {
		engine?.setOptions(next);
	},
	{ flush: "post" }
);

// Derived CSS custom properties for animation durations
const layer1Duration = computed(() => `${speed}s`);
const layer2Duration = computed(() => `${speed * 2}s`);
const layer3Duration = computed(() => `${speed * 3}s`);
</script>

<template>
	<div
		ref="host"
		:class="
			cn(
				'relative size-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]',
				className
			)
		"
	>
		<div ref="parallax" class="stars-parallax">
			<!-- Star Layer 1 (smallest, fastest) -->
			<div class="star-layer" :style="{ '--duration': layer1Duration }">
				<div class="star-field" :style="{ width: '1px', height: '1px', boxShadow: boxShadow1 }"></div>
				<div
					class="star-field top-[2000px]"
					:style="{ width: '1px', height: '1px', boxShadow: boxShadow1 }"
				></div>
			</div>

			<!-- Star Layer 2 (medium) -->
			<div class="star-layer" :style="{ '--duration': layer2Duration }">
				<div class="star-field" :style="{ width: '2px', height: '2px', boxShadow: boxShadow2 }"></div>
				<div
					class="star-field top-[2000px]"
					:style="{ width: '2px', height: '2px', boxShadow: boxShadow2 }"
				></div>
			</div>

			<!-- Star Layer 3 (largest, slowest) -->
			<div class="star-layer" :style="{ '--duration': layer3Duration }">
				<div class="star-field" :style="{ width: '3px', height: '3px', boxShadow: boxShadow3 }"></div>
				<div
					class="star-field top-[2000px]"
					:style="{ width: '3px', height: '3px', boxShadow: boxShadow3 }"
				></div>
			</div>
		</div>

		<!-- Slot for child content -->
		<slot />
	</div>
</template>

<style scoped>
.stars-parallax {
	will-change: transform;
}

.star-layer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 2000px;
	animation: scroll-stars var(--duration, 50s) linear infinite;
}

.star-field {
	position: absolute;
	background: transparent;
	border-radius: 50%;
}

@keyframes scroll-stars {
	from {
		transform: translateY(0);
	}
	to {
		transform: translateY(-2000px);
	}
}
</style>
