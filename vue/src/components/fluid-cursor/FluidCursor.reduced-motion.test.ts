import { render, cleanup } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Reduced-motion contract: with `prefers-reduced-motion: reduce` no engine
 * (and so no rAF loop, no pointer listeners, no GPU context) exists, and a
 * live change of the preference stops or starts the simulation without
 * remounting the component. The core is mocked, as in the live-props suite:
 * jsdom has no WebGL context, so the real engine never gets that far.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./fluid-cursor-core.js", () => ({ createFluidCursor: mocks.create }));

const FluidCursor = (await import("./FluidCursor.vue")).default;

const REDUCE = "(prefers-reduced-motion: reduce)";

/** A `matchMedia` whose reduced-motion answer the test controls. */
function stubReducedMotion(initial: boolean) {
	let matches = initial;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	window.matchMedia = ((query: string) => ({
		get matches() {
			return query === REDUCE ? matches : false;
		},
		media: query,
		onchange: null,
		addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
			if (query === REDUCE) listeners.add(listener);
		},
		removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
			listeners.delete(listener);
		},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	})) as unknown as typeof window.matchMedia;
	return {
		async set(next: boolean) {
			matches = next;
			for (const listener of [...listeners]) {
				listener({ matches: next, media: REDUCE } as MediaQueryListEvent);
			}
			await nextTick();
		},
		listenerCount: () => listeners.size,
	};
}

describe("FluidCursor reduced motion", () => {
	const originalMatchMedia = window.matchMedia;

	beforeEach(() => {
		mocks.create.mockReset();
		mocks.setOptions.mockReset();
		mocks.resize.mockReset();
		mocks.destroy.mockReset();
		mocks.create.mockReturnValue({
			setOptions: mocks.setOptions,
			resize: mocks.resize,
			destroy: mocks.destroy,
		});
	});

	afterEach(() => {
		cleanup();
		window.matchMedia = originalMatchMedia;
	});

	it("starts no engine when reduced motion is preferred at mount", () => {
		stubReducedMotion(true);
		const { container } = render(FluidCursor, { props: {} });
		expect(mocks.create).not.toHaveBeenCalled();
		// Static rendering: the empty, pointer-transparent canvas layer stays.
		expect(container.querySelector("canvas")).toBeInTheDocument();
		expect((container.firstElementChild as HTMLElement).className).toContain("pointer-events-none");
	});

	it("starts the engine when the preference flips back, without remounting", async () => {
		const media = stubReducedMotion(true);
		const { container } = render(FluidCursor, { props: { curl: 7 } });
		const root = container.firstElementChild;
		expect(mocks.create).not.toHaveBeenCalled();
		await media.set(false);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas).toBe(
			container.querySelector("canvas")
		);
		expect(options).toMatchObject({ curl: 7 });
		expect(container.firstElementChild).toBe(root);
	});

	it("stops the running engine when reduced motion turns on mid-session", async () => {
		const media = stubReducedMotion(false);
		const { container } = render(FluidCursor, { props: {} });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const liveCanvas = container.querySelector("canvas");
		await media.set(true);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		// The drawn canvas is swapped for a blank one, so no frozen frame stays.
		expect(container.querySelector("canvas")).not.toBe(liveCanvas);
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("restarts on a fresh canvas after a reduce → allow round trip", async () => {
		const media = stubReducedMotion(false);
		const { container } = render(FluidCursor, { props: {} });
		const first = (mocks.create.mock.calls[0]![0] as { canvas: HTMLCanvasElement }).canvas;
		await media.set(true);
		await media.set(false);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		const second = (mocks.create.mock.calls[1]![0] as { canvas: HTMLCanvasElement }).canvas;
		// A destroyed engine has lost its GPU context; a lost context cannot be
		// reacquired from the same element.
		expect(second).not.toBe(first);
		expect(second).toBe(container.querySelector("canvas"));
	});

	it("detaches the preference listener on unmount", () => {
		const media = stubReducedMotion(false);
		const { unmount } = render(FluidCursor, { props: {} });
		expect(media.listenerCount()).toBe(1);
		unmount();
		expect(media.listenerCount()).toBe(0);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});
});
