import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMagneticFieldCore,
	createMagneticFieldHub,
	falloff,
	itemSpring,
	itemTarget,
	MAGNETIC_FIELD_DEFAULTS,
	MAGNETIC_FIELD_SPRINGS,
	rectDistance,
	resolveSpring,
	stepSpring,
	type MagneticFieldCore,
	type MagneticItemOptions,
	type MagneticRect,
} from "./magnetic-field-core.js";

const FIELD = {
	radius: 220,
	strength: 1,
	maxTranslate: 24,
	maxRotate: 6,
	polarity: 1 as 1 | -1,
};
const RECT: MagneticRect = { left: 100, top: 100, width: 80, height: 24 };
const ITEM: MagneticItemOptions = { mass: 1, strength: 1, pull: true, rotate: true };

function target(x: number, y: number, item: Partial<MagneticItemOptions> = {}, field = FIELD) {
	return itemTarget({ x, y }, RECT, field, { ...ITEM, ...item });
}

describe("defaults and presets", () => {
	it("pins the library defaults", () => {
		expect(MAGNETIC_FIELD_DEFAULTS).toEqual({
			radius: 220,
			strength: 1,
			maxTranslate: 24,
			maxRotate: 6,
			polarity: 1,
		});
	});

	it("pins the spring presets", () => {
		expect(MAGNETIC_FIELD_SPRINGS.default).toEqual({ stiffness: 230, damping: 30, mass: 1 });
		expect(MAGNETIC_FIELD_SPRINGS.soft).toEqual({ stiffness: 170, damping: 18, mass: 1 });
		expect(MAGNETIC_FIELD_SPRINGS.snappy).toEqual({ stiffness: 320, damping: 36, mass: 1 });
		expect(Object.isFrozen(MAGNETIC_FIELD_SPRINGS)).toBe(true);
	});

	it("resolves presets and partial configs over default", () => {
		expect(resolveSpring()).toEqual(MAGNETIC_FIELD_SPRINGS.default);
		expect(resolveSpring("soft")).toEqual(MAGNETIC_FIELD_SPRINGS.soft);
		expect(resolveSpring({ damping: 10 })).toEqual({ stiffness: 230, damping: 10, mass: 1 });
		expect(resolveSpring({ stiffness: Number.NaN })).toEqual(MAGNETIC_FIELD_SPRINGS.default);
		// A fresh object: callers may not mutate the frozen presets through it.
		expect(resolveSpring("default")).not.toBe(MAGNETIC_FIELD_SPRINGS.default);
	});

	it("keeps the damping ratio constant across item masses, translation and rotation", () => {
		const ratio = (c: { stiffness: number; damping: number; mass: number }) =>
			c.damping / (2 * Math.sqrt(c.stiffness * c.mass));
		const base = ratio(MAGNETIC_FIELD_SPRINGS.default);
		expect(base).toBeCloseTo(0.989, 3);
		for (const m of [0.6, 1, 2.5]) {
			expect(ratio(itemSpring(MAGNETIC_FIELD_SPRINGS.default, m))).toBeCloseTo(base, 6);
			expect(ratio(itemSpring(MAGNETIC_FIELD_SPRINGS.default, m, true))).toBeCloseTo(base, 6);
		}
		const r = itemSpring(MAGNETIC_FIELD_SPRINGS.default, 1, true);
		expect(r.stiffness).toBe(460);
		expect(r.damping).toBeCloseTo(30 * Math.SQRT2, 9);
	});

	it("clamps item mass to [0.25, 10]", () => {
		expect(itemSpring(MAGNETIC_FIELD_SPRINGS.default, 0).mass).toBe(0.25);
		expect(itemSpring(MAGNETIC_FIELD_SPRINGS.default, 100).mass).toBe(10);
	});
});

describe("rectDistance / falloff", () => {
	it("is 0 inside and on the edge, euclidean to the nearest edge outside", () => {
		expect(rectDistance({ x: 150, y: 115 }, RECT)).toBe(0);
		expect(rectDistance({ x: 100, y: 100 }, RECT)).toBe(0);
		expect(rectDistance({ x: 140, y: 30 }, RECT)).toBe(70);
		expect(rectDistance({ x: 300, y: 200 }, RECT)).toBeCloseTo(142.042, 3);
	});

	it("is smoothstep(1 - d / radius)", () => {
		expect(falloff(0, 220)).toBe(1);
		expect(falloff(220, 220)).toBe(0);
		expect(falloff(400, 220)).toBe(0);
		expect(falloff(110, 220)).toBeCloseTo(0.5, 9);
		expect(falloff(53.814, 220)).toBeCloseTo(0.8498, 4);
		expect(falloff(10, 0)).toBe(0);
	});

	it("is monotonic and at least 2x stronger at 0.25 radius than at 0.6 radius", () => {
		let prev = 1;
		for (let d = 0; d <= 220; d += 5) {
			const f = falloff(d, 220);
			expect(f).toBeLessThanOrEqual(prev);
			prev = f;
		}
		expect(falloff(55, 220)).toBeGreaterThan(2 * falloff(132, 220));
	});
});

describe("itemTarget", () => {
	// Values from an independent implementation of the frozen formulas.
	it.each([
		[300, 200, 1, 6.05, 3.328, -4.481],
		[300, 200, 0.6, 10.084, 5.546, -6],
		[300, 200, 2.5, 2.42, 1.331, -1.792],
		[220, 160, 1, 17.488, 10.493, -5.686],
		[220, 160, 2.5, 6.995, 4.197, -2.274],
		[200, 130, 1, 22.406, 6.722, -5.923],
		[60, 60, 1, -16.816, -10.93, 5.654],
		[140, 30, 1, 0, -18.257, 0],
		[140, 30, 0.6, 0, -24, 0],
		[150, 115, 1, 10, 3, -3.811],
		[60, 112, 1, -21.908, 0, 5.831],
		[40, 300, 1, -0.727, 1.366, 3.275],
	])("magnet (%d, %d), mass %d → (%d, %d) px, %d°", (x, y, mass, tx, ty, tr) => {
		const t = target(x, y, { mass });
		expect(t.x).toBeCloseTo(tx, 3);
		expect(t.y).toBeCloseTo(ty, 3);
		expect(t.r).toBeCloseTo(tr, 3);
	});

	it("returns rest for no magnet, the exact centre, and beyond both reaches", () => {
		expect(itemTarget(null, RECT, FIELD, ITEM)).toEqual({ x: 0, y: 0, r: 0, f: 0 });
		expect(target(140, 112)).toEqual({ x: 0, y: 0, r: 0, f: 1 });
		expect(target(620, 112)).toEqual({ x: 0, y: 0, r: 0, f: 0 });
	});

	it("leans twice as far as it pulls", () => {
		const t = target(500, 112);
		expect(t.f).toBe(0);
		expect(t.x).toBe(0);
		expect(t.y).toBe(0);
		expect(t.r).toBeCloseTo(-1.09, 3);
	});

	it("leans by the magnet's horizontal side, whatever its height", () => {
		// Magnet to the right of the item, above, level and below: counter-clockwise.
		for (const y of [40, 112, 200]) expect(target(260, y).r).toBeLessThan(0);
		// Magnet to the left: clockwise, including level with the item.
		for (const y of [40, 112, 200]) expect(target(20, y).r).toBeGreaterThan(0);
		// Straight above or below: no lean.
		expect(target(140, 40).r).toBe(0);
		expect(target(140, 200).r).toBe(0);
	});

	it("saturates near the cap even where the pull is small", () => {
		const near = target(300, 112);
		expect(Math.abs(near.r)).toBeGreaterThan(0.6 * FIELD.maxRotate);
		expect(Math.hypot(near.x, near.y)).toBeLessThan(FIELD.maxTranslate);
	});

	it("never exceeds the caps, for any magnet and any light item", () => {
		for (let x = -200; x <= 500; x += 17) {
			for (let y = -200; y <= 400; y += 19) {
				const t = target(x, y, { mass: 0.25, strength: 4 });
				expect(Math.hypot(t.x, t.y)).toBeLessThanOrEqual(FIELD.maxTranslate + 1e-9);
				expect(Math.abs(t.r)).toBeLessThanOrEqual(FIELD.maxRotate + 1e-9);
			}
		}
	});

	it("never jumps past the magnet (pull ≤ centre distance)", () => {
		for (let dx = -30; dx <= 30; dx += 1.5) {
			const t = target(140 + dx, 112 + dx / 3, { mass: 0.25, strength: 4 });
			expect(Math.hypot(t.x, t.y)).toBeLessThanOrEqual(Math.hypot(dx, dx / 3) + 1e-9);
		}
	});

	it("does not flip the pull direction as the magnet crosses the centre line", () => {
		const left = target(139, 112);
		const right = target(141, 112);
		expect(Math.abs(left.x)).toBeLessThan(1.1);
		expect(Math.abs(right.x)).toBeLessThan(1.1);
	});

	it("flips translation only with polarity -1", () => {
		const attract = target(220, 160);
		const repel = target(220, 160, {}, { ...FIELD, polarity: -1 });
		expect(repel.x).toBeCloseTo(-attract.x, 9);
		expect(repel.y).toBeCloseTo(-attract.y, 9);
		expect(repel.r).toBeCloseTo(attract.r, 9);
	});

	it("honours pull, rotate, strength 0 and lighter-moves-more", () => {
		expect(target(220, 160, { pull: false })).toMatchObject({ x: 0, y: 0 });
		expect(target(220, 160, { pull: false }).r).not.toBe(0);
		expect(target(220, 160, { rotate: false }).r).toBe(0);
		expect(target(220, 160, { strength: 0 })).toMatchObject({ x: 0, y: 0, r: 0 });
		expect(target(220, 160, {}, { ...FIELD, strength: 0 })).toMatchObject({ x: 0, y: 0, r: 0 });
		const pullOf = (mass: number) => {
			const t = target(300, 200, { mass });
			return Math.hypot(t.x, t.y);
		};
		// Below the cap, the pull is inversely proportional to mass.
		expect(pullOf(3) / pullOf(1.2)).toBeCloseTo(0.4, 6);
		expect(pullOf(0.6) / pullOf(1.2)).toBeCloseTo(2, 6);
	});

	it("snaps targets too small to see to exactly 0, so far items count as at rest", () => {
		// 435 px right of the item's edge: inside the lean's 440 px reach, but
		// the lean there is a few thousandths of a degree.
		expect(target(615, 112)).toMatchObject({ x: 0, y: 0, r: 0 });
		// Well inside the reach the lean is untouched.
		expect(Math.abs(target(480, 112).r)).toBeGreaterThan(0.05);
	});
});

describe("stepSpring", () => {
	const def = itemSpring(MAGNETIC_FIELD_SPRINGS.default, 1);

	it("releases near-critically: no overshoot, settled under 450 ms", () => {
		const s = { x: 24, v: 0, target: 0 };
		const at: number[] = [];
		let min = 0;
		let restFrame = -1;
		for (let i = 1; i <= 60; i++) {
			const moving = stepSpring(s, def, 1 / 60, 0.01);
			min = Math.min(min, s.x);
			at[i] = s.x;
			if (!moving && restFrame < 0) restFrame = i;
		}
		expect(at[6]).toBeCloseTo(12.7436, 3);
		expect(at[12]).toBeCloseTo(4.4442, 3);
		expect(at[18]).toBeCloseTo(1.3724, 3);
		expect(Math.abs(at[27])).toBeLessThan(0.5);
		expect(min).toBeGreaterThanOrEqual(-0.03 * 24);
		expect(restFrame).toBe(43);
		expect(s).toEqual({ x: 0, v: 0, target: 0 });
	});

	it("overshoots visibly with the soft preset", () => {
		const soft = itemSpring(MAGNETIC_FIELD_SPRINGS.soft, 1);
		const s = { x: 24, v: 0, target: 0 };
		let min = 0;
		for (let i = 0; i < 60; i++) {
			stepSpring(s, soft, 1 / 60, 0.01);
			min = Math.min(min, s.x);
		}
		expect(min).toBeCloseTo(-1.0687, 3);
	});

	it("is frame-rate independent", () => {
		const results = [30, 60, 120].map((fps) => {
			const s = { x: 24, v: 0, target: 0 };
			for (let i = 0; i < fps * 0.2; i++) stepSpring(s, def, 1 / fps, 0.01);
			return s.x;
		});
		for (const x of results) expect(x).toBeCloseTo(4.44421, 4);
	});

	it("clamps a long frame to 1/30 s", () => {
		const s = { x: 24, v: 0, target: 0 };
		for (let i = 0; i < 3; i++) stepSpring(s, def, 0.5, 0.01);
		expect(s.x).toBeCloseTo(12.7436, 3);
	});

	it("leads with the lean: rotation reaches 80 % of its target within 150 ms, without overshoot", () => {
		const rot = itemSpring(MAGNETIC_FIELD_SPRINGS.default, 0.7, true);
		const s = { x: 0, v: 0, target: 6 };
		let max = 0;
		let reached = -1;
		for (let i = 1; i <= 60; i++) {
			stepSpring(s, rot, 1 / 60, 0.01);
			max = Math.max(max, s.x);
			if (reached < 0 && s.x >= 4.8) reached = i;
		}
		expect(reached).toBeGreaterThan(0);
		expect(reached).toBeLessThanOrEqual(9);
		expect(max).toBeLessThanOrEqual(6.1);
	});

	it("reaches 90 % of a pull within 300 ms", () => {
		const s = { x: 0, v: 0, target: 24 };
		let reached = -1;
		for (let i = 1; i <= 60; i++) {
			stepSpring(s, def, 1 / 60, 0.01);
			if (reached < 0 && s.x >= 21.6) reached = i;
		}
		expect(reached).toBeLessThanOrEqual(18);
	});
});

// ---------------------------------------------------------------------------
// The engine, against a fake clock and fake rects.

interface Frame {
	id: number;
	cb: FrameRequestCallback;
}

let frames: Frame[] = [];
let nextId = 1;
let now = 0;

function flushFrame(ms = 1000 / 60) {
	now += ms;
	const due = frames;
	frames = [];
	for (const f of due) f.cb(now);
}

function runFrames(n: number, ms?: number) {
	for (let i = 0; i < n; i++) flushFrame(ms);
}

function runUntilIdle(max = 600) {
	let i = 0;
	while (frames.length && i++ < max) flushFrame();
	return i;
}

function rect(el: HTMLElement, r: { left: number; top: number; width: number; height: number }) {
	vi.spyOn(el, "getBoundingClientRect").mockImplementation(
		() =>
			({
				...r,
				x: r.left,
				y: r.top,
				right: r.left + r.width,
				bottom: r.top + r.height,
				toJSON() {},
			}) as DOMRect
	);
}

function makeItem(
	root: HTMLElement,
	r: { left: number; top: number; width: number; height: number }
) {
	const outer = document.createElement("div");
	const inner = document.createElement("div");
	outer.appendChild(inner);
	root.appendChild(outer);
	rect(outer, r);
	return { outer, inner };
}

function vars(inner: HTMLElement) {
	return {
		x: inner.style.getPropertyValue("--ft-mf-x"),
		y: inner.style.getPropertyValue("--ft-mf-y"),
		r: inner.style.getPropertyValue("--ft-mf-r"),
	};
}

function num(v: string) {
	return Number.parseFloat(v);
}

describe("createMagneticFieldCore", () => {
	let root: HTMLElement;
	let core: MagneticFieldCore | null = null;

	beforeEach(() => {
		frames = [];
		now = 1000;
		vi.spyOn(performance, "now").mockImplementation(() => now);
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			const id = nextId++;
			frames.push({ id, cb });
			return id;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			frames = frames.filter((f) => f.id !== id);
		});
		root = document.createElement("div");
		document.body.appendChild(root);
		// The field's padding box starts at client (50, 40).
		rect(root, { left: 50, top: 40, width: 600, height: 400 });
	});

	afterEach(() => {
		core?.destroy();
		core = null;
		root.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("writes zeros on register and schedules nothing without a magnet", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		expect(vars(inner)).toEqual({ x: "0.00px", y: "0.00px", r: "0.00deg" });
		expect(frames).toHaveLength(0);
		expect(core.active).toBe(false);
	});

	it("pulls toward a manual magnet in field-local px and converges on itemTarget", () => {
		const onActiveChange = vi.fn();
		core = createMagneticFieldCore(root, { onActiveChange });
		// Local rect = RECT (client 150,140 minus origin 50,40).
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		expect(frames).toHaveLength(1);
		flushFrame();
		// Moving: the inner is promoted to its own layer.
		expect(inner.style.willChange).toBe("transform");
		runUntilIdle();
		const v = vars(inner);
		expect(num(v.x)).toBeCloseTo(17.49, 2);
		expect(num(v.y)).toBeCloseTo(10.49, 2);
		expect(num(v.r)).toBeCloseTo(-5.69, 2);
		expect(core.active).toBe(true);
		expect(onActiveChange).toHaveBeenCalledTimes(1);
		expect(onActiveChange).toHaveBeenLastCalledWith(true);
		// Holding still: the loop sleeps but the field stays active, and the
		// settled item gives its compositor layer back.
		expect(frames).toHaveLength(0);
		expect(inner.style.willChange).toBe("");
	});

	it("springs back and sleeps when the magnet leaves", () => {
		const onActiveChange = vi.fn();
		core = createMagneticFieldCore(root, { onActiveChange });
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		runUntilIdle();
		core.clearSource();
		const n = runUntilIdle();
		expect(n).toBeLessThan(60);
		expect(vars(inner)).toEqual({ x: "0.00px", y: "0.00px", r: "0.00deg" });
		expect(core.active).toBe(false);
		expect(onActiveChange.mock.calls).toEqual([[true], [false]]);
		expect(inner.style.willChange).toBe("");
		expect(frames).toHaveLength(0);
	});

	it("converts client coordinates with the padding-box origin (border included)", () => {
		Object.defineProperty(root, "clientLeft", { value: 4, configurable: true });
		Object.defineProperty(root, "clientTop", { value: 6, configurable: true });
		core = createMagneticFieldCore(root);
		// Local rect = client - (54, 46).
		const { inner, outer } = makeItem(root, { left: 154, top: 146, width: 80, height: 24 });
		core.register(outer, inner);
		core.setClientSource(220 + 54, 160 + 46);
		runUntilIdle();
		expect(num(vars(inner).x)).toBeCloseTo(17.49, 2);
		expect(num(vars(inner).y)).toBeCloseTo(10.49, 2);
	});

	it("gives priority puck > manual > pointer", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setClientSource(50 + 60, 40 + 112); // pointer on the left
		runUntilIdle();
		expect(num(vars(inner).x)).toBeLessThan(0);
		core.setSource({ x: 220, y: 112 }, "manual"); // manual on the right wins
		runUntilIdle();
		expect(num(vars(inner).x)).toBeGreaterThan(0);
		core.setSource({ x: 140, y: 30 }, "puck"); // puck above wins
		runUntilIdle();
		expect(num(vars(inner).x)).toBeCloseTo(0, 2);
		expect(num(vars(inner).y)).toBeLessThan(0);
		core.setSource(null, "puck");
		runUntilIdle();
		expect(num(vars(inner).x)).toBeGreaterThan(0);
		core.clearSource("manual");
		runUntilIdle();
		expect(num(vars(inner).x)).toBeLessThan(0);
	});

	it("moves lighter items further, per item options", () => {
		core = createMagneticFieldCore(root);
		const a = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		const b = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(a.outer, a.inner, { mass: 0.6 });
		core.register(b.outer, b.inner, { mass: 2.5 });
		core.setSource({ x: 300, y: 200 });
		runUntilIdle();
		expect(num(vars(a.inner).x)).toBeCloseTo(10.08, 2);
		expect(num(vars(b.inner).x)).toBeCloseTo(2.42, 2);
		core.updateItem(b.outer, { pull: false, rotate: false });
		runUntilIdle();
		expect(vars(b.inner)).toEqual({ x: "0.00px", y: "0.00px", r: "0.00deg" });
	});

	it("measures each rect once per wake or invalidation, reads before writes", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		flushFrame();
		// Moves during a running loop reuse the rects read when it woke.
		core.setSource({ x: 225, y: 160 });
		runUntilIdle();
		const rootReads = vi.mocked(root.getBoundingClientRect).mock.calls.length;
		const itemReads = vi.mocked(outer.getBoundingClientRect).mock.calls.length;
		expect(rootReads).toBe(1);
		expect(itemReads).toBe(1);
		// A new wake reads once more.
		core.setSource({ x: 230, y: 160 });
		runUntilIdle();
		expect(vi.mocked(outer.getBoundingClientRect).mock.calls.length).toBe(2);
		const held = vars(inner);
		// A scroll moved the field: the next frame re-reads both.
		rect(root, { left: 50, top: -60, width: 600, height: 400 });
		rect(outer, { left: 150, top: 40, width: 80, height: 24 });
		core.invalidate();
		expect(frames).toHaveLength(1);
		runUntilIdle();
		expect(vi.mocked(root.getBoundingClientRect)).toHaveBeenCalled();
		// Local geometry unchanged: same target, nothing moved.
		expect(vi.mocked(outer.getBoundingClientRect).mock.calls.length).toBe(3);
		expect(vars(inner)).toEqual(held);
	});

	it("picks up a position-only layout move on the next wake", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner, { rotate: false });
		core.setSource({ x: 140, y: 30 }); // straight above
		runUntilIdle();
		expect(num(vars(inner).y)).toBeLessThan(0);
		// Reordered below the magnet at the same size: no ResizeObserver entry.
		rect(outer, { left: 150, top: 20, width: 80, height: 24 });
		core.setSource({ x: 140, y: 31 });
		runUntilIdle();
		expect(num(vars(inner).y)).toBeGreaterThan(0);
	});

	it("measures in a scrolling root's content space, where a puck lives", () => {
		Object.defineProperty(root, "scrollTop", { value: 100, configurable: true });
		core = createMagneticFieldCore(root);
		// Scrolled 100 px: client top 140 is content y 200.
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 260 });
		runUntilIdle();
		expect(num(vars(inner).x)).toBeCloseTo(17.49, 2);
		expect(num(vars(inner).y)).toBeCloseTo(10.49, 2);
		// A client point maps into the same space.
		core.clearSource();
		runUntilIdle();
		core.setClientSource(50 + 220, 40 + 160);
		runUntilIdle();
		expect(num(vars(inner).x)).toBeCloseTo(17.49, 2);
		expect(num(vars(inner).y)).toBeCloseTo(10.49, 2);
	});

	it("does not wake for a pointer shadowed by a held puck", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 112 }, "puck");
		runUntilIdle();
		expect(core.active).toBe(true);
		core.setClientSource(50 + 60, 40 + 112);
		core.setClientSource(50 + 70, 40 + 112);
		expect(frames).toHaveLength(0);
		expect(num(vars(inner).x)).toBeGreaterThan(0);
		// The puck lets go: the stored pointer takes over.
		core.setSource(null, "puck");
		runUntilIdle();
		expect(num(vars(inner).x)).toBeLessThan(0);
	});

	it("re-targets a client source after a scroll with a still pointer", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setClientSource(50 + 140, 40 + 30); // straight above
		runUntilIdle();
		expect(num(vars(inner).y)).toBeLessThan(0);
		// The page scrolls 100 px down: the field and item move up, the pointer stays.
		rect(root, { left: 50, top: -60, width: 600, height: 400 });
		rect(outer, { left: 150, top: 40, width: 80, height: 24 });
		core.invalidate();
		runUntilIdle();
		// Pointer now 10 px below the item's top in local px (70 - (-60) = 130 local y).
		expect(num(vars(inner).y)).toBeGreaterThan(0);
	});

	it("invalidate does not wake an idle field", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.invalidate();
		expect(frames).toHaveLength(0);
	});

	it("clamps the first frame and long frames", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner, { rotate: false });
		core.setSource({ x: 140, y: 30 }, "manual");
		flushFrame(5000); // a background tab: advances 1/60 s, not 5 s
		const first = num(vars(inner).y);
		expect(first).toBeLessThan(0);
		expect(first).toBeGreaterThan(-3);
		flushFrame(5000); // advances 1/30 s
		expect(num(vars(inner).y)).toBeGreaterThan(-8);
	});

	it("disabled springs back without snapping, then ignores sources", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		runUntilIdle();
		core.update({ disabled: true });
		flushFrame();
		const mid = num(vars(inner).x);
		expect(mid).toBeGreaterThan(5);
		expect(mid).toBeLessThan(17.49);
		runUntilIdle();
		expect(vars(inner).x).toBe("0.00px");
		core.setSource({ x: 230, y: 160 });
		runUntilIdle();
		expect(vars(inner).x).toBe("0.00px");
		expect(core.active).toBe(false);
	});

	it("reduced motion snaps to rest and schedules no frame", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		runFrames(5);
		expect(num(vars(inner).x)).toBeGreaterThan(0);
		core.update({ reducedMotion: true });
		expect(frames).toHaveLength(0);
		expect(vars(inner)).toEqual({ x: "0.00px", y: "0.00px", r: "0.00deg" });
		expect(core.active).toBe(false);
		core.setSource({ x: 230, y: 160 });
		expect(frames).toHaveLength(0);
		// Back on: the held magnet applies again.
		core.update({ reducedMotion: false });
		expect(frames).toHaveLength(1);
		runUntilIdle();
		expect(num(vars(inner).x)).toBeGreaterThan(0);
	});

	it("starting under reduced motion never schedules", () => {
		core = createMagneticFieldCore(root, { reducedMotion: true });
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		expect(frames).toHaveLength(0);
		expect(vars(inner).x).toBe("0.00px");
	});

	it("keeps position and velocity across a spring change", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		runFrames(4);
		const before = num(vars(inner).x);
		core.update({ spring: MAGNETIC_FIELD_SPRINGS.soft });
		flushFrame();
		const after = num(vars(inner).x);
		expect(after).toBeGreaterThan(before);
	});

	it("ignores no-op updates", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		core.setSource({ x: 220, y: 160 });
		runUntilIdle();
		core.update({ radius: 220, spring: { ...MAGNETIC_FIELD_SPRINGS.default } });
		core.setSource({ x: 220, y: 160 });
		expect(frames).toHaveLength(0);
	});

	it("unregister resets the item; destroy cancels, resets and goes inert", () => {
		core = createMagneticFieldCore(root);
		const a = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		const b = makeItem(root, { left: 150, top: 200, width: 80, height: 24 });
		const off = core.register(a.outer, a.inner);
		core.register(b.outer, b.inner);
		core.setSource({ x: 220, y: 160 });
		runFrames(3);
		off();
		expect(vars(a.inner)).toEqual({ x: "0.00px", y: "0.00px", r: "0.00deg" });
		expect(num(vars(b.inner).x)).not.toBe(0);
		core.destroy();
		expect(frames).toHaveLength(0);
		expect(vars(b.inner)).toEqual({ x: "0.00px", y: "0.00px", r: "0.00deg" });
		expect(b.inner.style.willChange).toBe("");
		core.setSource({ x: 230, y: 160 });
		expect(frames).toHaveLength(0);
		expect(core.active).toBe(false);
	});

	it("clears active when the only engaged item unregisters while the loop sleeps", () => {
		const onActiveChange = vi.fn();
		core = createMagneticFieldCore(root, { onActiveChange });
		const near = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		const far = makeItem(root, { left: 1500, top: 1400, width: 80, height: 24 });
		const off = core.register(near.outer, near.inner);
		core.register(far.outer, far.inner);
		core.setSource({ x: 220, y: 160 });
		runUntilIdle();
		expect(core.active).toBe(true);
		expect(frames).toHaveLength(0);
		off();
		expect(core.active).toBe(false);
		expect(onActiveChange.mock.calls).toEqual([[true], [false]]);
	});

	it("disconnects its ResizeObserver on destroy", () => {
		const observe = vi.fn();
		const unobserve = vi.fn();
		const disconnect = vi.fn();
		let callback: (() => void) | null = null;
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor(cb: () => void) {
					callback = cb;
				}
				observe = observe;
				unobserve = unobserve;
				disconnect = disconnect;
			}
		);
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		const off = core.register(outer, inner);
		expect(observe).toHaveBeenCalledWith(root);
		expect(observe).toHaveBeenCalledWith(outer);
		core.setSource({ x: 220, y: 160 });
		runUntilIdle();
		// The item grew: the observer marks it stale and the next frame re-measures.
		rect(outer, { left: 150, top: 140, width: 160, height: 24 });
		(callback as unknown as () => void)();
		expect(frames).toHaveLength(1);
		runUntilIdle();
		off();
		expect(unobserve).toHaveBeenCalledWith(outer);
		core.destroy();
		expect(disconnect).toHaveBeenCalled();
	});

	it("does not reach browser globals at import or without rAF", async () => {
		vi.stubGlobal("requestAnimationFrame", undefined);
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		expect(() => core!.setSource({ x: 220, y: 160 })).not.toThrow();
	});
	it("skips the wake for pointer moves beyond every item's reach while the field rests", () => {
		core = createMagneticFieldCore(root);
		const { inner, outer } = makeItem(root, { left: 150, top: 140, width: 80, height: 24 });
		core.register(outer, inner);
		// A first move wakes once to measure the root and the item.
		core.setClientSource(1500, 140);
		expect(frames).toHaveLength(1);
		runUntilIdle();
		expect(core.active).toBe(false);

		// Far away (more than 2 × radius from the item): nothing to schedule.
		core.setClientSource(1400, 150);
		core.setClientSource(1300, 160);
		expect(frames).toHaveLength(0);

		// Within reach again: the loop wakes and the item reacts.
		core.setClientSource(300, 160);
		expect(frames).toHaveLength(1);
		runUntilIdle();
		expect(num(vars(inner).r)).not.toBe(0);

		// After a scroll the cached rects are stale, so a far move wakes once more.
		core.clearSource("pointer");
		runUntilIdle();
		core.invalidate();
		core.setClientSource(1500, 140);
		expect(frames).toHaveLength(1);
	});
});

describe("createMagneticFieldHub", () => {
	function fakeCore() {
		return {
			register: vi.fn(() => vi.fn()),
			updateItem: vi.fn(),
			setSource: vi.fn(),
			setClientSource: vi.fn(),
			clearSource: vi.fn(),
			update: vi.fn(),
			invalidate: vi.fn(),
			active: false,
			destroy: vi.fn(),
		};
	}

	it("buffers items and sources until a core attaches, then replays them", () => {
		const hub = createMagneticFieldHub();
		const outer = document.createElement("div");
		const inner = document.createElement("div");
		hub.register(outer, inner, { mass: 2 });
		hub.updateItem(outer, { rotate: false });
		hub.setSource({ x: 1, y: 2 }, "puck");
		hub.setSource({ x: 3, y: 4 }, "manual");
		hub.setSource(null, "manual");
		const core = fakeCore();
		hub.attach(core);
		expect(core.register).toHaveBeenCalledWith(outer, inner, { mass: 2, rotate: false });
		expect(core.setSource).toHaveBeenCalledTimes(1);
		expect(core.setSource).toHaveBeenCalledWith({ x: 1, y: 2 }, "puck");
	});

	it("forwards live once attached, and unregisters from the core", () => {
		const hub = createMagneticFieldHub();
		const core = fakeCore();
		hub.attach(core);
		const outer = document.createElement("div");
		const inner = document.createElement("div");
		const off = hub.register(outer, inner);
		const unregister = core.register.mock.results[0].value as ReturnType<typeof vi.fn>;
		hub.updateItem(outer, { mass: 3 });
		expect(core.updateItem).toHaveBeenCalledWith(outer, { mass: 3 });
		hub.setSource({ x: 5, y: 6 }, "manual");
		expect(core.setSource).toHaveBeenCalledWith({ x: 5, y: 6 }, "manual");
		off();
		expect(unregister).toHaveBeenCalledTimes(1);
		off();
		expect(unregister).toHaveBeenCalledTimes(1);
	});

	it("keeps the buffer across detach/attach (a strict-mode remount)", () => {
		const hub = createMagneticFieldHub();
		const first = fakeCore();
		hub.attach(first);
		const outer = document.createElement("div");
		const inner = document.createElement("div");
		hub.register(outer, inner, { mass: 0.6 });
		hub.setSource({ x: 7, y: 8 }, "puck");
		const firstUnregister = first.register.mock.results[0].value as ReturnType<typeof vi.fn>;
		hub.detach();
		expect(firstUnregister).toHaveBeenCalledTimes(1);
		const second = fakeCore();
		hub.attach(second);
		expect(second.register).toHaveBeenCalledWith(outer, inner, { mass: 0.6 });
		expect(second.setSource).toHaveBeenCalledWith({ x: 7, y: 8 }, "puck");
	});

	it("works end to end with a real core", () => {
		frames = [];
		vi.spyOn(performance, "now").mockImplementation(() => now);
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push({ id: nextId, cb });
			return nextId++;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {});
		const root = document.createElement("div");
		rect(root, { left: 0, top: 0, width: 600, height: 400 });
		const hub = createMagneticFieldHub();
		const outer = document.createElement("div");
		const inner = document.createElement("div");
		rect(outer, { left: 100, top: 100, width: 80, height: 24 });
		hub.register(outer, inner);
		hub.setSource({ x: 220, y: 160 }, "puck");
		const core = createMagneticFieldCore(root);
		hub.attach(core);
		runUntilIdle();
		expect(Number.parseFloat(inner.style.getPropertyValue("--ft-mf-x"))).toBeCloseTo(17.49, 2);
		hub.detach();
		core.destroy();
		expect(inner.style.getPropertyValue("--ft-mf-x")).toBe("0.00px");
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});
});
