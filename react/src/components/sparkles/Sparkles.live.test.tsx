import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wrapper-to-engine contract. The core is mocked so every creation, live push
 * and teardown is observable: colour and reduced motion must reach the running
 * engine through `setOptions`, and only the field-shaping props (and `seed`)
 * may rebuild it.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
	reduced: { value: false },
}));

vi.mock("./sparkles-core.js", () => ({ createSparkles: mocks.create }));
vi.mock("../../internals/motion/media-query.js", () => ({
	useReducedMotion: () => mocks.reduced.value,
}));

const { Sparkles } = await import("./Sparkles.js");

describe("Sparkles live props", () => {
	beforeEach(() => {
		mocks.create.mockReset();
		mocks.setOptions.mockReset();
		mocks.resize.mockReset();
		mocks.destroy.mockReset();
		mocks.reduced.value = false;
		mocks.create.mockImplementation(() => ({
			setOptions: mocks.setOptions,
			resize: mocks.resize,
			destroy: mocks.destroy,
		}));
	});

	afterEach(cleanup);

	it("creates the engine once with the mount values and a seeded random", () => {
		render(<Sparkles minSize={2} maxSize={4} speed={6} particleDensity={9} particleColor="#abc" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options, random] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect((elements as { container: HTMLElement }).container.tagName).toBe("DIV");
		expect(options).toEqual({
			minSize: 2,
			maxSize: 4,
			speed: 6,
			particleDensity: 9,
			particleColor: "#abc",
			reducedMotion: false,
		});
		expect(typeof random()).toBe("number");
	});

	it("forwards a colour change without recreating the engine", () => {
		const { rerender } = render(<Sparkles particleColor="#111111" />);
		rerender(<Sparkles particleColor="#222222" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
		expect(mocks.setOptions).toHaveBeenLastCalledWith({
			particleColor: "#222222",
			reducedMotion: false,
		});
	});

	it("forwards a reduced-motion flip without re-seeding the field", () => {
		const { rerender } = render(<Sparkles />);
		mocks.reduced.value = true;
		rerender(<Sparkles />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenLastCalledWith(
			expect.objectContaining({ reducedMotion: true })
		);
	});

	it("starts in the still-frame mode when reduced motion is already on", () => {
		mocks.reduced.value = true;
		render(<Sparkles />);
		expect(mocks.create.mock.calls[0]![1]).toMatchObject({ reducedMotion: true });
	});

	it.each([
		["minSize", { minSize: 2 }],
		["maxSize", { maxSize: 5 }],
		["speed", { speed: 9 }],
		["particleDensity", { particleDensity: 10 }],
		["seed", { seed: 7 }],
	])("re-creates the engine when %s changes, destroying the old one", (_name, props) => {
		const { rerender } = render(<Sparkles />);
		rerender(<Sparkles {...props} />);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("does not re-create on background or className changes", () => {
		const { rerender } = render(<Sparkles />);
		rerender(<Sparkles background="#000" className="x" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("resizes the engine from the container's observer and destroys on unmount", () => {
		let callback: ResizeObserverCallback | undefined;
		const Original = globalThis.ResizeObserver;
		const disconnect = vi.fn();
		globalThis.ResizeObserver = class {
			constructor(cb: ResizeObserverCallback) {
				callback = cb;
			}
			observe() {}
			unobserve() {}
			disconnect = disconnect;
		} as unknown as typeof ResizeObserver;
		try {
			const { unmount } = render(<Sparkles />);
			callback?.([], {} as ResizeObserver);
			expect(mocks.resize).toHaveBeenCalledTimes(1);
			unmount();
			expect(disconnect).toHaveBeenCalledTimes(1);
			expect(mocks.destroy).toHaveBeenCalledTimes(1);
		} finally {
			globalThis.ResizeObserver = Original;
		}
	});

	it("StrictMode: every engine started is destroyed, one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<Sparkles />
			</StrictMode>
		);
		const started = mocks.create.mock.calls.length;
		expect(started).toBeGreaterThanOrEqual(1);
		expect(mocks.destroy).toHaveBeenCalledTimes(started - 1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(started);
	});

	it("tolerates an engine that could not start (no 2d context)", () => {
		mocks.create.mockImplementation(() => null);
		const { unmount, rerender } = render(<Sparkles />);
		rerender(<Sparkles particleColor="#fff" />);
		expect(() => unmount()).not.toThrow();
	});
});
