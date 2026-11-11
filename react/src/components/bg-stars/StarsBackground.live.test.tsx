import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The wrapper's contract with the shared engine, with the engine mocked so
 * every creation, live push and teardown is observable. The behaviour of the
 * spring itself is covered against the real engine in StarsBackground.test.tsx.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./bg-stars-core.js", async (original) => ({
	...(await original<typeof import("./bg-stars-core.js")>()),
	createBgStars: mocks.create,
}));

const { StarsBackground } = await import("./StarsBackground.js");

const live = { factor: 0.05, stiffness: 50, damping: 20, reducedMotion: false };

describe("StarsBackground engine wiring", () => {
	beforeEach(() => {
		mocks.create.mockReset();
		mocks.setOptions.mockReset();
		mocks.destroy.mockReset();
		mocks.create.mockImplementation(() => ({
			setOptions: mocks.setOptions,
			resize: vi.fn(),
			destroy: mocks.destroy,
		}));
	});

	afterEach(cleanup);

	it("creates one engine on the root and the parallax layer, with the mount values", () => {
		const { container } = render(<StarsBackground factor={0.2} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		expect(elements.host).toBe(container.firstElementChild);
		expect(elements.parallax).toBe(container.querySelector(".stars-parallax"));
		expect(options).toEqual({ ...live, factor: 0.2 });
	});

	it.each([
		["factor", { factor: 0.3 }],
		["stiffness", { stiffness: 80 }],
		["damping", { damping: 40 }],
	])("pushes a %s change into the running engine without restarting it", (_name, change) => {
		const { rerender } = render(<StarsBackground />);
		mocks.setOptions.mockClear();
		rerender(<StarsBackground {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, ...change });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("leaves the engine alone when only the sky changes", () => {
		const { rerender } = render(<StarsBackground />);
		mocks.setOptions.mockClear();
		rerender(<StarsBackground starColor="#f00" seed={7} speed={10} />);
		expect(mocks.setOptions).not.toHaveBeenCalled();
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(<StarsBackground />);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode: every engine started is destroyed, and one survives until unmount", () => {
		const { unmount } = render(
			<StrictMode>
				<StarsBackground />
			</StrictMode>
		);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(2);
	});
});
