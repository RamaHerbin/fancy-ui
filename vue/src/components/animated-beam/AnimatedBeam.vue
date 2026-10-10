<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * AnimatedBeam - a fibre-optic connector between two elements.
 *
 * The link is drawn as a glass fibre, and light travels along it as a packet:
 * a white-hot head followed by three chromatic sub-pulses that spread apart
 * as they travel. When the head lands, a halo swells behind the destination
 * and a single ripple leaves it.
 *
 * The svg is absolutely positioned over `containerRef`, whose box becomes its
 * coordinate space, and is redrawn whenever that container resizes.
 */
export interface AnimatedBeamProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/** The element the beam is drawn inside; its box is the svg's coordinate space. */
	containerRef: HTMLElement | null;
	/** The element the beam starts at. */
	fromRef: HTMLElement | null;
	/** The element the beam ends at. */
	toRef: HTMLElement | null;
	/** Vertical bend of the fibre in px (the quadratic control point sits this far above the start). */
	curvature?: number;
	/** Send the light from `toRef` back to `fromRef` (the bloom then lands on `fromRef`). */
	reverse?: boolean;
	/** Fibre colour. Unset = theme-aware glass (dark on light, pale on dark). */
	pathColor?: string;
	/** Width of the fibre core and of the light packet, in px. */
	pathWidth?: number;
	/** Opacity of the fibre. Unset = 1 for the theme-aware glass, 0.2 when `pathColor` is set. */
	pathOpacity?: number;
	/** Colour of the packet's leading edge (its white-hot head is this colour mixed with white). */
	gradientStartColor?: string;
	/** Colour of the far end of the dispersing tail, and of the arrival bloom. */
	gradientStopColor?: string;
	/** Seconds before the first packet leaves. */
	delay?: number;
	/** Seconds per packet cycle. Unset = derived from `seed` (between 4 and 7). */
	duration?: number;
	/** Pixels added to the start point's x. */
	startXOffset?: number;
	/** Pixels added to the start point's y. */
	startYOffset?: number;
	/** Pixels added to the end point's x. */
	endXOffset?: number;
	/** Pixels added to the end point's y. */
	endYOffset?: number;
	/** Packets in flight at once, spaced evenly over one cycle. */
	pulses?: number;
	/** Length of the packet's tail as a fraction of the fibre (0.05–0.9). */
	tail?: number;
	/** Strength of the soft glow under the packet and the arrival bloom (0–1). */
	glow?: number;
	/** Seed for the default `duration`, so server and browser agree. */
	seed?: number;
}

/** Small seedable PRNG. Same seed → same sequence, on the server and in the browser. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** The default cycle length for a seed: somewhere between 4 and 7 seconds. */
export function beamDuration(seed = 1): number {
	return mulberry32(seed)() * 3 + 4;
}

/** Every flow path is normalised to this length, so dash maths is in fractions of the fibre. */
const PATH_LENGTH = 1000;
/** Share of the cycle the head spends travelling; the rest drains the tail into the node. */
export const ARRIVAL = 0.78;

export interface PacketLayer {
	key: "stop" | "mid" | "start" | "head";
	color: string;
	/** Dash length, in PATH_LENGTH units. */
	len: number;
	/** How far this layer has fallen behind the head by the moment of arrival. */
	lag: number;
	opacity: number;
	/** Stroke width as a multiple of `pathWidth`. */
	width: number;
	/** The white-hot core: on light surfaces it keeps more of its colour so it never vanishes. */
	core?: boolean;
}

/**
 * The packet: a white-hot head followed by three chromatic sub-pulses,
 * each longer, dimmer and further behind than the one before, so the tail
 * spreads out as it travels — light dispersing through glass. Listed bottom
 * to top (the order they are painted).
 *
 * Each chromatic band is drawn as three stacked dashes sharing one leading
 * edge (full, two thirds, one third of its length), so its brightness ramps
 * up toward the head instead of ending in a hard block.
 */
export function packetLayers(tail: number, start: string, stop: string): PacketLayer[] {
	const t = Math.min(0.9, Math.max(0.05, Number.isFinite(tail) ? tail : 0.35)) * PATH_LENGTH;
	const spread = t * 0.07;
	const mid = `color-mix(in oklab, ${start} 50%, ${stop})`;
	const hot = `color-mix(in oklab, ${start} 45%, white)`;
	const head = Math.max(12, t * 0.1);
	const bands: Array<[PacketLayer["key"], string, number, number, number]> = [
		["stop", stop, t, spread * 3, 0.26],
		["mid", mid, t * 0.66, spread * 2, 0.34],
		["start", start, t * 0.38, spread, 0.46],
	];
	const layers: PacketLayer[] = [];
	for (const [key, color, len, lag, opacity] of bands) {
		for (const share of [1, 2 / 3, 1 / 3]) {
			layers.push({ key, color, len: len * share, lag, opacity, width: 1 });
		}
	}
	layers.push({ key: "head", color: start, len: head * 1.7, lag: 0, opacity: 1, width: 1.6 });
	layers.push({ key: "head", color: hot, len: head, lag: 0, opacity: 1, width: 0.7, core: true });
	return layers;
}

/** The blurred copies under the packet: one per band plus a wide head. */
export function glowLayers(tail: number, start: string, stop: string): PacketLayer[] {
	const all = packetLayers(tail, start, stop);
	const bands = all.filter((l, i) => l.key !== "head" && i % 3 === 0);
	// Always present (packetLayers ends with the two head layers); the `!`
	// only satisfies this package's indexed-access strictness.
	const head = all[all.length - 2]!;
	return [
		...bands.map((l, i) => ({
			...l,
			opacity: Math.min(1, l.opacity * (1.5 + i * 0.4)),
			width: 2.5,
		})),
		{ ...head, len: head.len * 1.6, opacity: 1, width: 3.5 },
	];
}

/**
 * Dash offsets for the three keyframes: hidden before the start, arrival,
 * fully drained. The source writes these as a style string; here they are a
 * style object (custom properties in a string `style` are dropped by jsdom),
 * with the same names and the same one-decimal values.
 */
function dashVars(layer: PacketLayer): Record<string, string> {
	const o0 = layer.len + 4;
	const o1 = layer.len - (PATH_LENGTH - layer.lag);
	const o2 = -(PATH_LENGTH + 4);
	return {
		"--_len": layer.len.toFixed(1),
		"--_o0": o0.toFixed(1),
		"--_o1": o1.toFixed(1),
		"--_o2": o2.toFixed(1),
	};
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { createReducedMotion } from "../../internals/motion/media-query.js";

defineOptions({ name: "AnimatedBeam", inheritAttrs: false });

const {
	class: className = "",
	containerRef,
	fromRef,
	toRef,
	curvature = 0,
	reverse = false,
	pathColor,
	pathWidth = 2,
	pathOpacity,
	gradientStartColor = "#FFAA40",
	gradientStopColor = "#9C40FF",
	delay = 0,
	duration,
	startXOffset = 0,
	startYOffset = 0,
	endXOffset = 0,
	endYOffset = 0,
	pulses = 1,
	tail = 0.35,
	glow = 0.6,
	seed = 1,
} = defineProps<AnimatedBeamProps>();

// Stable across server render and hydration — no Math.random() anywhere.
const uid = "beam-" + useFancyId();
const id = uid; // the gradient keeps the bare id, as before
const glowId = `${uid}-glow`;
const bloomId = `${uid}-bloom`;

const reduced = createReducedMotion();
onMounted(() => {
	const stop = reduced.start();
	onBeforeUnmount(stop);
});

const cycle = computed(() =>
	Number.isFinite(duration) && (duration as number) > 0 ? (duration as number) : beamDuration(seed)
);
const packetCount = computed(() =>
	Math.max(1, Math.min(12, Math.floor(Number.isFinite(pulses) ? pulses : 1)))
);
const packets = computed(() =>
	Array.from(
		{ length: packetCount.value },
		(_, i) => +(delay + (i * cycle.value) / packetCount.value).toFixed(3)
	)
);
const layers = computed(() => packetLayers(tail, gradientStartColor, gradientStopColor));
const glows = computed(() => glowLayers(tail, gradientStartColor, gradientStopColor));
const glowAmount = computed(() => Math.min(1, Math.max(0, Number.isFinite(glow) ? glow : 0.6)));
const midColor = computed(
	() => `color-mix(in oklab, ${gradientStartColor} 50%, ${gradientStopColor})`
);
const hotColor = computed(() => `color-mix(in oklab, ${gradientStartColor} 45%, white)`);

// Fibre: theme-aware glass by default; an explicit pathColor keeps the old faint-line behaviour.
const fibreOpacity = computed(() => pathOpacity ?? (pathColor ? 0.2 : 1));
const fibreStyle = computed(() => (pathColor ? { stroke: pathColor } : {}));

// Geometry
const pathD = ref("");
const flowD = ref("");
const ends = ref({ x1: 0, y1: 0, x2: 0, y2: 0 });
const landingRadius = ref(24);
const svgDimensions = ref<{ width: number; height: number }>({ width: 0, height: 0 });

/** Where the light lands — the far end of the flow. */
const landing = computed(() =>
	reverse ? { x: ends.value.x1, y: ends.value.y1 } : { x: ends.value.x2, y: ends.value.y2 }
);
const launch = computed(() =>
	reverse ? { x: ends.value.x2, y: ends.value.y2 } : { x: ends.value.x1, y: ends.value.y1 }
);

let resizeObserver: ResizeObserver | undefined = undefined;

function updatePath() {
	if (!(containerRef && fromRef && toRef)) return;
	const containerRect = containerRef.getBoundingClientRect();
	const rectA = fromRef.getBoundingClientRect();
	const rectB = toRef.getBoundingClientRect();

	svgDimensions.value = { width: containerRect.width, height: containerRect.height };

	const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
	const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
	const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
	const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

	// The dash-driven packet follows the path itself, so horizontal,
	// vertical and diagonal fibres all travel the same way.
	const cx = (startX + endX) / 2;
	const cy = startY - curvature;
	ends.value = { x1: startX, y1: startY, x2: endX, y2: endY };
	pathD.value = `M ${startX},${startY} Q ${cx},${cy} ${endX},${endY}`;
	flowD.value = reverse ? `M ${endX},${endY} Q ${cx},${cy} ${startX},${startY}` : pathD.value;

	const target = reverse ? rectA : rectB;
	landingRadius.value = Math.max(8, Math.max(target.width, target.height) / 2);
}

function disconnect() {
	resizeObserver?.disconnect();
	resizeObserver = undefined;
}

// Setup ResizeObserver — the counterpart of the source's `onMount`.
function observeContainer() {
	disconnect();
	if (!containerRef) return;

	resizeObserver = new ResizeObserver(() => updatePath());
	resizeObserver.observe(containerRef);
	updatePath();
}

// A template ref in the parent is assigned AFTER this component's props were
// evaluated, so `containerRef` is routinely still null at `onMounted` — the
// source's one-shot `onMount` has no such gap, because a Svelte `bind:this`
// lands before a child's mount callbacks run. Arming from a `post` watcher as
// well is what closes it, and it re-arms if the container is swapped.
onMounted(observeContainer);
watch(() => containerRef, observeContainer, { flush: "post" });
onBeforeUnmount(disconnect);

// Re-trace when the geometry props change after mount (the source's
// `$effect` over `updatePath`, which also tracks the two endpoints).
watch(
	() => [fromRef, toRef, curvature, reverse, startXOffset, startYOffset, endXOffset, endYOffset],
	() => updatePath(),
	{ flush: "post" }
);
</script>

<template>
	<svg
		fill="none"
		aria-hidden="true"
		:width="svgDimensions.width"
		:height="svgDimensions.height"
		xmlns="http://www.w3.org/2000/svg"
		:class="cn('pointer-events-none absolute top-0 left-0 transform-gpu stroke-2', className)"
		:viewBox="`0 0 ${svgDimensions.width} ${svgDimensions.height}`"
		:data-duration="cycle.toFixed(3)"
		:style="{ '--_dur': `${cycle.toFixed(3)}s` }"
	>
		<defs>
			<linearGradient
				:id="id"
				gradientUnits="userSpaceOnUse"
				:x1="launch.x"
				:y1="launch.y"
				:x2="landing.x"
				:y2="landing.y"
			>
				<stop offset="0%" :style="{ stopColor: hotColor }" stop-opacity="0.9" />
				<stop offset="30%" :style="{ stopColor: gradientStartColor }" />
				<stop offset="65%" :style="{ stopColor: midColor }" />
				<stop offset="100%" :style="{ stopColor: gradientStopColor }" />
			</linearGradient>
			<filter
				:id="glowId"
				filterUnits="userSpaceOnUse"
				:x="-40"
				:y="-40"
				:width="svgDimensions.width + 80"
				:height="svgDimensions.height + 80"
			>
				<feGaussianBlur :stdDeviation="1.5 + 4 * glowAmount" />
			</filter>
			<filter
				:id="bloomId"
				filterUnits="userSpaceOnUse"
				:x="-40"
				:y="-40"
				:width="svgDimensions.width + 80"
				:height="svgDimensions.height + 80"
			>
				<feGaussianBlur :stdDeviation="5 + 6 * glowAmount" />
			</filter>
		</defs>

		<!-- The fibre: a sheath, a darker core, and a hair of glint down the middle. -->
		<g class="fibre" :opacity="fibreOpacity">
			<path
				class="fibre-sheath"
				:d="pathD"
				:stroke-width="pathWidth + 2"
				stroke-linecap="round"
				:style="fibreStyle"
				:stroke-opacity="pathColor ? 0.5 : 1"
			/>
			<path
				class="fibre-core"
				:d="pathD"
				:stroke-width="pathWidth"
				stroke-linecap="round"
				:style="fibreStyle"
			/>
			<path
				v-if="!pathColor"
				class="fibre-glint"
				:d="pathD"
				:stroke-width="Math.max(0.5, pathWidth * 0.3)"
				stroke-linecap="round"
			/>
		</g>

		<!-- Still frame: the fibre holds a soft gradient along its length. -->
		<g v-if="reduced.current" class="still" data-still>
			<path
				:d="pathD"
				:stroke="`url(#${id})`"
				:stroke-width="pathWidth * 2.5 + 3"
				stroke-linecap="round"
				:opacity="0.35 * glowAmount"
				:filter="`url(#${glowId})`"
			/>
			<path
				:d="pathD"
				:stroke="`url(#${id})`"
				:stroke-width="pathWidth"
				stroke-linecap="round"
				opacity="0.55"
			/>
		</g>
		<template v-else>
			<g
				v-for="(packetDelay, i) in packets"
				:key="i"
				class="packet"
				:data-packet="i"
				:style="{ '--_delay': `${packetDelay}s` }"
			>
				<!-- Arrival bloom behind the destination node. -->
				<g class="bloom" :opacity="0.3 + 0.7 * glowAmount">
					<circle
						class="bloom-disc"
						:cx="landing.x"
						:cy="landing.y"
						:r="landingRadius + 6"
						:style="{ fill: `color-mix(in oklab, ${gradientStopColor} 75%, white)` }"
						:filter="`url(#${bloomId})`"
					/>
					<circle
						class="bloom-ring"
						:cx="landing.x"
						:cy="landing.y"
						:r="landingRadius + 4"
						stroke-width="1"
						:style="{ stroke: `color-mix(in oklab, ${gradientStopColor} 55%, white)` }"
					/>
				</g>
				<!-- Soft glow, blurred, under the crisp packet. -->
				<g :filter="`url(#${glowId})`" :opacity="glowAmount">
					<path
						v-for="(layer, j) in glows"
						:key="j"
						class="packet-layer"
						:d="flowD"
						pathLength="1000"
						:stroke-width="pathWidth * layer.width + 2"
						stroke-linecap="round"
						:style="{ ...dashVars(layer), stroke: layer.color }"
						:opacity="layer.opacity"
					/>
				</g>
				<path
					v-for="(layer, j) in layers"
					:key="j"
					:class="['packet-layer', layer.core && 'packet-core']"
					:data-layer="layer.key"
					:d="flowD"
					pathLength="1000"
					:stroke-width="pathWidth * layer.width"
					stroke-linecap="round"
					:style="
						layer.core
							? { ...dashVars(layer), '--_core': gradientStartColor }
							: { ...dashVars(layer), stroke: layer.color }
					"
					:opacity="layer.opacity"
				/>
			</g>
		</template>
	</svg>
</template>

<style scoped>
/* Theme-aware glass. Public vars first, house defaults as fallbacks. */
.fibre-sheath {
	stroke: var(--beam-fibre-rim, rgba(0, 0, 0, 0.07));
}
.fibre-core {
	stroke: var(--beam-fibre, rgba(0, 0, 0, 0.18));
}
.fibre-glint {
	stroke: var(--beam-fibre-glint, rgba(255, 255, 255, 0.75));
}
/* The source's `:global(.dark) .fibre-*` rules. Spelled without `:global()`
   here: the scoped compiler replaces a whole selector with the wrapped part
   alone (it would emit a bare `.dark`), while a plain ancestor class is left
   unscoped and only the last compound gets the scope attribute. */
.dark .fibre-sheath {
	stroke: var(--beam-fibre-rim, rgba(255, 255, 255, 0.06));
}
.dark .fibre-core {
	stroke: var(--beam-fibre, rgba(255, 255, 255, 0.14));
}
.dark .fibre-glint {
	stroke: var(--beam-fibre-glint, rgba(255, 255, 255, 0.16));
}

/* On a light surface a white core disappears; keep more colour there. */
.packet-core {
	stroke: color-mix(in oklab, var(--_core) 72%, white);
}
.dark .packet-core {
	stroke: color-mix(in oklab, var(--_core) 45%, white);
}

.packet-layer {
	stroke-dasharray: var(--_len) 3000;
	stroke-dashoffset: var(--_o0);
	animation: beam-packet var(--_dur, 5s) linear var(--_delay, 0s) infinite backwards;
}

/* Glide out, settle into the node at ARRIVAL (78%), then drain the tail. */
@keyframes beam-packet {
	0% {
		stroke-dashoffset: var(--_o0);
		animation-timing-function: cubic-bezier(0.45, 0, 0.2, 1);
	}
	78% {
		stroke-dashoffset: var(--_o1);
		animation-timing-function: cubic-bezier(0.5, 0, 1, 1);
	}
	100% {
		stroke-dashoffset: var(--_o2);
	}
}

.bloom-disc,
.bloom-ring {
	transform-box: fill-box;
	transform-origin: center;
	opacity: 0;
	animation: beam-bloom var(--_dur, 5s) linear var(--_delay, 0s) infinite backwards;
}
.bloom-ring {
	animation-name: beam-ring;
}

/* The head lands at 78%: the halo swells behind the node, then lets go. */
@keyframes beam-bloom {
	0%,
	74% {
		opacity: 0;
		transform: scale(0.6);
		animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	}
	84% {
		opacity: 0.85;
		transform: scale(1);
		animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
	100% {
		opacity: 0;
		transform: scale(1.15);
	}
}

/* A single ripple leaves the node on arrival. */
@keyframes beam-ring {
	0%,
	77% {
		opacity: 0;
		transform: scale(0.96);
		animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	}
	81% {
		opacity: 0.7;
		animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	}
	100% {
		opacity: 0;
		transform: scale(1.5);
	}
}

/* Before hydration can ask the browser, keep reduced-motion users still. */
@media (prefers-reduced-motion: reduce) {
	.packet {
		display: none;
	}
}
</style>
