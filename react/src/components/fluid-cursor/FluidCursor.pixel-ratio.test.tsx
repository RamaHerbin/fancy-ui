import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { FluidCursor } from "./FluidCursor.js";

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

/**
 * Minimal WebGL2 stand-in: every `create*` hands back a truthy handle, every
 * other entry point is a no-op, and constants are minted on demand. All the
 * engine needs is for them to compare equal to each other.
 */
function createFakeGl(): unknown {
	const constants = new Map<string, number>();
	let next = 1000;
	const constantFor = (name: string) => {
		let value = constants.get(name);
		if (value === undefined) {
			value = next++;
			constants.set(name, value);
		}
		return value;
	};
	const target: Record<string, unknown> = {
		drawingBufferWidth: 300,
		drawingBufferHeight: 150,
		getExtension: (name: string) =>
			name === "WEBGL_lose_context" ? { loseContext: () => {} } : { stub: name },
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
	return new Proxy(target, {
		has: (t, prop) => prop === "drawBuffers" || prop in t,
		get(t, prop) {
			if (typeof prop !== "string") return Reflect.get(t, prop);
			if (prop in t) return t[prop];
			if (/^[A-Z][A-Z0-9_]*$/.test(prop)) return constantFor(prop);
			return () => {};
		},
	});
}

describe("FluidCursor pixel ratio", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).clientWidth;
		delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).clientHeight;
	});

	it("caps the display canvas scale at a pixel ratio of 2", () => {
		const gl = createFakeGl();
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) =>
			type === "webgl2" ? gl : null) as never);
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
			value: 300,
			configurable: true,
		});
		Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", {
			value: 150,
			configurable: true,
		});
		vi.stubGlobal("devicePixelRatio", 3);

		const { container } = render(<FluidCursor />);
		const canvas = container.querySelector("canvas")!;

		// 300 x 150 CSS px at the capped ratio of 2, not 900 x 450.
		expect(canvas.width).toBe(600);
		expect(canvas.height).toBe(300);
	});
});
