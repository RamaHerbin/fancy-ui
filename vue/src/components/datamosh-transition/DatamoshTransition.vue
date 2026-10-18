<script lang="ts">
import type { HTMLAttributes } from "vue";
import type {
	DatamoshEffect,
	DatamoshPaletteName,
	DatamoshSweep,
} from "./datamosh-transition-core.js";

export type DatamoshTransitionPhase = "idle" | "covering" | "covered" | "revealing";

/**
 * DatamoshTransition — a page-transition overlay that looks like a corrupted
 * video decode.
 *
 * A fixed grid of columns (narrow on the left, wide on the right) fills with
 * flat blocks of saturated colour. Inside each column a stack of tiles falls
 * along one sigmoid: slivers at the edges, one tile snapping open through
 * the middle. `cover()` drops the columns over the page like a curtain,
 * right to left; `reveal()` lets them fall away. Nothing moves sideways.
 *
 * Mount once (root layout) and drive it from your router's navigation hook.
 */
export interface DatamoshTransitionProps {
	/** Additional classes on the overlay */
	class?: HTMLAttributes["class"];
	/**
	 * Palette name or colour list (hex or rgb()). The lightest and darkest
	 * colours recur most often.
	 */
	colors?: string[] | DatamoshPaletteName;
	/** Shape of the covering band: curtain, rise, split or interlace */
	variant?: DatamoshEffect;
	/** Order in which the columns move */
	sweep?: DatamoshSweep;
	/**
	 * Picture to decode: tiles take their colours from it instead of the
	 * palette. A URL (same-origin or CORS-enabled), an image or a canvas.
	 */
	source?: string | HTMLImageElement | HTMLCanvasElement;
	/** Seed for the colour order — same seed, same strip */
	seed?: number;
	/** Number of columns */
	columns?: number;
	/** Column edge exponent: 1 = uniform grid, higher = wider columns to the right */
	power?: number;
	/** Tiles per column stack (forced odd) */
	tiles?: number;
	/** Time for one column to cover, ms */
	coverDuration?: number;
	/** Time for one column to clear, ms */
	revealDuration?: number;
	/** Delay between neighbouring columns, ms (rightmost first) */
	stagger?: number;
	/** Speed of the falling tiles, 1 = default */
	speed?: number;
	/** Fill the positioned parent instead of the viewport */
	contained?: boolean;
	/** Stacking order of the overlay */
	zIndex?: number;
	/** Current phase (read-only, `v-model:phase`) */
	phase?: DatamoshTransitionPhase;
	/** Called once the page is fully covered */
	oncovered?: () => void;
	/** Called once the page is fully revealed */
	onrevealed?: () => void;
}
</script>

<script setup lang="ts">
import {
	computed,
	onBeforeUnmount,
	onMounted,
	shallowRef,
	useAttrs,
	useTemplateRef,
	watch,
} from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	BLEED,
	CYCLE,
	DEFAULT_COLUMNS,
	DEFAULT_POWER,
	DEFAULT_TILES,
	FALL_STAGGER,
	buildStrip,
	columnBand,
	columnDelays,
	columnEdges,
	columnFlow,
	columnTiles,
	coverFit,
	sampleSource,
	sourceSlot,
	createCoverage,
	easeEdge,
	oddTiles,
	paletteRoles,
	resolvePalette,
	settleCoverage,
	stepCoverage,
	stripIndex,
	type Coverage,
	type Direction,
} from "./datamosh-transition-core.js";

defineOptions({ name: "DatamoshTransition", inheritAttrs: false });

const {
	class: className,
	colors = "broadcast",
	variant = "curtain",
	sweep = "right",
	source,
	seed = 1,
	columns = DEFAULT_COLUMNS,
	power = DEFAULT_POWER,
	tiles = DEFAULT_TILES,
	coverDuration = 380,
	revealDuration = 480,
	stagger = 28,
	speed = 1,
	contained = false,
	zIndex = 9999,
	oncovered,
	onrevealed,
} = defineProps<DatamoshTransitionProps>();

const phaseModel = defineModel<DatamoshTransitionPhase>("phase", { default: "idle" });

const attrs = useAttrs();
const reduced = useReducedMotion();

const palette = computed(() => resolvePalette(colors));
const columnsC = computed(() =>
	Math.max(1, Math.round(Number.isFinite(columns) ? columns : DEFAULT_COLUMNS))
);
const powerC = computed(() => (Number.isFinite(power) && power > 0 ? power : DEFAULT_POWER));
const tilesC = computed(() => oddTiles(tiles));
const speedC = computed(() => (Number.isFinite(speed) && speed > 0 ? speed : 1));
const strip = computed(() => buildStrip(seed, palette.value));
const delays = computed(() =>
	columnDelays(
		columnsC.value,
		sweep,
		Math.max(0, Number.isFinite(stagger) ? stagger : 0) / 1000,
		seed
	)
);
/** Darkest colour as a backing fill, so rounding seams never show the page through. */
const backing = computed(
	() => palette.value[paletteRoles(palette.value).darks[0] ?? 0] ?? "#14101f"
);

const hostEl = useTemplateRef<HTMLDivElement>("host");
const canvasEl = useTemplateRef<HTMLCanvasElement>("canvas");

/**
 * The phase the overlay renders and the loop reads. Svelte's bindable writes
 * through synchronously; a `defineModel` driven by the parent only reflects a
 * write after the parent's next render, so the engine keeps its own copy and
 * mirrors every change into the model.
 */
const phaseNow = shallowRef<DatamoshTransitionPhase>(phaseModel.value);

function setPhase(next: DatamoshTransitionPhase) {
	phaseNow.value = next;
	phaseModel.value = next;
}

// --- plain closure state (touched every frame, never rendered) --------------

let ctx: CanvasRenderingContext2D | null = null;
let w = 0;
let h = 0;
let dpr = 1;
let edges: number[] = [];
let cov: Coverage = createCoverage(DEFAULT_COLUMNS);
let direction: Direction = "reveal";
let phaseTime = 0;
let elapsed = 0;
let rafId: number | null = null;
let lastT = 0;
let pending: Array<() => void> = [];
/** Loaded picture, and its colours per `[column][slot]` for the current box. */
let sourceImage: CanvasImageSource | null = null;
let sourceSize = { w: 0, h: 0 };
let sourceTable: string[][] | null = null;
let cancelSource: (() => void) | null = null;
let ro: ResizeObserver | undefined;
let onVisibility: (() => void) | null = null;

// --- promises ------------------------------------------------------------------

function settlePending() {
	const list = pending;
	pending = [];
	for (const resolve of list) resolve();
}

function finish(dir: Direction) {
	settleCoverage(cov, dir);
	setPhase(dir === "cover" ? "covered" : "idle");
	if (dir === "reveal") {
		stopLoop();
		clear();
	} else if (!reduced.value) {
		requestFrame();
	} else {
		draw();
	}
	settlePending();
	if (dir === "cover") oncovered?.();
	else onrevealed?.();
}

function run(dir: Direction): Promise<void> {
	// A superseded call resolves now: its caller moves on, the new phase takes over.
	settlePending();
	const promise = new Promise<void>((resolve) => pending.push(resolve));

	// Already there: nothing to animate, no callback.
	if (
		(dir === "reveal" && phaseNow.value === "idle") ||
		(dir === "cover" && phaseNow.value === "covered")
	) {
		settlePending();
		return promise;
	}

	direction = dir;
	phaseTime = 0;
	setPhase(dir === "cover" ? "covering" : "revealing");

	const instant =
		!ctx ||
		reduced.value ||
		typeof requestAnimationFrame !== "function" ||
		(typeof document !== "undefined" && document.hidden);
	if (instant) finish(dir);
	else requestFrame();
	return promise;
}

/** Cover the page. Resolves once every column is down. */
function cover(): Promise<void> {
	return run("cover");
}

/** Clear the page. Resolves once every column has fallen away. */
function reveal(): Promise<void> {
	return run("reveal");
}

/** Cover, then reveal — a one-shot flash. */
async function play(): Promise<void> {
	await cover();
	await reveal();
}

defineExpose({ ref: hostEl, cover, reveal, play });

// --- setup ---------------------------------------------------------------------

function currentDpr() {
	return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
}

/** Sample the loaded picture onto the current grid; any failure falls back to the palette. */
function buildSourceTable() {
	sourceTable = null;
	if (!sourceImage || !edges.length || typeof document === "undefined") return;
	const pw = 96;
	const ph = Math.max(8, Math.round((pw * h) / Math.max(1, w)));
	try {
		const scratch = document.createElement("canvas");
		scratch.width = pw;
		scratch.height = ph;
		const sctx = scratch.getContext("2d", { willReadFrequently: true });
		if (!sctx) return;
		const fit = coverFit(sourceSize.w, sourceSize.h, pw, ph);
		sctx.drawImage(sourceImage, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, pw, ph);
		const { data } = sctx.getImageData(0, 0, pw, ph);
		const norm = edges.map((e) => e / Math.max(1, w));
		sourceTable = sampleSource(data, pw, ph, norm, tilesC.value);
	} catch {
		// Cross-origin picture without CORS taints the canvas: keep the palette.
		sourceTable = null;
	}
}

function measure() {
	const host = hostEl.value;
	const canvas = canvasEl.value;
	if (!host || !canvas || !ctx) return;
	dpr = currentDpr();
	w = Math.max(1, Math.round(host.clientWidth * dpr));
	h = Math.max(1, Math.round(host.clientHeight * dpr));
	canvas.width = w;
	canvas.height = h;
	ctx.imageSmoothingEnabled = false;
	edges = columnEdges(w, columnsC.value, powerC.value);
	buildSourceTable();
	if (cov.top.length !== columnsC.value) {
		const covered = phaseNow.value === "covered" || phaseNow.value === "covering";
		cov = createCoverage(columnsC.value, covered);
	}
	if (phaseNow.value !== "idle") draw();
}

// --- loop ----------------------------------------------------------------------

function requestFrame() {
	if (rafId !== null || !ctx || typeof requestAnimationFrame !== "function") return;
	lastT = 0;
	rafId = requestAnimationFrame(tick);
}

function stopLoop() {
	if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
	rafId = null;
}

function tick(now: number) {
	rafId = null;
	if (!ctx) return;
	// Time-based: identical pacing at 60 Hz and 120 Hz; long stalls clamp.
	const dt = lastT ? Math.min(0.05, Math.max(0, (now - lastT) / 1000)) : 0;
	lastT = now;
	elapsed += dt;

	if (phaseNow.value === "covering" || phaseNow.value === "revealing") {
		phaseTime += dt;
		const duration = (direction === "cover" ? coverDuration : revealDuration) / 1000;
		const done = stepCoverage(cov, direction, phaseTime, dt, duration, delays.value);
		if (done) {
			finish(direction);
			return;
		}
	}

	draw();
	if (phaseNow.value !== "idle") rafId = requestAnimationFrame(tick);
}

function clear() {
	ctx?.clearRect(0, 0, w, h);
}

function draw() {
	const c = ctx;
	if (!c || !edges.length) return;
	c.clearRect(0, 0, w, h);
	const bleed = Math.round(BLEED * h);
	const pal = palette.value;
	const len = pal.length;
	const n = columnsC.value;
	const tileCount = tilesC.value;
	const sp = speedC.value;
	const st = strip.value;
	const fill = backing.value;
	// Reduced motion paints one still frame part-way into a step.
	const t = reduced.value ? CYCLE * 0.45 + n * FALL_STAGGER : elapsed;

	for (let i = 0; i < n; i++) {
		const x0 = edges[i]!;
		const cw = edges[i + 1]! - x0;
		if (cw <= 0) continue;
		const band = columnBand(variant, i, easeEdge(cov.top[i] ?? 0), easeEdge(cov.bot[i] ?? 0));
		const bandTop = Math.round(band.y0 * h);
		const bandBot = Math.round(band.y1 * h);
		if (bandBot <= bandTop) continue;

		c.fillStyle = fill;
		c.fillRect(x0, bandTop, cw, bandBot - bandTop);

		const flow = columnFlow(t, i, n, sp);
		for (const tile of columnTiles(flow, tileCount, h, bleed)) {
			// Mirrored stacks rise instead of fall; the overhang still laps the next tile.
			const top = band.mirror ? h - tile.bot : tile.top;
			const bot = band.mirror ? h - tile.top : tile.bot;
			const y0 = Math.max(bandTop, top);
			const y1 = Math.min(bandBot, bot);
			if (y1 <= y0) continue;
			c.fillStyle =
				sourceTable?.[i]?.[sourceSlot(tile.id, i, tileCount)] ??
				pal[stripIndex(st, tile.id, i) % len]!;
			c.fillRect(x0, y0, cw, y1 - y0);
		}
	}
}

// --- picture source --------------------------------------------------------------

/** Load the picture source; a stale load never overwrites a newer one. */
function loadSource() {
	cancelSource?.();
	cancelSource = null;
	const src = source;
	sourceImage = null;
	sourceTable = null;
	if (!src || typeof window === "undefined") return;

	let cancelled = false;
	const ready = (img: CanvasImageSource, iw: number, ih: number) => {
		if (cancelled || iw <= 0 || ih <= 0) return;
		sourceImage = img;
		sourceSize = { w: iw, h: ih };
		buildSourceTable();
		if (phaseNow.value !== "idle") draw();
	};

	if (typeof src !== "string") {
		if (src instanceof HTMLCanvasElement) ready(src, src.width, src.height);
		else if (src.complete && src.naturalWidth) ready(src, src.naturalWidth, src.naturalHeight);
		else
			src.addEventListener("load", () => ready(src, src.naturalWidth, src.naturalHeight), {
				once: true,
			});
		cancelSource = () => {
			cancelled = true;
		};
		return;
	}

	const img = new Image();
	img.decoding = "async";
	if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
	img.onload = () => ready(img, img.naturalWidth || 300, img.naturalHeight || 150);
	img.src = src;
	cancelSource = () => {
		cancelled = true;
		img.onload = null;
	};
}

// --- mount ---------------------------------------------------------------------

onMounted(() => {
	// `useReducedMotion()` registered its own `onMounted` during setup, so the
	// query has already been asked by the time this hook runs.
	const host = hostEl.value;
	const canvas = canvasEl.value;
	if (host && canvas) {
		ctx = canvas.getContext("2d");
		if (ctx) {
			measure();

			if (typeof ResizeObserver !== "undefined") {
				ro = new ResizeObserver(() => measure());
				ro.observe(host);
			}

			// A hidden tab stops rAF: finish the phase so an awaiting navigation never hangs.
			onVisibility = () => {
				if (!document.hidden) {
					if (phaseNow.value !== "idle") requestFrame();
					return;
				}
				stopLoop();
				if (phaseNow.value === "covering") finish("cover");
				else if (phaseNow.value === "revealing") finish("reveal");
			};
			document.addEventListener("visibilitychange", onVisibility);
		}
	}

	// Svelte's source effect runs on mount after `onMount`, whatever it found.
	loadSource();
});

onBeforeUnmount(() => {
	cancelSource?.();
	cancelSource = null;
	if (!ctx) return;
	stopLoop();
	ro?.disconnect();
	ro = undefined;
	if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
	onVisibility = null;
	settlePending();
	ctx = null;
});

// --- reactivity ------------------------------------------------------------------

// A new picture (or a new stack height, which reshapes the sample table): reload.
watch([() => source, tilesC], loadSource, { flush: "post" });

// Grid-shaping props: re-measure (column count may change the coverage arrays).
// A `watch` without `immediate` skips the initial values, as Svelte's `gridInit` guard does.
watch([columnsC, powerC], () => measure(), { flush: "post" });

// Reduced motion flips mid-phase: settle instantly rather than animate.
watch(
	reduced,
	(on) => {
		if (!on) return;
		if (phaseNow.value === "covering") finish("cover");
		else if (phaseNow.value === "revealing") finish("reveal");
		else if (phaseNow.value === "covered") {
			stopLoop();
			draw();
		}
	},
	{ flush: "post" }
);
</script>

<template>
	<div
		ref="host"
		:class="
			cn(
				'datamosh-transition inset-0',
				contained ? 'absolute' : 'fixed',
				phaseNow === 'idle' ? 'pointer-events-none invisible' : 'pointer-events-auto',
				className
			)
		"
		:data-state="phaseNow"
		aria-hidden="true"
		v-bind="attrs"
		:style="{ 'z-index': zIndex }"
	>
		<canvas ref="canvas" class="block h-full w-full"></canvas>
	</div>
</template>
