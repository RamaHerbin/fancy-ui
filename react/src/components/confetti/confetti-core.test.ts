import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// canvas-confetti requires a real canvas rendering context which jsdom
// doesn't provide, so the module is mocked the same way the wrapper's own
// test file mocks it: the default export is callable AND carries `.create`.
const createMock = vi.fn();

vi.mock("canvas-confetti", () => {
	const globalFire = vi.fn();
	const mocked = globalFire as typeof globalFire & { create: typeof createMock };
	mocked.create = ((...args: unknown[]) => createMock(...args)) as typeof createMock;
	return { default: mocked };
});

import { createConfetti } from "./confetti-core.js";

function makeInstance() {
	const fn = vi.fn() as ReturnType<typeof vi.fn> & { reset: ReturnType<typeof vi.fn> };
	fn.reset = vi.fn();
	return fn;
}

function elements() {
	return { canvas: document.createElement("canvas") };
}

describe("createConfetti", () => {
	beforeEach(() => {
		createMock.mockReset();
	});

	// Fidelity: before the extraction the wrapper called `confettiModule.create()`
	// bare inside `onMount`, so a throw propagated out of the mount effect. The
	// core must NOT swallow it into a silent null engine.
	it("lets a throw from canvas-confetti's create() propagate", () => {
		createMock.mockImplementation(() => {
			throw new Error("no context");
		});

		expect(() => createConfetti(elements(), {})).toThrow("no context");
	});

	it("returns null when canvas-confetti's create() yields nothing", () => {
		createMock.mockReturnValue(null);

		const engine = createConfetti(elements(), {});

		expect(engine).toBeNull();
	});

	it("creates the instance against the given canvas with resize:true", () => {
		createMock.mockReturnValue(makeInstance());
		const canvas = document.createElement("canvas");

		createConfetti({ canvas }, { globalOptions: { useWorker: true } });

		expect(createMock).toHaveBeenCalledWith(canvas, { useWorker: true, resize: true });
	});

	// Spread order invariant: `resize: true` is applied last, so it wins over a
	// user-supplied globalOptions.resize — exactly as the original wrapper did.
	it("forces resize:true even when globalOptions asks for false", () => {
		createMock.mockReturnValue(makeInstance());
		const canvas = document.createElement("canvas");

		createConfetti({ canvas }, { globalOptions: { resize: false } });

		expect(createMock).toHaveBeenCalledWith(canvas, { resize: true });
	});

	it("auto-fires once on creation unless manualStart is set", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		createConfetti(elements(), {});

		expect(instance).toHaveBeenCalledTimes(1);
	});

	it("does not auto-fire when manualStart is true", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		createConfetti(elements(), { manualStart: true });

		expect(instance).not.toHaveBeenCalled();
	});

	it("auto-fires with the initial options", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		createConfetti(elements(), { options: { particleCount: 7 } });

		expect(instance).toHaveBeenCalledWith({ particleCount: 7 });
	});

	it("fire() merges live options under the call's own opts", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		const engine = createConfetti(elements(), {
			manualStart: true,
			options: { particleCount: 50, spread: 60 },
		})!;

		engine.fire({ spread: 90 });

		expect(instance).toHaveBeenCalledWith({ particleCount: 50, spread: 90 });
	});

	it("setOptions updates the live options used by subsequent fire() calls", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		const engine = createConfetti(elements(), { manualStart: true, options: { spread: 60 } })!;

		engine.setOptions({ options: { spread: 120 } });
		engine.fire();

		expect(instance).toHaveBeenCalledWith({ spread: 120 });
	});

	// The wrapper pushes the current `options` prop right before firing; a
	// setOptions immediately followed by fire() must be honoured synchronously,
	// with no flush in between.
	it("honours a setOptions applied in the same tick as the fire() that follows it", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		const engine = createConfetti(elements(), {
			manualStart: true,
			options: { particleCount: 50 },
		})!;

		engine.setOptions({ options: { particleCount: 500 } });
		engine.fire();

		expect(instance).toHaveBeenCalledWith({ particleCount: 500 });
	});

	it("resize() is a safe no-op before and after destroy", () => {
		createMock.mockReturnValue(makeInstance());

		const engine = createConfetti(elements(), { manualStart: true })!;

		expect(() => engine.resize()).not.toThrow();
		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
	});

	it("destroy() resets the instance and is idempotent", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		const engine = createConfetti(elements(), { manualStart: true })!;

		engine.destroy();
		engine.destroy();

		expect(instance.reset).toHaveBeenCalledTimes(1);
	});

	it("fire() and setOptions() are no-ops after destroy", () => {
		const instance = makeInstance();
		createMock.mockReturnValue(instance);

		const engine = createConfetti(elements(), { manualStart: true, options: { spread: 60 } })!;

		engine.destroy();
		instance.mockClear();
		engine.fire();
		engine.setOptions({ options: { spread: 999 } });

		expect(instance).not.toHaveBeenCalled();
	});

	// canvas-confetti owns the rAF loop and (via `resize: true`) the window
	// resize listener; the core must add none of its own, so destroy() has
	// nothing further to cancel.
	describe("owns no frame loop or listener of its own", () => {
		let raf: ReturnType<typeof vi.spyOn>;
		let addListener: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			raf = vi.spyOn(globalThis, "requestAnimationFrame");
			addListener = vi.spyOn(window, "addEventListener");
		});

		afterEach(() => {
			raf.mockRestore();
			addListener.mockRestore();
		});

		it("registers no rAF and no window listener across create/fire/destroy", () => {
			createMock.mockReturnValue(makeInstance());

			const engine = createConfetti(elements(), {})!;
			engine.fire();
			engine.resize();
			engine.destroy();

			expect(raf).not.toHaveBeenCalled();
			expect(addListener).not.toHaveBeenCalled();
		});
	});
});
