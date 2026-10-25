<!--
	MathBubble: a comic bubble that draws itself, then a formula written inside it by hand.

	Everything that is drawn comes from the framework-free engine in `handwrite-core.ts`. Before the
	drawing starts (on the server, without JavaScript, or under reduced motion) the finished frame is
	inline SVG; once it starts, a canvas draws one frame of the timeline per animation frame.
-->
<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { MathBubbleKind, MathBubbleTail, MathBubbleTrigger } from "./types.js";

export interface MathBubbleProps {
	/**
	 * The formula, in a small TeX subset (`^`, `_`, `\frac`, `\sqrt`, Greek letters). An array is
	 * written one formula after the other; with `loop` it cycles.
	 */
	formula: string | string[];
	/** Outline drawn around the formula. Default `"speech"`. */
	bubble?: MathBubbleKind;
	/** Side the tail points to. Default `"bottom"`. */
	tail?: MathBubbleTail;
	/** Where the tail leaves its side, 0..1. Default `0.25`. */
	tailOffset?: number;
	/** Writing speed, em per second. Default `5`. */
	speed?: number;
	/** Seed of the hand: the same seed always draws the same strokes. Default `1`. */
	seed?: number;
	/** Pixels per em. Default `32`. */
	size?: number;
	/** Base pen width, px. Default `2.2`. */
	strokeWidth?: number;
	/** Ink colour. `"currentColor"` follows the text colour. Default `"currentColor"`. */
	ink?: string;
	/** When the drawing starts. Default `"inView"`. */
	trigger?: MathBubbleTrigger;
	/** Start again after the last formula. Default `false`. */
	loop?: boolean;
	/** Rest on a finished formula before the next one, ms. Default `1800`. */
	hold?: number;
	/** Accessible name. Defaults to the formula text. */
	ariaLabel?: string;
	/**
	 * Renders one still at this time (ms since the start) with no animation loop: for screenshots
	 * and hidden tabs.
	 */
	t?: number;
	/** Additional CSS classes on the wrapper. */
	class?: HTMLAttributes["class"];
	/** Called when the last formula is written (once per pass when looping). */
	onComplete?: () => void;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { createMathBubble, type MathBubble } from "./handwrite-core.js";
import { cycleDuration } from "./handwrite-timeline.js";
import { inView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";

defineOptions({ name: "MathBubble", inheritAttrs: false });

const {
	formula,
	bubble = "speech",
	tail = "bottom",
	tailOffset = 0.25,
	speed = 5,
	seed = 1,
	size = 32,
	strokeWidth = 2.2,
	ink = "currentColor",
	trigger = "inView",
	loop = false,
	hold = 1800,
	ariaLabel,
	t,
	class: className,
	onComplete,
} = defineProps<MathBubbleProps>();

const reduced = useReducedMotion();

const formulas = computed(() =>
	Array.isArray(formula) ? (formula.length ? formula : [""]) : [formula]
);
const drawings = computed<MathBubble[]>(() =>
	formulas.value.map((f) =>
		createMathBubble(f, { bubble, tail, tailOffset, speed, seed, size, strokeWidth, hold })
	)
);
const box = computed(() => ({
	width: Math.max(...drawings.value.map((d) => d.size.width)),
	height: Math.max(...drawings.value.map((d) => d.size.height)),
}));
const label = computed(() => ariaLabel ?? formulas.value.join(", "));

/** Which formula is shown, and whether as the static SVG or on the canvas. */
const index = ref(0);
const mode = ref<"static" | "canvas">("static");
const current = computed(() => drawings.value[Math.min(index.value, drawings.value.length - 1)]!);
const svg = computed(() => current.value.svg());

const root = useTemplateRef<HTMLSpanElement>("root");
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
let frame = 0;
let startedAt = 0;
let completedPass = false;

/** Where a still at `ms` lands: which formula, and how far into it. */
function locate(ms: number): { i: number; local: number } {
	const list = drawings.value;
	let local = Math.max(0, ms);
	let i = 0;
	for (let guard = 0; guard < 10_000; guard++) {
		const last = i === list.length - 1;
		const cycle = cycleDuration(list[i]!.timeline);
		if (local < cycle || (last && !loop) || cycle <= 0) break;
		local -= cycle;
		i = last ? 0 : i + 1;
	}
	return { i, local };
}

function paint(drawing: MathBubble, ms: number): void {
	const el = canvas.value;
	if (!el || !root.value) return;
	const ctx = el.getContext("2d");
	if (!ctx) return;
	const dpr = window.devicePixelRatio || 1;
	const w = Math.round(drawing.size.width * dpr);
	const h = Math.round(drawing.size.height * dpr);
	if (el.width !== w) el.width = w;
	if (el.height !== h) el.height = h;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, w, h);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	drawing.draw(ctx, ms);
	// Tint the ink with the resolved colour at draw time, so a theme change follows.
	ctx.globalCompositeOperation = "source-in";
	ctx.fillStyle = getComputedStyle(root.value).color;
	ctx.fillRect(0, 0, drawing.size.width, drawing.size.height);
	ctx.globalCompositeOperation = "source-over";
}

function stop(): void {
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
}

function tick(now: number): void {
	frame = 0;
	const list = drawings.value;
	if (reduced.value) {
		// The preference changed mid-drawing: snap to the end state.
		index.value = loop ? 0 : list.length - 1;
		mode.value = "static";
		if (!completedPass) onComplete?.();
		return;
	}
	const drawing = current.value;
	const elapsed = now - startedAt;
	paint(drawing, elapsed);
	const last = index.value >= list.length - 1;
	if (elapsed >= drawing.timeline.duration && last && !completedPass) {
		completedPass = true;
		onComplete?.();
		if (!loop) {
			mode.value = "static";
			return;
		}
	}
	if (elapsed >= cycleDuration(drawing.timeline)) {
		index.value = last ? 0 : index.value + 1;
		if (last) completedPass = false;
		startedAt = now;
	}
	frame = requestAnimationFrame(tick);
}

/** Writes the formula from the start. */
function play(): void {
	if (typeof window === "undefined" || t !== undefined) return;
	stop();
	completedPass = false;
	if (reduced.value || prefersReducedMotion()) {
		index.value = loop ? 0 : drawings.value.length - 1;
		mode.value = "static";
		onComplete?.();
		return;
	}
	index.value = 0;
	mode.value = "canvas";
	startedAt = performance.now();
	frame = requestAnimationFrame(tick);
}

/** Stops the drawing and returns to the first formula's finished still. */
function reset(): void {
	stop();
	completedPass = false;
	index.value = 0;
	mode.value = "static";
}

defineExpose({ play, reset });

// Starts the drawing on mount or when 60% in view. No `immediate`: it never runs on the server,
// and fires once the root element is attached.
watch(
	[() => t, () => trigger, root],
	([still, when, el], _prev, onCleanup) => {
		if (still !== undefined || when === "manual" || !el) return;
		if (when === "mount") {
			play();
			return;
		}
		const action = inView(el, {
			threshold: 0.6,
			once: true,
			onChange: (visible) => {
				if (visible) play();
			},
		});
		onCleanup(() => action?.destroy?.());
	},
	{ flush: "post" }
);

// A still at `t`: one frame, no animation loop.
watch(
	[() => t, drawings, () => loop, root, canvas],
	([still, list, , el, cv]) => {
		if (still === undefined || !el) return;
		stop();
		const { i, local } = locate(still);
		index.value = i;
		mode.value = "canvas";
		if (cv) paint(list[i]!, local);
	},
	{ flush: "post" }
);

onBeforeUnmount(stop);
</script>

<template>
	<span
		ref="root"
		role="img"
		:aria-label="label"
		data-slot="math-bubble"
		:data-state="mode === 'canvas' ? 'drawing' : 'still'"
		:class="cn('relative inline-grid place-items-center align-middle', className)"
		:style="{
			width: `${box.width}px`,
			height: `${box.height}px`,
			color: ink === 'currentColor' ? undefined : ink,
		}"
	>
		<canvas
			v-if="mode === 'canvas'"
			ref="canvas"
			aria-hidden="true"
			class="block"
			:style="{ width: `${current.size.width}px`, height: `${current.size.height}px` }"
		></canvas>
		<svg
			v-else
			aria-hidden="true"
			class="block overflow-visible"
			:width="svg.width"
			:height="svg.height"
			:viewBox="svg.viewBox"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				v-for="(p, i) in svg.paths"
				:key="i"
				:d="p.d"
				:stroke-width="p.width"
				:data-kind="p.kind"
			/>
		</svg>
	</span>
</template>
