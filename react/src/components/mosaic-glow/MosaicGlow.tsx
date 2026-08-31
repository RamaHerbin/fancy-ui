import { forwardRef, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useConstant } from "../../internals/dom/ssr.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import {
	ATTACK_TAU,
	buildLut,
	clamp01,
	createGrid,
	driftPoint,
	flickerTiles,
	lutIndex,
	parseRgb,
	rate,
	releaseTau,
	smoothingTau,
	updateTiles,
	DEFAULT_COLOR,
	type Halo,
	type MosaicGrid,
} from "./mosaic-glow-core.js";

export type MosaicGlowIdle = "drift" | "none";

/**
 * MosaicGlow — a cursor-lit canvas mosaic.
 *
 * A dark surface tiled with small squares. A soft halo follows the pointer
 * with a slight lag and lights the tiles under it to random intensities;
 * lit tiles fade slowly so the pointer leaves a comet trail. An additive
 * bloom bleeds over the gaps, a glassy highlight sits on every tile, and a
 * scattering of faint tiles stays visible outside the halo. With nobody
 * pointing, the halo drifts on its own.
 */
export interface MosaicGlowProps extends Omit<HTMLAttributes<HTMLDivElement>, "color" | "children"> {
	/** Additional classes on the host */
	className?: string;
	/** Content rendered above the canvas — give the host a height */
	children?: ReactNode;
	/** Tile edge in CSS px */
	tileSize?: number;
	/** Gap between tiles in CSS px */
	gap?: number;
	/** Halo / tile colour — hex or rgb() */
	color?: string;
	/** Surface colour behind the tiles — hex or rgb() */
	background?: string;
	/** Halo radius in CSS px */
	radius?: number;
	/** Overall brightness of lit tiles, 0–1 */
	intensity?: number;
	/** How long lit tiles linger after the halo moves on, 0–1 */
	trail?: number;
	/** Pointer lag, 0 (instant) to 1 (very laggy) */
	smoothing?: number;
	/** Spread of per-tile random brightness inside the halo, 0–1 */
	noise?: number;
	/** Visibility of the random faint tiles outside the halo, 0–1 */
	ambient?: number;
	/** Slowly re-roll the faint tiles over time */
	flicker?: boolean;
	/** What the halo does with no pointer: wander on its own or switch off */
	idle?: MosaicGlowIdle;
	/** Follow the pointer. Off leaves only the idle behaviour. */
	interactive?: boolean;
	/** Seed for the per-tile randomness — same seed, same mosaic */
	seed?: number;
}

/** Wait after the pointer leaves before the idle drift takes over (ms). */
const IDLE_DELAY_MS = 1500;
/** Ambient-only frames are drawn at most this often (ms). */
const AMBIENT_FRAME_MS = 50;
const FLICKER_CHANCE = 0.15;
const LUT_SIZE = 64;

/**
 * Everything the frame loop touches and nothing React renders — the counterpart
 * of the Svelte source's plain (non-`$state`) module closure variables. It is
 * one object, created once per instance, so a prop effect and the running loop
 * mutate the same field without either of them re-rendering the component.
 *
 * `reducedMotion` is mirrored here as well as held in React state: the state is
 * what an effect can depend on, the mirror is what the long-lived loop and
 * pointer closures read.
 */
interface MosaicMachine {
	ctx: CanvasRenderingContext2D | null;
	glassLayer: HTMLCanvasElement | null;
	grid: MosaicGrid | null;
	lut: string[] | null;
	dpr: number;
	cssW: number;
	cssH: number;
	w: number;
	h: number;
	pitchDev: number;
	tileDev: number;
	px: number;
	py: number;
	pointerOver: boolean;
	sx: number;
	sy: number;
	sInit: boolean;
	haloFade: number;
	driftT: number;
	lastLeaveAt: number;
	rafId: number | null;
	lastTime: number;
	lastDraw: number;
	/** Something structural changed (size, grid, colours): the next frame must paint. */
	dirty: boolean;
	visible: boolean;
	reducedMotion: boolean;
}

function createMachine(): MosaicMachine {
	return {
		ctx: null,
		glassLayer: null,
		grid: null,
		lut: null,
		dpr: 1,
		cssW: 0,
		cssH: 0,
		w: 0,
		h: 0,
		pitchDev: 20,
		tileDev: 18,
		px: 0,
		py: 0,
		pointerOver: false,
		sx: 0,
		sy: 0,
		sInit: false,
		haloFade: 0,
		driftT: 0,
		lastLeaveAt: -1,
		rafId: null,
		lastTime: 0,
		lastDraw: 0,
		dirty: true,
		visible: true,
		reducedMotion: false,
	};
}

/**
 * The handful of loop entry points a prop effect needs. They are closures over
 * the live canvas, so they only exist between the mount effect and its cleanup;
 * every caller checks first, which is the React shape of the Svelte source's
 * `if (!ctx) return`.
 */
interface MosaicRuntime {
	resize: () => void;
	requestFrame: () => void;
	stopLoop: () => void;
	drawStatic: (halo: Halo | null) => void;
	initialHalo: () => Halo | null;
}

/** Every prop the loop reads per frame, in its already-clamped form. */
interface LiveProps {
	color: string;
	background: string;
	idle: MosaicGlowIdle;
	flicker: boolean;
	intensityC: number;
	trailC: number;
	smoothingC: number;
	noiseC: number;
	ambientC: number;
	radiusC: number;
	tileC: number;
	gapC: number;
	seed: number;
}

export const MosaicGlow = forwardRef<HTMLDivElement, MosaicGlowProps>(function MosaicGlow(
	{
		className,
		children,
		tileSize = 18,
		gap = 2,
		color = "#f2c318",
		background = "#0a0a0a",
		radius = 170,
		intensity = 1,
		trail = 0.6,
		smoothing = 0.15,
		noise = 0.7,
		ambient = 0.35,
		flicker = true,
		idle = "drift",
		interactive = true,
		seed = 1,
		style,
		...restProps
	},
	forwardedRef
) {
	const intensityC = clamp01(intensity);
	const trailC = clamp01(trail);
	const smoothingC = clamp01(smoothing);
	const noiseC = clamp01(noise);
	const ambientC = clamp01(ambient);
	const radiusC = Math.max(1, Number.isFinite(radius) ? radius : 170);
	const tileC = Math.max(1, Number.isFinite(tileSize) ? tileSize : 18);
	const gapC = Math.max(0, Number.isFinite(gap) ? gap : 2);

	// C-1: the nodes, not refs — the setup effect is keyed on them, so it runs
	// the moment both exist rather than racing the first commit.
	const [host, hostRef] = useElementRef<HTMLDivElement>();
	const [canvas, canvasRef] = useElementRef<HTMLCanvasElement>();
	// C-2: composed above every early return; there are none here, but the
	// forwarded ref and the internal one must still be merged in one callback.
	const composedHostRef = useComposedRefs<HTMLDivElement>(forwardedRef, hostRef);

	const machine = useConstant(createMachine);
	const runtimeRef = useRef<MosaicRuntime | null>(null);

	// The Svelte source reads these as `$props()` getters from inside the frame
	// loop, which is outside any tracking context: a new colour or intensity
	// lands on the next frame and never tears the canvas down.
	const live = useLiveRef<LiveProps>({
		color,
		background,
		idle,
		flicker,
		intensityC,
		trailC,
		smoothingC,
		noiseC,
		ambientC,
		radiusC,
		tileC,
		gapC,
		seed,
	});

	const [reducedMotion, setReducedMotion] = useState(false);

	// --- mount: context, observers, reduced motion -----------------------------

	useEffect(() => {
		if (!host || !canvas) return;
		const hostEl: HTMLDivElement = host;
		const canvasEl: HTMLCanvasElement = canvas;
		const context = canvasEl.getContext("2d");
		if (!context) return;
		// Re-bound with an explicit non-null type: the draw helpers below are
		// hoisted function declarations, and TypeScript does not carry the null
		// check above into one.
		const ctx: CanvasRenderingContext2D = context;
		const m = machine;
		m.ctx = ctx;

		/** Backing-store scale, capped so dense displays do not blow up the fill rate. */
		function currentDpr() {
			return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
		}

		function resize() {
			if (!m.ctx) return;
			const p = live.current;
			m.cssW = hostEl.clientWidth;
			m.cssH = hostEl.clientHeight;
			m.dpr = currentDpr();
			m.w = Math.max(1, Math.round(m.cssW * m.dpr));
			m.h = Math.max(1, Math.round(m.cssH * m.dpr));
			canvasEl.width = m.w;
			canvasEl.height = m.h;
			m.tileDev = Math.max(1, Math.round(p.tileC * m.dpr));
			m.pitchDev = Math.max(m.tileDev, Math.round((p.tileC + p.gapC) * m.dpr));
			const cols = Math.ceil(m.w / m.pitchDev);
			const rows = Math.ceil(m.h / m.pitchDev);
			m.grid = createGrid(cols, rows, p.seed, p.noiseC, p.ambientC);
			rebuildGlass(cols, rows);
			m.dirty = true;
			if (m.reducedMotion) drawStatic(initialHalo());
			else requestFrame();
		}

		/** One cached full-size layer with a glassy highlight stamped on every tile. */
		function rebuildGlass(cols: number, rows: number) {
			m.glassLayer = null;
			if (typeof document === "undefined") return;
			const sprite = document.createElement("canvas");
			sprite.width = m.tileDev;
			sprite.height = m.tileDev;
			const sctx = sprite.getContext("2d");
			if (!sctx) return;
			const grad = sctx.createRadialGradient(
				m.tileDev * 0.35,
				m.tileDev * 0.3,
				0,
				m.tileDev * 0.5,
				m.tileDev * 0.5,
				m.tileDev * 0.7
			);
			grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
			grad.addColorStop(1, "rgba(255, 255, 255, 0)");
			sctx.fillStyle = grad;
			sctx.fillRect(0, 0, m.tileDev, m.tileDev);

			const layer = document.createElement("canvas");
			layer.width = m.w;
			layer.height = m.h;
			const lctx = layer.getContext("2d");
			if (!lctx) return;
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					lctx.drawImage(sprite, c * m.pitchDev, r * m.pitchDev);
				}
			}
			m.glassLayer = layer;
		}

		function ensureLut(): string[] {
			if (!m.lut) m.lut = buildLut(live.current.background, live.current.color, LUT_SIZE);
			return m.lut;
		}

		function initialHalo(): Halo | null {
			if (live.current.idle !== "drift") return null;
			const p = driftPoint(0, m.w, m.h);
			return { x: p.x, y: p.y, r: live.current.radiusC * m.dpr };
		}

		// --- loop ---------------------------------------------------------------

		function requestFrame() {
			if (m.rafId !== null || !m.visible || m.reducedMotion || !m.ctx) return;
			if (typeof requestAnimationFrame !== "function") return;
			m.lastTime = 0;
			m.rafId = requestAnimationFrame(tick);
		}

		function stopLoop() {
			if (m.rafId !== null && typeof cancelAnimationFrame === "function")
				cancelAnimationFrame(m.rafId);
			m.rafId = null;
		}

		function tick(now: number) {
			m.rafId = null;
			const g = m.grid;
			if (!m.ctx || !g) return;
			const p = live.current;

			const dt = m.lastTime === 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (now - m.lastTime) / 1000));
			m.lastTime = now;

			const drifting =
				p.idle === "drift" &&
				!m.pointerOver &&
				(m.lastLeaveAt < 0 || now - m.lastLeaveAt > IDLE_DELAY_MS);
			let tx = 0;
			let ty = 0;
			let hasTarget = false;
			if (m.pointerOver) {
				tx = m.px;
				ty = m.py;
				hasTarget = true;
			} else if (drifting) {
				m.driftT += dt;
				const point = driftPoint(m.driftT, m.w, m.h);
				tx = point.x;
				ty = point.y;
				hasTarget = true;
			}

			if (hasTarget) {
				if (!m.sInit) {
					m.sx = tx;
					m.sy = ty;
					m.sInit = true;
				} else {
					const tau = drifting
						? Math.max(smoothingTau(p.smoothingC), 0.35)
						: smoothingTau(p.smoothingC);
					const k = rate(dt, tau);
					m.sx += (tx - m.sx) * k;
					m.sy += (ty - m.sy) * k;
				}
			}

			const rel = releaseTau(p.trailC);
			const fadeTarget = hasTarget ? 1 : 0;
			m.haloFade +=
				(fadeTarget - m.haloFade) * rate(dt, fadeTarget > m.haloFade ? ATTACK_TAU : rel);
			if (m.haloFade < 0.005) m.haloFade = 0;

			const halo: Halo | null = hasTarget ? { x: m.sx, y: m.sy, r: p.radiusC * m.dpr } : null;
			const maxDelta = updateTiles(g, halo, dt, {
				pitch: m.pitchDev,
				tile: m.tileDev,
				attackTau: ATTACK_TAU,
				releaseTau: rel,
			});
			if (p.flicker) flickerTiles(g, dt, FLICKER_CHANCE, p.ambientC);

			const active = hasTarget || maxDelta > 0.002 || m.haloFade > 0;
			if (active || m.dirty || now - m.lastDraw >= AMBIENT_FRAME_MS) {
				draw(halo);
				m.lastDraw = now;
				m.dirty = false;
			}

			const keepGoing = active || p.flicker || (p.idle === "drift" && !m.pointerOver);
			if (keepGoing && m.visible && typeof requestAnimationFrame === "function") {
				m.rafId = requestAnimationFrame(tick);
			}
		}

		/** Reduced motion: no loop — settle the field instantly and paint once. */
		function drawStatic(halo: Halo | null) {
			const g = m.grid;
			if (!m.ctx || !g) return;
			updateTiles(g, halo, 1, {
				pitch: m.pitchDev,
				tile: m.tileDev,
				attackTau: 0,
				releaseTau: 0,
			});
			m.haloFade = halo ? 1 : 0;
			if (halo) {
				m.sx = halo.x;
				m.sy = halo.y;
			}
			draw(halo);
		}

		function draw(halo: Halo | null) {
			const c = m.ctx;
			const g = m.grid;
			if (!c || !g) return;
			const p = live.current;
			const table = ensureLut();
			const { cols, rows, ambient: amb, heat } = g;

			c.globalCompositeOperation = "source-over";
			c.fillStyle = p.background;
			c.fillRect(0, 0, m.w, m.h);

			let current = -1;
			for (let r = 0; r < rows; r++) {
				const y = r * m.pitchDev;
				for (let col = 0; col < cols; col++) {
					const i = r * cols + col;
					const idx = lutIndex(amb[i]!, heat[i]!, p.intensityC, LUT_SIZE);
					if (idx !== current) {
						c.fillStyle = table[idx]!;
						current = idx;
					}
					c.fillRect(col * m.pitchDev, y, m.tileDev, m.tileDev);
				}
			}

			if (m.glassLayer) {
				c.globalCompositeOperation = "soft-light";
				c.drawImage(m.glassLayer, 0, 0);
			}

			if (m.haloFade > 0) {
				const rgb = parseRgb(p.color) ?? DEFAULT_COLOR;
				const r = (halo ? halo.r : p.radiusC * m.dpr) * 1.15;
				const a = p.intensityC * m.haloFade;
				const grad = c.createRadialGradient(m.sx, m.sy, 0, m.sx, m.sy, r);
				grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.2 * a).toFixed(3)})`);
				grad.addColorStop(0.45, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.07 * a).toFixed(3)})`);
				grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
				c.globalCompositeOperation = "lighter";
				c.fillStyle = grad;
				c.fillRect(m.sx - r, m.sy - r, r * 2, r * 2);
			}

			c.globalCompositeOperation = "source-over";
		}

		runtimeRef.current = { resize, requestFrame, stopLoop, drawStatic, initialHalo };

		let mq: MediaQueryList | undefined;
		let onMq: ((e: MediaQueryListEvent) => void) | undefined;
		if (typeof window.matchMedia === "function") {
			mq = window.matchMedia("(prefers-reduced-motion: reduce)");
			m.reducedMotion = mq.matches;
			setReducedMotion(mq.matches);
			onMq = (e) => {
				m.reducedMotion = e.matches;
				setReducedMotion(e.matches);
			};
			mq.addEventListener("change", onMq);
		}

		resize();

		let ro: ResizeObserver | undefined;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(() => {
				// Zoom and display moves can change the pixel ratio at a constant CSS size.
				if (
					hostEl.clientWidth === m.cssW &&
					hostEl.clientHeight === m.cssH &&
					currentDpr() === m.dpr
				)
					return;
				resize();
			});
			ro.observe(hostEl);
		}

		let io: IntersectionObserver | undefined;
		if (typeof IntersectionObserver !== "undefined") {
			io = new IntersectionObserver(
				([entry]) => {
					if (!entry) return;
					m.visible = entry.isIntersecting;
					if (m.visible) requestFrame();
					else stopLoop();
				},
				{ rootMargin: "128px" }
			);
			io.observe(hostEl);
		}

		return () => {
			stopLoop();
			ro?.disconnect();
			io?.disconnect();
			if (mq && onMq) mq.removeEventListener("change", onMq);
			runtimeRef.current = null;
			m.ctx = null;
			m.grid = null;
			m.glassLayer = null;
		};
	}, [host, canvas, machine, live]);

	// --- reactivity ------------------------------------------------------------

	// Structural props rebuild the grid (heat resets — acceptable, it is structural).
	// The first run only records dependencies; the mount effect does the initial setup.
	const structuralInit = useRef(false);
	useEffect(() => {
		if (!structuralInit.current) {
			structuralInit.current = true;
			return;
		}
		runtimeRef.current?.resize();
	}, [tileC, gapC, seed, noiseC, ambientC]);

	useEffect(() => {
		machine.lut = null;
		machine.dirty = true;
		const runtime = runtimeRef.current;
		if (!runtime) return;
		if (machine.reducedMotion)
			runtime.drawStatic(
				machine.haloFade > 0
					? { x: machine.sx, y: machine.sy, r: live.current.radiusC * machine.dpr }
					: null
			);
		else runtime.requestFrame();
	}, [color, background, machine, live]);

	// Loop- and paint-affecting props: restart a stopped loop, repaint a static frame.
	const visualInit = useRef(false);
	useEffect(() => {
		if (!visualInit.current) {
			visualInit.current = true;
			return;
		}
		const runtime = runtimeRef.current;
		if (!runtime) return;
		machine.dirty = true;
		if (machine.reducedMotion)
			runtime.drawStatic(
				machine.pointerOver
					? { x: machine.sx, y: machine.sy, r: radiusC * machine.dpr }
					: runtime.initialHalo()
			);
		else runtime.requestFrame();
	}, [idle, flicker, radiusC, intensityC, machine]);

	useEffect(() => {
		const runtime = runtimeRef.current;
		if (!runtime) return;
		if (reducedMotion) {
			runtime.stopLoop();
			runtime.drawStatic(runtime.initialHalo());
		} else {
			runtime.requestFrame();
		}
	}, [reducedMotion]);

	useEffect(() => {
		if (!host || !interactive) return;
		const hostEl: HTMLDivElement = host;
		const m = machine;

		const move = (e: PointerEvent) => {
			const rect = hostEl.getBoundingClientRect();
			m.px = (e.clientX - rect.left) * m.dpr;
			m.py = (e.clientY - rect.top) * m.dpr;
			m.pointerOver = true;
			const runtime = runtimeRef.current;
			if (!runtime) return;
			if (m.reducedMotion)
				runtime.drawStatic({ x: m.px, y: m.py, r: live.current.radiusC * m.dpr });
			else runtime.requestFrame();
		};
		const leave = () => {
			m.pointerOver = false;
			m.lastLeaveAt = typeof performance !== "undefined" ? performance.now() : Date.now();
			const runtime = runtimeRef.current;
			if (!runtime) return;
			if (m.reducedMotion) runtime.drawStatic(runtime.initialHalo());
			else runtime.requestFrame();
		};

		hostEl.addEventListener("pointermove", move, { passive: true });
		hostEl.addEventListener("pointerleave", leave);
		hostEl.addEventListener("pointercancel", leave);
		return () => {
			hostEl.removeEventListener("pointermove", move);
			hostEl.removeEventListener("pointerleave", leave);
			hostEl.removeEventListener("pointercancel", leave);
			m.pointerOver = false;
		};
	}, [host, interactive, machine, live]);

	return (
		<div
			ref={composedHostRef}
			className={cn("mosaic-glow relative overflow-hidden", className)}
			style={{ ...style, backgroundColor: background }}
			{...restProps}
		>
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 block h-full w-full"
				aria-hidden="true"
			/>
			{children ? (
				<div className="mosaic-glow__content relative z-[1] h-full w-full">{children}</div>
			) : null}
		</div>
	);
});
