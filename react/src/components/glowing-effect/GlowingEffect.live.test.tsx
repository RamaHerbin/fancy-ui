import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wrapper-to-engine contract. The core is mocked so every creation, live push
 * and teardown is observable; the real-engine behaviour is covered by
 * GlowingEffect.reduced-motion.test.tsx and the core's own tests.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./glowing-effect-core.js", () => ({ createGlowingEffect: mocks.create }));

const { GlowingEffect } = await import("./GlowingEffect.js");

describe("GlowingEffect live props", () => {
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

	it("does not create an engine while disabled (the default)", () => {
		render(<GlowingEffect />);
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it("creates the engine once, on the glow container, with mount values", () => {
		render(
			<GlowingEffect disabled={false} inactiveZone={0.3} proximity={12} movementDuration={4} />
		);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		expect(
			(elements as { container: HTMLElement }).container.style.getPropertyValue("--spread")
		).toBe("20");
		expect(options).toEqual({ inactiveZone: 0.3, proximity: 12, movementDuration: 4 });
	});

	it.each([
		["inactiveZone", { inactiveZone: 0.2 }],
		["proximity", { proximity: 30 }],
		["movementDuration", { movementDuration: 6 }],
	])("forwards a %s change without recreating the engine", (_name, change) => {
		const { rerender } = render(<GlowingEffect disabled={false} />);
		mocks.setOptions.mockClear();
		rerender(<GlowingEffect disabled={false} {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenCalledWith({
			inactiveZone: 0.7,
			proximity: 0,
			movementDuration: 2,
			...change,
		});
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("ignores purely visual prop changes", () => {
		const { rerender } = render(<GlowingEffect disabled={false} />);
		mocks.setOptions.mockClear();
		rerender(
			<GlowingEffect disabled={false} blur={8} spread={40} glow variant="white" borderWidth={3} />
		);
		expect(mocks.setOptions).not.toHaveBeenCalled();
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("reads disabled once at mount: toggling it later does not touch the engine", () => {
		const { rerender } = render(<GlowingEffect disabled />);
		rerender(<GlowingEffect disabled={false} />);
		expect(mocks.create).not.toHaveBeenCalled();

		cleanup();
		const second = render(<GlowingEffect disabled={false} />);
		second.rerender(<GlowingEffect disabled />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(<GlowingEffect disabled={false} />);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode: every engine started is destroyed, one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<GlowingEffect disabled={false} />
			</StrictMode>
		);
		expect(mocks.create.mock.calls.length - mocks.destroy.mock.calls.length).toBe(1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(mocks.create.mock.calls.length);
	});
});
