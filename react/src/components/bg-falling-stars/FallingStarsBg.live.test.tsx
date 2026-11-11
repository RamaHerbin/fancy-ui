import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wrapper-to-engine contract, with the core mocked: a colour or reduced-motion
 * change must reach the running engine through `setOptions` and never rebuild
 * the starfield; `count` and `seed` are the documented re-init props.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
	reduced: false,
}));

vi.mock("./bg-falling-stars-core.js", () => ({ createFallingStars: mocks.create }));
vi.mock("../../internals/motion/media-query.js", () => ({
	useReducedMotion: () => mocks.reduced,
}));

const { FallingStarsBg } = await import("./FallingStarsBg.js");

describe("FallingStarsBg live props", () => {
	beforeEach(() => {
		mocks.reduced = false;
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

	it("creates the engine once with the mount values and a seeded random", () => {
		mocks.reduced = true;
		render(<FallingStarsBg color="#f00" count={12} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options, random] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect(options).toEqual({ count: 12, color: "#f00", reducedMotion: true });
		expect(typeof random).toBe("function");
	});

	it("forwards a colour change without recreating the engine", () => {
		const { rerender } = render(<FallingStarsBg color="#f00" />);
		mocks.setOptions.mockClear();
		rerender(<FallingStarsBg color="#0f0" />);
		expect(mocks.setOptions).toHaveBeenCalledWith({ color: "#0f0", reducedMotion: false });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("resumes or idles the same sky when reduced motion flips", () => {
		const { rerender } = render(<FallingStarsBg />);
		mocks.setOptions.mockClear();
		mocks.reduced = true;
		rerender(<FallingStarsBg />);
		expect(mocks.setOptions).toHaveBeenCalledWith({
			color: "currentColor",
			reducedMotion: true,
		});
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it.each([
		["count", { count: 50 }],
		["seed", { seed: 9 }],
	])("re-initialises the starfield when %s changes", (_name, change) => {
		const { rerender } = render(<FallingStarsBg />);
		rerender(<FallingStarsBg {...change} />);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("a className change touches nothing", () => {
		const { rerender } = render(<FallingStarsBg />);
		rerender(<FallingStarsBg className="x" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(<FallingStarsBg />);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode: every engine started is destroyed, one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<FallingStarsBg />
			</StrictMode>
		);
		expect(mocks.create.mock.calls.length - mocks.destroy.mock.calls.length).toBe(1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(mocks.create.mock.calls.length);
	});

	it("tolerates a missing 2D context (engine is null)", () => {
		mocks.create.mockImplementation(() => null);
		const { unmount } = render(<FallingStarsBg />);
		expect(() => unmount()).not.toThrow();
	});
});
