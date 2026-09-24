<script lang="ts" module>
	import type { HTMLAttributes } from "svelte/elements";
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
	interface BaseProps {
		/** Additional classes on the overlay */
		class?: string;
		/** Bindable overlay element */
		ref?: HTMLDivElement | null;
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
		/** Current phase (read-only, bindable) */
		phase?: DatamoshTransitionPhase;
		/** Called once the page is fully covered */
		oncovered?: () => void;
		/** Called once the page is fully revealed */
		onrevealed?: () => void;
	}

	export type DatamoshTransitionProps = BaseProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
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

	let {
		class: className,
		ref = $bindable(null),
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
		phase = $bindable("idle"),
		oncovered,
		onrevealed,
		...restProps
	}: DatamoshTransitionProps = $props();

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	const palette = $derived(resolvePalette(colors));
	const columnsC = $derived(
		Math.max(1, Math.round(Number.isFinite(columns) ? columns : DEFAULT_COLUMNS))
	);
	const powerC = $derived(Number.isFinite(power) && power > 0 ? power : DEFAULT_POWER);
	const tilesC = $derived(oddTiles(tiles));
	const speedC = $derived(Number.isFinite(speed) && speed > 0 ? speed : 1);
	const strip = $derived(buildStrip(seed, palette));
	const delays = $derived(
		columnDelays(columnsC, sweep, Math.max(0, Number.isFinite(stagger) ? stagger : 0) / 1000, seed)
	);
	/** Darkest colour as a backing fill, so rounding seams never show the page through. */
	const backing = $derived(palette[paletteRoles(palette).darks[0] ?? 0] ?? "#14101f");

	let canvasEl: HTMLCanvasElement | null = $state(null);

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

	// --- promises ------------------------------------------------------------------

	function settlePending() {
		const list = pending;
		pending = [];
		for (const resolve of list) resolve();
	}

	function finish(dir: Direction) {
		settleCoverage(cov, dir);
		phase = dir === "cover" ? "covered" : "idle";
		if (dir === "reveal") {
			stopLoop();
			clear();
		} else if (!reduced.current) {
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
		if ((dir === "reveal" && phase === "idle") || (dir === "cover" && phase === "covered")) {
			settlePending();
			return promise;
		}

		direction = dir;
		phaseTime = 0;
		phase = dir === "cover" ? "covering" : "revealing";

		const instant =
			!ctx ||
			reduced.current ||
			typeof requestAnimationFrame !== "function" ||
			(typeof document !== "undefined" && document.hidden);
		if (instant) finish(dir);
		else requestFrame();
		return promise;
	}

	/** Cover the page. Resolves once every column is down. */
	export function cover(): Promise<void> {
		return run("cover");
	}

	/** Clear the page. Resolves once every column has fallen away. */
	export function reveal(): Promise<void> {
		return run("reveal");
	}

	/** Cover, then reveal — a one-shot flash. */
	export async function play(): Promise<void> {
		await cover();
		await reveal();
	}

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
			sourceTable = sampleSource(data, pw, ph, norm, tilesC);
		} catch {
			// Cross-origin picture without CORS taints the canvas: keep the palette.
			sourceTable = null;
		}
	}

	function measure() {
		const host = ref;
		const canvas = canvasEl;
		if (!host || !canvas || !ctx) return;
		dpr = currentDpr();
		w = Math.max(1, Math.round(host.clientWidth * dpr));
		h = Math.max(1, Math.round(host.clientHeight * dpr));
		canvas.width = w;
		canvas.height = h;
		ctx.imageSmoothingEnabled = false;
		edges = columnEdges(w, columnsC, powerC);
		buildSourceTable();
		if (cov.top.length !== columnsC) {
			const covered = phase === "covered" || phase === "covering";
			cov = createCoverage(columnsC, covered);
		}
		if (phase !== "idle") draw();
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

		if (phase === "covering" || phase === "revealing") {
			phaseTime += dt;
			const duration = (direction === "cover" ? coverDuration : revealDuration) / 1000;
			const done = stepCoverage(cov, direction, phaseTime, dt, duration, delays);
			if (done) {
				finish(direction);
				return;
			}
		}

		draw();
		if (phase !== "idle") rafId = requestAnimationFrame(tick);
	}

	function clear() {
		ctx?.clearRect(0, 0, w, h);
	}

	function draw() {
		const c = ctx;
		if (!c || !edges.length) return;
		c.clearRect(0, 0, w, h);
		const bleed = Math.round(BLEED * h);
		const len = palette.length;
		// Reduced motion paints one still frame part-way into a step.
		const t = reduced.current ? CYCLE * 0.45 + columnsC * FALL_STAGGER : elapsed;

		for (let i = 0; i < columnsC; i++) {
			const x0 = edges[i]!;
			const cw = edges[i + 1]! - x0;
			if (cw <= 0) continue;
			const band = columnBand(variant, i, easeEdge(cov.top[i] ?? 0), easeEdge(cov.bot[i] ?? 0));
			const bandTop = Math.round(band.y0 * h);
			const bandBot = Math.round(band.y1 * h);
			if (bandBot <= bandTop) continue;

			c.fillStyle = backing;
			c.fillRect(x0, bandTop, cw, bandBot - bandTop);

			const flow = columnFlow(t, i, columnsC, speedC);
			for (const tile of columnTiles(flow, tilesC, h, bleed)) {
				// Mirrored stacks rise instead of fall; the overhang still laps the next tile.
				const top = band.mirror ? h - tile.bot : tile.top;
				const bot = band.mirror ? h - tile.top : tile.bot;
				const y0 = Math.max(bandTop, top);
				const y1 = Math.min(bandBot, bot);
				if (y1 <= y0) continue;
				c.fillStyle =
					sourceTable?.[i]?.[sourceSlot(tile.id, i, tilesC)] ??
					palette[stripIndex(strip, tile.id, i) % len]!;
				c.fillRect(x0, y0, cw, y1 - y0);
			}
		}
	}

	// --- mount ---------------------------------------------------------------------

	onMount(() => {
		const host = ref;
		const canvas = canvasEl;
		if (!host || !canvas) return;
		ctx = canvas.getContext("2d");
		if (!ctx) return;
		measure();

		let ro: ResizeObserver | undefined;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(() => measure());
			ro.observe(host);
		}

		// A hidden tab stops rAF: finish the phase so an awaiting navigation never hangs.
		const onVisibility = () => {
			if (!document.hidden) {
				if (phase !== "idle") requestFrame();
				return;
			}
			stopLoop();
			if (phase === "covering") finish("cover");
			else if (phase === "revealing") finish("reveal");
		};
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			stopLoop();
			ro?.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			settlePending();
			ctx = null;
		};
	});

	// --- reactivity ------------------------------------------------------------------

	// Load the picture source; a stale load never overwrites a newer one.
	$effect(() => {
		const src = source;
		void tilesC;
		untrack(() => {
			sourceImage = null;
			sourceTable = null;
		});
		if (!src || typeof window === "undefined") return;

		let cancelled = false;
		const ready = (img: CanvasImageSource, iw: number, ih: number) => {
			if (cancelled || iw <= 0 || ih <= 0) return;
			sourceImage = img;
			sourceSize = { w: iw, h: ih };
			untrack(() => {
				buildSourceTable();
				if (phase !== "idle") draw();
			});
		};

		if (typeof src !== "string") {
			if (src instanceof HTMLCanvasElement) ready(src, src.width, src.height);
			else if (src.complete && src.naturalWidth) ready(src, src.naturalWidth, src.naturalHeight);
			else
				src.addEventListener("load", () => ready(src, src.naturalWidth, src.naturalHeight), {
					once: true,
				});
			return () => {
				cancelled = true;
			};
		}

		const img = new Image();
		img.decoding = "async";
		if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
		img.onload = () => ready(img, img.naturalWidth || 300, img.naturalHeight || 150);
		img.src = src;
		return () => {
			cancelled = true;
			img.onload = null;
		};
	});

	// Grid-shaping props: re-measure (column count may change the coverage arrays).
	let gridInit = false;
	$effect(() => {
		void columnsC;
		void powerC;
		if (!gridInit) {
			gridInit = true;
			return;
		}
		untrack(measure);
	});

	// Reduced motion flips mid-phase: settle instantly rather than animate.
	$effect(() => {
		if (!reduced.current) return;
		untrack(() => {
			if (phase === "covering") finish("cover");
			else if (phase === "revealing") finish("reveal");
			else if (phase === "covered") {
				stopLoop();
				draw();
			}
		});
	});
</script>

<div
	bind:this={ref}
	class={cn(
		"datamosh-transition inset-0",
		contained ? "absolute" : "fixed",
		phase === "idle" ? "pointer-events-none invisible" : "pointer-events-auto",
		className
	)}
	style:z-index={zIndex}
	data-state={phase}
	aria-hidden="true"
	{...restProps}
>
	<canvas bind:this={canvasEl} class="block h-full w-full"></canvas>
</div>
