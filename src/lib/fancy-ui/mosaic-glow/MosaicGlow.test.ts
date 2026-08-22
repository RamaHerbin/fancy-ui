import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MosaicGlow from "./MosaicGlow.svelte";

// --- harness ------------------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafCounter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	rafCallbacks.push(cb);
	return ++rafCounter;
});
const caf = vi.fn();

class MockIO {
	static instances: MockIO[] = [];
	cb: IntersectionObserverCallback;
	constructor(cb: IntersectionObserverCallback) {
		this.cb = cb;
		MockIO.instances.push(this);
	}
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
	trigger(isIntersecting: boolean) {
		this.cb(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

class MockRO {
	static instances: MockRO[] = [];
	constructor(_cb: ResizeObserverCallback) {
		MockRO.instances.push(this);
	}
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
	drawImage: ReturnType<typeof vi.fn>;
	createRadialGradient: ReturnType<typeof vi.fn>;
	fillStyle: unknown;
	globalCompositeOperation: string;
	styles: unknown[];
};

function fakeCtx(): FakeCtx {
	const ctx: FakeCtx = {
		fillRect: vi.fn(),
		drawImage: vi.fn(),
		createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
		fillStyle: "",
		globalCompositeOperation: "source-over",
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

/** Install a fake 2D context and a 200×120 host box. */
function withCanvas() {
	const ctx = fakeCtx();
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never;
	Object.defineProperty(HTMLElement.prototype, "clientWidth", {
		configurable: true,
		get: () => 200,
	});
	Object.defineProperty(HTMLElement.prototype, "clientHeight", {
		configurable: true,
		get: () => 120,
	});
	return ctx;
}

function restoreBox() {
	// jsdom defines clientWidth/clientHeight on Element.prototype; drop our overrides
	delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
	delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
}

/** Run every pending rAF callback with the given timestamp (ms). */
function frame(t: number) {
	const cbs = rafCallbacks.splice(0);
	for (const cb of cbs) cb(t);
}

function textSnippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function getHost(container: HTMLElement) {
	return container.querySelector(".mosaic-glow") as HTMLDivElement;
}

beforeEach(() => {
	rafCallbacks = [];
	raf.mockClear();
	caf.mockClear();
	vi.stubGlobal("requestAnimationFrame", raf);
	vi.stubGlobal("cancelAnimationFrame", caf);
	vi.stubGlobal("IntersectionObserver", MockIO);
	vi.stubGlobal("ResizeObserver", MockRO);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.matchMedia = originalMatchMedia;
	HTMLCanvasElement.prototype.getContext = originalGetContext;
	restoreBox();
	MockIO.instances = [];
	MockRO.instances = [];
});

// --- tests --------------------------------------------------------------------

describe("MosaicGlow", () => {
	it("renders host, canvas and children, merges classes and forwards attributes", () => {
		const { container } = render(MosaicGlow, {
			props: {
				class: "custom h-40",
				"data-testid": "mg",
				children: textSnippet("<p data-testid='content'>hi</p>"),
			} as never,
		});
		const host = getHost(container);
		expect(host).toBeTruthy();
		expect(host.classList.contains("custom")).toBe(true);
		expect(host.classList.contains("h-40")).toBe(true);
		expect(host.getAttribute("data-testid")).toBe("mg");
		expect(host.querySelector("canvas")).toBeTruthy();
		expect(host.querySelector(".mosaic-glow__content")).toBeTruthy();
		expect(host.querySelector("[data-testid='content']")).toBeTruthy();
	});

	it("omits the content wrapper without children", () => {
		const { container } = render(MosaicGlow);
		expect(container.querySelector(".mosaic-glow__content")).toBeNull();
	});

	it("accepts a ref binding and exposes the host as a div", async () => {
		const { container } = render(MosaicGlow, { props: { ref: null } });
		await tick();
		expect(getHost(container)).toBeInstanceOf(HTMLDivElement);
	});

	it("stays inert without a 2D context (default jsdom) and does not throw on events", async () => {
		const { container } = render(MosaicGlow);
		const host = getHost(container);
		expect(raf).not.toHaveBeenCalled();
		await fireEvent.pointerMove(host, { clientX: 10, clientY: 10 });
		await fireEvent.pointerLeave(host);
		expect(raf).not.toHaveBeenCalled();
	});

	it("draws tiles on the first frame and keeps drifting when idle", () => {
		const ctx = withCanvas();
		render(MosaicGlow, { props: { idle: "drift" } });
		expect(raf).toHaveBeenCalledTimes(1);
		frame(16);
		expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(60); // 10×6 tiles + background
		expect(ctx.styles.some((s) => typeof s === "string" && s.startsWith("rgb("))).toBe(true);
		// bloom pass used the additive composite
		expect(ctx.createRadialGradient).toHaveBeenCalled();
		// still alive: drifting keeps the loop scheduled
		expect(rafCallbacks.length).toBe(1);
	});

	it('draws once and stops with idle="none" and no flicker', () => {
		const ctx = withCanvas();
		render(MosaicGlow, { props: { idle: "none", flicker: false } });
		frame(16);
		expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(60);
		expect(rafCallbacks.length).toBe(0);
	});

	it("schedules a frame on pointermove over the host and over a child", async () => {
		withCanvas();
		const { container } = render(MosaicGlow, {
			props: {
				idle: "none",
				flicker: false,
				children: textSnippet("<button data-testid='btn'>go</button>"),
			},
		});
		frame(16);
		expect(rafCallbacks.length).toBe(0);
		const host = getHost(container);
		await fireEvent.pointerMove(host, { clientX: 50, clientY: 30 });
		expect(rafCallbacks.length).toBe(1);
		frame(32);
		expect(rafCallbacks.length).toBe(1); // pointer is over → keeps going
		frame(48);
		const btn = container.querySelector("[data-testid='btn']") as HTMLElement;
		await fireEvent.pointerMove(btn, { clientX: 60, clientY: 40 });
		expect(rafCallbacks.length).toBe(1);
	});

	it("decays after pointerleave and the loop terminates", async () => {
		withCanvas();
		const { container } = render(MosaicGlow, { props: { idle: "none", flicker: false } });
		frame(16);
		const host = getHost(container);
		await fireEvent.pointerMove(host, { clientX: 100, clientY: 60 });
		let t = 16;
		for (let i = 0; i < 20; i++) frame((t += 16));
		await fireEvent.pointerLeave(host);
		let frames = 0;
		while (rafCallbacks.length > 0 && frames < 300) {
			frame((t += 16));
			frames++;
		}
		expect(rafCallbacks.length).toBe(0);
		expect(frames).toBeGreaterThan(5);
		expect(frames).toBeLessThan(300);
	});

	it("never starts a loop under reduced motion and paints synchronously on pointermove", async () => {
		const ctx = withCanvas();
		stubReducedMotion(true);
		const { container } = render(MosaicGlow);
		expect(raf).not.toHaveBeenCalled();
		const painted = ctx.fillRect.mock.calls.length;
		expect(painted).toBeGreaterThan(0); // static frame at mount
		const host = getHost(container);
		await fireEvent.pointerMove(host, { clientX: 20, clientY: 20 });
		expect(raf).not.toHaveBeenCalled();
		expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(painted);
	});

	it("attaches no pointer listeners when interactive is false", () => {
		withCanvas();
		const spy = vi.spyOn(HTMLElement.prototype, "addEventListener");
		render(MosaicGlow, { props: { interactive: false } });
		const types = spy.mock.calls.map((c) => c[0]);
		expect(types).not.toContain("pointermove");
		expect(types).not.toContain("pointerleave");
		spy.mockRestore();
	});

	it("pauses offscreen and resumes when visible again", () => {
		withCanvas();
		render(MosaicGlow, { props: { idle: "drift" } });
		frame(16);
		expect(rafCallbacks.length).toBe(1);
		const io = MockIO.instances[0];
		expect(io).toBeTruthy();
		io.trigger(false);
		expect(caf).toHaveBeenCalled();
		rafCallbacks = [];
		raf.mockClear();
		io.trigger(true);
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("cancels the frame and disconnects observers on unmount", () => {
		withCanvas();
		const { unmount } = render(MosaicGlow, { props: { idle: "drift" } });
		frame(16);
		const io = MockIO.instances[0];
		const ro = MockRO.instances[0];
		unmount();
		expect(caf).toHaveBeenCalled();
		expect(io.disconnect).toHaveBeenCalled();
		expect(ro.disconnect).toHaveBeenCalled();
	});

	it("rebuilds the colour ramp when color changes", async () => {
		const ctx = withCanvas();
		const { rerender } = render(MosaicGlow, { props: { idle: "none", flicker: false } });
		frame(16);
		const before = new Set(ctx.styles.filter((s): s is string => typeof s === "string"));
		ctx.styles.length = 0;
		await rerender({ idle: "none", flicker: false, color: "#00ffff" });
		frame(32);
		const after = ctx.styles.filter(
			(s): s is string => typeof s === "string" && s.startsWith("rgb(")
		);
		expect(after.length).toBeGreaterThan(0);
		expect(after.some((s) => !before.has(s))).toBe(true);
	});
});
