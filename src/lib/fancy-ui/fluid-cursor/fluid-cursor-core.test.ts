import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createFluidCursor,
	type FluidCursorInitOptions,
	type FluidCursorLiveOptions,
} from "./fluid-cursor-core.js";
import { CLICK_PEAK, scaleRadiusForContainer, type FluidCursorHandle } from "./fluid-shared.js";

/**
 * The defaults the Svelte wrapper declares. The core deliberately takes every
 * simulation option as required, so the tests spell the public defaults out
 * once here. Mount-only keys live on `FluidCursorInitOptions`, the five
 * re-readable ones on `FluidCursorLiveOptions`; `createFluidCursor` takes the
 * intersection, which is what this literal has to satisfy.
 */
const defaults: FluidCursorInitOptions & FluidCursorLiveOptions = {
	simResolution: 128,
	dyeResolution: 1440,
	captureResolution: 512,
	densityDissipation: 3.5,
	velocityDissipation: 2,
	pressure: 0.1,
	pressureIterations: 20,
	curl: 3,
	splatRadius: 0.2,
	splatForce: 6000,
	shading: true,
	colorUpdateSpeed: 10,
	backColor: { r: 0.5, g: 0, b: 0 },
	transparent: true,
	colorIntensity: 0.15,
	autoSplat: false,
	autoSplatInterval: 1500,
	interactive: true,
	pauseWhenHidden: true,
	splatOnMount: false,
	allowMultiple: false,
	contained: true,
	hdr: false,
	hdrBoost: 1.5,
	dither: false,
	ditherPixelSize: 3,
	ditherLevels: 4,
};

/** Uniform names the stub context reports for every program. */
const UNIFORM_NAMES = [
	"uTexture",
	"texelSize",
	"value",
	"uTarget",
	"aspectRatio",
	"color",
	"point",
	"radius",
	"saturate",
	"uVelocity",
	"uSource",
	"dyeTexelSize",
	"dt",
	"dissipation",
	"uCurl",
	"curl",
	"uPressure",
	"uDivergence",
	"uDitherPixel",
	"uDitherLevels",
];

interface GlCall {
	name: string;
	args: unknown[];
}

interface FakeGl {
	gl: unknown;
	calls: GlCall[];
	loseContext: ReturnType<typeof vi.fn>;
}

/**
 * Minimal WebGL2 stand-in: every `create*` hands back a truthy handle, every
 * other entry point records its call, and `getUniformLocation` returns the
 * uniform's own name so the recorded `uniform*` calls are readable. Constants
 * are minted on demand (stable per name), which is all the engine needs — it
 * only ever compares them with each other.
 */
function createFakeGl(): FakeGl {
	const calls: GlCall[] = [];
	const constants = new Map<string, number>();
	let nextConstant = 1000;
	const constantFor = (name: string) => {
		let value = constants.get(name);
		if (value === undefined) {
			value = nextConstant++;
			constants.set(name, value);
		}
		return value;
	};
	const loseContext = vi.fn();

	const target: Record<string, unknown> = {
		drawingBufferWidth: 300,
		drawingBufferHeight: 150,
		getExtension: (name: string) =>
			name === "WEBGL_lose_context" ? { loseContext } : { stub: name },
		getProgramParameter: () => UNIFORM_NAMES.length,
		getActiveUniform: (_program: unknown, index: number) => ({ name: UNIFORM_NAMES[index] }),
		getUniformLocation: (_program: unknown, name: string) => name,
		checkFramebufferStatus: () => constantFor("FRAMEBUFFER_COMPLETE"),
		createTexture: () => ({ kind: "texture" }),
		createFramebuffer: () => ({ kind: "framebuffer" }),
		createBuffer: () => ({ kind: "buffer" }),
		createShader: () => ({ kind: "shader" }),
		createProgram: () => ({ kind: "program" }),
	};

	const gl = new Proxy(target, {
		has(t, prop) {
			// `"drawBuffers" in gl` is how the engine detects WebGL2.
			return prop === "drawBuffers" || prop in t;
		},
		get(t, prop) {
			if (typeof prop !== "string") return Reflect.get(t, prop);
			if (prop in t) return t[prop];
			if (/^[A-Z][A-Z0-9_]*$/.test(prop)) return constantFor(prop);
			return (...args: unknown[]) => {
				calls.push({ name: prop, args });
			};
		},
	});

	return { gl, calls, loseContext };
}

function createFakeCanvas(gl: unknown): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	// jsdom reports 0 for a detached element; a real size keeps the pixel math
	// (and therefore the recorded uniforms) deterministic.
	Object.defineProperty(canvas, "clientWidth", { value: 300, configurable: true });
	Object.defineProperty(canvas, "clientHeight", { value: 150, configurable: true });
	canvas.getContext = vi.fn((type: string) => (type === "webgl2" ? gl : null)) as never;
	return canvas;
}

/** All recorded calls to `gl.<name>` whose first argument is `uniform`. */
function uniformCalls(calls: GlCall[], name: string, uniform: string) {
	return calls.filter((call) => call.name === name && call.args[0] === uniform);
}

describe("createFluidCursor", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("without a renderer", () => {
		it("returns null when no WebGL context can be obtained", () => {
			const canvas = document.createElement("canvas");
			// jsdom has no WebGL: getContext already returns null, made explicit here.
			canvas.getContext = vi.fn(() => null) as never;
			expect(createFluidCursor({ canvas }, { ...defaults })).toBeNull();
		});

		it("still reports the inert handle through onReady", () => {
			const canvas = document.createElement("canvas");
			canvas.getContext = vi.fn(() => null) as never;
			const onReady = vi.fn();
			expect(createFluidCursor({ canvas }, { ...defaults, onReady })).toBeNull();
			expect(onReady).toHaveBeenCalledTimes(1);
			const handle = onReady.mock.calls[0]![0] as FluidCursorHandle;
			expect(handle.renderLevel).toBe("none");
			expect(() => {
				handle.moveTo(0.5, 0.5);
				handle.penUp();
				handle.burst(0.5, 0.5, 1, 1, { r: 1, g: 0, b: 0 });
			}).not.toThrow();
		});

		it("registers nothing: no listener survives a failed start", () => {
			const canvas = document.createElement("canvas");
			canvas.getContext = vi.fn(() => null) as never;
			const addSpy = vi.spyOn(window, "addEventListener");
			createFluidCursor({ canvas }, { ...defaults });
			expect(addSpy).not.toHaveBeenCalled();
		});
	});

	describe("engine contract", () => {
		let fake: FakeGl;
		let canvas: HTMLCanvasElement;
		let engine: ReturnType<typeof createFluidCursor>;

		beforeEach(() => {
			fake = createFakeGl();
			canvas = createFakeCanvas(fake.gl);
		});

		afterEach(() => {
			engine?.destroy();
		});

		it("returns an engine and a live handle when a context is available", () => {
			const onReady = vi.fn();
			engine = createFluidCursor({ canvas }, { ...defaults, onReady });
			expect(engine).not.toBeNull();
			expect(onReady).toHaveBeenCalledTimes(1);
			expect((onReady.mock.calls[0]![0] as FluidCursorHandle).renderLevel).toBe("webgl-sdr");
		});

		it("setOptions with no keys changes nothing and issues no GL call", () => {
			engine = createFluidCursor({ canvas }, { ...defaults });
			const before = fake.calls.length;
			expect(() => engine!.setOptions({})).not.toThrow();
			expect(fake.calls.length).toBe(before);
		});

		it("destroy cancels the pending frame", () => {
			let frameId = 0;
			vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => ++frameId);
			const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
			engine = createFluidCursor({ canvas }, { ...defaults });
			expect(frameId).toBeGreaterThan(0);
			engine!.destroy();
			expect(cancel).toHaveBeenCalledWith(frameId);
		});

		it("destroy is idempotent", () => {
			const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
			engine = createFluidCursor({ canvas }, { ...defaults });
			engine!.destroy();
			const afterFirst = cancel.mock.calls.length;
			expect(() => engine!.destroy()).not.toThrow();
			expect(cancel.mock.calls.length).toBe(afterFirst);
			// The context is dropped exactly once.
			expect(fake.loseContext).toHaveBeenCalledTimes(1);
		});

		it("destroy removes the pointer listeners it added", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");
			engine = createFluidCursor({ canvas }, { ...defaults });
			engine!.destroy();
			const removed = removeSpy.mock.calls.map(([event]) => event);
			for (const event of ["mousedown", "mouseup", "mousemove", "touchstart", "touchmove"]) {
				expect(removed).toContain(event);
			}
		});

		it("resize is safe before and after destroy", () => {
			engine = createFluidCursor({ canvas }, { ...defaults });
			expect(() => engine!.resize()).not.toThrow();
			engine!.destroy();
			const after = fake.calls.length;
			expect(() => engine!.resize()).not.toThrow();
			// Inert once the GL resources are gone.
			expect(fake.calls.length).toBe(after);
		});

		it("keeps the singleton registry per engine, so engines never evict each other", () => {
			// The component declared `activeInstance` / `mountCounter` in its
			// instance script, which Svelte compiles into the instance function:
			// every mounted <FluidCursor/> owned its own pair, so the eviction
			// branch was unreachable across instances. Module-level state here
			// would change that — and diverge from the React port, which holds
			// the same registry in a ref.
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			const first = createFluidCursor({ canvas }, { ...defaults, dev: true });
			const secondFake = createFakeGl();
			engine = createFluidCursor(
				{ canvas: createFakeCanvas(secondFake.gl) },
				{ ...defaults, allowMultiple: false, dev: true }
			);
			expect(fake.loseContext).not.toHaveBeenCalled();
			expect(secondFake.loseContext).not.toHaveBeenCalled();
			expect(warn).not.toHaveBeenCalled();
			first?.destroy();
		});

		it("allowMultiple keeps both engines alive", () => {
			const first = createFluidCursor({ canvas }, { ...defaults, allowMultiple: true });
			const secondFake = createFakeGl();
			engine = createFluidCursor(
				{ canvas: createFakeCanvas(secondFake.gl) },
				{ ...defaults, allowMultiple: true }
			);
			expect(fake.loseContext).not.toHaveBeenCalled();
			first?.destroy();
		});
	});

	/**
	 * The component never declared an `$effect`, but in runes mode a
	 * destructured prop is a getter: every closure that outlived mount read the
	 * current value on each call. These five were read that way, so the engine
	 * has to keep re-reading them too.
	 */
	describe("live options", () => {
		let fake: FakeGl;
		let canvas: HTMLCanvasElement;
		let engine: ReturnType<typeof createFluidCursor>;

		beforeEach(() => {
			fake = createFakeGl();
			canvas = createFakeCanvas(fake.gl);
		});

		afterEach(() => {
			engine?.destroy();
		});

		/** The dye pass's `color` uniform for the click that follows. */
		function clickDye() {
			window.dispatchEvent(new MouseEvent("mousedown", { clientX: 30, clientY: 30 }));
			const colors = uniformCalls(fake.calls, "uniform3f", "color");
			// The velocity pass writes first, the dye pass second.
			return colors[1]!.args.slice(1);
		}

		it("fluidColor: the next splat uses the new hex", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, fluidColor: "#ffffff" },
				() => 0.25
			);
			engine!.setOptions({ fluidColor: "#ff0000" });
			expect(clickDye()).toEqual([CLICK_PEAK, 0, 0]);
		});

		it("fluidColor: passing undefined clears the override, as the getter did", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, fluidColor: "#ff0000" },
				() => 0.5
			);
			engine!.setOptions({ fluidColor: undefined });
			// Back on the hue cycle: HSVtoRGB(0.5, 1, 1) is cyan, which the red
			// override could never produce.
			expect(clickDye()).toEqual([0, CLICK_PEAK, CLICK_PEAK]);
		});

		it("fluidColors: the next splat walks the new palette", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, fluidColors: ["#ffffff"] },
				() => 0.25
			);
			engine!.setOptions({ fluidColors: ["#00ff00"] });
			expect(clickDye()).toEqual([0, CLICK_PEAK, 0]);
		});

		it("contained: the splat radius picks up the container correction", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, splatRadius: 0.2 },
				() => 0.25
			);
			engine!.setOptions({ contained: true });
			window.dispatchEvent(new MouseEvent("mousedown", { clientX: 30, clientY: 30 }));
			const radius = uniformCalls(fake.calls, "uniform1f", "radius");
			expect(radius).toHaveLength(1);
			// Same 0.004 as the uncontained case, then scaled for the 150px box.
			expect(radius[0]!.args[1]).toBeCloseTo(
				scaleRadiusForContainer(0.004, 150, window.innerHeight),
				10
			);
		});

		it("interactive: teardown honours the current value, not the mount one", () => {
			// Faithful to the component, whose `cleanup()` re-read the prop: the
			// listeners registered at mount are only removed while it is true.
			const removeSpy = vi.spyOn(window, "removeEventListener");
			engine = createFluidCursor({ canvas }, { ...defaults, interactive: true });
			engine!.setOptions({ interactive: false });
			engine!.destroy();
			expect(removeSpy.mock.calls.map(([event]) => event)).not.toContain("mousedown");
		});

		it("allowMultiple: accepted without touching the GPU", () => {
			engine = createFluidCursor({ canvas }, { ...defaults });
			const before = fake.calls.length;
			expect(() => engine!.setOptions({ allowMultiple: true })).not.toThrow();
			expect(fake.calls.length).toBe(before);
		});

		it("never recreates anything: a live key rebuilds no program and no FBO", () => {
			engine = createFluidCursor({ canvas }, { ...defaults, contained: false });
			const built = (name: string) => fake.calls.filter((call) => call.name === name).length;
			const programs = built("linkProgram");
			const framebuffers = built("framebufferTexture2D");
			expect(programs).toBeGreaterThan(0);
			expect(framebuffers).toBeGreaterThan(0);
			engine!.setOptions({
				contained: true,
				fluidColor: "#123456",
				fluidColors: ["#123456"],
				interactive: false,
				allowMultiple: true,
			});
			expect(built("linkProgram")).toBe(programs);
			expect(built("framebufferTexture2D")).toBe(framebuffers);
		});
	});

	describe("preserved invariants", () => {
		let fake: FakeGl;
		let canvas: HTMLCanvasElement;
		let engine: ReturnType<typeof createFluidCursor>;

		beforeEach(() => {
			fake = createFakeGl();
			canvas = createFakeCanvas(fake.gl);
		});

		afterEach(() => {
			engine?.destroy();
		});

		it("splats at splatRadius / 100, aspect-corrected", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, splatRadius: 0.2 },
				() => 0.25
			);
			window.dispatchEvent(new MouseEvent("mousedown", { clientX: 30, clientY: 30 }));
			const radius = uniformCalls(fake.calls, "uniform1f", "radius");
			expect(radius).toHaveLength(1);
			// 0.2 / 100, then × the 300×150 aspect ratio.
			expect(radius[0]!.args[1]).toBeCloseTo(0.004, 10);
			const point = uniformCalls(fake.calls, "uniform2f", "point");
			expect(point[0]!.args.slice(1)).toEqual([0.1, 0.8]);
		});

		it("a click peaks at CLICK_PEAK and uses the saturating splat mode", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, fluidColor: "#ffffff" },
				() => 0.25
			);
			window.dispatchEvent(new MouseEvent("mousedown", { clientX: 30, clientY: 30 }));
			const colors = uniformCalls(fake.calls, "uniform3f", "color");
			// First the velocity pass (dx, dy, 0), then the dye pass (r, g, b).
			expect(colors).toHaveLength(2);
			expect(colors[0]!.args.slice(1)).toEqual([10 * (0.25 - 0.5), 30 * (0.25 - 0.5), 0]);
			expect(colors[1]!.args.slice(1)).toEqual([CLICK_PEAK, CLICK_PEAK, CLICK_PEAK]);
			const saturate = uniformCalls(fake.calls, "uniform1f", "saturate");
			expect(saturate.map((call) => call.args[1])).toEqual([0, 1]);
		});

		it("clamps colorIntensity into [0,1] so the click peak is unchanged", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, contained: false, fluidColor: "#ffffff", colorIntensity: 5 },
				() => 0.25
			);
			window.dispatchEvent(new MouseEvent("mousedown", { clientX: 30, clientY: 30 }));
			const colors = uniformCalls(fake.calls, "uniform3f", "color");
			expect(colors[1]!.args.slice(1)).toEqual([CLICK_PEAK, CLICK_PEAK, CLICK_PEAK]);
		});

		it("caps the simulation timestep at 0.016666 s", () => {
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
				frames.push(cb);
				return frames.length;
			});
			let now = 1_000_000;
			vi.spyOn(Date, "now").mockImplementation(() => now);
			engine = createFluidCursor({ canvas }, { ...defaults });
			expect(frames).toHaveLength(1);
			fake.calls.length = 0;
			// A one-second stall must not be integrated as a one-second step.
			now += 1000;
			frames[0]!(0);
			const dt = uniformCalls(fake.calls, "uniform1f", "dt");
			expect(dt.length).toBeGreaterThan(0);
			for (const call of dt) expect(call.args[1]).toBe(0.016666);
		});

		it("runs exactly pressureIterations Jacobi passes per frame", () => {
			const frames: FrameRequestCallback[] = [];
			vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
				frames.push(cb);
				return frames.length;
			});
			engine = createFluidCursor({ canvas }, { ...defaults, pressureIterations: 3 });
			fake.calls.length = 0;
			frames[0]!(0);
			// 3 Jacobi iterations + the single read by the gradient-subtract pass.
			expect(uniformCalls(fake.calls, "uniform1i", "uPressure")).toHaveLength(4);
		});

		it("clamps the dither uniforms to their documented ranges", () => {
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, dither: true, ditherPixelSize: 0, ditherLevels: 100 }
			);
			const pixel = uniformCalls(fake.calls, "uniform1f", "uDitherPixel");
			const levels = uniformCalls(fake.calls, "uniform1f", "uDitherLevels");
			// Pixel size floors at 1 CSS px (× devicePixelRatio, 1 under jsdom).
			expect(pixel[0]!.args[1]).toBe(1);
			expect(levels[0]!.args[1]).toBe(16);
		});

		it("auto-splats on the configured interval, driven by the injected random", () => {
			vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
			engine = createFluidCursor(
				{ canvas },
				{ ...defaults, autoSplat: true, autoSplatInterval: 1500, fluidColor: "#ffffff" },
				() => 0.25
			);
			fake.calls.length = 0;
			vi.advanceTimersByTime(1499);
			expect(uniformCalls(fake.calls, "uniform2f", "point")).toHaveLength(0);
			vi.advanceTimersByTime(1);
			const point = uniformCalls(fake.calls, "uniform2f", "point");
			expect(point).toHaveLength(1);
			expect(point[0]!.args.slice(1)).toEqual([0.25, 0.25]);
			const colors = uniformCalls(fake.calls, "uniform3f", "color");
			// Velocity pass: ±200 around the centre of the random range.
			expect(colors[0]!.args.slice(1)).toEqual([(0.25 - 0.5) * 200, (0.25 - 0.5) * 200, 0]);
			// Dye pass: white × the 0.15 default intensity, no click boost.
			expect(colors[1]!.args.slice(1)).toEqual([0.15, 0.15, 0.15]);
		});

		it("never registers pointer listeners when interactive is false", () => {
			const addSpy = vi.spyOn(window, "addEventListener");
			engine = createFluidCursor({ canvas }, { ...defaults, interactive: false });
			const events = addSpy.mock.calls.map(([event]) => event);
			expect(events).not.toContain("mousedown");
			expect(events).not.toContain("mousemove");
		});
	});
});
