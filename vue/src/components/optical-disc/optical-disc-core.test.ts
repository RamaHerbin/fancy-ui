import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	COAST_EPSILON,
	createOpticalDisc,
	fallbackBackground,
	isMoving,
	MAX_STEP,
	parseHexColor,
	spinRate,
	stepMotion,
} from "./optical-disc-core";

const FALLBACK = [0.1, 0.2, 0.3] as const;

describe("parseHexColor", () => {
	it("reads the long and the short form", () => {
		expect(parseHexColor("#ff0000", FALLBACK)).toEqual([1, 0, 0]);
		expect(parseHexColor("#0f0", FALLBACK)).toEqual([0, 1, 0]);
		expect(parseHexColor("  0000FF ", FALLBACK)).toEqual([0, 0, 1]);
	});

	it("falls back on anything else, as a fresh array", () => {
		for (const bad of [undefined, "", "red", "#12", "#gggggg", "rgb(1,2,3)"]) {
			const out = parseHexColor(bad, FALLBACK);
			expect(out).toEqual([0.1, 0.2, 0.3]);
			expect(out).not.toBe(FALLBACK);
		}
	});
});

describe("fallbackBackground", () => {
	it("ends on the label paper colour", () => {
		expect(fallbackBackground("#abcdef")).toMatch(/^radial-gradient\(.*#abcdef 38\.5%\)$/);
	});
});

describe("spinRate", () => {
	it("is one turn per `spin` seconds, signed", () => {
		expect(spinRate(4, false)).toBeCloseTo(Math.PI / 2);
		expect(spinRate(-4, false)).toBeCloseTo(-Math.PI / 2);
	});

	it("is zero for a still disc, a bad value or reduced motion", () => {
		expect(spinRate(0, false)).toBe(0);
		expect(spinRate(Number.NaN, false)).toBe(0);
		expect(spinRate(Number.POSITIVE_INFINITY, false)).toBe(0);
		expect(spinRate(4, true)).toBe(0);
	});
});

describe("stepMotion", () => {
	const rest = { yaw: 0, coast: 0, lean: 0 };

	it("advances by the base rate", () => {
		expect(stepMotion(rest, 0.01, 2, false).yaw).toBeCloseTo(0.02);
	});

	it("clamps a long frame so a background tab does not teleport", () => {
		expect(stepMotion(rest, 5, 2, false).yaw).toBeCloseTo(2 * MAX_STEP);
		expect(stepMotion(rest, -1, 2, false).yaw).toBe(0);
	});

	it("holds still while dragged", () => {
		const held = { yaw: 1, coast: 3, lean: 0.2 };
		expect(stepMotion(held, 0.016, 2, true)).toBe(held);
	});

	it("lets a flick coast down to exactly zero", () => {
		let motion = { yaw: 0, coast: 6, lean: 0.4 };
		let previous = motion.coast;
		for (let i = 0; i < 2000 && isMoving(motion, 0, false); i++) {
			motion = stepMotion(motion, 0.016, 0, false);
			expect(Math.abs(motion.coast)).toBeLessThanOrEqual(Math.abs(previous));
			previous = motion.coast;
		}
		expect(motion.coast).toBe(0);
		expect(motion.lean).toBe(0);
		expect(motion.yaw).toBeGreaterThan(0);
		expect(isMoving(motion, 0, false)).toBe(false);
	});

	it("drops a coast that is already below the threshold", () => {
		const motion = stepMotion({ yaw: 0, coast: COAST_EPSILON / 2, lean: 0 }, 0.016, 0, false);
		expect(motion.coast).toBe(0);
	});
});

describe("isMoving", () => {
	const rest = { yaw: 0, coast: 0, lean: 0 };

	it("is false only when nothing would change the next frame", () => {
		expect(isMoving(rest, 0, false)).toBe(false);
		expect(isMoving(rest, 1, false)).toBe(true);
		expect(isMoving(rest, 0, true)).toBe(true);
		expect(isMoving({ ...rest, coast: 1 }, 0, false)).toBe(true);
		expect(isMoving({ ...rest, lean: 0.1 }, 0, false)).toBe(true);
	});
});

/** The slice of WebGL the engine uses, counting what it allocates and frees. */
function fakeGl(overrides: Record<string, unknown> = {}) {
	const ledger = {
		live: new Set<string>(),
		draws: 0,
		lost: 0,
		uniforms: {} as Record<string, unknown[]>,
	};
	let id = 0;
	const make = (kind: string) => () => {
		const handle = `${kind}#${++id}`;
		ledger.live.add(handle);
		return handle;
	};
	const free = (handle: string) => ledger.live.delete(handle);
	const set =
		(kind: string) =>
		(location: string, ...values: unknown[]) => {
			ledger.uniforms[location] = values;
			void kind;
		};
	const gl = {
		VERTEX_SHADER: 1,
		FRAGMENT_SHADER: 2,
		COMPILE_STATUS: 3,
		LINK_STATUS: 4,
		ARRAY_BUFFER: 5,
		STATIC_DRAW: 6,
		FLOAT: 7,
		TEXTURE_2D: 8,
		TEXTURE_MIN_FILTER: 9,
		TEXTURE_MAG_FILTER: 10,
		TEXTURE_WRAP_S: 11,
		TEXTURE_WRAP_T: 12,
		LINEAR: 13,
		CLAMP_TO_EDGE: 14,
		RGBA: 15,
		UNSIGNED_BYTE: 16,
		DEPTH_TEST: 17,
		COLOR_BUFFER_BIT: 18,
		TRIANGLES: 19,
		createShader: make("shader"),
		deleteShader: free,
		shaderSource: vi.fn(),
		compileShader: vi.fn(),
		getShaderParameter: () => true,
		createProgram: make("program"),
		deleteProgram: free,
		attachShader: vi.fn(),
		bindAttribLocation: vi.fn(),
		linkProgram: vi.fn(),
		getProgramParameter: () => true,
		useProgram: vi.fn(),
		createBuffer: make("buffer"),
		deleteBuffer: free,
		bindBuffer: vi.fn(),
		bufferData: vi.fn(),
		enableVertexAttribArray: vi.fn(),
		vertexAttribPointer: vi.fn(),
		getUniformLocation: (_program: unknown, name: string) => name,
		createTexture: make("texture"),
		deleteTexture: free,
		bindTexture: vi.fn(),
		texParameteri: vi.fn(),
		texImage2D: vi.fn(),
		uniform1i: set("1i"),
		uniform1f: set("1f"),
		uniform2f: set("2f"),
		uniform3f: set("3f"),
		disable: vi.fn(),
		clearColor: vi.fn(),
		viewport: vi.fn(),
		clear: vi.fn(),
		drawArrays: () => {
			ledger.draws++;
		},
		getExtension: () => ({ loseContext: () => ledger.lost++ }),
		...overrides,
	};
	return { gl, ledger };
}

function canvasWith(gl: unknown): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	Object.defineProperty(canvas, "clientWidth", { value: 200 });
	Object.defineProperty(canvas, "clientHeight", { value: 200 });
	canvas.getContext = (() => gl) as unknown as HTMLCanvasElement["getContext"];
	return canvas;
}

function pointer(type: string, x: number, y: number, timeStamp: number): Event {
	const event = new Event(type);
	Object.assign(event, { pointerId: 1, pointerType: "touch", button: 0, clientX: x, clientY: y });
	Object.defineProperty(event, "timeStamp", { value: timeStamp });
	return event;
}

describe("createOpticalDisc", () => {
	let frames: Map<number, FrameRequestCallback>;
	let nextFrame: number;

	beforeEach(() => {
		frames = new Map();
		nextFrame = 0;
		vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
			frames.set(++nextFrame, callback);
			return nextFrame;
		});
		vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
			frames.delete(handle);
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function flush(now: number): void {
		const pending = [...frames.values()];
		frames.clear();
		for (const callback of pending) callback(now);
	}

	it("returns null without WebGL, and when the shader does not compile", () => {
		expect(createOpticalDisc({ canvas: canvasWith(null) })).toBeNull();
		const { gl, ledger } = fakeGl({ getShaderParameter: () => false });
		expect(createOpticalDisc({ canvas: canvasWith(gl) })).toBeNull();
		expect(ledger.live.size).toBe(0);
	});

	it("frees a program that fails to link", () => {
		const { gl, ledger } = fakeGl({ getProgramParameter: () => false });
		expect(createOpticalDisc({ canvas: canvasWith(gl) })).toBeNull();
		expect(ledger.live.size).toBe(0);
	});

	it("paints one frame and sleeps when the disc is still", () => {
		const { gl, ledger } = fakeGl();
		const engine = createOpticalDisc({ canvas: canvasWith(gl) }, { spin: 0, angle: 90 });
		expect(engine).not.toBeNull();
		expect(ledger.draws).toBe(1);
		expect(frames.size).toBe(0);
		expect(engine!.getAngle()).toBeCloseTo(90);
		expect(ledger.uniforms.uYaw![0]).toBeCloseTo(Math.PI / 2);
		engine!.destroy();
	});

	it("keeps turning while it spins, and stops under reduced motion", () => {
		const { gl } = fakeGl();
		const engine = createOpticalDisc({ canvas: canvasWith(gl) }, { spin: 4, angle: 0 })!;
		expect(frames.size).toBe(1);
		flush(1000);
		flush(1016);
		expect(engine.getAngle()).toBeGreaterThan(0);
		expect(frames.size).toBe(1);

		engine.setOptions({ reducedMotion: true });
		const frozen = (flush(1032), engine.getAngle());
		flush(1048);
		expect(frames.size).toBe(0);
		expect(engine.getAngle()).toBe(frozen);
		engine.destroy();
	});

	it("turns with a drag and repaints live options while asleep", () => {
		const { gl, ledger } = fakeGl();
		const canvas = canvasWith(gl);
		const engine = createOpticalDisc({ canvas }, { spin: 0, angle: 0, reducedMotion: true })!;
		canvas.dispatchEvent(pointer("pointerdown", 100, 100, 0));
		canvas.dispatchEvent(pointer("pointermove", 150, 100, 16));
		// A quarter of the width is a quarter of a half-turn.
		expect(engine.getAngle()).toBeCloseTo(45);
		canvas.dispatchEvent(pointer("pointerup", 150, 100, 32));
		flush(48);
		flush(64);
		// Reduced motion: no coasting after release.
		expect(engine.getAngle()).toBeCloseTo(45);

		const before = ledger.draws;
		engine.setOptions({ iridescence: 0.5 });
		expect(ledger.draws).toBe(before + 1);
		expect(ledger.uniforms.uIridescence).toEqual([0.5]);
		engine.destroy();
	});

	it("ignores a drag when not interactive", () => {
		const { gl } = fakeGl();
		const canvas = canvasWith(gl);
		const engine = createOpticalDisc({ canvas }, { spin: 0, angle: 0, interactive: false })!;
		canvas.dispatchEvent(pointer("pointerdown", 100, 100, 0));
		canvas.dispatchEvent(pointer("pointermove", 180, 100, 16));
		expect(engine.getAngle()).toBe(0);
		engine.destroy();
	});

	it("frees every GL object, cancels its frame and detaches on destroy", () => {
		const { gl, ledger } = fakeGl();
		const canvas = canvasWith(gl);
		const removed = vi.spyOn(document, "removeEventListener");
		const engine = createOpticalDisc({ canvas }, { spin: 4 })!;
		expect(frames.size).toBe(1);
		engine.destroy();
		expect(ledger.live.size).toBe(0);
		expect(frames.size).toBe(0);
		expect(ledger.lost).toBe(1);
		expect(removed).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

		const draws = ledger.draws;
		canvas.dispatchEvent(pointer("pointerdown", 100, 100, 0));
		engine.setOptions({ spin: 1 });
		engine.destroy();
		expect(ledger.draws).toBe(draws);
		expect(frames.size).toBe(0);
		expect(ledger.lost).toBe(1);
		removed.mockRestore();
	});

	it("keeps the context when asked to, for a canvas that is reused", () => {
		const { gl, ledger } = fakeGl();
		const engine = createOpticalDisc({ canvas: canvasWith(gl) }, { releaseContext: false })!;
		engine.destroy();
		expect(ledger.lost).toBe(0);
		expect(ledger.live.size).toBe(0);
	});
});
