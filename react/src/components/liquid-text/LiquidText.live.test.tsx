import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiquidTextInitOptions, LiquidTextLiveOptions } from "./liquid-text-core.js";

/**
 * Regression net for the wrapper's contract with the shared engine.
 *
 * LiquidText.test.tsx runs the real engine against a fake GL context, which
 * proves the sim starts, survives StrictMode and releases its listeners, but
 * cannot see *how* the wrapper talks to the engine. Here `createLiquidText` is
 * mocked (the real `measureLiquidText` and constants stay), so every creation,
 * live push and teardown is observable: a prop change must reach the running
 * engine through `setOptions` and must never rebuild the simulation.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./liquid-text-core.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./liquid-text-core.js")>()),
	createLiquidText: mocks.create,
}));

const { LiquidText } = await import("./LiquidText.js");

type EngineOptions = LiquidTextInitOptions & LiquidTextLiveOptions;

function lastOptions(): EngineOptions {
	return mocks.create.mock.calls.at(-1)![1] as EngineOptions;
}

/**
 * A `matchMedia` whose reduced-motion answer can be flipped mid-test, firing
 * `change` on every list handed out, like a real OS preference toggle.
 */
function installMatchMedia(initiallyReduced = false) {
	const original = window.matchMedia;
	let reduced = initiallyReduced;
	const listeners = new Set<() => void>();
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			get matches() {
				return query.includes("prefers-reduced-motion") && reduced;
			},
			media: query,
			onchange: null,
			addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
			removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
	return {
		set(next: boolean) {
			reduced = next;
			act(() => {
				for (const listener of [...listeners]) listener();
			});
		},
		restore() {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: original,
			});
		},
	};
}

describe("LiquidText engine contract", () => {
	let media: ReturnType<typeof installMatchMedia>;

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
		media = installMatchMedia();
	});

	afterEach(() => {
		cleanup();
		media.restore();
		document.documentElement.classList.remove("dark");
	});

	it("creates the engine once, on the host and canvas, with every option at its mount value", () => {
		const { container } = render(
			<LiquidText text="Hi" font="Georgia" fontSize={40} strength={0.9} staticBelow={0} />
		);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		const root = container.firstElementChild as HTMLElement;
		expect(elements).toEqual({ host: root, canvas: root.querySelector("canvas") });
		expect(options).toMatchObject({
			text: "Hi",
			font: "Georgia",
			fontSize: 40,
			fontWeight: 700,
			textColor: "#000000",
			strength: 0.9,
			radius: 160,
			forceGain: 17,
			dissipation: 0.98,
			viscosity: 4,
			chromaticRatio: 0.2,
			interactive: true,
			pauseWhenHidden: true,
		});
		// The wrapper-only props never reach the engine.
		expect(options).not.toHaveProperty("staticBelow");
		expect(options).not.toHaveProperty("lightColor");
		expect(screen.getByText("Hi").className).toContain("sr-only");
	});

	it("keeps the WebGL context across teardowns: the canvas element is reused", () => {
		render(<LiquidText staticBelow={0} />);
		expect(lastOptions().releaseContext).toBe(false);
	});

	it("starts the dark color when the page is already dark", () => {
		document.documentElement.classList.add("dark");
		render(<LiquidText staticBelow={0} darkColor="#abcdef" />);
		expect(lastOptions().textColor).toBe("#abcdef");
	});

	it("does not start the engine at or below staticBelow", () => {
		render(<LiquidText staticBelow={window.innerWidth} />);
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it("does not start the engine when reduced motion is preferred at mount", () => {
		media.restore();
		media = installMatchMedia(true);
		render(<LiquidText staticBelow={0} text="Still" />);
		expect(mocks.create).not.toHaveBeenCalled();
		expect(screen.getByText("Still").className).toContain("liquid-text-fallback");
	});

	it.each([
		["strength", { strength: 0.1 }],
		["radius", { radius: 40 }],
		["forceGain", { forceGain: 3 }],
		["dissipation", { dissipation: 0.5 }],
		["viscosity", { viscosity: 1 }],
		["chromaticRatio", { chromaticRatio: 0.9 }],
		["interactive", { interactive: false }],
		["pauseWhenHidden", { pauseWhenHidden: false }],
	])("forwards a %s change into the running engine", (_name, change) => {
		const { rerender } = render(<LiquidText staticBelow={0} />);
		mocks.setOptions.mockClear();
		rerender(<LiquidText staticBelow={0} {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions.mock.calls[0]![0]).toMatchObject(change);
		// Sim parameters never touch the text texture.
		expect(mocks.setOptions.mock.calls[0]![0]).not.toHaveProperty("text");
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it.each([
		["text", { text: "Other" }],
		["font", { font: "Courier" }],
		["fontSize", { fontSize: 22 }],
		["fontWeight", { fontWeight: 300 }],
		["lightColor", { lightColor: "#ff0000" }],
	])("pushes a %s change as one text/font update, without recreating", (_name, change) => {
		const { rerender } = render(<LiquidText staticBelow={0} />);
		mocks.setOptions.mockClear();
		rerender(<LiquidText staticBelow={0} {...change} />);
		const expected = {
			text: "Liquid",
			font: "",
			fontSize: 0,
			fontWeight: 700,
			textColor: "#000000",
			...change,
		};
		if ("lightColor" in change) {
			delete (expected as Record<string, unknown>).lightColor;
			expected.textColor = change.lightColor;
		}
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenCalledWith(expected);
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("does not push sim or text options to the engine while static", () => {
		const { rerender } = render(<LiquidText text="A" />);
		rerender(<LiquidText text="B" strength={0.1} />);
		expect(mocks.create).not.toHaveBeenCalled();
		expect(mocks.setOptions).not.toHaveBeenCalled();
	});

	it("mirrors the engine's metrics into the root height and font state", () => {
		const { container } = render(<LiquidText staticBelow={0} />);
		const root = container.firstElementChild as HTMLElement;
		act(() => lastOptions().onMetrics!({ font: "Serif", fontSize: 50 }));
		expect(root.style.height).toBe("60px");
	});

	it("pushes a theme change into the engine as a color-only update", async () => {
		render(<LiquidText staticBelow={0} darkColor="#eeeeee" />);
		mocks.setOptions.mockClear();
		await act(async () => {
			document.documentElement.classList.add("dark");
			// MutationObserver callbacks are microtasks.
			await Promise.resolve();
		});
		expect(mocks.setOptions).toHaveBeenCalledWith({ textColor: "#eeeeee" });
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("routes resize to the engine while the sim runs", () => {
		const callbacks: ResizeObserverCallback[] = [];
		const Original = window.ResizeObserver;
		window.ResizeObserver = class {
			constructor(cb: ResizeObserverCallback) {
				callbacks.push(cb);
			}
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		try {
			render(<LiquidText staticBelow={0} />);
			expect(callbacks).toHaveLength(1);
			act(() => callbacks[0]!([], {} as ResizeObserver));
			expect(mocks.resize).toHaveBeenCalledTimes(1);

			// After a context loss the same observer re-fits the fallback instead.
			act(() => lastOptions().onContextLost!());
			act(() => callbacks[0]!([], {} as ResizeObserver));
			expect(mocks.resize).toHaveBeenCalledTimes(1);
		} finally {
			window.ResizeObserver = Original;
		}
	});

	it("drops to the static text on a context loss and still destroys the engine on unmount", () => {
		const { container, rerender, unmount } = render(
			<LiquidText staticBelow={0} text="Lost" fontSize={30} />
		);
		act(() => lastOptions().onContextLost!());
		const textNode = screen.getByText("Lost");
		expect(textNode.className).toContain("liquid-text-fallback");
		expect(container.querySelector("canvas")!.className).toContain("invisible");

		// Text changes now go to the fallback markup, not the dead engine.
		mocks.setOptions.mockClear();
		rerender(<LiquidText staticBelow={0} text="Lost" fontSize={44} />);
		expect(mocks.setOptions).not.toHaveBeenCalledWith(expect.objectContaining({ fontSize: 44 }));
		expect(screen.getByText("Lost").style.fontSize).toBe("44px");

		expect(mocks.destroy).not.toHaveBeenCalled();
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("falls back to the static text when the engine cannot start", () => {
		mocks.create.mockImplementation(() => null);
		const { container } = render(<LiquidText staticBelow={0} text="Nope" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Nope").className).toContain("liquid-text-fallback");
		expect(container.querySelector("canvas")!.className).toContain("invisible");
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(<LiquidText staticBelow={0} />);
		expect(mocks.destroy).not.toHaveBeenCalled();
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode: every engine started but the last is destroyed, one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<LiquidText staticBelow={0} text="Strict" />
			</StrictMode>
		);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Strict").className).toContain("sr-only");
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(2);
	});

	it("tears the sim down when reduced motion turns on, and does not restart it when it turns off", () => {
		const { container } = render(<LiquidText staticBelow={0} text="Motion" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);

		media.set(true);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Motion").className).toContain("liquid-text-fallback");
		expect(container.querySelector("canvas")!.className).toContain("invisible");

		media.set(false);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		cleanup();
		// Already destroyed: unmount does not destroy it twice.
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});
});
