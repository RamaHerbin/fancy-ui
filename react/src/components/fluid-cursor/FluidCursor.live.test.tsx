import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression net for the wrapper's contract with the shared engine.
 *
 * FluidCursor.test.tsx runs the real engine against a fake GL context, which
 * proves the resources are released but cannot see *how* the wrapper talks to
 * the engine. Here the core is mocked, so every creation, live push and
 * teardown is observable: a prop change must reach the running engine through
 * `setOptions` and must never rebuild the simulation.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./fluid-cursor-core.js", () => ({ createFluidCursor: mocks.create }));

const { FluidCursor } = await import("./FluidCursor.js");

/** The live keys, at their public defaults. */
const live = {
	fluidColor: undefined,
	fluidColors: undefined,
	contained: true,
	interactive: true,
	allowMultiple: false,
	onReady: undefined,
};

describe("FluidCursor live props", () => {
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

	it("creates the engine once, with every option at its mount value", () => {
		render(<FluidCursor curl={9} fluidColor="#ffffff" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect(options).toMatchObject({ curl: 9, fluidColor: "#ffffff", contained: true });
	});

	it("keeps the WebGL context across teardowns: the canvas element is reused", () => {
		render(<FluidCursor />);
		expect(mocks.create.mock.calls[0]![1]).toMatchObject({ releaseContext: false });
	});

	it("the mount push only repeats the values the engine started with", () => {
		render(<FluidCursor fluidColor="#ffffff" />);
		for (const [pushed] of mocks.setOptions.mock.calls) {
			expect(pushed).toEqual({ ...live, fluidColor: "#ffffff" });
		}
	});

	it.each([
		["fluidColor", { fluidColor: "#ff0000" }],
		["fluidColors", { fluidColors: ["#ff0000", "#00ff00"] }],
		["contained", { contained: false }],
		["interactive", { interactive: false }],
		["allowMultiple", { allowMultiple: true }],
	])("forwards a %s change into the running engine", (_name, change) => {
		const { rerender } = render(<FluidCursor />);
		mocks.setOptions.mockClear();
		rerender(<FluidCursor {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, ...change });
		// Live, not a remount: the simulation keeps its dye and velocity fields.
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("forwards a new onReady without restarting the engine", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(<FluidCursor onReady={first} />);
		expect(mocks.create.mock.calls[0]![1]).toMatchObject({ onReady: first });
		mocks.setOptions.mockClear();
		rerender(<FluidCursor onReady={second} />);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, onReady: second });
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("clears a fluidColor override by forwarding undefined", () => {
		const { rerender } = render(<FluidCursor fluidColor="#ff0000" />);
		mocks.setOptions.mockClear();
		rerender(<FluidCursor />);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, fluidColor: undefined });
	});

	it("never recreates the engine, and pushes nothing, on a mount-only prop change", () => {
		const { rerender } = render(<FluidCursor curl={3} contained={false} />);
		mocks.setOptions.mockClear();
		rerender(<FluidCursor curl={9} splatRadius={0.4} dither contained={false} />);
		expect(mocks.setOptions).not.toHaveBeenCalled();
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(<FluidCursor />);
		unmount();
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode: every engine started is destroyed, and exactly one survives until unmount", () => {
		const { unmount, rerender } = render(
			<StrictMode>
				<FluidCursor />
			</StrictMode>
		);
		// Mount, simulated unmount, mount again.
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		// Both starts were handed the same <canvas> element.
		expect(mocks.create.mock.calls[0]![0].canvas).toBe(mocks.create.mock.calls[1]![0].canvas);
		// A live push after the double mount reaches the surviving engine.
		mocks.setOptions.mockClear();
		rerender(
			<StrictMode>
				<FluidCursor fluidColor="#ff0000" />
			</StrictMode>
		);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, fluidColor: "#ff0000" });
		expect(mocks.create).toHaveBeenCalledTimes(2);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(2);
	});

	it("a restart after the engine could not start (no renderer) is still safe", () => {
		mocks.create.mockImplementation(() => null);
		const { rerender, unmount } = render(<FluidCursor />);
		expect(() => rerender(<FluidCursor fluidColor="#ff0000" />)).not.toThrow();
		expect(() => unmount()).not.toThrow();
		expect(mocks.setOptions).not.toHaveBeenCalled();
	});
});
