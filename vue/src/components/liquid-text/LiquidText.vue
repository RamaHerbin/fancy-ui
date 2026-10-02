<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface LiquidTextProps {
	/** Text rendered into the fluid texture (or as static fallback text). */
	text?: string;
	/** CSS font-family. Empty string resolves to getComputedStyle(host).fontFamily. */
	font?: string;
	/** Font size in px. 0 auto-fits the text to the container's width. */
	fontSize?: number;
	/** CSS font-weight for the rasterized/fallback text. */
	fontWeight?: number | string;
	/** Text color used in light mode. */
	lightColor?: string;
	/** Text color used in dark mode. */
	darkColor?: string;
	/** Additional CSS classes applied to the root element. */
	class?: HTMLAttributes["class"];
	/** Geometric UV warp gain — how far the fluid velocity displaces the text's UVs. */
	strength?: number;
	/** Splat radius in screen pixels around the pointer. */
	radius?: number;
	/** Multiplier from mouse-delta-per-frame to splat force. */
	forceGain?: number;
	/** Per-frame velocity decay factor (relax-back rate for the smear). */
	dissipation?: number;
	/** Viscous diffusion strength (Jacobi iteration, 8 iters). */
	viscosity?: number;
	/** Chromatic offset = warp amount x this ratio. */
	chromaticRatio?: number;
	/** If window.innerWidth <= staticBelow at mount, render static DOM text instead. */
	staticBelow?: number;
	/** Whether the fluid sim reacts to pointer movement. */
	interactive?: boolean;
	/** Pause the render loop via visibilitychange when the tab/page is hidden. */
	pauseWhenHidden?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	createLiquidText,
	measureLiquidText,
	DEFAULT_DISPLAY_FONT_SIZE,
	HEIGHT_RATIO,
	type LiquidTextEngine,
} from "./liquid-text-core.js";

defineOptions({ name: "LiquidText", inheritAttrs: false });

const {
	text = "Liquid",
	font = "",
	fontSize = 0,
	fontWeight = 700,
	lightColor = "#000000",
	darkColor = "#ffffff",
	class: className = "",
	strength = 0.5,
	radius = 160,
	forceGain = 17,
	dissipation = 0.98,
	viscosity = 4,
	chromaticRatio = 0.2,
	staticBelow = 1024,
	interactive = true,
	pauseWhenHidden = true,
} = defineProps<LiquidTextProps>();

const rootEl = useTemplateRef<HTMLDivElement>("root");
const canvasEl = useTemplateRef<HTMLCanvasElement>("canvas");

// Always starts "static" so the very first render (SSR or client) never
// touches window/document — onMounted promotes to "canvas" if eligible.
const mode = ref<"static" | "canvas">("static");
const themeColor = ref(lightColor);
const resolvedFont = ref(font);
const displayFontSize = ref(fontSize > 0 ? fontSize : DEFAULT_DISPLAY_FONT_SIZE);

// Deliberately NOT reactive: the watchers below read them without taking a
// dependency, so booting the engine in onMounted never re-runs them.
// `simRunning` goes false when the sim is dropped mid-session (reduced
// motion flipped on, GPU context lost) while `engine` is kept until
// unmount so destroy() can still release the canvas listeners/context.
let engine: LiquidTextEngine | null = null;
let simRunning = false;

// Started in the composable's own `onMounted`, which is registered here in
// setup and therefore runs BEFORE this component's `onMounted` below: the
// mount-time read of `reduced.value` is the browser's real answer, exactly
// like the source's `matchMedia(...).matches`. It is `false` on the server
// and through hydration, so nothing here makes the first render differ.
const reduced = useReducedMotion();

const rootHeight = computed(() => `${Math.round(displayFontSize.value * HEIGHT_RATIO)}px`);

/** The source spells these as four `style:` directives. `fontFamily` is the
 * one that can legitimately be empty (`font=""` until the host is measured):
 * an empty string reaches the SSR stringifier as `font-family:;`, which the
 * client-side style patch drops — so it is omitted outright instead, keeping
 * the server render and its hydration identical. */
const fallbackStyle = computed(() => ({
	color: themeColor.value,
	fontFamily: resolvedFont.value || undefined,
	fontSize: `${displayFontSize.value}px`,
	fontWeight,
}));

function activeThemeColor(): string {
	return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
		? darkColor
		: lightColor;
}

/** Static-fallback metrics. While the sim runs, the engine measures instead
 * and reports back through `onMetrics`. */
function fitFontSize() {
	const root = rootEl.value;
	if (!root) return;
	const metrics = measureLiquidText(root, { text, font, fontSize, fontWeight });
	resolvedFont.value = metrics.font;
	if (metrics.fontSize !== null) displayFontSize.value = metrics.fontSize;
}

function simOptions() {
	return {
		strength,
		radius,
		forceGain,
		dissipation,
		viscosity,
		chromaticRatio,
		interactive,
		pauseWhenHidden,
	};
}

// Text/font/color changes re-derive the resolved font + size and, on the
// canvas path, re-rasterize the text texture. No `immediate`: onMounted owns
// the initial pass (the source's effect and its onMount both ran it).
watch(
	() => [text, font, fontSize, fontWeight, lightColor, darkColor],
	() => {
		if (!rootEl.value) return;
		themeColor.value = activeThemeColor();
		if (simRunning && engine) {
			engine.setOptions({ text, font, fontSize, fontWeight, textColor: themeColor.value });
		} else {
			fitFontSize();
		}
	},
	{ flush: "post" }
);

// Sim parameters: pushed through without touching the text texture.
watch(
	() => [
		strength,
		radius,
		forceGain,
		dissipation,
		viscosity,
		chromaticRatio,
		interactive,
		pauseWhenHidden,
	],
	() => {
		engine?.setOptions(simOptions());
	},
	{ flush: "post" }
);

// Honor a live toggle of the OS reduced-motion setting, not just its value at
// mount: if it flips to "reduce" while the sim is running, tear the sim down
// and drop to the static fallback.
watch(
	reduced,
	(next) => {
		if (next && simRunning) {
			engine?.destroy();
			engine = null;
			simRunning = false;
			mode.value = "static";
		}
	},
	{ flush: "post" }
);

let themeObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
	const root = rootEl.value;
	const canvas = canvasEl.value;
	if (!root || !canvas) return;

	themeColor.value = activeThemeColor();

	themeObserver = new MutationObserver(() => {
		const next = activeThemeColor();
		if (next !== themeColor.value) {
			themeColor.value = next;
			engine?.setOptions({ textColor: next });
		}
	});
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});

	fitFontSize();

	const tooSmall = window.innerWidth <= staticBelow;

	if (!reduced.value && !tooSmall) {
		engine = createLiquidText(
			{ host: root, canvas },
			{
				text,
				font,
				fontSize,
				fontWeight,
				textColor: themeColor.value,
				...simOptions(),
				onMetrics: (metrics) => {
					resolvedFont.value = metrics.font;
					displayFontSize.value = metrics.fontSize;
				},
				// A real GPU context loss leaves every GL object invalid, so
				// the engine tears itself down and we drop to the stable
				// static fallback for the rest of this mount.
				onContextLost: () => {
					simRunning = false;
					mode.value = "static";
				},
			}
		);
		if (engine) {
			simRunning = true;
			mode.value = "canvas";
		}
	}

	// One observer for both paths: it drives the sim's resize while the
	// canvas is live, and the auto-fit (fontSize=0) fallback text
	// otherwise — so the fallback never stays frozen at its mount-time
	// size across a later container/viewport resize (e.g. mobile rotation).
	resizeObserver = new ResizeObserver(() => {
		if (simRunning && engine) engine.resize();
		else fitFontSize();
	});
	resizeObserver.observe(root);
});

onBeforeUnmount(() => {
	themeObserver?.disconnect();
	themeObserver = null;
	resizeObserver?.disconnect();
	resizeObserver = null;
	engine?.destroy();
	engine = null;
	simRunning = false;
});
</script>

<template>
	<div
		ref="root"
		:class="cn('liquid-text relative block w-full', className)"
		:style="{ height: rootHeight }"
	>
		<canvas
			ref="canvas"
			aria-hidden="true"
			:class="
				cn(
					'pointer-events-none absolute inset-0 block h-full w-full',
					mode === 'canvas' ? '' : 'invisible'
				)
			"
		></canvas>
		<span v-if="mode === 'canvas'" class="sr-only">{{ text }}</span>
		<span
			v-else
			class="liquid-text-fallback block"
			:style="fallbackStyle"
			>{{ text }}</span
		>
	</div>
</template>

<style scoped>
.liquid-text {
	line-height: 1;
}

.liquid-text-fallback {
	margin: 0;
	white-space: nowrap;
}
</style>
