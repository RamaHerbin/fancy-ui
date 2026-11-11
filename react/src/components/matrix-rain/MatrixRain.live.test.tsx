import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";

/**
 * The wrapper's contract with the shared engine, with the engine mocked so
 * every creation, live push and teardown is observable. The rain itself is
 * covered against the real engine in MatrixRain.test.tsx.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./matrix-rain-core.js", () => ({ createMatrixRain: mocks.create }));

const { MatrixRain } = await import("./MatrixRain.js");

const appearance = { color: "#00ff41", speed: 1, fadeOpacity: 0.05 };

describe("MatrixRain engine wiring", () => {
	beforeEach(() => {
		mocks.create.mockReset();
		mocks.setOptions.mockReset();
		mocks.resize.mockReset();
		mocks.destroy.mockReset();
		mocks.create.mockImplementation(() => ({
			setOptions: mocks.setOptions,
			resize: mocks.resize,
			destroy: mocks.destroy,
		}));
	});

	afterEach(cleanup);

	it("starts one engine on the canvas, with a seeded stream", () => {
		const { container } = render(<MatrixRain glyphSize={20} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options, random] = mocks.create.mock.calls[0]!;
		expect(elements.canvas).toBe(container.querySelector("canvas"));
		expect(options).toEqual({ ...appearance, glyphSize: 20, density: 1, reducedMotion: false });
		// Deterministic: a second stream from the same seed draws the same values.
		const first = [random(), random(), random()];
		cleanup();
		render(<MatrixRain glyphSize={20} />);
		const again = mocks.create.mock.calls[1]![2] as () => number;
		expect([again(), again(), again()]).toEqual(first);
	});

	it.each([
		[2, 0.5],
		[0.5, 2],
		[4, 0.25],
		// Floored like the component always floored its own value.
		[0, 10],
	])("density %s reaches the engine as its reciprocal (%s)", (density, expected) => {
		render(<MatrixRain density={density} />);
		expect(mocks.create.mock.calls[0]![1].density).toBeCloseTo(expected, 12);
	});

	it.each([
		["color", { color: "#ff0000" }],
		["speed", { speed: 2 }],
		["fadeOpacity", { fadeOpacity: 0.2 }],
	])("pushes a %s change into the running engine without restarting it", (_name, change) => {
		const { rerender } = render(<MatrixRain />);
		mocks.setOptions.mockClear();
		rerender(<MatrixRain {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...appearance, ...change });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it.each([
		["glyphSize", { glyphSize: 24 }],
		["density", { density: 2 }],
		["seed", { seed: 7 }],
	])("starts a fresh engine when %s changes, carrying the current appearance", (_name, change) => {
		const { rerender } = render(<MatrixRain color="#ff0000" />);
		rerender(<MatrixRain color="#ff0000" {...change} />);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.create.mock.calls[1]![1].color).toBe("#ff0000");
	});

	it("forwards on-screen changes as the `visible` option", () => {
		render(<MatrixRain />);
		const observers = FakeIntersectionObserver.instances;
		const gate = observers[observers.length - 1]!;
		act(() => gate.trigger(false));
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ visible: false });
		act(() => gate.trigger(true));
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ visible: true });
	});

	it("does nothing, without throwing, when the canvas cannot paint", () => {
		mocks.create.mockImplementation(() => null);
		const { rerender, unmount } = render(<MatrixRain />);
		expect(() => rerender(<MatrixRain color="#ff0000" />)).not.toThrow();
		expect(() => unmount()).not.toThrow();
		expect(mocks.setOptions).not.toHaveBeenCalled();
	});

	it("StrictMode: every engine started is destroyed, and the last one goes on unmount", () => {
		const { unmount } = render(
			<StrictMode>
				<MatrixRain />
			</StrictMode>
		);
		const started = mocks.create.mock.calls.length;
		expect(started).toBeGreaterThan(0);
		expect(mocks.destroy).toHaveBeenCalledTimes(started - 1);
		unmount();
		expect(mocks.create).toHaveBeenCalledTimes(started);
		expect(mocks.destroy).toHaveBeenCalledTimes(started);
	});
});
