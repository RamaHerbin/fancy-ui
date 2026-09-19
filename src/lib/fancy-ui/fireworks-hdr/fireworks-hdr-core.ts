/**
 * Framework-free engine behind `FireworksHdr`.
 *
 * Owns everything the Svelte/React/Vue wrappers do not: the GPU boot (WebGPU
 * HDR first, WebGL2 fallback), the sim, the rAF loop, the ambient scheduler,
 * the adaptive downgrade ladder, the pointer-launch listener, the tab
 * visibility gate and the context-loss recovery. The wrapper keeps the markup,
 * the class string, the a11y attributes, the `prefers-reduced-motion` query,
 * the IntersectionObserver and the ResizeObserver.
 *
 * Zero framework imports; no module-scope DOM access; all randomness flows
 * through the injectable `random` parameter so a future `seed` prop can drive
 * the scheduler deterministically.
 */
import {
	createSim,
	hexToLinearRgb,
	linearToOklab,
	nextShellHue,
	shellHueColor,
	poissonIntervalMs,
	sampleZone,
	rectExpandedContains,
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
	type FireworksHandle,
	type FireworksRenderLevel,
	type LaunchOptions,
	type LaunchResult,
} from "./fireworks-shared.js";
import {
	startWebGpuFireworks,
	type FireworksEngineHandle,
	type FrameUniforms,
} from "./webgpu-renderer.js";
import { startWebGl2Fireworks } from "./webgl2-renderer.js";

/** DOM handles the engine needs. */
export interface FireworksHdrElements {
	/** The canvas the GPU renderer draws into, already laid out by the wrapper. */
	canvas: HTMLCanvasElement;
}

/**
 * Props the wrapper reads ONLY at mount. `FireworksHdr` has no `$effect`: it
 * snapshots these once and runtime control goes through the `onReady` handle,
 * so `setOptions` deliberately ignores every key listed here (see
 * {@link FireworksHdrLiveOptions} for what it does accept).
 */
export interface FireworksHdrInitOptions {
	/** Brand hues (hex), sorted cool→warm by oklab hue angle at boot. */
	palette?: string[];
	/** Opt into the GPU engine. When false, no engine boots at all. */
	hdr?: boolean;
	/** Quality tier, or "auto" to pick from the render level + DPR. */
	quality?: "auto" | "high" | "mid" | "low";
	/** Launch a shell toward the pointer on window pointerdown. */
	interactive?: boolean;
	/** Shells the ambient scheduler may fire (self-drawing kinds only). */
	ambientShells?: ShellKind[];
	/**
	 * The wrapper's resolved `prefers-reduced-motion` gate (it owns the media
	 * query). Forces ambient off; explicit launches still work. Snapshotted at
	 * creation, exactly as the Svelte wrapper snapshots it today.
	 */
	reducedMotion?: boolean;
	/** Emit the dev-only console diagnostics (the wrapper passes its bundler DEV flag). */
	debug?: boolean;
	/** Called with an imperative handle whenever an engine goes live (incl. after a recovery). */
	onReady?: (handle: FireworksHandle) => void;
	/** Called once when the GPU context is lost and cannot be brought back. */
	onLost?: () => void;
}

/**
 * The state that can legitimately change after mount. `ambient`,
 * `ambientIntensity`, `exposure` and `keepClear` are exactly what the
 * `onReady` handle mutates; `visible` is the wrapper's IntersectionObserver
 * gate.
 */
export interface FireworksHdrLiveOptions {
	/** Run the ambient auto-scheduler (AND-ed with `!reducedMotion`). */
	ambient?: boolean;
	/** Ambient intensity, clamped [0,1] — scales shell size/energy. */
	ambientIntensity?: number;
	/** Display exposure multiplier, clamped [1,4]. */
	exposure?: number;
	/** Keep-clear rect ambient apexes avoid (also soft-dims stray particles). */
	keepClear?: Rect | null;
	/** Wrapper's IntersectionObserver gate: pause the loop off-screen. */
	visible?: boolean;
}

export interface FireworksHdrEngine {
	/** Apply live keys. Keys from {@link FireworksHdrInitOptions} are ignored. */
	setOptions(next: Partial<FireworksHdrLiveOptions>): void;
	/** Re-read the canvas box: update the sim aspect and the drawing buffer. */
	resize(): void;
	/** Stop the loop, drop listeners, release GPU resources. Idempotent. */
	destroy(): void;
}

// Largest instance buffer we might need — the engine is sized for the high
// tier up front so the resolved (auto) quality can be any tier ≤ high.
const MAX_INSTANCES = QUALITY.high.maxParticles;
const DT_CLAMP = 0.05; // guards against huge dt after a tab switch
// AD §4.3 / physics §6: "ambient 2–3 (rare 4)" — the scheduler's own cadence
// stays gated at 2; a mirrored double (§5.2) may push a third shell in
// flight, but never a fourth.
const MAX_AMBIENT_INFLIGHT_SOFT = 2;
const MAX_AMBIENT_INFLIGHT_HARD = 3;
// How long a lost WebGL context is given to announce its restoration before
// the engine gives up and reports the failure through `onLost`.
const RESTORE_TIMEOUT_MS = 4000;

/** Shells the scheduler can fire unaided — "glyph"/"shape" need caller points. */
const SELF_DRAWING: ShellKind[] = ["peony", "willow", "ring", "heart", "star"];

/** Fallback palette used when the caller passes an empty list. */
const DEFAULT_PALETTE_HEX = ["#42cfff", "#3d5bff", "#a142ff", "#ff2fd6"];

function clampExposure(v: number): number {
	return Number.isFinite(v) ? Math.max(1, Math.min(4, v)) : 1;
}

/** Parse palette hexes to linear RGB, sorted cool→warm by oklab hue angle. */
function resolvePalette(hexes: string[]): Rgb[] {
	const parsed = (hexes.length ? hexes : DEFAULT_PALETTE_HEX).map(hexToLinearRgb);
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

/**
 * Boot the fireworks engine on `el.canvas`.
 *
 * Returns `null` only when there is no canvas to draw into — the GPU itself is
 * probed asynchronously and fails *quiet*: when neither WebGPU nor WebGL2 comes
 * up, the returned engine simply never calls `onReady` and the caller's own
 * timeout owns the static fallback (that is the component's published
 * contract, unchanged by this extraction).
 */
export function createFireworksHdr(
	el: FireworksHdrElements,
	options: FireworksHdrInitOptions & FireworksHdrLiveOptions = {},
	random: () => number = Math.random
): FireworksHdrEngine | null {
	const canvas = el.canvas;
	if (!canvas) return null;

	const {
		palette = DEFAULT_PALETTE_HEX,
		hdr = true,
		quality = "auto",
		interactive = true,
		ambientShells,
		reducedMotion = false,
		debug = false,
		onReady,
		onLost,
		ambient = true,
		ambientIntensity = 0.35,
		exposure = EXPOSURE_AMBIENT,
		keepClear: initialKeepClear = KEEP_CLEAR_DESKTOP,
		visible = true,
	} = options;

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
	const frameUniforms: FrameUniforms = { exposure: currentExposure };
	let keepClear: Rect | null = initialKeepClear;
	const paletteRgb = resolvePalette(palette);

	const prefersReduced = reducedMotion;

	// Sampled once; only consulted on the WebGL2 fallback tier resolution.
	const lowPower = detectLowPower();

	let ambientOn = ambient && !prefersReduced;
	let ambientLevel = Math.max(0, Math.min(1, ambientIntensity));

	// Ambient scheduling state.
	const hueState = { i: 0, dir: 1 as 1 | -1 };
	let ambientElapsed = 0;
	let nextInterval = poissonIntervalMs(2200, random, 900, 5200);
	let ambientInFlight = 0;
	const pendingDoubles: { at: number; mirror: boolean }[] = [];

	let isVisible = visible;

	// GPU context loss: one recovery attempt (WebGPU asks for a new device,
	// WebGL waits for `webglcontextrestored`), then a full teardown so the
	// caller can fall back instead of holding a dead handle.
	let wired = false; // listeners are registered exactly once
	// Latches what was actually wired, so teardown removes exactly what was
	// added. Reading the live `interactive` option there would leak the window
	// listener whenever the option flipped to false after mount.
	let pointerWired = false;
	let recovering = false;
	let recoveryUsed = false;
	let restoreTimer = 0;

	function updateAspect() {
		if (!sim || !canvas) return;
		const w = canvas.clientWidth || 1;
		const h = canvas.clientHeight || 1;
		sim.setAspect(w / h);
	}

	function currentAspect(): number {
		return (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
	}

	const ambientMix = (ambientShells ?? []).filter((k) => SELF_DRAWING.includes(k));

	/** The stock weighted mix — what a launch uses when nothing overrides it. */
	function pickShell(): ShellKind {
		const r = random();
		if (r < 0.62) return "peony";
		if (r < 0.82) return "willow";
		return "ring";
	}

	/**
	 * The scheduler's own pick. `ambientShells` is scoped to the scheduler, so
	 * pointer launches keep the stock mix — an option named for the ambient loop
	 * must not quietly rewrite what a click does.
	 */
	function pickAmbientShell(): ShellKind {
		// Length checked on the line above, so the index is always in range.
		if (ambientMix.length) return ambientMix[Math.floor(random() * ambientMix.length)]!;
		return pickShell();
	}

	function ambientColor(): Rgb {
		return shellHueColor(nextShellHue(hueState), paletteRgb, SHELL_JITTER_DEG, random);
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
		let picked = sampleZone(AMBIENT_ZONES, random, keepClear);
		let apex = picked.apex;
		if (mirror) {
			const mirrored = { x: 1 - picked.apex.x, y: picked.apex.y };
			// sampleZone validated the ORIGINAL point; reflecting it can drop the
			// double straight into an asymmetric keep-clear rect. Re-test, and
			// take a freshly sampled (validated) apex when the mirror lands in it.
			if (keepClear && rectExpandedContains(keepClear, mirrored.x, mirrored.y)) {
				picked = sampleZone(AMBIENT_ZONES, random, keepClear);
				apex = picked.apex;
			} else {
				apex = mirrored;
			}
		}
		const shell = pickAmbientShell();
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
		window.setTimeout(() => {
			ambientInFlight = Math.max(0, ambientInFlight - 1);
		}, res.breakMs + 200);
	}

	function ambientTick(dtMs: number) {
		if (!ambientOn) return;
		// Fire any scheduled double-launches whose delay has elapsed.
		for (let i = pendingDoubles.length - 1; i >= 0; i--) {
			const pending = pendingDoubles[i];
			if (!pending) continue;
			pending.at -= dtMs;
			if (pending.at <= 0) {
				doAmbientLaunch(pending.mirror);
				pendingDoubles.splice(i, 1);
			}
		}
		ambientElapsed += dtMs;
		if (ambientElapsed >= nextInterval && ambientInFlight < MAX_AMBIENT_INFLIGHT_SOFT) {
			doAmbientLaunch(false);
			ambientElapsed = 0;
			nextInterval = poissonIntervalMs(2200, random, 900, 5200);
			// 18% chance of a mirrored double, +120–320 ms later.
			if (random() < 0.18) {
				pendingDoubles.push({ at: 120 + random() * 200, mirror: true });
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
		if (debug) {
			console.info(
				`[FireworksHdr] adaptive downgrade → step ${adaptive.step} ` +
					`(renderScale ${currentRenderScale}, spawnScale ${currentSpawnScale})`
			);
		}
	}

	function loop(now: number) {
		if (!running || disposed || !sim || !engine || !instances) return;
		// A lost device/context never recovers on its own: reboot or tear down
		// rather than leave a live component driving a dead engine.
		if (engine.lost) {
			handleEngineLoss();
			return;
		}
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

	/**
	 * The visibility gate, shared by the wrapper's IntersectionObserver
	 * (`setOptions({ visible })`), the tab `visibilitychange` listener and
	 * engine activation. Inert until an engine is live, so a gate report that
	 * lands before the async GPU boot cannot strand `running` on a loop that
	 * bailed out for a missing sim.
	 */
	function applyVisibility() {
		if (!sim || !engine) return;
		if (isVisible && !document.hidden && !disposed) startLoop();
		else stopLoop();
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
				setOptions(
					intensity === undefined ? { ambient: on } : { ambient: on, ambientIntensity: intensity }
				);
			},
			setKeepClear(rect: Rect | null) {
				setOptions({ keepClear: rect });
			},
			setExposure(v: number) {
				setOptions({ exposure: v });
			},
			renderLevel: level,
			cleanup: teardown,
		};
	}

	function teardown() {
		if (disposed) return;
		disposed = true;
		stopLoop();
		if (pointerWired) {
			window.removeEventListener("pointerdown", handlePointerDown);
			pointerWired = false;
		}
		document.removeEventListener("visibilitychange", handleVisibility);
		canvas.removeEventListener("webglcontextrestored", onContextRestored);
		if (restoreTimer) window.clearTimeout(restoreTimer);
		restoreTimer = 0;
		wired = false;
		engine?.destroy();
		engine = null;
		sim = null;
		instances = null;
	}

	/** Drop the dead engine and its sim, keeping listeners alive. */
	function releaseEngine() {
		stopLoop();
		engine?.destroy();
		engine = null;
		sim = null;
		instances = null;
	}

	function giveUp() {
		if (disposed) return;
		teardown();
		onLost?.();
	}

	async function reboot() {
		recovering = true;
		let revived = false;
		try {
			revived = await boot();
		} catch (error) {
			if (debug) {
				console.warn("[FireworksHdr] engine reboot failed:", error);
			}
		}
		recovering = false;
		if (!revived && !disposed) giveUp();
	}

	function onContextRestored() {
		if (restoreTimer) window.clearTimeout(restoreTimer);
		restoreTimer = 0;
		if (disposed) return;
		void reboot();
	}

	/**
	 * A WebGPU device loss or a `webglcontextlost` leaves the engine dead: no
	 * frame it draws lands. Reboot once (which also re-runs the WebGPU →
	 * WebGL2 fallback), and if that fails tear the engine down and report
	 * it instead of leaving listeners and a handle wired to nothing.
	 */
	function handleEngineLoss() {
		if (disposed || recovering) return;
		const wasWebgl = engine ? engine.renderLevel.startsWith("webgl") : false;
		releaseEngine();
		if (recoveryUsed) {
			giveUp();
			return;
		}
		recoveryUsed = true;
		if (wasWebgl) {
			// A lost WebGL context only vends a usable one again once the browser
			// fires webglcontextrestored — which it may never do.
			recovering = true;
			canvas.addEventListener("webglcontextrestored", onContextRestored, { once: true });
			restoreTimer = window.setTimeout(() => {
				restoreTimer = 0;
				canvas.removeEventListener("webglcontextrestored", onContextRestored);
				recovering = false;
				giveUp();
			}, RESTORE_TIMEOUT_MS);
		} else {
			// WebGPU: a fresh device can be requested straight away.
			void reboot();
		}
	}

	/**
	 * Wire the sim and listeners around a live engine and hand out a handle.
	 * Shared by both the WebGPU and WebGL2 paths so the render level flows
	 * through from whichever engine actually came up — and re-entrant, so a
	 * post-loss reboot re-seats the sim without double-wiring the listeners it
	 * already owns.
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
			rng: random,
		});
		sim.setKeepClear(keepClear);
		instances = new Float32Array(sim.capacity * 8);

		if (!wired) {
			if (interactive) {
				window.addEventListener("pointerdown", handlePointerDown);
				pointerWired = true;
			}
			document.addEventListener("visibilitychange", handleVisibility);
			wired = true;
		}

		updateAspect();
		applyVisibility();
		// Re-fired after a recovery: the level may have dropped to the WebGL2
		// fallback, and the caller needs a handle that says so.
		onReady?.(buildHandle(level));
	}

	// --- boot the engine, then wire everything ---------------------------
	// WebGPU first (if present), then the WebGL2 fallback. Only if BOTH fail do
	// we stay silent — the app's own timeout then shows the static fallback
	// (renderLevel "none"). Resolves to whether an engine actually activated,
	// which is what the post-loss reboot decides on.
	async function boot(): Promise<boolean> {
		let eng: FireworksEngineHandle | null = null;

		if (typeof navigator !== "undefined" && "gpu" in navigator) {
			eng = await startWebGpuFireworks(canvas, {
				maxInstances: MAX_INSTANCES,
				renderScale: 1,
				exposure: currentExposure,
			}).catch((error) => {
				if (debug) {
					console.warn("[FireworksHdr] WebGPU start failed:", error);
				}
				return null;
			});
		}

		if (disposed) {
			eng?.destroy();
			return false;
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
				return false;
			}
		}

		// Both paths exhausted: no GPU renderer. Stay silent (no onReady); the
		// app's timeout owns the static fallback.
		if (!eng) return false;

		activate(eng);
		return true;
	}

	function setOptions(next: Partial<FireworksHdrLiveOptions>): void {
		if (next.ambient !== undefined) {
			ambientOn = next.ambient && !prefersReduced;
		}
		if (next.ambientIntensity !== undefined) {
			ambientLevel = Math.max(0, Math.min(1, next.ambientIntensity));
		}
		if (next.exposure !== undefined) {
			currentExposure = clampExposure(next.exposure);
		}
		if (next.keepClear !== undefined) {
			keepClear = next.keepClear;
			// Also drives the per-particle soft dim (AD §4.5) — apex sampling
			// alone only keeps burst origins clear, not drift-in trails/embers.
			sim?.setKeepClear(next.keepClear);
		}
		if (next.visible !== undefined) {
			isVisible = next.visible;
			applyVisibility();
		}
	}

	if (hdr) {
		boot().catch((error) => {
			if (debug) {
				console.warn("[FireworksHdr] engine boot failed:", error);
			}
			return false;
		});
	}

	return {
		setOptions,
		resize() {
			updateAspect();
			engine?.resizeIfNeeded();
		},
		destroy: teardown,
	};
}
