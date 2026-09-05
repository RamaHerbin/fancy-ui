<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

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
	interface BaseProps {
		/** Additional classes on the host */
		class?: string;
		/** Content rendered above the canvas — give the host a height */
		children?: Snippet;
		/** Bindable host element */
		ref?: HTMLDivElement | null;
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

	export type MosaicGlowProps = BaseProps & Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
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
		type Halo,
		type MosaicGrid,
		DEFAULT_COLOR,
	} from "./mosaic-glow-core.js";

	let {
		class: className,
		children,
		ref = $bindable(null),
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
		...restProps
	}: MosaicGlowProps = $props();

	/** Wait after the pointer leaves before the idle drift takes over (ms). */
	const IDLE_DELAY_MS = 1500;
	/** Ambient-only frames are drawn at most this often (ms). */
	const AMBIENT_FRAME_MS = 50;
	const FLICKER_CHANCE = 0.15;
	const LUT_SIZE = 64;

	const intensityC = $derived(clamp01(intensity));
	const trailC = $derived(clamp01(trail));
	const smoothingC = $derived(clamp01(smoothing));
	const noiseC = $derived(clamp01(noise));
	const ambientC = $derived(clamp01(ambient));
	const radiusC = $derived(Math.max(1, Number.isFinite(radius) ? radius : 170));
	const tileC = $derived(Math.max(1, Number.isFinite(tileSize) ? tileSize : 18));
	const gapC = $derived(Math.max(0, Number.isFinite(gap) ? gap : 2));

	let reducedMotion = $state(false);
	let canvasEl: HTMLCanvasElement | null = $state(null);

	// --- plain closure state (touched every frame, never rendered) --------------

	let ctx: CanvasRenderingContext2D | null = null;
	let glassLayer: HTMLCanvasElement | null = null;
	let grid: MosaicGrid | null = null;
	let lut: string[] | null = null;
	let dpr = 1;
	let cssW = 0;
	let cssH = 0;
	let w = 0;
	let h = 0;
	let pitchDev = 20;
	let tileDev = 18;

	let px = 0;
	let py = 0;
	let pointerOver = false;
	let sx = 0;
	let sy = 0;
	let sInit = false;
	let haloFade = 0;
	let driftT = 0;
	let lastLeaveAt = -1;

	let rafId: number | null = null;
	let lastTime = 0;
	let lastDraw = 0;
	/** Something structural changed (size, grid, colours): the next frame must paint. */
	let dirty = true;
	let visible = true;

	// --- setup -------------------------------------------------------------------

	/** Backing-store scale, capped so dense displays do not blow up the fill rate. */
	function currentDpr() {
		return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
	}

	function resize() {
		const host = ref;
		const canvas = canvasEl;
		if (!host || !canvas || !ctx) return;
		cssW = host.clientWidth;
		cssH = host.clientHeight;
		dpr = currentDpr();
		w = Math.max(1, Math.round(cssW * dpr));
		h = Math.max(1, Math.round(cssH * dpr));
		canvas.width = w;
		canvas.height = h;
		tileDev = Math.max(1, Math.round(tileC * dpr));
		pitchDev = Math.max(tileDev, Math.round((tileC + gapC) * dpr));
		const cols = Math.ceil(w / pitchDev);
		const rows = Math.ceil(h / pitchDev);
		grid = createGrid(cols, rows, seed, noiseC, ambientC);
		rebuildGlass(cols, rows);
		dirty = true;
		if (reducedMotion) drawStatic(initialHalo());
		else requestFrame();
	}

	/** One cached full-size layer with a glassy highlight stamped on every tile. */
	function rebuildGlass(cols: number, rows: number) {
		glassLayer = null;
		if (typeof document === "undefined") return;
		const sprite = document.createElement("canvas");
		sprite.width = tileDev;
		sprite.height = tileDev;
		const sctx = sprite.getContext("2d");
		if (!sctx) return;
		const grad = sctx.createRadialGradient(
			tileDev * 0.35,
			tileDev * 0.3,
			0,
			tileDev * 0.5,
			tileDev * 0.5,
			tileDev * 0.7
		);
		grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
		grad.addColorStop(1, "rgba(255, 255, 255, 0)");
		sctx.fillStyle = grad;
		sctx.fillRect(0, 0, tileDev, tileDev);

		const layer = document.createElement("canvas");
		layer.width = w;
		layer.height = h;
		const lctx = layer.getContext("2d");
		if (!lctx) return;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				lctx.drawImage(sprite, c * pitchDev, r * pitchDev);
			}
		}
		glassLayer = layer;
	}

	function ensureLut(): string[] {
		if (!lut) lut = buildLut(background, color, LUT_SIZE);
		return lut;
	}

	function initialHalo(): Halo | null {
		if (idle !== "drift") return null;
		const p = driftPoint(0, w, h);
		return { x: p.x, y: p.y, r: radiusC * dpr };
	}

	// --- loop --------------------------------------------------------------------

	function requestFrame() {
		if (rafId !== null || !visible || reducedMotion || !ctx) return;
		if (typeof requestAnimationFrame !== "function") return;
		lastTime = 0;
		rafId = requestAnimationFrame(tick);
	}

	function stopLoop() {
		if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
		rafId = null;
	}

	function tick(now: number) {
		rafId = null;
		if (!ctx || !grid) return;

		const dt = lastTime === 0 ? 1 / 60 : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
		lastTime = now;

		const drifting =
			idle === "drift" && !pointerOver && (lastLeaveAt < 0 || now - lastLeaveAt > IDLE_DELAY_MS);
		let tx = 0;
		let ty = 0;
		let hasTarget = false;
		if (pointerOver) {
			tx = px;
			ty = py;
			hasTarget = true;
		} else if (drifting) {
			driftT += dt;
			const p = driftPoint(driftT, w, h);
			tx = p.x;
			ty = p.y;
			hasTarget = true;
		}

		if (hasTarget) {
			if (!sInit) {
				sx = tx;
				sy = ty;
				sInit = true;
			} else {
				const tau = drifting ? Math.max(smoothingTau(smoothingC), 0.35) : smoothingTau(smoothingC);
				const k = rate(dt, tau);
				sx += (tx - sx) * k;
				sy += (ty - sy) * k;
			}
		}

		const rel = releaseTau(trailC);
		const fadeTarget = hasTarget ? 1 : 0;
		haloFade += (fadeTarget - haloFade) * rate(dt, fadeTarget > haloFade ? ATTACK_TAU : rel);
		if (haloFade < 0.005) haloFade = 0;

		const halo: Halo | null = hasTarget ? { x: sx, y: sy, r: radiusC * dpr } : null;
		const maxDelta = updateTiles(grid, halo, dt, {
			pitch: pitchDev,
			tile: tileDev,
			attackTau: ATTACK_TAU,
			releaseTau: rel,
		});
		if (flicker) flickerTiles(grid, dt, FLICKER_CHANCE, ambientC);

		const active = hasTarget || maxDelta > 0.002 || haloFade > 0;
		if (active || dirty || now - lastDraw >= AMBIENT_FRAME_MS) {
			draw(halo);
			lastDraw = now;
			dirty = false;
		}

		const keepGoing = active || flicker || (idle === "drift" && !pointerOver);
		if (keepGoing && visible && typeof requestAnimationFrame === "function") {
			rafId = requestAnimationFrame(tick);
		}
	}

	/** Reduced motion: no loop — settle the field instantly and paint once. */
	function drawStatic(halo: Halo | null) {
		if (!ctx || !grid) return;
		updateTiles(grid, halo, 1, { pitch: pitchDev, tile: tileDev, attackTau: 0, releaseTau: 0 });
		haloFade = halo ? 1 : 0;
		if (halo) {
			sx = halo.x;
			sy = halo.y;
		}
		draw(halo);
	}

	function draw(halo: Halo | null) {
		const c = ctx;
		const g = grid;
		if (!c || !g) return;
		const table = ensureLut();
		const { cols, rows, ambient: amb, heat } = g;

		c.globalCompositeOperation = "source-over";
		c.fillStyle = background;
		c.fillRect(0, 0, w, h);

		let current = -1;
		for (let r = 0; r < rows; r++) {
			const y = r * pitchDev;
			for (let col = 0; col < cols; col++) {
				const i = r * cols + col;
				const idx = lutIndex(amb[i], heat[i], intensityC, LUT_SIZE);
				if (idx !== current) {
					c.fillStyle = table[idx];
					current = idx;
				}
				c.fillRect(col * pitchDev, y, tileDev, tileDev);
			}
		}

		if (glassLayer) {
			c.globalCompositeOperation = "soft-light";
			c.drawImage(glassLayer, 0, 0);
		}

		if (haloFade > 0) {
			const rgb = parseRgb(color) ?? DEFAULT_COLOR;
			const r = (halo ? halo.r : radiusC * dpr) * 1.15;
			const a = intensityC * haloFade;
			const grad = c.createRadialGradient(sx, sy, 0, sx, sy, r);
			grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.2 * a).toFixed(3)})`);
			grad.addColorStop(0.45, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.07 * a).toFixed(3)})`);
			grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
			c.globalCompositeOperation = "lighter";
			c.fillStyle = grad;
			c.fillRect(sx - r, sy - r, r * 2, r * 2);
		}

		c.globalCompositeOperation = "source-over";
	}

	// --- mount: context, observers, reduced motion -------------------------------

	onMount(() => {
		const host = ref;
		const canvas = canvasEl;
		if (!host || !canvas) return;
		ctx = canvas.getContext("2d");
		if (!ctx) return;

		let mq: MediaQueryList | undefined;
		let onMq: ((e: MediaQueryListEvent) => void) | undefined;
		if (typeof window.matchMedia === "function") {
			mq = window.matchMedia("(prefers-reduced-motion: reduce)");
			reducedMotion = mq.matches;
			onMq = (e) => {
				reducedMotion = e.matches;
			};
			mq.addEventListener("change", onMq);
		}

		resize();

		let ro: ResizeObserver | undefined;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(() => {
				// Zoom and display moves can change the pixel ratio at a constant CSS size.
				if (host.clientWidth === cssW && host.clientHeight === cssH && currentDpr() === dpr) return;
				resize();
			});
			ro.observe(host);
		}

		let io: IntersectionObserver | undefined;
		if (typeof IntersectionObserver !== "undefined") {
			io = new IntersectionObserver(
				([entry]) => {
					if (!entry) return;
					visible = entry.isIntersecting;
					if (visible) requestFrame();
					else stopLoop();
				},
				{ rootMargin: "128px" }
			);
			io.observe(host);
		}

		return () => {
			stopLoop();
			ro?.disconnect();
			io?.disconnect();
			if (mq && onMq) mq.removeEventListener("change", onMq);
			ctx = null;
			grid = null;
			glassLayer = null;
		};
	});

	// --- reactivity ----------------------------------------------------------------

	// Structural props rebuild the grid (heat resets — acceptable, it is structural).
	// The first run only records dependencies; onMount does the initial setup.
	let structuralInit = false;
	$effect(() => {
		void tileC;
		void gapC;
		void seed;
		void noiseC;
		void ambientC;
		if (!structuralInit) {
			structuralInit = true;
			return;
		}
		untrack(resize);
	});

	$effect(() => {
		void color;
		void background;
		untrack(() => {
			lut = null;
			dirty = true;
			if (!ctx) return;
			if (reducedMotion) drawStatic(haloFade > 0 ? { x: sx, y: sy, r: radiusC * dpr } : null);
			else requestFrame();
		});
	});

	// Loop- and paint-affecting props: restart a stopped loop, repaint a static frame.
	let visualInit = false;
	$effect(() => {
		void idle;
		void flicker;
		void radiusC;
		void intensityC;
		if (!visualInit) {
			visualInit = true;
			return;
		}
		untrack(() => {
			if (!ctx) return;
			dirty = true;
			if (reducedMotion)
				drawStatic(pointerOver ? { x: sx, y: sy, r: radiusC * dpr } : initialHalo());
			else requestFrame();
		});
	});

	$effect(() => {
		const rm = reducedMotion;
		untrack(() => {
			if (!ctx) return;
			if (rm) {
				stopLoop();
				drawStatic(initialHalo());
			} else {
				requestFrame();
			}
		});
	});

	$effect(() => {
		const host = ref;
		const on = interactive;
		if (!host || !on) return;

		const move = (e: PointerEvent) => {
			const rect = host.getBoundingClientRect();
			px = (e.clientX - rect.left) * dpr;
			py = (e.clientY - rect.top) * dpr;
			pointerOver = true;
			if (reducedMotion) drawStatic({ x: px, y: py, r: radiusC * dpr });
			else requestFrame();
		};
		const leave = () => {
			pointerOver = false;
			lastLeaveAt = typeof performance !== "undefined" ? performance.now() : Date.now();
			if (reducedMotion) drawStatic(initialHalo());
			else requestFrame();
		};

		host.addEventListener("pointermove", move, { passive: true });
		host.addEventListener("pointerleave", leave);
		host.addEventListener("pointercancel", leave);
		return () => {
			host.removeEventListener("pointermove", move);
			host.removeEventListener("pointerleave", leave);
			host.removeEventListener("pointercancel", leave);
			pointerOver = false;
		};
	});
</script>

<div
	bind:this={ref}
	class={cn("mosaic-glow relative overflow-hidden", className)}
	style:background-color={background}
	{...restProps}
>
	<canvas
		bind:this={canvasEl}
		class="pointer-events-none absolute inset-0 block h-full w-full"
		aria-hidden="true"
	></canvas>
	{#if children}
		<div class="mosaic-glow__content relative z-[1] h-full w-full">
			{@render children()}
		</div>
	{/if}
</div>
