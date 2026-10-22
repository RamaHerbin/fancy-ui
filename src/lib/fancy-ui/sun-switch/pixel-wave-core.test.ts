import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	GHOST_ATTR,
	HALO_ATTR,
	MAX_WAVE_CANVAS_PIXELS,
	LIVE_NAME,
	SHEET_ATTR,
	WAVE_ATTR,
	WAVE_CSS,
	WAVE_NAME,
	WAVE_STYLE_ID,
	ensureWaveStyles,
	firstOpaqueBackground,
	isWaving,
	pixelWave,
	supportsViewTransition,
	waveCanvasDpr,
} from "./pixel-wave-core.js";
import { EMPTY_POLYGON, type Ctx2D } from "./sun-switch-core.js";

// Manual frame queue + clock: frames run only when the test flushes them.
let queue: (() => void)[] = [];
let clock = 0;
const now = () => clock;

function flushFrame(advance: number) {
	clock += advance;
	const run = queue;
	queue = [];
	for (const cb of run) cb();
}

async function runToEnd(step = 100, max = 100) {
	for (let i = 0; i < max && queue.length; i++) flushFrame(step);
	await Promise.resolve();
	await Promise.resolve();
}

beforeEach(() => {
	queue = [];
	clock = 0;
	vi.stubGlobal("requestAnimationFrame", (cb: () => void) => queue.push(cb));
	vi.stubGlobal("cancelAnimationFrame", (id: number) => {
		queue[id - 1] = () => {};
	});
	vi.stubGlobal("innerWidth", 1280);
	vi.stubGlobal("innerHeight", 800);
});

afterEach(async () => {
	// Drain any wave a test left running: waves are module-global.
	await runToEnd(5000);
	expect(isWaving()).toBe(false);
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	delete (document as { startViewTransition?: unknown }).startViewTransition;
	delete (document.documentElement as { animate?: unknown }).animate;
	document.getElementById(WAVE_STYLE_ID)?.remove();
	document.body.innerHTML = "";
	document.body.removeAttribute("style");
});

describe("styles and detection", () => {
	it("WAVE_CSS scopes every rule to the waving attribute", () => {
		expect(WAVE_CSS).toContain(`html[${WAVE_ATTR}]::view-transition-new(root)`);
		expect(WAVE_CSS).toContain(`::view-transition-old(${WAVE_NAME})`);
		expect(WAVE_CSS).toContain(`::view-transition-old(${LIVE_NAME})`);
		expect(WAVE_CSS).toContain(EMPTY_POLYGON);
		for (const line of WAVE_CSS.split("\n")) {
			if (line.includes("::view-transition")) expect(line).toContain(`html[${WAVE_ATTR}]`);
		}
	});

	it("ensureWaveStyles injects one <style> (jsdom has no adoptedStyleSheets)", () => {
		ensureWaveStyles(document);
		ensureWaveStyles(document);
		const styles = document.querySelectorAll(`#${WAVE_STYLE_ID}`);
		expect(styles).toHaveLength(1);
		expect(styles[0]!.textContent).toBe(WAVE_CSS);
	});

	it("supportsViewTransition is a runtime check", () => {
		expect(supportsViewTransition(document)).toBe(false);
		(document as { startViewTransition?: unknown }).startViewTransition = () => {};
		expect(supportsViewTransition(document)).toBe(true);
	});

	it("waveCanvasDpr: integer 1–2, back to 1 above the pixel budget", () => {
		expect(waveCanvasDpr(1, 1280, 800)).toBe(1);
		expect(waveCanvasDpr(1.5, 1280, 800)).toBe(1);
		expect(waveCanvasDpr(2, 1280, 800)).toBe(2);
		expect(waveCanvasDpr(3, 390, 844)).toBe(2);
		expect(waveCanvasDpr(0, 100, 100)).toBe(1);
		expect(waveCanvasDpr(2, 3008, 1692)).toBe(1);
		expect(3008 * 1692 * 4).toBeGreaterThan(MAX_WAVE_CANVAS_PIXELS);
	});

	it("firstOpaqueBackground walks up to the first opaque colour", () => {
		const outer = document.createElement("div");
		outer.style.backgroundColor = "rgb(1, 2, 3)";
		const inner = document.createElement("div");
		outer.append(inner);
		document.body.append(outer);
		expect(firstOpaqueBackground(inner)).toBe("rgb(1, 2, 3)");
		expect(firstOpaqueBackground(document.body)).toBe("#fff");
	});
});

describe("reduced motion", () => {
	it("applies only: no canvas, no attribute", async () => {
		const apply = vi.fn();
		await pixelWave({ origin: { x: 10, y: 10 }, apply, reducedMotion: true, now });
		expect(apply).toHaveBeenCalledTimes(1);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		expect(isWaving()).toBe(false);
	});

	it("reads prefers-reduced-motion when not told", async () => {
		vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
		const apply = vi.fn();
		await pixelWave({ origin: { x: 10, y: 10 }, apply, now });
		expect(apply).toHaveBeenCalledTimes(1);
		expect(queue).toHaveLength(0);
	});
});

describe("sheet fallback (no view transitions)", () => {
	it("applies synchronously, sweeps for the duration and cleans up", async () => {
		const apply = vi.fn();
		const onFront = vi.fn();
		const done = pixelWave({
			origin: { x: 100, y: 60 },
			apply,
			fill: "#abcdef",
			reducedMotion: false,
			onFront,
			now,
		});
		expect(apply).toHaveBeenCalledTimes(1);
		expect(isWaving()).toBe(true);
		const canvas = document.querySelector(`[${HALO_ATTR}]`) as HTMLCanvasElement;
		expect(canvas).not.toBeNull();
		expect(canvas.hasAttribute(SHEET_ATTR)).toBe(true);
		expect(canvas.style.position).toBe("fixed");
		expect(canvas.style.pointerEvents).toBe("none");
		expect(canvas.style.zIndex).toBe("2147483647");
		// first frame painted synchronously at t = 0
		expect(onFront).toHaveBeenCalledWith(0, 0);

		flushFrame(650);
		expect(onFront).toHaveBeenLastCalledWith(expect.any(Number), 0.5);
		await runToEnd(400);
		await done;
		expect(onFront).toHaveBeenLastCalledWith(expect.closeTo(287.5678, 3), 1);
		expect(apply).toHaveBeenCalledTimes(1);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		expect(isWaving()).toBe(false);
	});

	it("paints the old-colour sheet and draws the live canvas onto it", () => {
		const ops: { x: number; y: number; w: number; h: number; style: string; clear?: true }[] = [];
		const draws: { x: number; y: number; w: number; h: number; op: string }[] = [];
		const ctx: Ctx2D & { globalCompositeOperation: string; drawImage: unknown } = {
			globalCompositeOperation: "source-over",
			drawImage(_img: unknown, x: number, y: number, w: number, h: number) {
				draws.push({ x, y, w, h, op: ctx.globalCompositeOperation });
			},
			fillStyle: "",
			globalAlpha: 1,
			fillRect(x, y, w, h) {
				ops.push({ x, y, w, h, style: String(ctx.fillStyle) });
			},
			clearRect(x, y, w, h) {
				ops.push({ x, y, w, h, style: "", clear: true });
			},
			setTransform() {},
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
		const live = document.createElement("canvas");
		vi.spyOn(live, "getBoundingClientRect").mockReturnValue({
			left: 50,
			top: 10,
			right: 155,
			bottom: 115,
			width: 105,
			height: 105,
			x: 50,
			y: 10,
			toJSON() {},
		});
		pixelWave({
			origin: { x: 102.5, y: 62.5 },
			apply: () => {},
			live,
			fill: "#abcdef",
			reducedMotion: false,
			now,
		});
		const sheet = ops.filter((o) => o.style === "#abcdef");
		expect(sheet).toHaveLength(1);
		expect(sheet[0]).toMatchObject({ x: 0, y: 0, w: 1280, h: 800 });
		// no hole around the live element any more: it is drawn on the sheet
		expect(ops.filter((o) => o.clear && o.w !== 1280)).toHaveLength(0);
		expect(draws).toEqual([{ x: 50, y: 10, w: 105, h: 105, op: "source-atop" }]);
		expect(ctx.globalCompositeOperation).toBe("source-over");
	});

	it("contained mode paints inside the scope", async () => {
		const scope = document.createElement("div");
		document.body.append(scope);
		const done = pixelWave({
			origin: { x: 20, y: 20 },
			apply: () => {},
			mode: "contained",
			scope,
			reducedMotion: false,
			now,
		});
		const canvas = scope.querySelector(`[${HALO_ATTR}]`) as HTMLCanvasElement;
		expect(canvas).not.toBeNull();
		expect(canvas.style.position).toBe("absolute");
		await runToEnd(2000);
		await done;
		expect(scope.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("contained mode keeps an inert copy of the old content outside the front", async () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const scope = document.createElement("div");
		scope.innerHTML =
			'<h3 id="t">Old title</h3><input type="radio" name="g" checked><iframe></iframe>';
		document.body.append(scope);
		Object.defineProperty(scope, "clientWidth", { value: 400 });
		Object.defineProperty(scope, "clientHeight", { value: 300 });
		const done = pixelWave({
			origin: { x: 20, y: 20 },
			apply: () => {
				scope.querySelector("h3")!.textContent = "New title";
			},
			mode: "contained",
			scope,
			fill: "#123456",
			reducedMotion: false,
			now,
		});
		const ghost = scope.querySelector(`[${GHOST_ATTR}]`) as HTMLElement;
		expect(ghost).not.toBeNull();
		expect(ghost.textContent).toBe("Old title");
		expect(ghost.hasAttribute("inert")).toBe(true);
		expect(ghost.getAttribute("aria-hidden")).toBe("true");
		expect(ghost.querySelector("[id], [name], iframe")).toBeNull();
		expect(ghost.style.position).toBe("absolute");
		expect(ghost.style.width).toBe("400px");
		expect(ghost.style.zIndex).toBe("2147483646");
		// the halo canvas (no sheet) sits above the copy
		const halo = scope.querySelector(`[${HALO_ATTR}]`) as HTMLCanvasElement;
		expect(halo.hasAttribute(SHEET_ATTR)).toBe(false);
		expect(scope.lastElementChild).toBe(halo);
		expect(ghost.style.getPropertyValue("clip-path")).toBe('path(evenodd, "M0 0H400V300H0Z")');
		flushFrame(650);
		expect(ghost.style.getPropertyValue("clip-path")).toMatch(/^path\(evenodd, "M0 0H400V300H0ZM/);
		await runToEnd(400);
		await done;
		expect(scope.querySelector(`[${GHOST_ATTR}]`)).toBeNull();
		expect(scope.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("a second call skips the running wave and applies instantly", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const p1 = pixelWave({ origin: { x: 0, y: 0 }, apply: first, reducedMotion: false, now });
		expect(isWaving()).toBe(true);
		const p2 = pixelWave({ origin: { x: 0, y: 0 }, apply: second, reducedMotion: false, now });
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(first.mock.invocationCallOrder[0]!).toBeLessThan(second.mock.invocationCallOrder[0]!);
		await Promise.all([p1, p2]);
		expect(isWaving()).toBe(false);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("never rejects when apply throws", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const done = pixelWave({
			origin: { x: 0, y: 0 },
			apply: () => {
				throw new Error("boom");
			},
			reducedMotion: false,
			duration: 0,
			now,
		});
		await expect(done).resolves.toBeUndefined();
		expect(error).toHaveBeenCalled();
		expect(isWaving()).toBe(false);
	});
});

describe("view transition path", () => {
	function stubVT() {
		let resolveReady!: () => void;
		let resolveFinished!: () => void;
		const ready = new Promise<void>((r) => (resolveReady = r));
		const finished = new Promise<void>((r) => (resolveFinished = r));
		const vt = { ready, finished, skipTransition: vi.fn(() => resolveFinished()) };
		let callback: (() => void) | null = null;
		const start = vi.fn((cb: () => void) => {
			callback = cb;
			return vt;
		});
		(document as { startViewTransition?: unknown }).startViewTransition = start;
		return {
			vt,
			start,
			runUpdate: () => callback?.(),
			resolveReady,
			resolveFinished,
		};
	}

	function stubAnimate(impl?: () => never) {
		const anims: { keyframes: Keyframe[]; options: KeyframeAnimationOptions; anim: Animation }[] =
			[];
		const animate = vi.fn((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
			if (impl) impl();
			const anim = { cancel: vi.fn(), finish: vi.fn() } as unknown as Animation;
			anims.push({ keyframes, options, anim });
			return anim;
		});
		(document.documentElement as { animate?: unknown }).animate = animate;
		return { animate, anims };
	}

	it("clips ::view-transition-new(root) per frame and cleans up", async () => {
		const { vt, start, runUpdate, resolveReady, resolveFinished } = stubVT();
		const { anims } = stubAnimate();
		const live = document.createElement("canvas");
		document.body.append(live);
		const apply = vi.fn();
		const done = pixelWave({
			origin: { x: 102.5, y: 62.5 },
			apply,
			live,
			reducedMotion: false,
			now,
		});
		expect(start).toHaveBeenCalledTimes(1);
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(true);
		expect(live.style.getPropertyValue("view-transition-name")).toBe(LIVE_NAME);
		const halo = document.querySelector(`[${HALO_ATTR}]`) as HTMLCanvasElement;
		expect(halo.style.getPropertyValue("view-transition-name")).toBe(WAVE_NAME);
		expect(halo.hasAttribute(SHEET_ATTR)).toBe(false);
		expect(document.getElementById(WAVE_STYLE_ID)).not.toBeNull();

		expect(apply).not.toHaveBeenCalled();
		runUpdate();
		expect(apply).toHaveBeenCalledTimes(1);
		resolveReady();
		await Promise.resolve();
		expect(queue).toHaveLength(1);

		flushFrame(0); // t0
		flushFrame(130); // t = 0.1: clip still empty
		expect(anims[0]!.keyframes[0]!.clipPath).toBe(EMPTY_POLYGON);
		expect(anims[0]!.options).toMatchObject({
			pseudoElement: "::view-transition-new(root)",
			fill: "forwards",
		});
		flushFrame(520); // t = 0.5
		const mid = anims.at(-1)!;
		expect(mid.keyframes[0]!.clipPath).toMatch(/^polygon\(\d/);
		expect(anims.at(-2)!.anim.cancel).toHaveBeenCalled();

		await runToEnd(400);
		expect(anims.at(-1)!.anim.finish).toHaveBeenCalled();
		expect(isWaving()).toBe(true); // waits for vt.finished
		resolveFinished();
		await done;
		expect(vt.skipTransition).not.toHaveBeenCalled();
		expect(apply).toHaveBeenCalledTimes(1);
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(false);
		expect(live.style.getPropertyValue("view-transition-name")).toBe("");
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		expect(isWaving()).toBe(false);
	});

	it("updates the running clip in place when setKeyframes exists", async () => {
		const { runUpdate, resolveReady, resolveFinished } = stubVT();
		const setKeyframes = vi.fn();
		const animate = vi.fn(
			() => ({ cancel: vi.fn(), finish: vi.fn(), effect: { setKeyframes } }) as unknown as Animation
		);
		(document.documentElement as { animate?: unknown }).animate = animate;
		const done = pixelWave({
			origin: { x: 640, y: 400 },
			apply: () => {},
			reducedMotion: false,
			now,
		});
		runUpdate();
		resolveReady();
		await Promise.resolve();
		flushFrame(0);
		for (let i = 0; i < 12; i++) flushFrame(100);
		expect(animate).toHaveBeenCalledTimes(1);
		expect(setKeyframes.mock.calls.length).toBeGreaterThan(3);
		// unchanged polygons are not re-sent
		const polys = setKeyframes.mock.calls.map((c) => (c[0] as Keyframe[])[0]!.clipPath);
		for (let i = 1; i < polys.length; i++) expect(polys[i]).not.toBe(polys[i - 1]);
		await runToEnd(400);
		resolveFinished();
		await done;
	});

	it("falls back to halo-only when the pseudo-element animation throws", async () => {
		const { vt, runUpdate, resolveReady } = stubVT();
		stubAnimate(() => {
			throw new TypeError("unsupported");
		});
		const done = pixelWave({
			origin: { x: 10, y: 10 },
			apply: () => {},
			reducedMotion: false,
			now,
		});
		runUpdate();
		resolveReady();
		await Promise.resolve();
		flushFrame(0);
		expect(vt.skipTransition).toHaveBeenCalledTimes(1);
		// the halo keeps sweeping until the end of the duration
		expect(document.querySelector(`[${HALO_ATTR}]`)).not.toBeNull();
		await runToEnd(400);
		await done;
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("re-entry runs the pending apply first, skips, then applies the new state", async () => {
		const { vt } = stubVT();
		stubAnimate();
		const order: string[] = [];
		const p1 = pixelWave({
			origin: { x: 10, y: 10 },
			apply: () => order.push("first"),
			reducedMotion: false,
			now,
		});
		const p2 = pixelWave({
			origin: { x: 10, y: 10 },
			apply: () => order.push("second"),
			reducedMotion: false,
			now,
		});
		expect(order).toEqual(["first", "second"]);
		expect(vt.skipTransition).toHaveBeenCalledTimes(1);
		await Promise.all([p1, p2]);
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(false);
		expect(isWaving()).toBe(false);
	});

	it("uses the sheet when animate() is missing", () => {
		const { start } = stubVT();
		(document.documentElement as { animate?: unknown }).animate = undefined;
		const apply = vi.fn();
		pixelWave({ origin: { x: 10, y: 10 }, apply, reducedMotion: false, now });
		expect(start).not.toHaveBeenCalled();
		expect(apply).toHaveBeenCalledTimes(1);
		expect(document.querySelector(`[${SHEET_ATTR}]`)).not.toBeNull();
	});
});
