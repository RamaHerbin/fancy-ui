import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";

/**
 * Regression net for the wrapper's contract with the shared engine. The core
 * is mocked so every creation, live push and teardown is observable: a prop
 * change must reach the running engine through `setOptions` and must never
 * rebuild the grid.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	setInView: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
	reduced: { value: false },
}));

vi.mock("./flickering-grid-core.js", () => ({ createFlickeringGrid: mocks.create }));
vi.mock("../../internals/motion/media-query.js", () => ({
	useReducedMotion: () => mocks.reduced.value,
}));

const { FlickeringGrid } = await import("./FlickeringGrid.js");

const defaults = {
	squareSize: 4,
	gridGap: 6,
	flickerChance: 0.3,
	color: "currentColor",
	maxOpacity: 0.3,
	width: undefined,
	height: undefined,
	reducedMotion: false,
};

function lastObserver(): FakeIntersectionObserver {
	const all = FakeIntersectionObserver.instances;
	return all[all.length - 1]!;
}

describe("FlickeringGrid live props", () => {
	beforeEach(() => {
		for (const fn of [mocks.create, mocks.setOptions, mocks.setInView, mocks.resize, mocks.destroy])
			fn.mockReset();
		mocks.reduced.value = false;
		mocks.create.mockImplementation(() => ({
			setOptions: mocks.setOptions,
			setInView: mocks.setInView,
			resize: mocks.resize,
			destroy: mocks.destroy,
		}));
	});

	afterEach(cleanup);

	it("creates the engine once, with every option at its mount value and a seeded random", () => {
		render(<FlickeringGrid color="#ff0000" squareSize={8} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options, random] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect(options).toMatchObject({ ...defaults, color: "#ff0000", squareSize: 8 });
		expect(typeof random).toBe("function");
		expect(random()).toBeGreaterThanOrEqual(0);
	});

	it.each([
		["squareSize", { squareSize: 9 }],
		["gridGap", { gridGap: 2 }],
		["flickerChance", { flickerChance: 0.9 }],
		["color", { color: "#00ff00" }],
		["maxOpacity", { maxOpacity: 0.8 }],
		["width", { width: 120 }],
		["height", { height: 80 }],
	])("forwards a %s change into the running engine without recreating it", (_n, change) => {
		const { rerender } = render(<FlickeringGrid />);
		mocks.setOptions.mockClear();
		rerender(<FlickeringGrid {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ ...defaults, ...change });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("a reduced-motion flip is pushed to the engine, not a re-seed", () => {
		const { rerender } = render(<FlickeringGrid />);
		mocks.setOptions.mockClear();
		mocks.reduced.value = true;
		rerender(<FlickeringGrid />);
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ ...defaults, reducedMotion: true });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("starts from the reduced-motion preference when it is already set", () => {
		mocks.reduced.value = true;
		render(<FlickeringGrid />);
		expect(mocks.create.mock.calls[0]![1]).toMatchObject({ reducedMotion: true });
	});

	it("a seed change rebuilds the engine, destroying the previous one", () => {
		const { rerender } = render(<FlickeringGrid seed={1} />);
		rerender(<FlickeringGrid seed={2} />);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("forwards every on-screen report to the engine, which owns the single-loop guarantee", () => {
		render(<FlickeringGrid />);
		act(() => lastObserver().trigger(true));
		act(() => lastObserver().trigger(false));
		act(() => lastObserver().trigger(true));
		expect(mocks.setInView.mock.calls.map((c) => c[0])).toEqual([true, false, true]);
	});

	it("destroys the engine on unmount and detaches the intersection observer", () => {
		const { unmount } = render(<FlickeringGrid />);
		const observer = lastObserver();
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(observer.elements.size).toBe(0);
	});

	it("under StrictMode every engine started is destroyed, and one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<FlickeringGrid />
			</StrictMode>
		);
		const started = mocks.create.mock.calls.length;
		expect(started).toBeGreaterThanOrEqual(1);
		expect(mocks.destroy).toHaveBeenCalledTimes(started - 1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(started);
	});

	it("renders nothing live when the engine is unsupported (create returns null)", () => {
		mocks.create.mockReturnValue(null);
		const { container, unmount } = render(<FlickeringGrid />);
		expect(container.querySelector("canvas")).toBeInTheDocument();
		expect(() => unmount()).not.toThrow();
	});
});
