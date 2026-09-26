import { mount, type VueWrapper } from "@vue/test-utils";
import { createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatamoshTransition from "./DatamoshTransition.vue";

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

type Api = {
	cover: () => Promise<void>;
	reveal: () => Promise<void>;
	play: () => Promise<void>;
	ref: HTMLDivElement | null;
};

// The Svelte suite reads `cover` / `reveal` / `play` off the component
// instance; here they are exposed, so mount through test-utils to reach `vm`.
const wrappers: VueWrapper[] = [];
function render(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
	const wrapper = mount(DatamoshTransition, { props, attrs });
	wrappers.push(wrapper);
	return {
		wrapper,
		api: wrapper.vm as unknown as Api,
		host: wrapper.element as HTMLDivElement,
		unmount: () => wrapper.unmount(),
	};
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
	for (const w of wrappers.splice(0)) {
		try {
			w.unmount();
		} catch {
			// already unmounted by the test
		}
	}
	vi.unstubAllGlobals();
	window.matchMedia = originalMatchMedia;
	HTMLCanvasElement.prototype.getContext = originalGetContext;
	restoreBox();
	MockRO.instances = [];
});

// --- tests --------------------------------------------------------------------

describe("DatamoshTransition", () => {
	it("renders an idle, click-through, hidden overlay and forwards attributes", () => {
		const { host, api } = render({ class: "custom" }, { "data-testid": "dm" });
		expect(host.classList.contains("custom")).toBe(true);
		expect(host.classList.contains("fixed")).toBe(true);
		expect(host.classList.contains("invisible")).toBe(true);
		expect(host.classList.contains("pointer-events-none")).toBe(true);
		expect(host.getAttribute("aria-hidden")).toBe("true");
		expect(host.getAttribute("data-testid")).toBe("dm");
		expect(host.dataset.state).toBe("idle");
		expect(host.style.zIndex).toBe("9999");
		expect(raf).not.toHaveBeenCalled();
		// Svelte's bindable `ref` is the exposed `ref`.
		expect(api.ref).toBe(host);
	});

	it("uses absolute positioning when contained", () => {
		const { host } = render({ contained: true });
		expect(host.classList.contains("absolute")).toBe(true);
	});

	it("resolves at once without a 2D context (default jsdom)", async () => {
		const oncovered = vi.fn();
		const onrevealed = vi.fn();
		const { api, host } = render({ oncovered, onrevealed });
		await api.cover();
		await nextTick();
		expect(host.dataset.state).toBe("covered");
		expect(oncovered).toHaveBeenCalledTimes(1);
		await api.reveal();
		await nextTick();
		expect(host.dataset.state).toBe("idle");
		expect(onrevealed).toHaveBeenCalledTimes(1);
		expect(raf).not.toHaveBeenCalled();
	});

	it("animates a cover, keeps moshing while covered, then reveals and stops", async () => {
		const ctx = withCanvas();
		const oncovered = vi.fn();
		const { api, host } = render({ oncovered });

		let covered = false;
		void api.cover().then(() => (covered = true));
		await nextTick();
		expect(host.dataset.state).toBe("covering");
		expect(host.classList.contains("pointer-events-auto")).toBe(true);
		expect(raf).toHaveBeenCalled();

		let t = runFrames(0, 100);
		expect(covered).toBe(false);
		expect(ctx.fillRect).toHaveBeenCalled();
		t = runFrames(t, 3000);
		await nextTick();
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
		await nextTick();
		expect(revealed).toBe(true);
		expect(host.dataset.state).toBe("idle");
		expect(rafCallbacks.length).toBe(0);
	});

	it("resolves a superseded cover when reveal interrupts it", async () => {
		withCanvas();
		const { api } = render();
		let coverDone = false;
		void api.cover().then(() => (coverDone = true));
		await nextTick();
		runFrames(0, 80);
		void api.reveal();
		await Promise.resolve();
		expect(coverDone).toBe(true);
	});

	it("covers and reveals instantly under reduced motion, drawing one still frame", async () => {
		stubReducedMotion(true);
		const ctx = withCanvas();
		const { api, host } = render();
		await nextTick();
		await api.cover();
		await nextTick();
		expect(host.dataset.state).toBe("covered");
		expect(ctx.fillRect).toHaveBeenCalled();
		expect(raf).not.toHaveBeenCalled();
		await api.reveal();
		await nextTick();
		expect(host.dataset.state).toBe("idle");
	});

	it("play() covers then reveals", async () => {
		const onrevealed = vi.fn();
		const { api } = render({ onrevealed });
		await api.play();
		expect(onrevealed).toHaveBeenCalledTimes(1);
	});

	it("cancels the loop and resolves pending promises on unmount", async () => {
		withCanvas();
		const { api, unmount } = render();
		let done = false;
		void api.cover().then(() => (done = true));
		await nextTick();
		unmount();
		await Promise.resolve();
		expect(done).toBe(true);
		expect(caf).toHaveBeenCalled();
	});

	it.each(["curtain", "rise", "split", "interlace"] as const)(
		"%s covers and reveals",
		async (variant) => {
			const ctx = withCanvas();
			const { api, host } = render({ variant, sweep: "center", colors: "thermal" });
			let covered = false;
			void api.cover().then(() => (covered = true));
			await nextTick();
			const t = runFrames(0, 3000);
			await nextTick();
			expect(covered).toBe(true);
			expect(ctx.styles).toContain("#fff4d6");
			let revealed = false;
			void api.reveal().then(() => (revealed = true));
			runFrames(t, t + 3000);
			await nextTick();
			expect(revealed).toBe(true);
			expect(host.dataset.state).toBe("idle");
		}
	);

	it("falls back to the palette while a picture source has not loaded", async () => {
		const ctx = withCanvas();
		const { api } = render({ source: "data:image/svg+xml,%3Csvg%2F%3E", colors: "mono" });
		void api.cover();
		await nextTick();
		runFrames(0, 200);
		expect(ctx.styles).toContain("#ffffff");
	});

	// Port addition: Svelte's `bind:phase` is `v-model:phase` here, and the
	// model hears every phase in order.
	it("reports every phase through v-model:phase", async () => {
		withCanvas();
		const seen: string[] = [];
		const { api } = render({ "onUpdate:phase": (p: string) => seen.push(p) });
		void api.cover();
		const t = runFrames(0, 3000);
		await nextTick();
		void api.reveal();
		runFrames(t, t + 3000);
		await nextTick();
		expect(seen).toEqual(["covering", "covered", "revealing", "idle"]);
	});

	// Port addition: the package-wide hydration sweep, run on this component alone.
	it("hydrates its server HTML without a mismatch warning", async () => {
		const html = await renderToString(createSSRApp(DatamoshTransition, { seed: 3 }));
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);
		const messages: string[] = [];
		const app = createSSRApp(DatamoshTransition, { seed: 3 });
		app.config.warnHandler = (message) => {
			if (/hydrat|mismatch/i.test(message)) messages.push(message);
		};
		app.mount(container);
		app.unmount();
		container.remove();
		expect(messages).toEqual([]);
	});
});
