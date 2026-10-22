<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { SunPalette } from "./sun-switch-core.js";

export interface SunSwitchProps {
	/** Called with the new value from inside the view transition's update callback. */
	onCheckedChange?: (checked: boolean) => void;
	/** Sun radius in cells. The canvas is 2 × radius + 1 cells square. */
	radius?: number;
	/** Grid pitch in CSS pixels, shared by the sun, the wave front and its halo. */
	cell?: number;
	/** Size of each square dot in CSS pixels (at most `cell`). */
	dot?: number;
	/** Four colours from the top of the sun to the bottom. */
	palette?: SunPalette;
	/** Monochrome colour of the scene outside the lens. */
	ink?: string;
	/** Opacity of the ink sun at night. */
	nightAlpha?: number;
	/** Draws a few sparse rows of dots under the sun for the lens to reveal. */
	horizon?: boolean;
	/** On hover, a soft circular lens shows the true colours under the pointer. */
	lens?: boolean;
	/** Lens radius in cells. */
	lensRadius?: number;
	/** `document`: view transition over the page. `contained`: painted over `scope`. */
	mode?: "document" | "contained";
	/** The element the wave covers in contained mode. */
	scope?: HTMLElement | null;
	/** Colour of the old-state sheet in the fallback and contained paths. */
	fill?: string;
	/** Duration of the wave in milliseconds. */
	duration?: number;
	/** Thickness of the dithered halo leading the wave front, in cells. */
	haloCells?: number;
	/** Plays the toggle cue through the sound controller. */
	sound?: boolean;
	/** Accessible name of the switch. */
	label?: string;
	/** Blocks interaction. */
	disabled?: boolean;
	/** Additional CSS classes on the button. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import {
	nextTick,
	onBeforeUnmount,
	onMounted,
	shallowRef,
	useAttrs,
	useTemplateRef,
	watch,
} from "vue";
import { cn } from "../../utils.js";
import { inView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { sound as soundFx } from "../../sound/sound.js";
import { isWaving, pixelWave } from "./pixel-wave-core.js";
import { SUN_PALETTE, createSunPainter, type SunPainter } from "./sun-switch-core.js";

defineOptions({ name: "SunSwitch", inheritAttrs: false });

const {
	onCheckedChange,
	radius = 10,
	cell = 5,
	dot = 4,
	palette = SUN_PALETTE,
	ink = "currentColor",
	nightAlpha = 0.42,
	horizon = true,
	lens = true,
	lensRadius = 7,
	mode = "document",
	scope = null,
	fill,
	duration = 1300,
	haloCells = 9,
	sound = false,
	label = "Day mode",
	disabled = false,
	class: className,
} = defineProps<SunSwitchProps>();

/** Day (true) or night (false). */
const checked = defineModel<boolean>("checked", { default: true });

const el = useTemplateRef<HTMLButtonElement>("ref");
const canvasEl = useTemplateRef<HTMLCanvasElement>("canvas");
defineExpose({ ref: el });

const attrs = useAttrs();

/**
 * Consumer listeners the component chains AFTER its own handler (the Svelte
 * order). They are taken out of the forwarded attributes, so Vue does not merge
 * them onto the button ahead of the internal one.
 */
const CHAINED = [
	"onClick",
	"onPointerenter",
	"onPointermove",
	"onPointerdown",
	"onPointerup",
	"onPointerleave",
	"onPointercancel",
	"onFocus",
	"onBlur",
	"onKeydown",
] as const;

/** Read at render time: `attrs` is not reactive, the render function is. */
function forwardedAttrs(): Record<string, unknown> {
	const out: Record<string, unknown> = { ...attrs };
	for (const key of CHAINED) delete out[key];
	return out;
}

/** Vue hands several `@event` bindings over as an array. */
function chain(key: (typeof CHAINED)[number], event: Event) {
	const listener = attrs[key];
	if (Array.isArray(listener)) {
		for (const fn of listener) if (typeof fn === "function") fn(event);
	} else if (typeof listener === "function") {
		listener(event);
	}
}

const reduced = useReducedMotion();

/** The canvas painter; null before mount and under jsdom (no 2D context). */
let painter: SunPainter | null = null;
/** True while THIS instance's wave runs (drives `aria-busy` / `data-waving`). */
const waving = shallowRef(false);

function sunRadius() {
	return Math.max(1, Math.round(radius));
}

/** True while the painter sleeps (out of view or hidden document). */
let asleep = false;
/** An ink re-read was asked for while asleep; done on wake. */
let inkStale = false;
let inkFrame = 0;

/** Re-reads the resolved ink (computed `color` of the canvas, which is `ink`). */
function readInk() {
	inkStale = false;
	const canvas = canvasEl.value;
	if (!painter || !canvas) return;
	painter.setInk(getComputedStyle(canvas).color);
}

/** Coalesces ink re-reads to one per frame (each forces a style flush), and
 * defers them while the painter sleeps. */
function scheduleInk() {
	if (asleep) {
		inkStale = true;
		return;
	}
	if (inkFrame || typeof requestAnimationFrame !== "function") return;
	inkFrame = requestAnimationFrame(() => {
		inkFrame = 0;
		readInk();
	});
}

let teardown: (() => void) | null = null;

// The painter lives for the component's lifetime; prop changes reach it
// through the watchers below.
onMounted(() => {
	const canvas = canvasEl.value;
	if (!canvas) return;
	const p = createSunPainter(canvas, {
		radius,
		cell,
		dot,
		palette,
		nightAlpha,
		horizon,
		lens,
		lensRadius,
		checked: checked.value,
		reducedMotion: reduced.value,
	});
	if (!p) return;
	painter = p;
	readInk();

	let visible = true;
	let hidden = document.visibilityState === "hidden";
	const sync = () => {
		asleep = !(visible && !hidden);
		if (asleep) {
			p.sleep();
			return;
		}
		if (inkStale) readInk();
		p.wake();
	};

	let ro: ResizeObserver | undefined;
	if (typeof ResizeObserver !== "undefined") {
		ro = new ResizeObserver(() => p.resize());
		try {
			// Also fires on a device-pixel-ratio change (zoom, moving screens).
			ro.observe(canvas, { box: "device-pixel-content-box" });
		} catch {
			ro.observe(canvas);
		}
	}

	const io = inView(canvas, {
		once: false,
		threshold: 0,
		onChange: (intersecting) => {
			visible = intersecting;
			sync();
		},
	}) as { destroy?: () => void } | void;

	const onVisibility = () => {
		hidden = document.visibilityState === "hidden";
		sync();
	};
	document.addEventListener("visibilitychange", onVisibility);

	// The ink follows the theme: re-read it when the document's theme hooks or
	// the colour scheme change, whatever system flips them, and again when a
	// `color` transition settles (the computed colour lags behind the flip).
	let mo: MutationObserver | undefined;
	if (typeof MutationObserver !== "undefined") {
		mo = new MutationObserver(scheduleInk);
		const attributeFilter = ["class", "style", "data-theme", "data-mode"];
		mo.observe(document.documentElement, { attributes: true, attributeFilter });
		mo.observe(document.body, { attributes: true, attributeFilter });
	}
	const scheme =
		typeof window.matchMedia === "function"
			? window.matchMedia("(prefers-color-scheme: dark)")
			: null;
	scheme?.addEventListener("change", scheduleInk);
	const onColorSettled = (event: TransitionEvent) => {
		// Only transitions on the canvas or its ancestors can change its colour.
		const target = event.target;
		if (event.propertyName !== "color" || !(target instanceof Node)) return;
		if (target.contains(canvas)) scheduleInk();
	};
	document.addEventListener("transitionend", onColorSettled, true);
	document.addEventListener("transitioncancel", onColorSettled, true);

	sync();

	teardown = () => {
		ro?.disconnect();
		io?.destroy?.();
		mo?.disconnect();
		scheme?.removeEventListener("change", scheduleInk);
		document.removeEventListener("transitionend", onColorSettled, true);
		document.removeEventListener("transitioncancel", onColorSettled, true);
		document.removeEventListener("visibilitychange", onVisibility);
		if (inkFrame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(inkFrame);
		inkFrame = 0;
		p.destroy();
		painter = null;
	};
});

onBeforeUnmount(() => {
	clearTimeout(closeTimer);
	clearTimeout(pendingTimer);
	pendingTimer = undefined;
	pending = null;
	disarm?.();
	disarm = null;
	teardown?.();
	teardown = null;
});

// Layout props: re-raster and resize.
watch(
	() => ({ radius, cell, dot, horizon }),
	(next) => painter?.setOptions(next),
	{ flush: "post" }
);

// Appearance props: repaint in place.
watch(
	() => ({ palette, nightAlpha, lens, lensRadius }),
	(next) => painter?.setOptions(next),
	{ flush: "post" }
);

watch(checked, (value) => painter?.setOptions({ checked: value }), { flush: "post" });

watch(reduced, (value) => painter?.setOptions({ reducedMotion: value }), { flush: "post" });

// `ink` lands on the canvas as `color`; a post-flush watcher runs after the
// DOM update, so the computed value is already the new one here.
watch(() => ink, readInk, { flush: "post" });

// Lens state. The lens opens while the pointer is over the button (or the
// button has keyboard focus) and stays open through this instance's own wave,
// whatever the pointer does meanwhile (a view transition re-targets hit
// testing, so a `pointerleave` may arrive mid-wave).
let hovering = false;
let focused = false;
let lensOpen = false;
/** Last lens target in canvas cells. */
let targetX = 0;
let targetY = 0;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

/** Side of the sun canvas in cells (the core rounds the radius the same way). */
function sizeCells() {
	return 2 * sunRadius() + 1;
}

/** Disc centre in canvas cells. */
function centreCells() {
	return sunRadius() + 0.5;
}

/** Pointer position in canvas cells, robust to CSS scaling of the button. */
function trackPointer(event: PointerEvent) {
	const canvas = canvasEl.value;
	if (!canvas) return;
	const r = canvas.getBoundingClientRect();
	const size = sizeCells();
	const sx = r.width > 0 ? size / r.width : 1 / cell;
	const sy = r.height > 0 ? size / r.height : 1 / cell;
	targetX = (event.clientX - r.left) * sx;
	targetY = (event.clientY - r.top) * sy;
}

function syncLens() {
	const want = lens && !disabled && (hovering || focused);
	lensOpen = want || (waving.value && lensOpen);
	if (focused && !hovering) {
		targetX = centreCells();
		targetY = centreCells();
	}
	painter?.pointer(targetX, targetY, lensOpen);
}

/** Closes on the next task, so a touch release that is followed by its
 * `click` (same task) keeps the lens open for the wave that click starts. */
function syncLensSoon() {
	clearTimeout(closeTimer);
	closeTimer = setTimeout(() => {
		closeTimer = undefined;
		syncLens();
	}, 0);
}

// `lens` / `disabled` changes open or close the lens at once.
watch(
	() => [lens, disabled],
	() => syncLens()
);

function onPointerEnter(event: PointerEvent) {
	hovering = true;
	trackPointer(event);
	syncLens();
	chain("onPointerenter", event);
}

function onPointerMove(event: PointerEvent) {
	hovering = true;
	trackPointer(event);
	syncLens();
	chain("onPointermove", event);
}

// Touch opens the lens at the touch point (no hover before a tap).
function onPointerDown(event: PointerEvent) {
	hovering = true;
	trackPointer(event);
	syncLens();
	chain("onPointerdown", event);
}

// A touch release ends the "hover".
function onPointerUp(event: PointerEvent) {
	if (event.pointerType === "touch") {
		hovering = false;
		syncLensSoon();
	}
	chain("onPointerup", event);
}

// Closes the lens (held open while this instance is waving).
function onPointerLeave(event: PointerEvent) {
	hovering = false;
	syncLensSoon();
	chain("onPointerleave", event);
}

function onPointerCancel(event: PointerEvent) {
	hovering = false;
	syncLensSoon();
	chain("onPointercancel", event);
}

// Keyboard focus opens the lens centred on the disc (the hover affordance for
// keyboard users). Pointer focus does not: the pointer already drives it.
function onFocus(event: FocusEvent) {
	let visible = false;
	try {
		visible = (event.currentTarget as HTMLElement).matches(":focus-visible");
	} catch {
		visible = false;
	}
	focused = visible;
	syncLens();
	chain("onFocus", event);
}

function onBlur(event: FocusEvent) {
	focused = false;
	syncLensSoon();
	chain("onBlur", event);
}

// Click → wave.
/** Value asked for by the latest click until its wave settles, so a click
 * landing before the previous wave applied still toggles from the right state
 * (intent is never dropped). */
let intent: boolean | null = null;
/** Identifies the latest click; only its wave may clear the shared state. */
let token = 0;

/** Minimum time between two theme flips: at most 3 full-page flips a second
 * (photosensitivity), however fast the clicks come. */
const MIN_FLIP_MS = 334;
let lastFlipAt = -Infinity;
/** Value asked for by clicks that came too soon, applied when the gap allows. */
let pending: boolean | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
/** Removes the document listeners that catch clicks during a view transition. */
let disarm: (() => void) | null = null;

/** One more toggle asked for by the user, rate-limited without dropping intent. */
function toggle() {
	if (disabled) return;
	const next = !(pending ?? intent ?? checked.value);
	const wait = lastFlipAt + MIN_FLIP_MS - window.performance.now();
	if (wait > 0) {
		pending = next;
		pendingTimer ??= setTimeout(flushPending, wait);
		return;
	}
	pending = null;
	startWave(next);
}

function flushPending() {
	pendingTimer = undefined;
	const next = pending;
	pending = null;
	// An even number of early clicks asks for the current state: nothing to do.
	if (next === null || disabled || next === (intent ?? checked.value)) return;
	startWave(next);
}

/** Whether a viewport point falls on the button. */
function overButton(x: number, y: number): boolean {
	const r = el.value?.getBoundingClientRect();
	return !!r && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

/**
 * While a document-mode wave runs, the view transition hit-tests every point as
 * `<html>`, so the button never sees the pointer. Catch those events on the
 * document and route the ones over the button back to it.
 */
function armReentry() {
	if (disarm || mode !== "document") return;
	const root = document.documentElement;
	const onDown = (event: PointerEvent) => {
		// Keep focus on the switch instead of moving it to <body>.
		if (event.target === root && overButton(event.clientX, event.clientY)) {
			event.preventDefault();
		}
	};
	const onMove = (event: PointerEvent) => {
		if (event.target !== root || !overButton(event.clientX, event.clientY)) return;
		hovering = true;
		trackPointer(event);
		syncLens();
	};
	const onDocClick = (event: MouseEvent) => {
		if (event.target === root && overButton(event.clientX, event.clientY)) toggle();
	};
	document.addEventListener("pointerdown", onDown, true);
	document.addEventListener("pointermove", onMove, true);
	document.addEventListener("click", onDocClick, true);
	disarm = () => {
		document.removeEventListener("pointerdown", onDown, true);
		document.removeEventListener("pointermove", onMove, true);
		document.removeEventListener("click", onDocClick, true);
	};
}

// Auto-repeated Enter would click on every repeat: a full-page flash train.
function onKeyDown(event: KeyboardEvent) {
	if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
	chain("onKeydown", event);
}

function isHovered(): boolean {
	try {
		return !!el.value?.matches(":hover");
	} catch {
		return false;
	}
}

function onClick(event: MouseEvent) {
	toggle();
	chain("onClick", event);
}

/** Writes the state attributes straight onto the button: Vue patches the DOM
 * on the next flush, after the view transition has taken its "new" snapshot. */
function writeState(value: boolean) {
	const button = el.value;
	if (!button) return;
	button.setAttribute("aria-checked", value ? "true" : "false");
	button.setAttribute("data-state", value ? "day" : "night");
}

function startWave(next: boolean) {
	lastFlipAt = window.performance.now();
	intent = next;
	const id = ++token;
	// User activation: play before the view transition starts.
	if (sound) soundFx.play(next ? "toggle-on" : "toggle-off");

	const canvas = canvasEl.value;
	const instant = reduced.value || isWaving();
	const rect = canvas?.getBoundingClientRect();
	const centre = centreCells() * cell;
	let origin = { x: (rect?.left ?? 0) + centre, y: (rect?.top ?? 0) + centre };
	if (mode === "contained" && scope) {
		const sr = scope.getBoundingClientRect();
		origin = {
			x: origin.x - sr.left - scope.clientLeft,
			y: origin.y - sr.top - scope.clientTop,
		};
	}
	const oldInk = canvas ? getComputedStyle(canvas).color : "";
	const front = (outer: number) => ({
		cx: centre,
		cy: centre,
		R: Math.max(0, outer - haloCells + 0.5) * cell,
		nextChecked: next,
		oldInk,
	});

	waving.value = !instant;
	if (!instant) armReentry();
	// Hold the old look on the canvas until the front reaches each cell; the
	// canvas renders live above the snapshots during a view transition.
	painter?.setFront(instant ? null : front(0));

	void pixelWave({
		origin,
		mode,
		scope,
		live: canvas ?? null,
		fill,
		cell,
		dot,
		haloCells,
		duration,
		palette,
		reducedMotion: reduced.value,
		apply: () => {
			checked.value = next;
			onCheckedChange?.(next);
			// Commit now: the view transition captures the new state right
			// after this callback returns, before Vue's next flush.
			writeState(next);
			painter?.setOptions({ checked: next });
			readInk();
			// Again once styles settle (a transition may still hold the old colour).
			scheduleInk();
		},
		onFront: (outer) => {
			if (id === token) painter?.setFront(front(outer));
		},
	}).then(() => {
		// A parent that owns `checked` and declined the write leaves the vnode
		// unchanged, so Vue never patches the attributes back: put them on the
		// model once the flush that would have carried the write is done.
		void nextTick(() => {
			writeState(checked.value);
			painter?.setOptions({ checked: checked.value });
		});
		if (id !== token) return;
		intent = null;
		waving.value = false;
		disarm?.();
		disarm = null;
		painter?.setFront(null);
		hovering = isHovered();
		syncLens();
	});
}
</script>

<template>
	<button
		v-bind="forwardedAttrs()"
		ref="ref"
		type="button"
		role="switch"
		:aria-checked="checked ? 'true' : 'false'"
		:aria-label="label"
		:aria-busy="waving ? 'true' : undefined"
		:data-state="checked ? 'day' : 'night'"
		:data-waving="waving ? '' : undefined"
		:disabled="disabled"
		:class="cn('ft-sun-switch', className)"
		:style="{ '--ft-sun-r': String(sunRadius()), '--ft-sun-cell': `${cell}px` }"
		@click="onClick"
		@pointerenter="onPointerEnter"
		@pointermove="onPointerMove"
		@pointerdown="onPointerDown"
		@pointerup="onPointerUp"
		@pointerleave="onPointerLeave"
		@pointercancel="onPointerCancel"
		@focus="onFocus"
		@blur="onBlur"
		@keydown="onKeyDown"
	>
		<canvas
			ref="canvas"
			class="ft-sun-switch-canvas"
			aria-hidden="true"
			:style="{ color: ink }"
		></canvas>
	</button>
</template>

<style scoped>
.ft-sun-switch {
	appearance: none;
	background: none;
	border: 0;
	padding: 0;
	margin: 0;
	display: inline-block;
	line-height: 0;
	color: inherit;
	cursor: pointer;
	touch-action: manipulation;
	border-radius: 4px;
	-webkit-tap-highlight-color: transparent;
}

.ft-sun-switch:focus-visible {
	outline: 2px solid var(--ft-accent, currentColor);
	outline-offset: 2px;
}

.ft-sun-switch:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.ft-sun-switch-canvas {
	display: block;
	width: calc((2 * var(--ft-sun-r) + 1) * var(--ft-sun-cell));
	height: calc((2 * var(--ft-sun-r) + 1) * var(--ft-sun-cell));
	image-rendering: pixelated;
	pointer-events: none;
}
</style>
