/**
 * Transposed from the Svelte package's `DatamoshTransition.test.ts`. The
 * imperative API reaches the test through the forwarded ref (the React
 * counterpart of the Svelte component instance).
 */
import { act, cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DatamoshTransition, type DatamoshTransitionHandle } from "./DatamoshTransition.js";

// --- harness ------------------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafCounter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	rafCallbacks.push(cb);
	return ++rafCounter;
});
const caf = vi.fn();

class MockRO {
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
}

const originalMatchMedia = window.matchMedia;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

function stubReducedMotion(matches: boolean) {
	window.matchMedia = ((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	})) as typeof window.matchMedia;
}

type FakeCtx = {
	fillRect: ReturnType<typeof vi.fn>;
	clearRect: ReturnType<typeof vi.fn>;
	fillStyle: unknown;
	imageSmoothingEnabled: boolean;
	styles: unknown[];
};

function fakeCtx(): FakeCtx {
	const ctx: FakeCtx = {
		fillRect: vi.fn(),
		clearRect: vi.fn(),
		fillStyle: "",
		imageSmoothingEnabled: true,
		styles: [],
	};
	let style: unknown = "";
	Object.defineProperty(ctx, "fillStyle", {
		get: () => style,
		set: (v) => {
			style = v;
			ctx.styles.push(v);
		},
	});
	return ctx;
}

/** Install a fake 2D context and a 440×300 box. */
function withCanvas() {
	const ctx = fakeCtx();
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never;
	Object.defineProperty(HTMLElement.prototype, "clientWidth", {
		configurable: true,
		get: () => 440,
	});
	Object.defineProperty(HTMLElement.prototype, "clientHeight", {
		configurable: true,
		get: () => 300,
	});
	return ctx;
}

function restoreBox() {
	delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
	delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
}

/** Run frames every 16 ms from `from` until `until` (ms) or no frame is pending. */
function runFrames(from: number, until: number) {
	let t = from;
	act(() => {
		while (rafCallbacks.length && t <= until) {
			const cbs = rafCallbacks.splice(0);
			for (const cb of cbs) cb(t);
			t += 16;
		}
	});
	return t;
}

function getHost(container: HTMLElement) {
	return container.querySelector(".datamosh-transition") as HTMLDivElement;
}

function setup(props: Parameters<typeof DatamoshTransition>[0] = {}) {
	const ref = createRef<DatamoshTransitionHandle>();
	const utils = render(<DatamoshTransition ref={ref} {...props} />);
	return { ...utils, api: ref };
}

beforeEach(() => {
	rafCallbacks = [];
	raf.mockClear();
	caf.mockClear();
	vi.stubGlobal("requestAnimationFrame", raf);
	vi.stubGlobal("cancelAnimationFrame", caf);
	vi.stubGlobal("ResizeObserver", MockRO);
	stubReducedMotion(false);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.matchMedia = originalMatchMedia;
	HTMLCanvasElement.prototype.getContext = originalGetContext;
	restoreBox();
});

// --- tests --------------------------------------------------------------------

describe("DatamoshTransition", () => {
	it("renders an idle, click-through, hidden overlay and forwards attributes", () => {
		const { container } = render(<DatamoshTransition className="custom" data-testid="dm" />);
		const host = getHost(container);
		expect(host.classList.contains("custom")).toBe(true);
		expect(host.classList.contains("fixed")).toBe(true);
		expect(host.classList.contains("invisible")).toBe(true);
		expect(host.classList.contains("pointer-events-none")).toBe(true);
		expect(host.getAttribute("aria-hidden")).toBe("true");
		expect(host.getAttribute("data-testid")).toBe("dm");
		expect(host.dataset.state).toBe("idle");
		expect(host.style.zIndex).toBe("9999");
		expect(raf).not.toHaveBeenCalled();
	});

	it("uses absolute positioning when contained", () => {
		const { container } = render(<DatamoshTransition contained />);
		expect(getHost(container).classList.contains("absolute")).toBe(true);
	});

	it("exposes the overlay element on the handle", () => {
		const { container, api } = setup();
		expect(api.current?.element).toBe(getHost(container));
	});

	it("resolves at once without a 2D context (default jsdom)", async () => {
		const oncovered = vi.fn();
		const onrevealed = vi.fn();
		const onPhaseChange = vi.fn();
		const { container, api } = setup({ oncovered, onrevealed, onPhaseChange });
		await act(() => api.current!.cover());
		expect(getHost(container).dataset.state).toBe("covered");
		expect(oncovered).toHaveBeenCalledTimes(1);
		await act(() => api.current!.reveal());
		expect(getHost(container).dataset.state).toBe("idle");
		expect(onrevealed).toHaveBeenCalledTimes(1);
		expect(onPhaseChange.mock.calls.map((c) => c[0])).toEqual([
			"covering",
			"covered",
			"revealing",
			"idle",
		]);
		expect(raf).not.toHaveBeenCalled();
	});

	it("animates a cover, keeps moshing while covered, then reveals and stops", async () => {
		const ctx = withCanvas();
		const oncovered = vi.fn();
		const { container, api } = setup({ oncovered });
		const host = getHost(container);

		let covered = false;
		act(() => {
			void api.current!.cover().then(() => (covered = true));
		});
		expect(host.dataset.state).toBe("covering");
		expect(host.classList.contains("pointer-events-auto")).toBe(true);
		expect(raf).toHaveBeenCalled();

		let t = runFrames(0, 100);
		expect(covered).toBe(false);
		expect(ctx.fillRect).toHaveBeenCalled();
		t = runFrames(t, 3000);
		await act(async () => {});
		expect(covered).toBe(true);
		expect(oncovered).toHaveBeenCalledTimes(1);
		expect(host.dataset.state).toBe("covered");
		// still looping while covered
		expect(rafCallbacks.length).toBe(1);
		// saturated palette colours reach the canvas
		expect(ctx.styles).toContain("#ffffff");

		let revealed = false;
		act(() => {
			void api.current!.reveal().then(() => (revealed = true));
		});
		runFrames(t, t + 3000);
		await act(async () => {});
		expect(revealed).toBe(true);
		expect(host.dataset.state).toBe("idle");
		expect(rafCallbacks.length).toBe(0);
	});

	it("resolves a superseded cover when reveal interrupts it", async () => {
		withCanvas();
		const { api } = setup();
		let coverDone = false;
		act(() => {
			void api.current!.cover().then(() => (coverDone = true));
		});
		runFrames(0, 80);
		act(() => {
			void api.current!.reveal();
		});
		await act(async () => {});
		expect(coverDone).toBe(true);
	});

	it("covers and reveals instantly under reduced motion, drawing one still frame", async () => {
		stubReducedMotion(true);
		const ctx = withCanvas();
		const { container, api } = setup();
		await act(() => api.current!.cover());
		expect(getHost(container).dataset.state).toBe("covered");
		expect(ctx.fillRect).toHaveBeenCalled();
		expect(raf).not.toHaveBeenCalled();
		await act(() => api.current!.reveal());
		expect(getHost(container).dataset.state).toBe("idle");
	});

	it("play() covers then reveals", async () => {
		const onrevealed = vi.fn();
		const { api } = setup({ onrevealed });
		await act(() => api.current!.play());
		expect(onrevealed).toHaveBeenCalledTimes(1);
	});

	it("cancels the loop and resolves pending promises on unmount", async () => {
		withCanvas();
		const { api, unmount } = setup();
		let done = false;
		act(() => {
			void api.current!.cover().then(() => (done = true));
		});
		unmount();
		await act(async () => {});
		expect(done).toBe(true);
		expect(caf).toHaveBeenCalled();
	});

	it.each(["curtain", "rise", "split", "interlace"] as const)(
		"%s covers and reveals",
		async (variant) => {
			const ctx = withCanvas();
			const { container, api } = setup({ variant, sweep: "center", colors: "thermal" });
			let covered = false;
			act(() => {
				void api.current!.cover().then(() => (covered = true));
			});
			const t = runFrames(0, 3000);
			await act(async () => {});
			expect(covered).toBe(true);
			expect(ctx.styles).toContain("#fff4d6");
			let revealed = false;
			act(() => {
				void api.current!.reveal().then(() => (revealed = true));
			});
			runFrames(t, t + 3000);
			await act(async () => {});
			expect(revealed).toBe(true);
			expect(getHost(container).dataset.state).toBe("idle");
		}
	);

	it("falls back to the palette while a picture source has not loaded", () => {
		const ctx = withCanvas();
		const { api } = setup({ source: "data:image/svg+xml,%3Csvg%2F%3E", colors: "mono" });
		act(() => {
			void api.current!.cover();
		});
		runFrames(0, 200);
		expect(ctx.styles).toContain("#ffffff");
	});
});
