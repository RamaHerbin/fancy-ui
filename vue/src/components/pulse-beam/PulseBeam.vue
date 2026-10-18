<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PulseBeamPalette, PulseBeamTone, PulseBeamVariant } from "./pulse-beam-data.js";

export type { PulseBeamPalette, PulseBeamTone, PulseBeamVariant };

/**
 * PulseBeam — a breathing, colour-shifting border glow.
 *
 * Wrap any card or control. Three masked gradient layers (a 1px ring, a
 * feathered inner glow and a blurred bloom) are driven by a shared
 * animation loop through CSS custom properties, so the effect stays on the
 * compositor and costs one style recalc per frame per instance.
 */
export interface PulseBeamProps {
	/** Additional classes on the wrapper */
	class?: HTMLAttributes["class"];
	/** Show the glow. Off fades out (500ms) and stops the loop; on fades in (600ms). */
	active?: boolean;
	/** `inner` paints inside the box; `outside` adds a blurred halo behind the content */
	variant?: PulseBeamVariant;
	/** Built-in nine-slot colour set. `mono` halves opacity and disables hue drift. */
	palette?: PulseBeamPalette;
	/** Up to nine CSS colours overriding the palette slots in order */
	colors?: string[];
	/** Overall intensity, 0–1 */
	strength?: number;
	/** Corner radius in px, applied to the wrapper and every layer */
	radius?: number;
	/** Multiplier for the breathing and drift periods */
	speed?: number;
	/** Opacity / brightness / saturation preset for the surface the card sits on */
	tone?: PulseBeamTone;
	/** Slowly rotate every hue over a 14–16s cycle */
	hueShift?: boolean;
	/** Override the preset brightness filter */
	brightness?: number;
	/** Override the preset saturation filter */
	saturation?: number;
	/** Called once the fade-in has completed */
	onfadein?: () => void;
	/** Called once the fade-out has completed and the loop has stopped */
	onfadeout?: () => void;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	LAYER_PRESETS,
	buildLayerBackgrounds,
	buildOscillators,
	motionPreset,
} from "./pulse-beam-data.js";
import { registerPulse } from "./pulse-beam-loop.js";

defineOptions({ name: "PulseBeam", inheritAttrs: false });

const attrs = useAttrs();

const {
	class: className,
	active = true,
	variant = "inner",
	palette = "colorful",
	colors,
	strength = 1,
	radius = 16,
	speed = 1,
	tone = "dark",
	hueShift = true,
	brightness,
	saturation,
	onfadein,
	onfadeout,
} = defineProps<PulseBeamProps>();

defineSlots<{
	/** Content wrapped by the glow (Svelte's optional `children` snippet). */
	default?(): unknown;
}>();

const FADE_IN_MS = 600;
const FADE_OUT_MS = 500;
/** Slack after the CSS duration before the JS fallback settles the fade. */
const FADE_SLACK_MS = 80;

type Phase = "idle" | "active" | "fading";

// Starts idle even when `active` is true so the first activation is a real
// fade-in, and SSR output never flashes a fully lit ring before hydration.
const phase = ref<Phase>("idle");
const reducedMotion = useReducedMotion();

// Plain lets: touched by timers and events, never rendered.
let pending: "in" | "out" | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// --- derived configuration -------------------------------------------------

const preset = computed(() => LAYER_PRESETS[variant][tone]);
const isMono = computed(() => palette === "mono" && !colors?.length);
const monoFactor = computed(() => (isMono.value ? 0.5 : 1));
const motion = computed(() => motionPreset(variant, tone, speed));
const oscillators = computed(() => buildOscillators(motion.value));
const hueEnabled = computed(() => hueShift && !isMono.value);
const backgrounds = computed(() =>
	buildLayerBackgrounds({ variant, palette, colors, tone, op: motion.value.op })
);
const clampedStrength = computed(() =>
	Math.min(1, Math.max(0, Number.isFinite(strength) ? strength : 1))
);
const running = computed(() => phase.value !== "idle");

// --- fade state machine ------------------------------------------------------

function settle(kind: "in" | "out") {
	if (pending !== kind) return;
	pending = null;
	clearTimeout(fadeTimer);
	if (kind === "out") {
		phase.value = "idle";
		onfadeout?.();
	} else {
		onfadein?.();
	}
}

function handleTransitionEnd(e: TransitionEvent) {
	if (e.propertyName !== "opacity" || e.target !== e.currentTarget) return;
	settle(phase.value === "fading" ? "out" : "in");
}

// The watch is created inside `onMounted` (not at setup scope) so its first,
// immediate run is guaranteed to happen after `useReducedMotion`'s own
// `onMounted` has resolved the media query — both are queued as post-flush
// jobs, and a job created from inside a running post-flush job always lands
// after it. Created at setup scope instead, this watch's immediate run and
// `useReducedMotion`'s mount hook race in the same queue, and reduced motion
// can lose that race on the very first paint.
onMounted(() => {
	watch(
		() => ({ on: active, host: el.value }),
		({ on, host }) => {
			clearTimeout(fadeTimer);
			const reduced = reducedMotion.value;
			if (on) {
				if (phase.value === "active") return;
				// Force the idle style to be computed so the flip to active is a
				// transition rather than a first paint.
				if (phase.value === "idle" && host) void host.offsetWidth;
				phase.value = "active";
				pending = "in";
			} else {
				if (phase.value === "idle") {
					pending = null;
					return;
				}
				phase.value = "fading";
				pending = "out";
			}
			// Fallback for the cases where no transitionend arrives: reduced
			// motion, a display:none ancestor, an offscreen host, jsdom.
			const ms = reduced ? 0 : (on ? FADE_IN_MS : FADE_OUT_MS) + FADE_SLACK_MS;
			fadeTimer = setTimeout(() => settle(on ? "in" : "out"), ms);
		},
		{ flush: "post", immediate: true }
	);
});

onBeforeUnmount(() => clearTimeout(fadeTimer));

// --- shared animation loop ----------------------------------------------------

let unregister: (() => void) | null = null;
let io: IntersectionObserver | undefined;

function teardownLoop() {
	io?.disconnect();
	io = undefined;
	unregister?.();
	unregister = null;
}

watch(
	() => ({
		host: el.value,
		config: oscillators.value,
		hue: hueEnabled.value ? { period: motion.value.huePeriod } : null,
		isRunning: running.value,
		reduced: reducedMotion.value,
	}),
	({ host, config, hue, isRunning, reduced }, _prev, onCleanup) => {
		teardownLoop();
		// Turning hue drift off must drop the rotation the loop last wrote,
		// otherwise the palette stays frozen at an arbitrary angle.
		if (!hue && host) host.style.removeProperty("--pb-hue");
		if (!host) return;
		if (!isRunning || reduced) return;

		const handle = registerPulse(host, config, hue);
		unregister = handle.unregister;
		if (typeof IntersectionObserver !== "undefined") {
			io = new IntersectionObserver(
				([entry]) => {
					if (entry) handle.setPaused(!entry.isIntersecting);
				},
				{ rootMargin: "256px" }
			);
			io.observe(host);
		}
		onCleanup(() => teardownLoop());
	},
	{ flush: "post", immediate: true }
);

onBeforeUnmount(() => teardownLoop());

// --- outside variant: scale blobs with the box --------------------------------

let ro: ResizeObserver | undefined;

function teardownResize() {
	ro?.disconnect();
	ro = undefined;
	el.value?.style.removeProperty("--pb-sx");
	el.value?.style.removeProperty("--pb-sy");
}

watch(
	() => ({ host: el.value, isOutside: variant === "outside" }),
	({ host, isOutside }, _prev, onCleanup) => {
		teardownResize();
		if (!host || !isOutside || typeof ResizeObserver === "undefined") return;
		const clamp = (v: number) => Math.max(0.35, Math.min(4, v));
		const apply = () => {
			const r = host.getBoundingClientRect();
			if (!r.width || !r.height) return;
			host.style.setProperty("--pb-sx", clamp(r.width / 350).toFixed(3));
			host.style.setProperty("--pb-sy", clamp(r.height / 140).toFixed(3));
		};
		apply();
		ro = new ResizeObserver(apply);
		ro.observe(host);
		onCleanup(() => teardownResize());
	},
	{ flush: "post", immediate: true }
);

onBeforeUnmount(() => teardownResize());
</script>

<template>
	<!--
	  The host carries only `:style` bound to an object — never a `style`
	  string. A string `style` goes through `cssText`, which would wipe the
	  custom properties the loop writes every frame; the object form patches
	  per key. `v-bind="attrs"` comes BEFORE `:style` so the computed --pb-*
	  values win over a consumer `style`, as Svelte's `style:` directives beat
	  a spread `style` attribute.
	-->
	<div
		ref="el"
		v-bind="attrs"
		:class="cn('pulse-beam', className)"
		:style="{
			'--pb-strength': clampedStrength,
			'--pb-radius': `${radius}px`,
			'--pb-o-stroke': preset.stroke * monoFactor,
			'--pb-o-glow': preset.glow * monoFactor,
			'--pb-o-bloom': preset.bloom * monoFactor,
			'--pb-brightness': brightness ?? preset.brightness,
			'--pb-saturation': saturation ?? preset.saturation,
			'--pb-glow-blur': `${preset.glowBlur}px`,
			'--pb-bloom-blur': `${preset.bloomBlur}px`,
		}"
		:data-variant="variant"
		:data-state="phase"
	>
		<slot />
		<!--
		  `backgroundImage`, not `background`: the value is a pure gradient list
		  (no color/position/repeat), and jsdom's CSSOM rejects a `background`
		  shorthand whose layers carry no `var()`/`calc()` token — a jsdom-only
		  quirk (a real browser accepts either). `background-image` renders
		  identically and is the more precise property for what this actually
		  is, so both jsdom and a real browser agree on it.
		-->
		<div
			class="pulse-beam__layer pulse-beam__glow"
			:style="{ backgroundImage: backgrounds.glow }"
		></div>
		<div
			class="pulse-beam__layer pulse-beam__stroke"
			:style="{ backgroundImage: backgrounds.stroke }"
			@transitionend="handleTransitionEnd"
		></div>
		<div
			class="pulse-beam__layer pulse-beam__bloom"
			:style="{ backgroundImage: backgrounds.bloom }"
		></div>
	</div>
</template>

<style scoped>
.pulse-beam {
	position: relative;
	isolation: isolate;
	border-radius: var(--pb-radius);
	overflow: hidden;
}

.pulse-beam[data-variant="outside"] {
	overflow: visible;
}

.pulse-beam__layer {
	position: absolute;
	inset: 0;
	border-radius: var(--pb-radius);
	pointer-events: none;
	transition: opacity 600ms ease;
}

/* Filter runs before the mask: the bloom blurs its gradients, then the 1px
   ring is cut from the blurred image — a softened ring, not a halo. */
.pulse-beam__stroke,
.pulse-beam__bloom {
	padding: 1px;
	clip-path: inset(0 round var(--pb-radius));
	-webkit-mask:
		linear-gradient(#fff 0 0) content-box,
		linear-gradient(#fff 0 0);
	-webkit-mask-composite: xor;
	mask:
		linear-gradient(#fff 0 0) content-box,
		linear-gradient(#fff 0 0);
	mask-composite: exclude;
}

.pulse-beam__stroke {
	z-index: 2;
	opacity: calc(var(--pb-o-stroke) * var(--pb-strength));
	filter: hue-rotate(var(--pb-hue, 0deg)) brightness(var(--pb-brightness))
		saturate(var(--pb-saturation));
}

.pulse-beam__glow {
	z-index: 1;
	clip-path: inset(0 round var(--pb-radius));
	-webkit-mask-image:
		linear-gradient(#fff, transparent 28px, transparent calc(100% - 28px), #fff),
		linear-gradient(to right, #fff, transparent 28px, transparent calc(100% - 28px), #fff);
	-webkit-mask-composite: source-over;
	mask-image:
		linear-gradient(#fff, transparent 28px, transparent calc(100% - 28px), #fff),
		linear-gradient(to right, #fff, transparent 28px, transparent calc(100% - 28px), #fff);
	mask-composite: add;
	opacity: calc(var(--pb-o-glow) * var(--pb-strength));
	filter: hue-rotate(var(--pb-hue, 0deg)) brightness(var(--pb-brightness))
		saturate(var(--pb-saturation));
}

.pulse-beam__bloom {
	z-index: 3;
	opacity: calc(var(--pb-o-bloom) * var(--pb-strength));
	filter: blur(var(--pb-bloom-blur)) hue-rotate(var(--pb-hue, 0deg))
		brightness(var(--pb-brightness)) saturate(var(--pb-saturation));
}

/* Outside: the stroke stays a ring; glow and bloom bleed past the box and
   sit behind the (opaque) children inside the isolated stacking context. */
.pulse-beam[data-variant="outside"] .pulse-beam__glow {
	inset: -10px;
	z-index: -1;
	border-radius: calc(var(--pb-radius) + 10px);
	clip-path: none;
	-webkit-mask: none;
	mask: none;
	transform: scale(0.95, 0.9);
	filter: blur(var(--pb-glow-blur)) hue-rotate(var(--pb-hue, 0deg)) brightness(var(--pb-brightness))
		saturate(var(--pb-saturation));
}

.pulse-beam[data-variant="outside"] .pulse-beam__bloom {
	inset: -30px;
	z-index: -1;
	border-radius: calc(var(--pb-radius) + 30px);
	padding: 0;
	clip-path: none;
	-webkit-mask: none;
	mask: none;
	transform: scale(0.95, 0.9);
}

/* Fade states */
.pulse-beam[data-state="idle"] .pulse-beam__layer {
	opacity: 0;
	visibility: hidden;
	transition: none;
}

.pulse-beam[data-state="fading"] .pulse-beam__layer {
	opacity: 0;
	transition-duration: 500ms;
}

.pulse-beam[data-state="active"] .pulse-beam__layer,
.pulse-beam[data-state="fading"] .pulse-beam__layer {
	will-change: opacity, filter;
}

@media (prefers-reduced-motion: reduce) {
	.pulse-beam__layer {
		transition: none;
	}
}
</style>
