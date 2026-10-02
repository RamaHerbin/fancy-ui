import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createLiquidText,
	measureLiquidText,
	DEFAULT_DISPLAY_FONT_SIZE,
	DIFFUSE_ITERATIONS,
	FIT_MAX_SIZE,
	FIT_MIN_SIZE,
	FIT_REFERENCE_SIZE,
	FIXED_DT,
	HEIGHT_RATIO,
	PRESSURE_ITERATIONS,
	SIM_SCALE,
	type LiquidTextLiveOptions,
} from "./liquid-text-core.js";

/**
 * The ambient test environment (src/test-setup.ts) stubs
 * HTMLCanvasElement.prototype.getContext -> null, i.e. "no WebGL, no 2D".
 * Tests that need a live engine install the fakes below and restore the
 * ambient stub afterwards.
 */

const GL_CONSTANT_NAMES = [
	"COMPILE_STATUS",
	"LINK_STATUS",
	"ACTIVE_UNIFORMS",
	"FRAGMENT_SHADER",
	"VERTEX_SHADER",
	"TEXTURE0",
	"TEXTURE_2D",
	"TEXTURE_MIN_FILTER",
	"TEXTURE_MAG_FILTER",
	"TEXTURE_WRAP_S",
	"TEXTURE_WRAP_T",
	"CLAMP_TO_EDGE",
	"NEAREST",
	"LINEAR",
	"FRAMEBUFFER",
	"COLOR_ATTACHMENT0",
	"COLOR_BUFFER_BIT",
	"FRAMEBUFFER_COMPLETE",
	"ARRAY_BUFFER",
	"ELEMENT_ARRAY_BUFFER",
	"STATIC_DRAW",
	"FLOAT",
	"TRIANGLES",
	"UNSIGNED_SHORT",
	"RGBA",
	"UNSIGNED_BYTE",
	"BLEND",
	"SRC_ALPHA",
	"ONE_MINUS_SRC_ALPHA",
	"UNPACK_FLIP_Y_WEBGL",
	"HALF_FLOAT",
	"RG16F",
	"RG",
	"RGBA16F",
	"R16F",
	"RED",
] as const;

interface FakeGl {
	[key: string]: unknown;
	pixelStorei: ReturnType<typeof vi.fn>;
	texImage2D: ReturnType<typeof vi.fn>;
	deleteTexture: ReturnType<typeof vi.fn>;
	loseContext: ReturnType<typeof vi.fn>;
}

function createFakeGl(): FakeGl {
	const constants: Record<string, number> = {};
	GL_CONSTANT_NAMES.forEach((name, index) => {
		constants[name] = 0x1000 + index;
	});
	const loseContext = vi.fn();

	const gl: Record<string, unknown> = {
		...constants,
		drawingBufferWidth: 300,
		drawingBufferHeight: 60,
		createShader: () => ({}),
		createProgram: () => ({}),
		createTexture: () => ({}),
		createFramebuffer: () => ({}),
		createBuffer: () => ({}),
		getShaderParameter: () => true,
		getProgramParameter: (_p: unknown, pname: number) =>
			pname === constants["ACTIVE_UNIFORMS"] ? 0 : true,
		getActiveUniform: () => null,
		getUniformLocation: () => null,
		checkFramebufferStatus: () => constants["FRAMEBUFFER_COMPLETE"],
		getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null),
		pixelStorei: vi.fn(),
		texImage2D: vi.fn(),
		deleteTexture: vi.fn(),
	};

	for (const name of [
		"shaderSource",
		"compileShader",
		"deleteShader",
		"attachShader",
		"linkProgram",
		"deleteProgram",
		"useProgram",
		"uniform1f",
		"uniform2f",
		"uniform1i",
		"activeTexture",
		"bindTexture",
		"texParameteri",
		"bindFramebuffer",
		"framebufferTexture2D",
		"deleteFramebuffer",
		"bindBuffer",
		"bufferData",
		"vertexAttribPointer",
		"enableVertexAttribArray",
		"deleteBuffer",
		"viewport",
		"clearColor",
		"clear",
		"drawElements",
		"enable",
		"disable",
		"blendFunc",
	]) {
		gl[name] = vi.fn();
	}

	gl["loseContext"] = loseContext;
	return gl as unknown as FakeGl;
}

function createFake2d() {
	return {
		font: "",
		fillStyle: "",
		textAlign: "",
		textBaseline: "",
		clearRect: vi.fn(),
		fillText: vi.fn(),
		measureText: (_text: string) => ({ width: 200 }),
	};
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

function installFakeContexts(gl: FakeGl | null) {
	HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string) {
		if (id === "2d") return createFake2d();
		if (id === "webgl2") return gl;
		return null;
	} as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

function makeHost(clientWidth: number): HTMLDivElement {
	const host = document.createElement("div");
	Object.defineProperty(host, "clientWidth", { value: clientWidth, configurable: true });
	document.body.appendChild(host);
	return host;
}

const BASE_OPTIONS: LiquidTextLiveOptions = {
	text: "Liquid",
	font: "Georgia, serif",
	fontSize: 50,
	fontWeight: 700,
	textColor: "#000000",
	strength: 0.5,
	radius: 160,
	forceGain: 17,
	dissipation: 0.98,
	viscosity: 4,
	chromaticRatio: 0.2,
	interactive: true,
	pauseWhenHidden: true,
};

describe("liquid-text-core", () => {
	describe("numeric + timing invariants", () => {
		it("pins the simulation constants the visual result depends on", () => {
			expect(FIXED_DT).toBe(0.016);
			expect(DIFFUSE_ITERATIONS).toBe(8);
			expect(PRESSURE_ITERATIONS).toBe(16);
			expect(SIM_SCALE).toBe(0.25);
			expect(HEIGHT_RATIO).toBe(1.2);
			expect(DEFAULT_DISPLAY_FONT_SIZE).toBe(64);
			expect(FIT_REFERENCE_SIZE).toBe(100);
			expect(FIT_MIN_SIZE).toBe(8);
			expect(FIT_MAX_SIZE).toBe(2000);
		});
	});

	describe("measureLiquidText", () => {
		afterEach(() => {
			HTMLCanvasElement.prototype.getContext = originalGetContext;
		});

		it("passes an explicit fontSize straight through without measuring", () => {
			const host = makeHost(300);
			expect(measureLiquidText(host, { ...BASE_OPTIONS, fontSize: 42 })).toEqual({
				font: "Georgia, serif",
				fontSize: 42,
			});
			host.remove();
		});

		it("auto-fits fontSize 0 to the host width at the 100px reference size", () => {
			installFakeContexts(null);
			const host = makeHost(300);
			// measureText -> 200px at the 100px reference => 100 * (300 / 200).
			expect(measureLiquidText(host, { ...BASE_OPTIONS, fontSize: 0 })).toEqual({
				font: "Georgia, serif",
				fontSize: 150,
			});
			host.remove();
		});

		it("clamps the auto-fitted size into [8, 2000]", () => {
			installFakeContexts(null);
			const host = makeHost(1_000_000);
			expect(measureLiquidText(host, { ...BASE_OPTIONS, fontSize: 0 }).fontSize).toBe(FIT_MAX_SIZE);
			const tiny = makeHost(1);
			expect(measureLiquidText(tiny, { ...BASE_OPTIONS, fontSize: 0 }).fontSize).toBe(FIT_MIN_SIZE);
			host.remove();
			tiny.remove();
		});

		it("reports a null fontSize (family only) when no 2D measuring context exists", () => {
			const host = makeHost(300);
			// Ambient stub: getContext -> null.
			expect(measureLiquidText(host, { ...BASE_OPTIONS, fontSize: 0 })).toEqual({
				font: "Georgia, serif",
				fontSize: null,
			});
			host.remove();
		});

		it("falls back to the host's computed family, then sans-serif, for an empty font prop", () => {
			const host = makeHost(300);
			expect(measureLiquidText(host, { ...BASE_OPTIONS, font: "" }).font).toBe(
				getComputedStyle(host).fontFamily || "sans-serif"
			);
			host.remove();
		});
	});

	describe("createLiquidText — unavailable context", () => {
		it("returns null (fail-quiet) when no WebGL context can be acquired", () => {
			const host = makeHost(300);
			const canvas = document.createElement("canvas");
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			expect(createLiquidText({ host, canvas }, { ...BASE_OPTIONS })).toBeNull();
			expect(errorSpy).not.toHaveBeenCalled();

			errorSpy.mockRestore();
			host.remove();
		});

		it("returns null when no renderable half-float format is available", () => {
			const gl = createFakeGl();
			gl["checkFramebufferStatus"] = () => 0;
			installFakeContexts(gl);
			const host = makeHost(300);
			const canvas = document.createElement("canvas");

			expect(createLiquidText({ host, canvas }, { ...BASE_OPTIONS })).toBeNull();

			HTMLCanvasElement.prototype.getContext = originalGetContext;
			host.remove();
		});
	});

	describe("createLiquidText — running engine", () => {
		let gl: FakeGl;
		let host: HTMLDivElement;
		let canvas: HTMLCanvasElement;
		let rafSpy: ReturnType<typeof vi.spyOn>;
		let cafSpy: ReturnType<typeof vi.spyOn>;
		let pendingRaf: Set<number>;
		let nextRafId: number;

		beforeEach(() => {
			gl = createFakeGl();
			installFakeContexts(gl);
			host = makeHost(300);
			canvas = document.createElement("canvas");
			document.body.appendChild(canvas);
			pendingRaf = new Set();
			nextRafId = 1;
			rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
				const id = nextRafId++;
				pendingRaf.add(id);
				return id;
			});
			cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
				pendingRaf.delete(id);
			});
		});

		afterEach(() => {
			rafSpy.mockRestore();
			cafSpy.mockRestore();
			HTMLCanvasElement.prototype.getContext = originalGetContext;
			host.remove();
			canvas.remove();
		});

		it("boots the render loop with exactly one pending rAF", () => {
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS });
			expect(engine).not.toBeNull();
			expect(pendingRaf.size).toBe(1);
			engine?.destroy();
		});

		it("sizes the canvas from the host width and the 1.2 height ratio", () => {
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS, fontSize: 50 });
			// dpr 1 in jsdom: width = clientWidth, height = round(50 * 1.2).
			expect(canvas.width).toBe(300);
			expect(canvas.height).toBe(60);
			engine?.destroy();
		});

		it("reports the auto-fitted metrics through onMetrics", () => {
			const onMetrics = vi.fn();
			const engine = createLiquidText(
				{ host, canvas },
				{ ...BASE_OPTIONS, fontSize: 0, onMetrics }
			);
			expect(onMetrics).toHaveBeenCalledWith({ font: "Georgia, serif", fontSize: 150 });
			// …and the canvas follows that size: round(150 * 1.2).
			expect(canvas.height).toBe(180);
			engine?.destroy();
		});

		it("re-rasterizes on a text-affecting setOptions but not on a sim-parameter one", () => {
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS });
			expect(engine).not.toBeNull();

			// rasterizeText() brackets its texture upload with two pixelStorei
			// calls (UNPACK_FLIP_Y_WEBGL on/off), so the count is a faithful
			// "did it re-rasterize?" probe.
			const before = gl.pixelStorei.mock.calls.length;
			engine?.setOptions({ strength: 0.9, radius: 10, viscosity: 1 });
			expect(gl.pixelStorei.mock.calls.length).toBe(before);

			engine?.setOptions({ textColor: "#ff0000" });
			expect(gl.pixelStorei.mock.calls.length).toBe(before + 2);

			engine?.setOptions({ text: "Changed" });
			expect(gl.pixelStorei.mock.calls.length).toBe(before + 4);

			engine?.destroy();
		});

		it("re-measures (and reports) only for font-affecting keys", () => {
			const onMetrics = vi.fn();
			const engine = createLiquidText(
				{ host, canvas },
				{ ...BASE_OPTIONS, fontSize: 0, onMetrics }
			);
			onMetrics.mockClear();

			engine?.setOptions({ textColor: "#ff0000" });
			expect(onMetrics).not.toHaveBeenCalled();

			engine?.setOptions({ fontSize: 30 });
			expect(onMetrics).toHaveBeenCalledWith({ font: "Georgia, serif", fontSize: 30 });

			engine?.destroy();
		});

		it("applies every live key it is handed", () => {
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS });
			expect(engine).not.toBeNull();
			const liveKeys: Array<keyof LiquidTextLiveOptions> = [
				"text",
				"font",
				"fontSize",
				"fontWeight",
				"textColor",
				"strength",
				"radius",
				"forceGain",
				"dissipation",
				"viscosity",
				"chromaticRatio",
				"interactive",
				"pauseWhenHidden",
			];
			// Each key is accepted individually without throwing and without
			// tearing the loop down.
			for (const key of liveKeys) {
				expect(() =>
					engine?.setOptions({ [key]: BASE_OPTIONS[key] } as Partial<LiquidTextLiveOptions>)
				).not.toThrow();
			}
			expect(pendingRaf.size).toBe(1);
			engine?.destroy();
		});

		it("resizes safely before destroy and no-ops after it", () => {
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS, fontSize: 0 });
			expect(() => engine?.resize()).not.toThrow();

			engine?.destroy();
			const afterDestroy = gl.pixelStorei.mock.calls.length;
			expect(() => engine?.resize()).not.toThrow();
			expect(() => engine?.setOptions({ text: "post-destroy" })).not.toThrow();
			expect(gl.pixelStorei.mock.calls.length).toBe(afterDestroy);
		});

		it("cancels the rAF loop on destroy and is idempotent", () => {
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS });
			expect(pendingRaf.size).toBe(1);

			engine?.destroy();
			expect(pendingRaf.size).toBe(0);
			expect(cafSpy).toHaveBeenCalledTimes(1);
			expect(gl.loseContext).toHaveBeenCalledTimes(1);

			engine?.destroy();
			engine?.destroy();
			expect(cafSpy).toHaveBeenCalledTimes(1);
			expect(gl.loseContext).toHaveBeenCalledTimes(1);
		});

		it("removes every listener it registered on destroy", () => {
			const windowRemove = vi.spyOn(window, "removeEventListener");
			const documentRemove = vi.spyOn(document, "removeEventListener");
			const canvasRemove = vi.spyOn(canvas, "removeEventListener");

			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS });
			engine?.destroy();

			expect(windowRemove).toHaveBeenCalledWith("pointermove", expect.any(Function));
			expect(documentRemove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
			expect(canvasRemove).toHaveBeenCalledWith("webglcontextlost", expect.any(Function));
			expect(canvasRemove).toHaveBeenCalledWith("webglcontextrestored", expect.any(Function));

			windowRemove.mockRestore();
			documentRemove.mockRestore();
			canvasRemove.mockRestore();
		});

		it("tears the sim down and notifies the wrapper on a GPU context loss", () => {
			const onContextLost = vi.fn();
			const engine = createLiquidText({ host, canvas }, { ...BASE_OPTIONS, onContextLost });
			expect(pendingRaf.size).toBe(1);

			const event = new Event("webglcontextlost", { cancelable: true });
			canvas.dispatchEvent(event);

			expect(event.defaultPrevented).toBe(true);
			expect(onContextLost).toHaveBeenCalledTimes(1);
			expect(pendingRaf.size).toBe(0);

			// Inert afterwards, and a later destroy must not double-free.
			const after = gl.pixelStorei.mock.calls.length;
			engine?.setOptions({ text: "ignored" });
			expect(gl.pixelStorei.mock.calls.length).toBe(after);
			engine?.destroy();
			expect(cafSpy).toHaveBeenCalledTimes(1);
		});
	});
});
