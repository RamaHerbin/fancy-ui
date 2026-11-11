import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";
import type { FireworksHandle } from "./fireworks-shared.js";

/**
 * Regression net for the wrapper's contract with the shared engine.
 *
 * FireworksHdr.test.tsx runs the real engine against a stubbed renderer, which
 * proves the boot and the listeners behave but cannot see *how* the wrapper
 * talks to the engine. Here the core is mocked, so every creation, live push
 * and teardown is observable: a prop change must never reboot the GPU engine.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./fireworks-hdr-core.js", () => ({ createFireworksHdr: mocks.create }));

const { FireworksHdr } = await import("./FireworksHdr.js");

type CreateOptions = {
	reducedMotion: boolean;
	onReady: (handle: FireworksHandle) => void;
	onLost: () => void;
	onDestroy: () => void;
	[key: string]: unknown;
};

function createdOptions(call = 0): CreateOptions {
	return mocks.create.mock.calls[call]![1] as CreateOptions;
}

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: matches && query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("FireworksHdr ↔ engine contract", () => {
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

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("creates the engine once, with every option at its mount value", () => {
		const shells = ["heart" as const];
		const palette = ["#ffffff"];
		render(
			<FireworksHdr
				palette={palette}
				exposure={2}
				ambient={false}
				ambientIntensity={0.8}
				interactive={false}
				quality="low"
				ambientShells={shells}
				hdr
			/>
		);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options, random] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect(options).toMatchObject({
			palette,
			exposure: 2,
			ambient: false,
			ambientIntensity: 0.8,
			interactive: false,
			quality: "low",
			ambientShells: shells,
			hdr: true,
			reducedMotion: false,
			// Vitest runs with NODE_ENV=test, which `isDev()` reads as dev.
			debug: true,
		});
		// No seed prop: the engine's own default randomness is used.
		expect(random).toBeUndefined();
	});

	it.each([
		["quality", { quality: "mid" as const }],
		["interactive", { interactive: false }],
	])("forwards a %s change into the running engine", (_name, change) => {
		const { rerender } = render(<FireworksHdr />);
		mocks.setOptions.mockClear();
		rerender(<FireworksHdr {...change} />);
		expect(mocks.setOptions).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenCalledWith({
			quality: "auto",
			interactive: true,
			...change,
		});
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("never reboots the engine, and pushes nothing, on a mount-only prop change", () => {
		const { rerender } = render(<FireworksHdr />);
		mocks.setOptions.mockClear();
		rerender(
			<FireworksHdr
				palette={["#000000"]}
				hdr={false}
				exposure={3}
				ambient={false}
				ambientIntensity={1}
				ambientShells={["ring"]}
				respectReducedMotion={false}
				className="x"
			/>
		);
		expect(mocks.setOptions).not.toHaveBeenCalled();
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("keeps onReady / onLost current without rebooting the engine", () => {
		const firstReady = vi.fn();
		const secondReady = vi.fn();
		const firstLost = vi.fn();
		const secondLost = vi.fn();
		const { rerender } = render(<FireworksHdr onReady={firstReady} onLost={firstLost} />);
		const { onReady, onLost } = createdOptions();
		rerender(<FireworksHdr onReady={secondReady} onLost={secondLost} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);

		// A late activation (async boot, post-loss recovery) reaches the latest callback.
		const handle = { renderLevel: "webgl-sdr" } as FireworksHandle;
		onReady(handle);
		onLost();
		expect(firstReady).not.toHaveBeenCalled();
		expect(firstLost).not.toHaveBeenCalled();
		expect(secondReady).toHaveBeenCalledWith(handle);
		expect(secondLost).toHaveBeenCalledTimes(1);
	});

	it("is safe when no callback is passed", () => {
		render(<FireworksHdr />);
		const { onReady, onLost } = createdOptions();
		expect(() => onReady({} as FireworksHandle)).not.toThrow();
		expect(() => onLost()).not.toThrow();
	});

	it("forwards the IntersectionObserver gate and resizes into the engine", () => {
		render(<FireworksHdr />);
		const io = FakeIntersectionObserver.instances.at(-1)!;
		expect(io.options).toEqual({ threshold: 0 });
		io.trigger(false);
		expect(mocks.setOptions).toHaveBeenCalledWith({ visible: false });
		io.trigger(true);
		expect(mocks.setOptions).toHaveBeenCalledWith({ visible: true });
	});

	it("observes before the engine exists and releases the observers on engine teardown", () => {
		render(<FireworksHdr />);
		const io = FakeIntersectionObserver.instances.at(-1)!;
		expect(io.elements.size).toBe(1);
		// The give-up after an unrecoverable loss (or the handle's cleanup())
		// tears the engine down from inside; the observers must go with it.
		createdOptions().onDestroy();
		expect(io.elements.size).toBe(0);
	});

	it("destroys the engine and disconnects the observers on unmount", () => {
		const { unmount } = render(<FireworksHdr />);
		const io = FakeIntersectionObserver.instances.at(-1)!;
		unmount();
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(io.elements.size).toBe(0);
	});

	it("StrictMode: every engine started is destroyed, and exactly one survives until unmount", () => {
		const { unmount, rerender } = render(
			<StrictMode>
				<FireworksHdr />
			</StrictMode>
		);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.create.mock.calls[0]![0].canvas).toBe(mocks.create.mock.calls[1]![0].canvas);
		mocks.setOptions.mockClear();
		rerender(
			<StrictMode>
				<FireworksHdr quality="low" />
			</StrictMode>
		);
		expect(mocks.setOptions).toHaveBeenCalledWith({ quality: "low", interactive: true });
		expect(mocks.create).toHaveBeenCalledTimes(2);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(2);
	});

	it("hands the engine the reduced-motion answer when the preference is on", () => {
		stubReducedMotion(true);
		render(<FireworksHdr />);
		expect(createdOptions().reducedMotion).toBe(true);
	});

	it("ignores the preference when respectReducedMotion={false}", () => {
		stubReducedMotion(true);
		render(<FireworksHdr respectReducedMotion={false} />);
		expect(createdOptions().reducedMotion).toBe(false);
	});

	it("snapshots reduced motion at mount: a later preference change does not reboot the engine", () => {
		stubReducedMotion(false);
		const { rerender } = render(<FireworksHdr />);
		stubReducedMotion(true);
		rerender(<FireworksHdr className="re-render" />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
		expect(createdOptions().reducedMotion).toBe(false);
	});

	it("is safe when the engine could not be created", () => {
		mocks.create.mockImplementation(() => null);
		const { rerender, unmount } = render(<FireworksHdr />);
		expect(() => rerender(<FireworksHdr quality="low" />)).not.toThrow();
		expect(() => unmount()).not.toThrow();
		expect(mocks.setOptions).not.toHaveBeenCalled();
	});
});
