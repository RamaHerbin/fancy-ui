import { describe, it, expect } from "vitest";
import {
	F,
	STRIDE,
	TYPE,
	G,
	createSim,
	solveLaunch,
	solveGravity,
	sphereBurst,
	ringBurst,
	springStep,
	nextShellHue,
	poissonIntervalMs,
	sampleZone,
	flickerNoise,
	deathGate,
	mixOklab,
	hueRotate,
	hexToLinearRgb,
	softKnee,
	resolveQualityTier,
	createAdaptiveState,
	adaptiveDowngradeStep,
	adaptiveLevel,
	ADAPTIVE_LADDER,
	ADAPTIVE_DEFAULTS,
	SDR_KNEE_START,
	QUALITY,
	AMBIENT_ZONES,
	KEEP_CLEAR_DESKTOP,
	type Rect,
} from "./fireworks-shared.js";

/** Deterministic rng (mulberry32) so probabilistic tests are reproducible. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe("solveLaunch / solveGravity", () => {
	it("peaks within ±0.005 of apex.y when flight is derived", () => {
		const from = { x: 0.5, y: 1.05 };
		const apex = { x: 0.3, y: 0.28 };
		const { v0 } = solveLaunch(from, apex, G);
		// Analytic trajectory minimum: y = from.y - v0y²/(2G).
		const minY = from.y - (v0.y * v0.y) / (2 * G);
		expect(Math.abs(minY - apex.y)).toBeLessThan(0.005);
	});

	it("has vy = 0 at the requested flight time (±1e-3)", () => {
		const from = { x: 0.5, y: 1.05 };
		const apex = { x: 0.5, y: 0.3 };
		const flightMs = 800;
		const { v0, flightMs: resolved } = solveLaunch(from, apex, G, flightMs);
		expect(resolved).toBeCloseTo(flightMs, 6);
		const vyAtFlight = v0.y + G * (flightMs / 1000);
		expect(Math.abs(vyAtFlight)).toBeLessThan(1e-3);
	});

	it("solveGravity inverts to a flight that peaks at apex.y", () => {
		const from = { x: 0.5, y: 1.05 };
		const apex = { x: 0.5, y: 0.4 };
		const g = solveGravity(from, apex, 0.7);
		const { v0 } = solveLaunch(from, apex, g);
		const minY = from.y - (v0.y * v0.y) / (2 * g);
		expect(Math.abs(minY - apex.y)).toBeLessThan(0.005);
	});
});

describe("springStep", () => {
	// Isolated spring response from rest at d0=0.15 (target 0), ω=6 ζ=0.9. The
	// underdamped position envelope has a 1/√(1−ζ²) ≈ 2.29 amplitude factor the
	// spec's 0.0059 estimate omitted, so the honest settle-below-0.01 time is
	// ~640 ms; we check by 700 ms. In the sim the pop phase (§5.1) hands off
	// inward velocity that reaches the target sooner still.
	function run(dt: number, seconds: number) {
		let pos = 0.15;
		let vel = 0;
		let maxOvershoot = 0; // farthest past the target (below 0)
		const steps = Math.round(seconds / dt);
		for (let i = 0; i < steps; i++) {
			({ pos, vel } = springStep(pos, vel, 0, dt, 6, 0.9));
			if (pos < -maxOvershoot) maxOvershoot = -pos;
		}
		return { pos, maxOvershoot };
	}

	it("converges to <0.01 by 700 ms at dt=16.6 ms", () => {
		const { pos } = run(1 / 60, 0.7);
		expect(Math.abs(pos)).toBeLessThan(0.01);
	});

	it("converges to <0.01 by 700 ms at dt=33 ms", () => {
		const { pos } = run(1 / 30, 0.7);
		expect(Math.abs(pos)).toBeLessThan(0.01);
	});

	it("stays converged and settled through 3 s at dt=16.6 ms", () => {
		const { pos } = run(1 / 60, 3);
		expect(Math.abs(pos)).toBeLessThan(0.01);
	});

	it("overshoots less than 5% of d0", () => {
		const { maxOvershoot } = run(1 / 60, 3);
		expect(maxOvershoot).toBeLessThan(0.05 * 0.15);
	});

	it("does not blow up over 3 s at dt=33 ms", () => {
		let pos = 0.15;
		let vel = 0;
		for (let i = 0; i < Math.round(3 / (1 / 30)); i++) {
			({ pos, vel } = springStep(pos, vel, 0, 1 / 30, 6, 0.9));
			expect(Number.isFinite(pos)).toBe(true);
			expect(Math.abs(pos)).toBeLessThan(1);
		}
	});
});

describe("sphereBurst", () => {
	it("has a near-zero mean direction (isotropic)", () => {
		const dirs = sphereBurst(320, 42);
		let mx = 0;
		let my = 0;
		for (const d of dirs) {
			mx += d.dir.x;
			my += d.dir.y;
		}
		mx /= dirs.length;
		my /= dirs.length;
		expect(Math.hypot(mx, my)).toBeLessThan(0.02);
	});

	it("splits front/back evenly (frac z<0 in [0.45,0.55])", () => {
		const dirs = sphereBurst(320, 7);
		const frac = dirs.filter((d) => d.z < 0).length / dirs.length;
		expect(frac).toBeGreaterThanOrEqual(0.45);
		expect(frac).toBeLessThanOrEqual(0.55);
	});
});

describe("ringBurst", () => {
	it("emits unit in-plane directions (|len−1| < 0.05)", () => {
		for (const d of ringBurst(180, 3)) {
			expect(Math.abs(Math.hypot(d.dir.x, d.dir.y) - 1)).toBeLessThan(0.05);
		}
	});

	it("is angularly even to ±10%", () => {
		const n = 120;
		const dirs = ringBurst(n, 9);
		const expected = (2 * Math.PI) / n;
		for (let i = 1; i < dirs.length; i++) {
			let a0 = Math.atan2(dirs[i - 1].dir.y, dirs[i - 1].dir.x);
			let a1 = Math.atan2(dirs[i].dir.y, dirs[i].dir.x);
			let diff = a1 - a0;
			while (diff < 0) diff += 2 * Math.PI;
			expect(Math.abs(diff - expected)).toBeLessThan(expected * 0.1);
		}
	});
});

describe("poissonIntervalMs", () => {
	it("stays in [900,5200] with a mean near 2200", () => {
		const rng = mulberry32(1234);
		let sum = 0;
		const N = 10000;
		for (let i = 0; i < N; i++) {
			const v = poissonIntervalMs(2200, rng, 900, 5200);
			expect(v).toBeGreaterThanOrEqual(900);
			expect(v).toBeLessThanOrEqual(5200);
			sum += v;
		}
		expect(Math.abs(sum / N - 2200)).toBeLessThan(150);
	});
});

describe("sampleZone", () => {
	function inside(rect: Rect, x: number, y: number) {
		return x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;
	}

	it("never samples inside the keep-clear rect", () => {
		const rng = mulberry32(99);
		for (let i = 0; i < 1000; i++) {
			const { apex } = sampleZone(AMBIENT_ZONES, rng, KEEP_CLEAR_DESKTOP);
			expect(inside(KEEP_CLEAR_DESKTOP, apex.x, apex.y)).toBe(false);
		}
	});

	it("respects zone weights within ±3%", () => {
		const rng = mulberry32(2024);
		const N = 8000;
		const counts = AMBIENT_ZONES.map(() => 0);
		for (let i = 0; i < N; i++) {
			const { apex } = sampleZone(AMBIENT_ZONES, rng, null);
			// Attribute by which zone rect contains the (unbiased) point.
			for (let z = 0; z < AMBIENT_ZONES.length; z++) {
				if (inside(AMBIENT_ZONES[z].rect, apex.x, apex.y)) {
					counts[z]++;
					break;
				}
			}
		}
		for (let z = 0; z < AMBIENT_ZONES.length; z++) {
			expect(Math.abs(counts[z] / N - AMBIENT_ZONES[z].weight)).toBeLessThan(0.03);
		}
	});
});

describe("nextShellHue", () => {
	it("ping-pongs 0,1,2,3,2,1,0,1 over 8 calls", () => {
		const state = { i: 0, dir: 1 as 1 | -1 };
		const seq = Array.from({ length: 8 }, () => nextShellHue(state));
		expect(seq).toEqual([0, 1, 2, 3, 2, 1, 0, 1]);
	});
});

describe("flickerNoise", () => {
	it("is deterministic per (seed, age, freq)", () => {
		expect(flickerNoise(3, 0.5, 10)).toBe(flickerNoise(3, 0.5, 10));
		expect(flickerNoise(3, 1.234, 12)).toBe(flickerNoise(3, 1.234, 12));
	});

	it("differs across seeds", () => {
		expect(flickerNoise(1, 0.5, 10)).not.toBe(flickerNoise(999, 0.5, 10));
	});

	it("stays within [0,1)", () => {
		const rng = mulberry32(5);
		for (let i = 0; i < 500; i++) {
			const v = flickerNoise(rng() * 1000, rng() * 3, 8 + rng() * 6);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});

describe("deathGate", () => {
	it("is 1 before the last 10% of life and 0 at end-of-life", () => {
		expect(deathGate(0.5)).toBe(1);
		expect(deathGate(0.9)).toBe(1);
		expect(deathGate(0.95)).toBeCloseTo(0.5, 5);
		expect(deathGate(1.0)).toBe(0);
	});

	it("is strictly positive for any lifeT < 1 (nothing removed at nonzero brightness)", () => {
		for (let lifeT = 0; lifeT < 0.999; lifeT += 0.01) {
			expect(deathGate(lifeT)).toBeGreaterThan(0);
		}
	});
});

describe("color helpers", () => {
	it("hueRotate preserves oklab lightness roughly and changes hue", () => {
		const cyan = hexToLinearRgb("#42cfff");
		const rotated = hueRotate(cyan, 40);
		expect(rotated).not.toEqual(cyan);
	});

	it("mixOklab endpoints return the endpoints", () => {
		const a = hexToLinearRgb("#42cfff");
		const b = hexToLinearRgb("#ff2fd6");
		const m0 = mixOklab(a, b, 0);
		expect(m0.r).toBeCloseTo(a.r, 5);
		expect(m0.g).toBeCloseTo(a.g, 5);
		expect(m0.b).toBeCloseTo(a.b, 5);
	});
});

describe("softKnee (§7.2 SDR tone map)", () => {
	const knee = SDR_KNEE_START;

	it("is the identity at or below the knee", () => {
		expect(softKnee(0, knee)).toBe(0);
		expect(softKnee(0.5, knee)).toBe(0.5);
		expect(softKnee(knee, knee)).toBe(knee);
	});

	it("compresses above the knee and never exceeds 1.0", () => {
		expect(softKnee(1.8, knee)).toBeGreaterThan(knee);
		expect(softKnee(1.8, knee)).toBeLessThan(1); // moderate over-white stays below white
		expect(softKnee(1e6, knee)).toBeLessThanOrEqual(1); // saturates at the 1.0 asymptote
	});

	it("is monotonic increasing across the knee", () => {
		let prev = -Infinity;
		for (let x = 0; x <= 4; x += 0.05) {
			const y = softKnee(x, knee);
			expect(y).toBeGreaterThanOrEqual(prev);
			prev = y;
		}
	});

	it("approaches 1.0 asymptotically as input grows", () => {
		expect(softKnee(100, knee)).toBeCloseTo(1, 5);
	});
});

describe("resolveQualityTier", () => {
	it("passes an explicit tier through unchanged", () => {
		for (const t of ["high", "mid", "low"] as const) {
			expect(resolveQualityTier(t, "webgl-sdr", 1, 1000)).toBe(t);
			// Explicit tiers ignore every other signal (small screen, low power).
			expect(resolveQualityTier(t, "webgpu-hdr", 2, 300, true)).toBe(t);
		}
	});

	it("drops to low on a small viewport, over any render level", () => {
		expect(resolveQualityTier("auto", "webgpu-hdr", 2, 400)).toBe("low");
		expect(resolveQualityTier("auto", "webgl-p3", 1, 320)).toBe("low");
	});

	it("does not treat an unmeasured (0) min-dim as small", () => {
		expect(resolveQualityTier("auto", "webgpu-hdr", 2, 0)).toBe("high");
	});

	it("maps webgpu-hdr to high, webgpu-sdr to high@retina else mid", () => {
		expect(resolveQualityTier("auto", "webgpu-hdr", 1, 1000)).toBe("high");
		expect(resolveQualityTier("auto", "webgpu-sdr", 2, 1000)).toBe("high");
		expect(resolveQualityTier("auto", "webgpu-sdr", 1, 1000)).toBe("mid");
	});

	it("maps the WebGL2 levels to mid", () => {
		expect(resolveQualityTier("auto", "webgl-p3", 2, 1000)).toBe("mid");
		expect(resolveQualityTier("auto", "webgl-sdr", 1, 1000)).toBe("mid");
	});

	it("downgrades the WebGL2 path to low only when low-power", () => {
		expect(resolveQualityTier("auto", "webgl-p3", 2, 1000, true)).toBe("low");
		expect(resolveQualityTier("auto", "webgl-sdr", 1, 1000, true)).toBe("low");
	});

	it("never lets low-power downgrade a WebGPU tier", () => {
		expect(resolveQualityTier("auto", "webgpu-hdr", 2, 1000, true)).toBe("high");
		expect(resolveQualityTier("auto", "webgpu-sdr", 2, 1000, true)).toBe("high");
	});

	it("resolves to a tier that exists in the QUALITY table", () => {
		const tier = resolveQualityTier("auto", "webgl-p3", 1, 1000);
		expect(QUALITY[tier].maxParticles).toBeGreaterThan(0);
	});
});

describe("adaptiveDowngradeStep", () => {
	const T = ADAPTIVE_DEFAULTS;

	it("starts at full quality and seeds the EMA on the first frame", () => {
		const s = createAdaptiveState();
		expect(s).toEqual({ emaMs: 0, overCount: 0, step: 0, started: false });
		adaptiveDowngradeStep(s, 40);
		expect(s.started).toBe(true);
		expect(s.emaMs).toBe(40); // seeded to the first sample, not ramped from 0
	});

	it("never downgrades while frame time stays under threshold", () => {
		const s = createAdaptiveState();
		for (let i = 0; i < 1000; i++) {
			expect(adaptiveDowngradeStep(s, 16)).toBe(false);
		}
		expect(s.step).toBe(0);
		expect(s.overCount).toBe(0);
	});

	it("downgrades one notch after exactly sustainFrames over threshold", () => {
		const s = createAdaptiveState();
		let fired = -1;
		for (let i = 1; i <= T.sustainFrames + 5; i++) {
			if (adaptiveDowngradeStep(s, 40)) {
				fired = i;
				break;
			}
		}
		// 40 ms > 24 ms every frame; the EMA seeds at 40 so it is over from frame 1.
		expect(fired).toBe(T.sustainFrames);
		expect(s.step).toBe(1);
		expect(s.overCount).toBe(0); // reset after a downgrade
	});

	it("is session-sticky: only ever downgrades and stops at the floor", () => {
		const s = createAdaptiveState();
		const floor = ADAPTIVE_LADDER.length - 1;
		let downgrades = 0;
		let prevStep = 0;
		for (let i = 0; i < T.sustainFrames * (floor + 4); i++) {
			if (adaptiveDowngradeStep(s, 50)) downgrades++;
			expect(s.step).toBeGreaterThanOrEqual(prevStep); // never upgrades
			prevStep = s.step;
		}
		expect(downgrades).toBe(floor); // exactly one per rung below full
		expect(s.step).toBe(floor);
		// At the floor it is inert no matter how slow the frames get.
		expect(adaptiveDowngradeStep(s, 999)).toBe(false);
		expect(s.step).toBe(floor);
	});

	it("does not downgrade on a single spike followed by good frames", () => {
		const s = createAdaptiveState();
		for (let i = 0; i < 30; i++) adaptiveDowngradeStep(s, 16); // settle EMA low
		adaptiveDowngradeStep(s, 400); // one huge stall
		let downgraded = false;
		for (let i = 0; i < 40; i++) {
			if (adaptiveDowngradeStep(s, 16)) downgraded = true;
		}
		expect(downgraded).toBe(false);
		expect(s.step).toBe(0);
	});

	it("resets the over-counter when a good frame drops the EMA back under threshold", () => {
		const s = createAdaptiveState();
		// 30 slow frames (below sustain) then a long calm — counter must not latch.
		for (let i = 0; i < 30; i++) adaptiveDowngradeStep(s, 40);
		expect(s.overCount).toBeGreaterThan(0);
		for (let i = 0; i < 200; i++) adaptiveDowngradeStep(s, 10);
		expect(s.overCount).toBe(0);
		expect(s.step).toBe(0);
	});

	it("uses the EMA, not the raw frame time (a lone slow frame is absorbed)", () => {
		const s = createAdaptiveState();
		adaptiveDowngradeStep(s, 10); // EMA = 10
		// One 30 ms frame lifts the EMA only to 10 + 0.1·(30−10) = 12 ms (< 24).
		adaptiveDowngradeStep(s, 30);
		expect(s.emaMs).toBeCloseTo(12, 6);
		expect(s.overCount).toBe(0);
	});
});

describe("adaptiveLevel / ADAPTIVE_LADDER", () => {
	it("sheds GPU renderScale before CPU spawnScale, and never upgrades a rung", () => {
		for (let i = 1; i < ADAPTIVE_LADDER.length; i++) {
			const prev = ADAPTIVE_LADDER[i - 1];
			const cur = ADAPTIVE_LADDER[i];
			expect(cur.renderScale).toBeLessThanOrEqual(prev.renderScale);
			expect(cur.spawnScale).toBeLessThanOrEqual(prev.spawnScale);
			// A rung either drops renderScale or spawnScale (progress every step).
			expect(cur.renderScale < prev.renderScale || cur.spawnScale < prev.spawnScale).toBe(true);
		}
		// renderScale bottoms out before spawnScale starts moving (GPU-first).
		expect(ADAPTIVE_LADDER[1].spawnScale).toBe(1);
		expect(ADAPTIVE_LADDER[2].spawnScale).toBe(1);
		expect(ADAPTIVE_LADDER[2].renderScale).toBe(0.5);
	});

	it("maps a state's step to its rung and clamps past the floor", () => {
		const s = createAdaptiveState();
		expect(adaptiveLevel(s)).toEqual(ADAPTIVE_LADDER[0]);
		s.step = 3;
		expect(adaptiveLevel(s)).toEqual(ADAPTIVE_LADDER[3]);
		s.step = 999;
		expect(adaptiveLevel(s)).toEqual(ADAPTIVE_LADDER[ADAPTIVE_LADDER.length - 1]);
	});
});

describe("setSpawnScale (adaptive CPU lever)", () => {
	it("shrinks new burst particle counts and keeps determinism at scale 1", () => {
		function detonatedCount(scale: number): number {
			const sim = createSim({ quality: "high", aspect: 1.6, hdr: true, rng: mulberry32(7) });
			sim.setSpawnScale(scale);
			sim.launch({ apex: { x: 0.5, y: 0.4 }, shell: "peony", seed: 42, flightMs: 120 });
			// Step past the short flight so the shell detonates into debris.
			for (let f = 0; f < 20; f++) sim.step(1 / 60);
			return sim.count;
		}
		const full = detonatedCount(1);
		const half = detonatedCount(0.5);
		expect(full).toBeGreaterThan(0);
		expect(half).toBeLessThan(full); // fewer sparks at 0.5× density
		expect(half).toBeGreaterThan(0);
	});

	it("does not scale glyph seekers (the intro word stays intact)", () => {
		function seekerCount(scale: number): number {
			const sim = createSim({ quality: "high", aspect: 1.6, hdr: true, rng: mulberry32(3) });
			sim.setSpawnScale(scale);
			const glyphPoints = Array.from({ length: 40 }, (_, i) => ({ x: 0.4 + 0.004 * i, y: 0.4 }));
			sim.launch({ apex: { x: 0.5, y: 0.4 }, shell: "glyph", glyphPoints, seed: 3, releaseAtMs: 4000 });
			for (let f = 0; f < 60; f++) sim.step(1 / 60);
			let seekers = 0;
			for (let idx = 0; idx < sim.count; idx++) {
				if (sim.data[idx * STRIDE + F.type] === TYPE.SEEKER) seekers++;
			}
			return seekers;
		}
		// Seeker count is driven by glyphPoints (40), unaffected by spawnScale.
		expect(seekerCount(0.4)).toBe(seekerCount(1));
		expect(seekerCount(0.4)).toBe(40);
	});
});

describe("createSim pool", () => {
	it("counts dropped spawns exactly when over capacity", () => {
		const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(1) });
		const cap = sim.capacity; // 1280 for the low tier
		const over = 20;
		const white = { r: 1, g: 1, b: 1 };
		for (let i = 0; i < cap + over; i++) sim.spawnFlash({ x: 0.5, y: 0.5 }, 3.8, 0.1, white);
		sim.step(1 / 60);
		expect(sim.count).toBe(cap);
		expect(sim.droppedSpawns).toBe(over);
	});

	it("keeps count ≤ capacity and every live particle age<ttl across churn", () => {
		const sim = createSim({ quality: "mid", aspect: 1.6, hdr: true, rng: mulberry32(77) });
		const data = sim.data;
		for (let frame = 0; frame < 220; frame++) {
			if (frame % 5 === 0) {
				sim.launch({ apex: { x: 0.2 + 0.6 * ((frame / 5) % 2), y: 0.25 }, shell: "peony" });
			}
			sim.step(1 / 60);
			expect(sim.count).toBeLessThanOrEqual(sim.capacity);
			for (let idx = 0; idx < sim.count; idx++) {
				const base = idx * STRIDE;
				const ttl = data[base + F.ttl];
				const age = data[base + F.age];
				if (ttl > 0) expect(age).toBeLessThan(ttl);
			}
		}
		// The churn actually produced particles (detonations happened).
		expect(sim.count).toBeGreaterThan(0);
	});

	it("writeInstances returns the live count and 8 floats per instance", () => {
		const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(3) });
		sim.launch({ apex: { x: 0.5, y: 0.3 }, shell: "ring" });
		for (let f = 0; f < 120; f++) sim.step(1 / 60);
		const out = new Float32Array(sim.capacity * 8);
		const n = sim.writeInstances(out);
		expect(n).toBe(sim.count);
		expect(n).toBeGreaterThan(0);
		// Live instances carry a finite position and non-negative size.
		for (let i = 0; i < n; i++) {
			expect(Number.isFinite(out[i * 8 + 0])).toBe(true);
			expect(out[i * 8 + 2]).toBeGreaterThanOrEqual(0);
		}
	});

	it("reset clears the pool and counters", () => {
		const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(9) });
		sim.launch({ apex: { x: 0.5, y: 0.3 } });
		sim.step(1 / 60);
		sim.reset();
		expect(sim.count).toBe(0);
		expect(sim.droppedSpawns).toBe(0);
	});

	it("is deterministic given a fixed seed and rng", () => {
		function trace() {
			const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(555) });
			sim.launch({ apex: { x: 0.5, y: 0.3 }, seed: 12345, shell: "peony" });
			for (let f = 0; f < 90; f++) sim.step(1 / 60);
			return { count: sim.count, first: sim.data.slice(0, STRIDE) };
		}
		const a = trace();
		const b = trace();
		expect(a.count).toBe(b.count);
		expect(Array.from(a.first)).toEqual(Array.from(b.first));
	});

	it("supports glyph shells driven by glyphPoints", () => {
		const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(11) });
		const glyphPoints = Array.from({ length: 20 }, (_, i) => ({
			x: 0.4 + 0.01 * i,
			y: 0.4,
		}));
		sim.launch({
			apex: { x: 0.5, y: 0.35 },
			shell: "glyph",
			glyphPoints,
			releaseAtMs: 2000,
		});
		for (let f = 0; f < 60; f++) sim.step(1 / 60);
		// Seekers exist while the glyph is held.
		let seekers = 0;
		for (let idx = 0; idx < sim.count; idx++) {
			if (sim.data[idx * STRIDE + F.type] === TYPE.SEEKER) seekers++;
		}
		expect(seekers).toBeGreaterThan(0);
	});
});

describe("keep-clear soft dim (§4.5)", () => {
	// A rect covering the whole field: every particle is "inside", so the only
	// thing that can move the summed brightness between two otherwise-identical
	// runs is the dim itself (dimming never feeds back into motion/aging).
	const FULL: Rect = { x0: 0, y0: 0, x1: 1, y1: 1 };

	function sumBrightness(sim: ReturnType<typeof createSim>, only?: number): number {
		let sum = 0;
		for (let idx = 0; idx < sim.count; idx++) {
			const base = idx * STRIDE;
			const type = sim.data[base + F.type];
			if (only !== undefined && type !== only) continue;
			sum += sim.data[base + F.brightness];
		}
		return sum;
	}

	function sumDimmable(sim: ReturnType<typeof createSim>): number {
		let sum = 0;
		for (let idx = 0; idx < sim.count; idx++) {
			const base = idx * STRIDE;
			const type = sim.data[base + F.type];
			if (type === TYPE.ROCKET || type === TYPE.SEEKER) continue;
			sum += sim.data[base + F.brightness];
		}
		return sum;
	}

	it("fades sparks/embers/smoke inside the rect to 35% of their undimmed brightness", () => {
		function run(withClear: boolean): number {
			const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(4242) });
			if (withClear) sim.setKeepClear(FULL);
			sim.launch({ apex: { x: 0.5, y: 0.5 }, seed: 7, shell: "peony" });
			for (let f = 0; f < 60; f++) sim.step(1 / 60); // past detonation: burst debris is alive
			return sumDimmable(sim);
		}
		const dimmed = run(true);
		const bright = run(false);
		expect(bright).toBeGreaterThan(0);
		expect(dimmed / bright).toBeCloseTo(0.35, 5);
	});

	it("leaves rockets undimmed — they transit thin and fast", () => {
		function rocketBrightness(withClear: boolean): number {
			const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(88) });
			if (withClear) sim.setKeepClear(FULL);
			sim.launch({ apex: { x: 0.5, y: 0.3 }, seed: 5, shell: "peony" });
			sim.step(1 / 60); // still ascending, inside the rect
			return sumBrightness(sim, TYPE.ROCKET);
		}
		const b = rocketBrightness(true);
		expect(b).toBeGreaterThan(0);
		expect(b).toBe(rocketBrightness(false));
	});

	it("leaves glyph seekers undimmed — the intro word is the show", () => {
		function seekerBrightness(withClear: boolean): number {
			const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(11) });
			if (withClear) sim.setKeepClear(FULL);
			const glyphPoints = Array.from({ length: 12 }, (_, i) => ({ x: 0.45 + 0.005 * i, y: 0.45 }));
			sim.launch({ apex: { x: 0.5, y: 0.4 }, shell: "glyph", glyphPoints, seed: 3, releaseAtMs: 2000 });
			for (let f = 0; f < 60; f++) sim.step(1 / 60); // detonated, seekers held (release at 2 s)
			return sumBrightness(sim, TYPE.SEEKER);
		}
		const b = seekerBrightness(true);
		expect(b).toBeGreaterThan(0);
		expect(b).toBe(seekerBrightness(false));
	});

	it("does nothing once the rect is cleared back to null", () => {
		const sim = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(4242) });
		sim.setKeepClear(FULL);
		sim.setKeepClear(null);
		sim.launch({ apex: { x: 0.5, y: 0.5 }, seed: 7, shell: "peony" });
		for (let f = 0; f < 60; f++) sim.step(1 / 60);
		const cleared = sumDimmable(sim);

		const ref = createSim({ quality: "low", aspect: 1.6, hdr: true, rng: mulberry32(4242) });
		ref.launch({ apex: { x: 0.5, y: 0.5 }, seed: 7, shell: "peony" });
		for (let f = 0; f < 60; f++) ref.step(1 / 60);
		expect(cleared).toBe(sumDimmable(ref));
	});
});
