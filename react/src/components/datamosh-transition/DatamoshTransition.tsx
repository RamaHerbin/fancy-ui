import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import type { HTMLAttributes } from "react";

import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
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
	type DatamoshEffect,
	type DatamoshPaletteName,
	type DatamoshSweep,
	type Direction,
} from "./datamosh-transition-core.js";

export type DatamoshTransitionPhase = "idle" | "covering" | "covered" | "revealing";

/**
 * What the forwarded ref carries. The Svelte source exposes `cover()`,
 * `reveal()` and `play()` on the component instance and binds the overlay
 * element through `ref`; React has no instance, so both travel through one
 * handle: the three methods plus `element`.
 */
export interface DatamoshTransitionHandle {
	/** Cover the page. Resolves once every column is down. */
	cover: () => Promise<void>;
	/** Clear the page. Resolves once every column has fallen away. */
	reveal: () => Promise<void>;
	/** Cover, then reveal — a one-shot flash. */
	play: () => Promise<void>;
	/** The overlay element. */
	readonly element: HTMLDivElement | null;
}

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
export interface DatamoshTransitionProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
	/** Additional classes on the overlay */
	className?: string;
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
	/** Called with every phase change (the Svelte `bind:phase`) */
	onPhaseChange?: (phase: DatamoshTransitionPhase) => void;
	/** Called once the page is fully covered */
	oncovered?: () => void;
	/** Called once the page is fully revealed */
	onrevealed?: () => void;
}

function currentDpr() {
	return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
}

export const DatamoshTransition = forwardRef<DatamoshTransitionHandle, DatamoshTransitionProps>(
	function DatamoshTransition(
		{
			className,
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
			onPhaseChange,
			oncovered,
			onrevealed,
			style,
			...restProps
		},
		ref
	) {
		const reduced = useReducedMotion();

		const palette = useMemo(() => resolvePalette(colors), [colors]);
		const columnsC = Math.max(1, Math.round(Number.isFinite(columns) ? columns : DEFAULT_COLUMNS));
		const powerC = Number.isFinite(power) && power > 0 ? power : DEFAULT_POWER;
		const tilesC = oddTiles(tiles);
		const speedC = Number.isFinite(speed) && speed > 0 ? speed : 1;
		const strip = useMemo(() => buildStrip(seed, palette), [seed, palette]);
		const delays = useMemo(
			() =>
				columnDelays(
					columnsC,
					sweep,
					Math.max(0, Number.isFinite(stagger) ? stagger : 0) / 1000,
					seed
				),
			[columnsC, sweep, stagger, seed]
		);
		/** Darkest colour as a backing fill, so rounding seams never show the page through. */
		const backing = palette[paletteRoles(palette).darks[0] ?? 0] ?? "#14101f";

		const [phase, setPhaseState] = useState<DatamoshTransitionPhase>("idle");

		const hostRef = useRef<HTMLDivElement | null>(null);
		const canvasRef = useRef<HTMLCanvasElement | null>(null);

		// Everything the loop reads, always current, without re-creating the engine.
		const live = useLiveRef({
			reduced,
			palette,
			columnsC,
			powerC,
			tilesC,
			speedC,
			strip,
			delays,
			backing,
			variant,
			coverDuration,
			revealDuration,
			onPhaseChange,
			oncovered,
			onrevealed,
		});

		// --- plain closure state (touched every frame, never rendered) ---------------
		const s = useRef({
			ctx: null as CanvasRenderingContext2D | null,
			w: 0,
			h: 0,
			edges: [] as number[],
			cov: createCoverage(DEFAULT_COLUMNS) as Coverage,
			direction: "reveal" as Direction,
			phase: "idle" as DatamoshTransitionPhase,
			phaseTime: 0,
			elapsed: 0,
			rafId: null as number | null,
			lastT: 0,
			pending: [] as Array<() => void>,
			sourceImage: null as CanvasImageSource | null,
			sourceSize: { w: 0, h: 0 },
			sourceTable: null as string[][] | null,
		}).current;

		// The engine: stable functions over `s` and `live`, built once.
		const engine = useMemo(() => {
			function setPhase(next: DatamoshTransitionPhase) {
				if (s.phase === next) return;
				s.phase = next;
				setPhaseState(next);
				live.current.onPhaseChange?.(next);
			}

			function settlePending() {
				const list = s.pending;
				s.pending = [];
				for (const resolve of list) resolve();
			}

			function clear() {
				s.ctx?.clearRect(0, 0, s.w, s.h);
			}

			function draw() {
				const c = s.ctx;
				const p = live.current;
				if (!c || !s.edges.length) return;
				const { w, h } = s;
				c.clearRect(0, 0, w, h);
				const bleed = Math.round(BLEED * h);
				const len = p.palette.length;
				// Reduced motion paints one still frame part-way into a step.
				const t = p.reduced ? CYCLE * 0.45 + p.columnsC * FALL_STAGGER : s.elapsed;

				for (let i = 0; i < p.columnsC; i++) {
					const x0 = s.edges[i]!;
					const cw = s.edges[i + 1]! - x0;
					if (cw <= 0) continue;
					const band = columnBand(
						p.variant,
						i,
						easeEdge(s.cov.top[i] ?? 0),
						easeEdge(s.cov.bot[i] ?? 0)
					);
					const bandTop = Math.round(band.y0 * h);
					const bandBot = Math.round(band.y1 * h);
					if (bandBot <= bandTop) continue;

					c.fillStyle = p.backing;
					c.fillRect(x0, bandTop, cw, bandBot - bandTop);

					const flow = columnFlow(t, i, p.columnsC, p.speedC);
					for (const tile of columnTiles(flow, p.tilesC, h, bleed)) {
						// Mirrored stacks rise instead of fall; the overhang still laps the next tile.
						const top = band.mirror ? h - tile.bot : tile.top;
						const bot = band.mirror ? h - tile.top : tile.bot;
						const y0 = Math.max(bandTop, top);
						const y1 = Math.min(bandBot, bot);
						if (y1 <= y0) continue;
						c.fillStyle =
							s.sourceTable?.[i]?.[sourceSlot(tile.id, i, p.tilesC)] ??
							p.palette[stripIndex(p.strip, tile.id, i) % len]!;
						c.fillRect(x0, y0, cw, y1 - y0);
					}
				}
			}

			function stopLoop() {
				if (s.rafId !== null && typeof cancelAnimationFrame === "function")
					cancelAnimationFrame(s.rafId);
				s.rafId = null;
			}

			function requestFrame() {
				if (s.rafId !== null || !s.ctx || typeof requestAnimationFrame !== "function") return;
				s.lastT = 0;
				s.rafId = requestAnimationFrame(tick);
			}

			function finish(dir: Direction) {
				settleCoverage(s.cov, dir);
				setPhase(dir === "cover" ? "covered" : "idle");
				if (dir === "reveal") {
					stopLoop();
					clear();
				} else if (!live.current.reduced) {
					requestFrame();
				} else {
					draw();
				}
				settlePending();
				if (dir === "cover") live.current.oncovered?.();
				else live.current.onrevealed?.();
			}

			function tick(now: number) {
				s.rafId = null;
				if (!s.ctx) return;
				// Time-based: identical pacing at 60 Hz and 120 Hz; long stalls clamp.
				const dt = s.lastT ? Math.min(0.05, Math.max(0, (now - s.lastT) / 1000)) : 0;
				s.lastT = now;
				s.elapsed += dt;

				if (s.phase === "covering" || s.phase === "revealing") {
					s.phaseTime += dt;
					const p = live.current;
					const duration = (s.direction === "cover" ? p.coverDuration : p.revealDuration) / 1000;
					const done = stepCoverage(s.cov, s.direction, s.phaseTime, dt, duration, p.delays);
					if (done) {
						finish(s.direction);
						return;
					}
				}

				draw();
				if (s.phase !== "idle") s.rafId = requestAnimationFrame(tick);
			}

			function run(dir: Direction): Promise<void> {
				// A superseded call resolves now: its caller moves on, the new phase takes over.
				settlePending();
				const promise = new Promise<void>((resolve) => s.pending.push(resolve));

				// Already there: nothing to animate, no callback.
				if (
					(dir === "reveal" && s.phase === "idle") ||
					(dir === "cover" && s.phase === "covered")
				) {
					settlePending();
					return promise;
				}

				s.direction = dir;
				s.phaseTime = 0;
				setPhase(dir === "cover" ? "covering" : "revealing");

				const instant =
					!s.ctx ||
					live.current.reduced ||
					typeof requestAnimationFrame !== "function" ||
					(typeof document !== "undefined" && document.hidden);
				if (instant) finish(dir);
				else requestFrame();
				return promise;
			}

			/** Sample the loaded picture onto the current grid; any failure falls back to the palette. */
			function buildSourceTable() {
				s.sourceTable = null;
				if (!s.sourceImage || !s.edges.length || typeof document === "undefined") return;
				const pw = 96;
				const ph = Math.max(8, Math.round((pw * s.h) / Math.max(1, s.w)));
				try {
					const scratch = document.createElement("canvas");
					scratch.width = pw;
					scratch.height = ph;
					const sctx = scratch.getContext("2d", { willReadFrequently: true });
					if (!sctx) return;
					const fit = coverFit(s.sourceSize.w, s.sourceSize.h, pw, ph);
					sctx.drawImage(s.sourceImage, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, pw, ph);
					const { data } = sctx.getImageData(0, 0, pw, ph);
					const norm = s.edges.map((e) => e / Math.max(1, s.w));
					s.sourceTable = sampleSource(data, pw, ph, norm, live.current.tilesC);
				} catch {
					// Cross-origin picture without CORS taints the canvas: keep the palette.
					s.sourceTable = null;
				}
			}

			function measure() {
				const host = hostRef.current;
				const canvas = canvasRef.current;
				if (!host || !canvas || !s.ctx) return;
				const p = live.current;
				const dpr = currentDpr();
				s.w = Math.max(1, Math.round(host.clientWidth * dpr));
				s.h = Math.max(1, Math.round(host.clientHeight * dpr));
				canvas.width = s.w;
				canvas.height = s.h;
				s.ctx.imageSmoothingEnabled = false;
				s.edges = columnEdges(s.w, p.columnsC, p.powerC);
				buildSourceTable();
				if (s.cov.top.length !== p.columnsC) {
					const covered = s.phase === "covered" || s.phase === "covering";
					s.cov = createCoverage(p.columnsC, covered);
				}
				if (s.phase !== "idle") draw();
			}

			return {
				run,
				draw,
				finish,
				measure,
				stopLoop,
				requestFrame,
				settlePending,
				buildSourceTable,
			};
		}, [live, s]);

		const cover = useCallback(() => engine.run("cover"), [engine]);
		const reveal = useCallback(() => engine.run("reveal"), [engine]);
		const play = useCallback(async () => {
			await engine.run("cover");
			await engine.run("reveal");
		}, [engine]);

		useImperativeHandle(
			ref,
			() => ({
				cover,
				reveal,
				play,
				get element() {
					return hostRef.current;
				},
			}),
			[cover, reveal, play]
		);

		// --- mount: context, observers, hidden tab ---------------------------------
		useEffect(() => {
			const host = hostRef.current;
			const canvas = canvasRef.current;
			if (!host || !canvas) return;
			s.ctx = canvas.getContext("2d");
			if (!s.ctx) return;
			engine.measure();

			let ro: ResizeObserver | undefined;
			if (typeof ResizeObserver !== "undefined") {
				ro = new ResizeObserver(() => engine.measure());
				ro.observe(host);
			}

			// A hidden tab stops rAF: finish the phase so an awaiting navigation never hangs.
			const onVisibility = () => {
				if (!document.hidden) {
					if (s.phase !== "idle") engine.requestFrame();
					return;
				}
				engine.stopLoop();
				if (s.phase === "covering") engine.finish("cover");
				else if (s.phase === "revealing") engine.finish("reveal");
			};
			document.addEventListener("visibilitychange", onVisibility);

			return () => {
				engine.stopLoop();
				ro?.disconnect();
				document.removeEventListener("visibilitychange", onVisibility);
				engine.settlePending();
				s.ctx = null;
			};
		}, [engine, s]);

		// Grid-shaping props: re-measure (column count may change the coverage arrays).
		const gridInit = useRef(false);
		useEffect(() => {
			if (!gridInit.current) {
				gridInit.current = true;
				return;
			}
			engine.measure();
		}, [columnsC, powerC, engine]);

		// Reduced motion flips mid-phase: settle instantly rather than animate.
		useEffect(() => {
			if (!reduced) return;
			if (s.phase === "covering") engine.finish("cover");
			else if (s.phase === "revealing") engine.finish("reveal");
			else if (s.phase === "covered") {
				engine.stopLoop();
				engine.draw();
			}
		}, [reduced, engine, s]);

		// Load the picture source; a stale load never overwrites a newer one.
		useEffect(() => {
			s.sourceImage = null;
			s.sourceTable = null;
			const src = source;
			if (!src || typeof window === "undefined") return;

			let cancelled = false;
			const ready = (img: CanvasImageSource, iw: number, ih: number) => {
				if (cancelled || iw <= 0 || ih <= 0) return;
				s.sourceImage = img;
				s.sourceSize = { w: iw, h: ih };
				engine.buildSourceTable();
				if (s.phase !== "idle") engine.draw();
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
		}, [source, tilesC, engine, s]);

		return (
			<div
				ref={hostRef}
				className={cn(
					"datamosh-transition inset-0",
					contained ? "absolute" : "fixed",
					phase === "idle" ? "pointer-events-none invisible" : "pointer-events-auto",
					className
				)}
				style={{ zIndex, ...style }}
				data-state={phase}
				aria-hidden="true"
				{...restProps}
			>
				<canvas ref={canvasRef} className="block h-full w-full" />
			</div>
		);
	}
);
