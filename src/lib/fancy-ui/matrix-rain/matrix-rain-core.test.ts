import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMatrixRain } from "./matrix-rain-core.js";

function makeCanvas(w = 300, h = 150) {
	const canvas = document.createElement("canvas");
	Object.defineProperty(canvas, "clientWidth", { value: w, configurable: true });
	Object.defineProperty(canvas, "clientHeight", { value: h, configurable: true });
	return canvas;
}

type RectCall = { style: string; args: number[] };
type TextCall = { style: string; text: string; x: number; y: number; font: string; shadow: string };

/** Recording 2d context: captures the style state at the moment of each call. */
function makeFakeCtx() {
	const fillRects: RectCall[] = [];
	const fillTexts: TextCall[] = [];
	const setTransform = vi.fn();
	const ctx = {
		fillStyle: "",
		font: "",
		shadowBlur: 0,
		shadowColor: "",
		setTransform,
		fillRect: (...args: number[]) => {
			fillRects.push({ style: String(ctx.fillStyle), args });
		},
		fillText: (text: string, x: number, y: number) => {
			fillTexts.push({
				style: String(ctx.fillStyle),
				text,
				x,
				y,
				font: ctx.font,
				shadow: ctx.shadowColor,
			});
		},
	};
	return { ctx, fillRects, fillTexts, setTransform };
}

function attach(canvas: HTMLCanvasElement) {
	const fake = makeFakeCtx();
	vi.spyOn(canvas, "getContext").mockReturnValue(fake.ctx as never);
	return fake;
}

describe("createMatrixRain", () => {
	let frames: FrameRequestCallback[] = [];
	let nextId = 1;
	let cafSpy: ReturnType<typeof vi.spyOn>;

	/** Run the single frame the engine has scheduled. */
	function tick() {
		const cb = frames.shift();
		if (!cb) throw new Error("no animation frame is scheduled");
		cb(0);
	}

	beforeEach(() => {
		frames = [];
		nextId = 1;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
			frames.push(cb);
			return nextId++;
		});
		cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null when the 2d context is unavailable (jsdom has no canvas backend)", () => {
		expect(createMatrixRain({ canvas: makeCanvas() }, {})).toBeNull();
	});

	it("paints the opaque black background and starts the loop on creation", () => {
		const canvas = makeCanvas();
		const { fillRects, setTransform } = attach(canvas);

		const engine = createMatrixRain({ canvas }, {}, () => 0.42);
		expect(engine).not.toBeNull();

		expect(setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
		expect(canvas.width).toBe(300);
		expect(canvas.height).toBe(150);
		expect(fillRects).toEqual([{ style: "black", args: [0, 0, 300, 150] }]);
		expect(frames).toHaveLength(1);
	});

	it("draws one frame with the documented defaults (fade 0.05, 16px monospace, glow 8, #00ff41)", () => {
		const canvas = makeCanvas();
		const { ctx, fillRects, fillTexts } = attach(canvas);

		createMatrixRain({ canvas }, {}, () => 0.42);
		fillRects.length = 0;
		tick();

		// Fade trail rectangle first, with the default fadeOpacity.
		expect(fillRects[0]).toEqual({ style: "rgba(0, 0, 0, 0.05)", args: [0, 0, 300, 150] });

		// 300 / 16 => 18 columns; each draws a white head plus a coloured body.
		expect(fillTexts).toHaveLength(36);
		const head = fillTexts[0]!;
		const body = fillTexts[1]!;
		expect(head.style).toBe("#ffffff");
		expect(head.font).toBe("16px monospace");
		expect(head.shadow).toBe("#00ff41");
		expect(head.x).toBe(0);
		// floor(0.42 * (150 / 16)) = 3 rows down => y = 48, body one glyph above.
		expect(head.y).toBe(48);
		expect(body.style).toBe("#00ff41");
		expect(body.y).toBe(32);
		expect(fillTexts[2]!.x).toBe(16);

		// The glow is switched off again at the end of the frame, and the next
		// frame is scheduled.
		expect(ctx.shadowBlur).toBe(0);
		expect(frames).toHaveLength(1);
	});

	it("advances each column by max(1, speed) rows per frame", () => {
		const canvas = makeCanvas();
		const { fillTexts } = attach(canvas);

		createMatrixRain({ canvas }, { speed: 3 }, () => 0.42);
		tick();
		fillTexts.length = 0;
		tick();

		// 3 rows advanced from y = 48 => 48 + 3 * 16 = 96.
		expect(fillTexts[0]!.y).toBe(96);
	});

	it("setOptions applies every live key to the next frame", () => {
		const canvas = makeCanvas();
		const { fillRects, fillTexts } = attach(canvas);

		const engine = createMatrixRain({ canvas }, {}, () => 0.42)!;
		engine.setOptions({
			color: "#ff00ff",
			speed: 2,
			density: 0.5,
			glyphSize: 20,
			fadeOpacity: 0.1,
		});

		fillRects.length = 0;
		fillTexts.length = 0;
		tick();

		expect(fillRects[0]).toEqual({ style: "rgba(0, 0, 0, 0.1)", args: [0, 0, 300, 150] });
		const head = fillTexts[0]!;
		expect(head.font).toBe("20px monospace");
		expect(head.shadow).toBe("#ff00ff");
		expect(fillTexts[1]!.style).toBe("#ff00ff");
		// 300 / (20 * 0.5) = 30 columns, spaced by glyphSize * density = 10px.
		expect(fillTexts).toHaveLength(60);
		expect(fillTexts[2]!.x).toBe(10);
	});

	it("relayouts only when glyphSize or density changes", () => {
		const canvas = makeCanvas();
		const { fillRects, setTransform } = attach(canvas);

		const engine = createMatrixRain({ canvas }, {}, () => 0.42)!;
		expect(setTransform).toHaveBeenCalledTimes(1);
		fillRects.length = 0;

		// Per-frame appearance props never repaint or re-randomise the columns.
		engine.setOptions({ color: "#ff0000", speed: 4, fadeOpacity: 0.2 });
		expect(setTransform).toHaveBeenCalledTimes(1);
		expect(fillRects).toEqual([]);

		// Re-sending identical layout values is a no-op too.
		engine.setOptions({ glyphSize: 16, density: 1 });
		expect(setTransform).toHaveBeenCalledTimes(1);

		// A real layout change repaints black and rebuilds the grid.
		engine.setOptions({ glyphSize: 32 });
		expect(setTransform).toHaveBeenCalledTimes(2);
		expect(fillRects).toEqual([{ style: "black", args: [0, 0, 300, 150] }]);

		engine.setOptions({ density: 2 });
		expect(setTransform).toHaveBeenCalledTimes(3);
	});

	it("keeps the sub-1x advance cadence running across a relayout", () => {
		const canvas = makeCanvas();
		const { fillTexts } = attach(canvas);

		// speed 0.5 => advance only on even frame counts.
		const engine = createMatrixRain({ canvas }, { speed: 0.5 }, () => 0.42)!;

		tick();
		expect(fillTexts).toHaveLength(0); // frame 1: 1 % 2 !== 0

		// A relayout must not reset the frame counter (it was component-scope
		// state that survived the wrapper's effect re-run before the extraction).
		engine.setOptions({ glyphSize: 16, density: 1.5 });

		tick();
		expect(fillTexts.length).toBeGreaterThan(0); // frame 2: 2 % 2 === 0
	});

	it("ignores an explicit undefined instead of dropping back to nothing", () => {
		const canvas = makeCanvas();
		const { fillRects, fillTexts } = attach(canvas);

		const engine = createMatrixRain({ canvas }, { color: "#123456" }, () => 0.42)!;
		engine.setOptions({ color: undefined, fadeOpacity: undefined });

		fillRects.length = 0;
		fillTexts.length = 0;
		tick();

		expect(fillRects[0]!.style).toBe("rgba(0, 0, 0, 0.05)");
		expect(fillTexts[0]!.shadow).toBe("#123456");
	});

	it("uses the injected random() rather than Math.random", () => {
		const canvas = makeCanvas();
		attach(canvas);
		const mathRandom = vi.spyOn(Math, "random");

		const random = vi.fn(() => 0.42);
		createMatrixRain({ canvas }, {}, random);
		tick();

		expect(random).toHaveBeenCalled();
		expect(mathRandom).not.toHaveBeenCalled();
	});

	it("destroy cancels the loop, stops drawing and is idempotent", () => {
		const canvas = makeCanvas();
		const { fillRects, fillTexts } = attach(canvas);

		const engine = createMatrixRain({ canvas }, {}, () => 0.42)!;
		const pending = frames[0]!;

		engine.destroy();
		expect(cafSpy).toHaveBeenCalledTimes(1);
		expect(cafSpy).toHaveBeenCalledWith(1);

		engine.destroy();
		expect(cafSpy).toHaveBeenCalledTimes(1);

		// Even if a cancelled frame still fires, it neither draws nor reschedules.
		fillRects.length = 0;
		fillTexts.length = 0;
		frames.length = 0;
		pending(0);
		expect(fillRects).toEqual([]);
		expect(fillTexts).toEqual([]);
		expect(frames).toEqual([]);
	});

	it("resize is safe before and after destroy, and setOptions is inert once destroyed", () => {
		const canvas = makeCanvas();
		const { fillRects, setTransform } = attach(canvas);

		const engine = createMatrixRain({ canvas }, {}, () => 0.42)!;
		fillRects.length = 0;

		expect(() => engine.resize()).not.toThrow();
		expect(setTransform).toHaveBeenCalledTimes(2);

		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
		expect(() => engine.setOptions({ glyphSize: 64 })).not.toThrow();
		expect(setTransform).toHaveBeenCalledTimes(2);
	});

	it("clamps degenerate glyphSize/density (min 1px, min 0.1 density)", () => {
		const canvas = makeCanvas(30, 15);
		const { fillTexts } = attach(canvas);

		expect(() =>
			createMatrixRain({ canvas }, { density: 0, glyphSize: 0 }, () => 0.42)
		).not.toThrow();
		tick();

		// floor(30 / (1 * 0.1)) = 300 columns, each drawing a head glyph.
		// floor(0.42 * (15 / 1)) = 6 rows down => y = 0 with glyphSize 0.
		expect(fillTexts.filter((t) => t.style === "#ffffff")).toHaveLength(300);
	});
});
