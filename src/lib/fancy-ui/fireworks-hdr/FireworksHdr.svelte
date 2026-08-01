<script lang="ts" module>
	import type { FireworksHandle } from "./fireworks-shared.js";

	/** Props for {@link FireworksHdr}. */
	export interface FireworksHdrProps {
		/**
		 * Brand hues (hex). Order is irrelevant — they are parsed and sorted into
		 * the canonical cool→warm ping-pong order (cyan, blue, violet, magenta)
		 * so the shell sweep is stable however they are listed.
		 */
		palette?: string[];
		/**
		 * Opt into the GPU engine: WebGPU HDR first, then a WebGL2 fallback
		 * (display-p3 SDR where supported, else plain sRGB). When false, no engine
		 * boots at all.
		 */
		hdr?: boolean;
		/** Display exposure multiplier, clamped [1,4]. */
		exposure?: number;
		/** Run the ambient auto-scheduler. */
		ambient?: boolean;
		/** Ambient intensity [0,1] — scales shell size/energy. */
		ambientIntensity?: number;
		/** Launch a shell toward the pointer on window pointerdown. */
		interactive?: boolean;
		/** Quality tier, or "auto" to pick from the render level + DPR. */
		quality?: "auto" | "high" | "mid" | "low";
		/** Force ambient off under prefers-reduced-motion (launches still work). */
		respectReducedMotion?: boolean;
		/** Extra classes on the canvas wrapper. */
		class?: string;
		/**
		 * Called once when the engine is live, with an imperative handle. Never
		 * called when no GPU renderer comes up (the caller uses its own timeout).
		 */
		onReady?: (handle: FireworksHandle) => void;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";
	import {
		createSim,
		hexToLinearRgb,
		linearToOklab,
		nextShellHue,
		shellHueColor,
		poissonIntervalMs,
		sampleZone,
		resolveQualityTier,
		createAdaptiveState,
		adaptiveDowngradeStep,
		adaptiveLevel,
		AMBIENT_ZONES,
		AMBIENT_RADIUS_MAX,
		KEEP_CLEAR_DESKTOP,
		QUALITY,
		SHELL,
		SHELL_JITTER_DEG,
		EXPOSURE_AMBIENT,
		type Sim,
		type Rgb,
		type Rect,
		type ShellKind,
		type FireworksRenderLevel,
		type LaunchOptions,
		type LaunchResult,
	} from "./fireworks-shared.js";
	import { startWebGpuFireworks, type FireworksEngineHandle } from "./webgpu-renderer.js";
	import { startWebGl2Fireworks } from "./webgl2-renderer.js";

	let {
		palette = ["#ff2fd6", "#a142ff", "#3d5bff", "#42cfff"],
		hdr = true,
		exposure = EXPOSURE_AMBIENT,
		ambient = true,
		ambientIntensity = 0.35,
		interactive = true,
		quality = "auto",
		respectReducedMotion = true,
		class: className = "",
		onReady,
	}: FireworksHdrProps = $props();

	let canvasRef: HTMLCanvasElement;

	// Largest instance buffer we might need — the engine is sized for the high
	// tier up front so the resolved (auto) quality can be any tier ≤ high.
	const MAX_INSTANCES = QUALITY.high.maxParticles;
	const DT_CLAMP = 0.05; // guards against huge dt after a tab switch
	// AD §4.3 / physics §6: "ambient 2–3 (rare 4)" — the scheduler's own cadence
	// stays gated at 2; a mirrored double (§5.2) may push a third shell in
	// flight, but never a fourth.
	const MAX_AMBIENT_INFLIGHT_SOFT = 2;
	const MAX_AMBIENT_INFLIGHT_HARD = 3;

	function clampExposure(v: number): number {
		return Number.isFinite(v) ? Math.max(1, Math.min(4, v)) : 1;
	}

	/** Parse palette hexes to linear RGB, sorted cool→warm by oklab hue angle. */
	function resolvePalette(hexes: string[]): Rgb[] {
		const parsed = (hexes.length ? hexes : ["#42cfff", "#3d5bff", "#a142ff", "#ff2fd6"]).map(
			hexToLinearRgb
		);
		return parsed
			.map((c) => {
				const o = linearToOklab(c);
				// Angle folded to [0,2π); cyan≈196°→…→magenta≈312° sort ascending.
				let h = Math.atan2(o.b, o.a);
				if (h < 0) h += Math.PI * 2;
				return { c, h };
			})
			.sort((a, b) => a.h - b.h)
			.map((x) => x.c);
	}

	/** Clamped device-pixel ratio, matching the renderers' MAX_DPR. */
	function currentDpr(): number {
		return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
	}

	/**
	 * A conservative low-power signal (modest RAM or few logical cores). Only ever
	 * consulted on the WebGL2 fallback path (a weak-GPU signal already), where it
	 * drops the auto tier from "mid" to "low". WebGPU machines are never affected.
	 */
	function detectLowPower(): boolean {
		if (typeof navigator === "undefined") return false;
		const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
		const cores = navigator.hardwareConcurrency;
		return (typeof mem === "number" && mem <= 4) || (typeof cores === "number" && cores <= 4);
	}

	onMount(() => {
		const canvas = canvasRef;
		if (!canvas) return;

		let disposed = false;
		let engine: FireworksEngineHandle | null = null;
		let sim: Sim | null = null;
		let instances: Float32Array<ArrayBuffer> | null = null;
		let rafId = 0;
		let running = false;
		let lastTime = 0;

		// Adaptive downgrade: session-sticky quality ladder driven by an
		// EMA of frame time. Applied only on active frames (see `loop`).
		const adaptive = createAdaptiveState();
		let currentRenderScale = 1;
		let currentSpawnScale = 1;

		let currentExposure = clampExposure(exposure);
		// Reused per-frame uniforms object (no per-frame allocation in the loop).
		const frameUniforms = { exposure: currentExposure };
		let keepClear: Rect | null = KEEP_CLEAR_DESKTOP;
		let paletteRgb = resolvePalette(palette);

		const prefersReduced =
			respectReducedMotion &&
			typeof window !== "undefined" &&
			typeof window.matchMedia === "function" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// Sampled once; only consulted on the WebGL2 fallback tier resolution.
		const lowPower = detectLowPower();

		let ambientOn = ambient && !prefersReduced;
		let ambientLevel = Math.max(0, Math.min(1, ambientIntensity));

		// Ambient scheduling state.
		const hueState = { i: 0, dir: 1 as 1 | -1 };
		let ambientElapsed = 0;
		let nextInterval = poissonIntervalMs(2200, Math.random, 900, 5200);
		let ambientInFlight = 0;
		const pendingDoubles: { at: number; mirror: boolean }[] = [];

		let isVisible = true;
		let observer: IntersectionObserver | null = null;
		let resizeObs: ResizeObserver | null = null;

		function updateAspect() {
			if (!sim || !canvas) return;
			const w = canvas.clientWidth || 1;
			const h = canvas.clientHeight || 1;
			sim.setAspect(w / h);
		}

		function currentAspect(): number {
			return (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
		}

		function pickShell(): ShellKind {
			const r = Math.random();
			if (r < 0.62) return "peony";
			if (r < 0.82) return "willow";
			return "ring";
		}

		function ambientColor(): Rgb {
			return shellHueColor(nextShellHue(hueState), paletteRgb, SHELL_JITTER_DEG, Math.random);
		}

		/**
		 * AD §4.4: ambient bursts must stay within 0.10–0.20 (fraction of
		 * min-dim) — distinct from the larger "feature" band reserved for
		 * intro/feature shells. `SHELL[shell].radius[1]` is each shell's own
		 * frozen max (willow runs a touch larger than peony/ring), so the scale
		 * ceiling is derived per shell rather than shared, guaranteeing the
		 * 0.20 cap holds at ambientLevel 1 for every shell kind.
		 */
		function ambientScale(shell: ShellKind, level: number): number {
			const raw = 0.7 + 0.4 * level;
			const ceiling = AMBIENT_RADIUS_MAX / SHELL[shell].radius[1];
			return Math.min(raw, ceiling);
		}

		function doAmbientLaunch(mirror: boolean) {
			if (!sim || ambientInFlight >= MAX_AMBIENT_INFLIGHT_HARD) return;
			const picked = sampleZone(AMBIENT_ZONES, Math.random, keepClear);
			const apex = mirror ? { x: 1 - picked.apex.x, y: picked.apex.y } : picked.apex;
			const shell = pickShell();
			const res = sim.launch({
				apex,
				shell,
				color: ambientColor(),
				depth: picked.depth,
				scale: ambientScale(shell, ambientLevel),
				intensity: "ambient",
			});
			ambientInFlight++;
			// Release the in-flight slot shortly after the shell detonates.
			window.setTimeout(
				() => {
					ambientInFlight = Math.max(0, ambientInFlight - 1);
				},
				res.breakMs + 200
			);
		}

		function ambientTick(dtMs: number) {
			if (!ambientOn) return;
			// Fire any scheduled double-launches whose delay has elapsed.
			for (let i = pendingDoubles.length - 1; i >= 0; i--) {
				pendingDoubles[i].at -= dtMs;
				if (pendingDoubles[i].at <= 0) {
					doAmbientLaunch(pendingDoubles[i].mirror);
					pendingDoubles.splice(i, 1);
				}
			}
			ambientElapsed += dtMs;
			if (ambientElapsed >= nextInterval && ambientInFlight < MAX_AMBIENT_INFLIGHT_SOFT) {
				doAmbientLaunch(false);
				ambientElapsed = 0;
				nextInterval = poissonIntervalMs(2200, Math.random, 900, 5200);
				// 18% chance of a mirrored double, +120–320 ms later.
				if (Math.random() < 0.18) {
					pendingDoubles.push({ at: 120 + Math.random() * 200, mirror: true });
				}
			}
		}

		function applyAdaptiveLevel() {
			const level = adaptiveLevel(adaptive);
			if (level.renderScale !== currentRenderScale) {
				currentRenderScale = level.renderScale;
				engine?.setRenderScale(currentRenderScale);
			}
			if (level.spawnScale !== currentSpawnScale) {
				currentSpawnScale = level.spawnScale;
				sim?.setSpawnScale(currentSpawnScale);
			}
			if (import.meta.env.DEV) {
				console.info(
					`[FireworksHdr] adaptive downgrade → step ${adaptive.step} ` +
						`(renderScale ${currentRenderScale}, spawnScale ${currentSpawnScale})`
				);
			}
		}

		function loop(now: number) {
			if (!running || disposed || !sim || !engine || !instances) return;
			if (engine.lost) return;
			const rawFrameMs = now - lastTime;
			const dt = Math.min((now - lastTime) / 1000, DT_CLAMP);
			lastTime = now;

			ambientTick(dt * 1000);
			engine.resizeIfNeeded();
			sim.step(dt);
			const n = sim.writeInstances(instances);
			frameUniforms.exposure = currentExposure;
			engine.frame(dt, instances, n, frameUniforms);

			// Fold only ACTIVE, foreground frames into the adaptive controller so
			// paused / reduced-motion-idle frames (n === 0) never skew the average.
			if (n > 0 && !document.hidden && adaptiveDowngradeStep(adaptive, rawFrameMs)) {
				applyAdaptiveLevel();
			}

			rafId = requestAnimationFrame(loop);
		}

		function startLoop() {
			if (running) return;
			running = true;
			lastTime = performance.now();
			rafId = requestAnimationFrame(loop);
		}
		function stopLoop() {
			running = false;
			if (rafId) cancelAnimationFrame(rafId);
			rafId = 0;
		}

		// --- pointer-driven launches -----------------------------------------
		function handlePointerDown(e: PointerEvent) {
			if (!sim) return;
			const rect = canvas.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;
			const x = (e.clientX - rect.left) / rect.width;
			const y = (e.clientY - rect.top) / rect.height;
			if (x < 0 || x > 1 || y < 0 || y > 1) return;
			sim.launch({
				apex: { x, y },
				shell: pickShell(),
				color: ambientColor(),
				intensity: "ambient",
			});
		}

		function handleVisibility() {
			if (document.hidden) stopLoop();
			else if (isVisible && !disposed && sim) startLoop();
		}

		// --- imperative handle (§1) ------------------------------------------
		function buildHandle(level: FireworksRenderLevel): FireworksHandle {
			return {
				launch(o: LaunchOptions): LaunchResult {
					if (!sim) return { flightMs: 0, breakMs: 0 };
					return sim.launch(o);
				},
				setAmbient(on: boolean, intensity?: number) {
					ambientOn = on && !prefersReduced;
					if (intensity !== undefined) ambientLevel = Math.max(0, Math.min(1, intensity));
				},
				setKeepClear(rect: Rect | null) {
					keepClear = rect;
					// Also drives the per-particle soft dim (AD §4.5) — apex sampling
					// alone only keeps burst origins clear, not drift-in trails/embers.
					sim?.setKeepClear(rect);
				},
				setExposure(v: number) {
					currentExposure = clampExposure(v);
				},
				renderLevel: level,
				cleanup: teardown,
			};
		}

		function teardown() {
			disposed = true;
			stopLoop();
			observer?.disconnect();
			resizeObs?.disconnect();
			if (interactive) window.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("visibilitychange", handleVisibility);
			engine?.destroy();
			engine = null;
			sim = null;
			instances = null;
		}

		/**
		 * Wire the sim, observers, and listeners around a live engine and fire
		 * onReady once. Shared by both the WebGPU and WebGL2 paths so the render
		 * level flows through from whichever engine actually came up.
		 */
		function activate(eng: FireworksEngineHandle) {
			engine = eng;
			const level = eng.renderLevel;
			const minDim = Math.min(canvas.clientWidth, canvas.clientHeight);
			const q = resolveQualityTier(quality, level, currentDpr(), minDim, lowPower);

			sim = createSim({
				quality: q,
				aspect: currentAspect(),
				hdr: true,
				palette: paletteRgb,
			});
			sim.setKeepClear(keepClear);
			instances = new Float32Array(sim.capacity * 8);

			// Observers: pause off-screen / when hidden; track aspect + resize.
			observer = new IntersectionObserver(
				([entry]) => {
					isVisible = entry.isIntersecting;
					if (isVisible && !document.hidden && !disposed) startLoop();
					else stopLoop();
				},
				{ threshold: 0 }
			);
			observer.observe(canvas);

			resizeObs = new ResizeObserver(() => {
				updateAspect();
				engine?.resizeIfNeeded();
			});
			resizeObs.observe(canvas);

			if (interactive) window.addEventListener("pointerdown", handlePointerDown);
			document.addEventListener("visibilitychange", handleVisibility);

			updateAspect();
			startLoop();
			onReady?.(buildHandle(level));
		}

		// --- boot the engine, then wire everything ---------------------------
		// WebGPU first (if present), then the WebGL2 fallback. Only if BOTH fail do
		// we stay silent — the app's own timeout then shows the static fallback
		// (renderLevel "none"). onReady fires at most once, from `activate`.
		async function boot() {
			let eng: FireworksEngineHandle | null = null;

			if (typeof navigator !== "undefined" && "gpu" in navigator) {
				eng = await startWebGpuFireworks(canvas, {
					maxInstances: MAX_INSTANCES,
					renderScale: 1,
					exposure: currentExposure,
				}).catch((error) => {
					if (import.meta.env.DEV) {
						console.warn("[FireworksHdr] WebGPU start failed:", error);
					}
					return null;
				});
			}

			if (disposed) {
				eng?.destroy();
				return;
			}

			if (!eng) {
				// WebGL2 fallback. It only ever reports webgl-p3 / webgl-sdr, which
				// resolve to the same tier, so the tier is resolved up front to size
				// the instance buffer to the resolved tier (not high's 4096).
				const minDim = Math.min(canvas.clientWidth, canvas.clientHeight);
				const webglTier = resolveQualityTier(quality, "webgl-p3", currentDpr(), minDim, lowPower);
				eng = startWebGl2Fireworks(canvas, {
					maxInstances: QUALITY[webglTier].maxParticles,
					renderScale: 1,
					exposure: currentExposure,
					hdr: true,
				});
				if (disposed) {
					eng?.destroy();
					return;
				}
			}

			// Both paths exhausted: no GPU renderer. Stay silent (no onReady); the
			// app's timeout owns the static fallback.
			if (!eng) return;

			activate(eng);
		}

		if (hdr) {
			boot().catch((error) => {
				if (import.meta.env.DEV) {
					console.warn("[FireworksHdr] engine boot failed:", error);
				}
			});
		}

		return teardown;
	});
</script>

<div class={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true">
	<canvas bind:this={canvasRef} class="block h-full w-full"></canvas>
</div>
