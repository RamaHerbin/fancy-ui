import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";

/**
 * The wrapper's contract with the shared engine, with the engine mocked so
 * every creation, live push and teardown is observable. The loop itself is
 * covered against the real engine in NoiseReveal.test.tsx.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./noise-reveal-core.js", () => ({ createNoiseReveal: mocks.create }));

const { NoiseReveal } = await import("./NoiseReveal.js");

const src = "https://example.com/image.jpg";

describe("NoiseReveal engine wiring", () => {
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

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("builds one scene on the host, seeded with the mount values", () => {
		const { container } = render(<NoiseReveal src={src} trigger="manual" revealed duration={2} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		expect(elements.container).toBe(container.firstElementChild);
		expect(options).toEqual({
			src,
			duration: 2,
			trigger: "manual",
			revealed: true,
			reducedMotion: false,
		});
	});

	it("manual trigger: follows `revealed` both ways without rebuilding the scene", () => {
		const { rerender } = render(<NoiseReveal src={src} trigger="manual" />);
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ target: 0 });
		rerender(<NoiseReveal src={src} trigger="manual" revealed />);
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ target: 1 });
		rerender(<NoiseReveal src={src} trigger="manual" revealed={false} />);
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ target: 0 });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("view trigger: reveals once on the first intersection, after `delay`", () => {
		vi.useFakeTimers();
		render(<NoiseReveal src={src} delay={0.5} />);
		const trigger = FakeIntersectionObserver.instances.find((o) => o.options?.threshold === 0.1)!;
		act(() => trigger.trigger(true));
		expect(mocks.setOptions).not.toHaveBeenCalledWith({ target: 1 });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(mocks.setOptions).toHaveBeenCalledWith({ target: 1 });
	});

	it("forwards on-screen changes as the `visible` option", () => {
		render(<NoiseReveal src={src} />);
		const gate = FakeIntersectionObserver.instances.find((o) => o.options?.threshold === 0)!;
		act(() => gate.trigger(false));
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ visible: false });
		act(() => gate.trigger(true));
		expect(mocks.setOptions).toHaveBeenLastCalledWith({ visible: true });
	});

	it.each([
		["src", { src: "https://example.com/other.jpg" }],
		["duration", { duration: 3 }],
		["trigger", { trigger: "manual" as const }],
	])("rebuilds the scene when %s changes", (_name, change) => {
		const { rerender } = render(<NoiseReveal src={src} />);
		rerender(<NoiseReveal src={src} {...change} />);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.create.mock.calls[1]![1]).toMatchObject(change);
	});

	it("stays an empty host, without throwing, when no WebGL context is available", () => {
		mocks.create.mockImplementation(() => null);
		const { rerender, unmount } = render(<NoiseReveal src={src} trigger="manual" />);
		expect(() => rerender(<NoiseReveal src={src} trigger="manual" revealed />)).not.toThrow();
		expect(() => unmount()).not.toThrow();
		expect(mocks.setOptions).not.toHaveBeenCalled();
	});

	it("destroys the scene on unmount", () => {
		const { unmount } = render(<NoiseReveal src={src} />);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode: every scene built is destroyed, and one survives until unmount", () => {
		const { unmount } = render(
			<StrictMode>
				<NoiseReveal src={src} />
			</StrictMode>
		);
		// The host element arrives through state, after the simulated remount, so
		// how many scenes get built is React's business; what matters is that all
		// but the last are already destroyed, and the last one goes on unmount.
		const built = mocks.create.mock.calls.length;
		expect(built).toBeGreaterThan(0);
		expect(mocks.destroy).toHaveBeenCalledTimes(built - 1);
		unmount();
		expect(mocks.create).toHaveBeenCalledTimes(built);
		expect(mocks.destroy).toHaveBeenCalledTimes(built);
	});
});
