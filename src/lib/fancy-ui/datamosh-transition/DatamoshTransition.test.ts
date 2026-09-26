import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatamoshTransition from "./DatamoshTransition.svelte";

// --- harness ------------------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafCounter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	rafCallbacks.push(cb);
	return ++rafCounter;
});
const caf = vi.fn();

class MockRO {
	static instances: MockRO[] = [];
	cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
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
	while (rafCallbacks.length && t <= until) {
		const cbs = rafCallbacks.splice(0);
		for (const cb of cbs) cb(t);
		t += 16;
	}
	return t;
}

function getHost(container: HTMLElement) {
	return container.querySelector(".datamosh-transition") as HTMLDivElement;
}

type Api = {
	cover: () => Promise<void>;
	reveal: () => Promise<void>;
	play: () => Promise<void>;
};

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
	MockRO.instances = [];
});

// --- tests --------------------------------------------------------------------

describe("DatamoshTransition", () => {
	it("renders an idle, click-through, hidden overlay and forwards attributes", () => {
		const { container } = render(DatamoshTransition, {
			props: { class: "custom", "data-testid": "dm" } as never,
		});
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
		const { container } = render(DatamoshTransition, { props: { contained: true } });
		expect(getHost(container).classList.contains("absolute")).toBe(true);
	});

	it("resolves at once without a 2D context (default jsdom)", async () => {
		const oncovered = vi.fn();
		const onrevealed = vi.fn();
		const { component, container } = render(DatamoshTransition, {
			props: { oncovered, onrevealed },
		});
		const api = component as unknown as Api;
		await api.cover();
		await tick();
		expect(getHost(container).dataset.state).toBe("covered");
		expect(oncovered).toHaveBeenCalledTimes(1);
		await api.reveal();
		await tick();
		expect(getHost(container).dataset.state).toBe("idle");
		expect(onrevealed).toHaveBeenCalledTimes(1);
		expect(raf).not.toHaveBeenCalled();
	});

	it("animates a cover, keeps moshing while covered, then reveals and stops", async () => {
		const ctx = withCanvas();
		const oncovered = vi.fn();
		const { component, container } = render(DatamoshTransition, { props: { oncovered } });
		const api = component as unknown as Api;
		const host = getHost(container);

		let covered = false;
		void api.cover().then(() => (covered = true));
		await tick();
		expect(host.dataset.state).toBe("covering");
		expect(host.classList.contains("pointer-events-auto")).toBe(true);
		expect(raf).toHaveBeenCalled();

		let t = runFrames(0, 100);
		expect(covered).toBe(false);
		expect(ctx.fillRect).toHaveBeenCalled();
		t = runFrames(t, 3000);
		await tick();
		expect(covered).toBe(true);
		expect(oncovered).toHaveBeenCalledTimes(1);
		expect(host.dataset.state).toBe("covered");
		// still looping while covered
		expect(rafCallbacks.length).toBe(1);
		// saturated palette colours reach the canvas
		expect(ctx.styles).toContain("#ffffff");

		let revealed = false;
		void api.reveal().then(() => (revealed = true));
		runFrames(t, t + 3000);
		await tick();
		expect(revealed).toBe(true);
		expect(host.dataset.state).toBe("idle");
		expect(rafCallbacks.length).toBe(0);
	});

	it("resolves a superseded cover when reveal interrupts it", async () => {
		withCanvas();
		const { component } = render(DatamoshTransition);
		const api = component as unknown as Api;
		let coverDone = false;
		void api.cover().then(() => (coverDone = true));
		await tick();
		runFrames(0, 80);
		void api.reveal();
		await Promise.resolve();
		expect(coverDone).toBe(true);
	});

	it("covers and reveals instantly under reduced motion, drawing one still frame", async () => {
		stubReducedMotion(true);
		const ctx = withCanvas();
		const { component, container } = render(DatamoshTransition);
		await tick();
		const api = component as unknown as Api;
		await api.cover();
		await tick();
		expect(getHost(container).dataset.state).toBe("covered");
		expect(ctx.fillRect).toHaveBeenCalled();
		expect(raf).not.toHaveBeenCalled();
		await api.reveal();
		await tick();
		expect(getHost(container).dataset.state).toBe("idle");
	});

	it("play() covers then reveals", async () => {
		const onrevealed = vi.fn();
		const { component } = render(DatamoshTransition, { props: { onrevealed } });
		await (component as unknown as Api).play();
		expect(onrevealed).toHaveBeenCalledTimes(1);
	});

	it("cancels the loop and resolves pending promises on unmount", async () => {
		withCanvas();
		const { component, unmount } = render(DatamoshTransition);
		let done = false;
		void (component as unknown as Api).cover().then(() => (done = true));
		await tick();
		unmount();
		await Promise.resolve();
		expect(done).toBe(true);
		expect(caf).toHaveBeenCalled();
	});

	it.each(["curtain", "rise", "split", "interlace"] as const)(
		"%s covers and reveals",
		async (variant) => {
			const ctx = withCanvas();
			const { component, container } = render(DatamoshTransition, {
				props: { variant, sweep: "center", colors: "thermal" },
			});
			const api = component as unknown as Api;
			let covered = false;
			void api.cover().then(() => (covered = true));
			await tick();
			let t = runFrames(0, 3000);
			await tick();
			expect(covered).toBe(true);
			expect(ctx.styles).toContain("#fff4d6");
			let revealed = false;
			void api.reveal().then(() => (revealed = true));
			runFrames(t, t + 3000);
			await tick();
			expect(revealed).toBe(true);
			expect(getHost(container).dataset.state).toBe("idle");
		}
	);

	it("falls back to the palette while a picture source has not loaded", async () => {
		const ctx = withCanvas();
		const { component } = render(DatamoshTransition, {
			props: { source: "data:image/svg+xml,%3Csvg%2F%3E", colors: "mono" },
		});
		const api = component as unknown as Api;
		void api.cover();
		await tick();
		runFrames(0, 200);
		expect(ctx.styles).toContain("#ffffff");
	});
});
