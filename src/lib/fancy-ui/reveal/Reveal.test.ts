import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet, mount, tick, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Reveal from "./Reveal.svelte";
import RevealHarness from "./RevealHarness.test.svelte";

/** Capturing IntersectionObserver mock — the `number-ticker`/`in-view.test.ts`
 * archetype, already reused by `magnetic/Magnetic.test.ts` in this same
 * campaign. */
class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();

	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.callback = callback;
		this.options = options;
		MockIntersectionObserver.instances.push(this);
	}

	trigger(isIntersecting: boolean) {
		this.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

/** Same shape as `_internals/motion/media-query.test.ts`'s stub. */
function stubMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
}

/** Captured-frame rAF, matching `magnetic/Magnetic.test.ts`'s house pattern:
 * frames are stored, not run, until a test calls `runFrames()`. */
let frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 0;
function runFrames() {
	const pending = [...frames.values()];
	frames.clear();
	for (const frame of pending) frame(performance.now());
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

const CHILD = () => snippet("<p>content</p>");

describe("Reveal", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		MockIntersectionObserver.instances = [];
		frames = new Map();
		nextFrameId = 0;
		vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
			const id = ++nextFrameId;
			frames.set(id, cb);
			return id;
		});
		vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id: number) => {
			frames.delete(id);
		});
		stubMatchMedia(false);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("trigger='view' (default): renders armed immediately, with one IO instance observing", () => {
		const { container } = render(Reveal, { props: { children: CHILD() } });
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(root.dataset.state).toBe("armed");
		expect(root.dataset.preset).toBe("fade-up");
		expect(MockIntersectionObserver.instances).toHaveLength(1);
		expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledTimes(1);
	});

	it("trigger='view': IO reporting intersecting flips to visible and fires onReveal once", async () => {
		const onReveal = vi.fn();
		const { container } = render(Reveal, { props: { children: CHILD(), onReveal } });
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		MockIntersectionObserver.instances[0].trigger(true);
		await tick();

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("once=true (default): a later isIntersecting=false does nothing once visible", async () => {
		const { container } = render(Reveal, { props: { children: CHILD() } });
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const observer = MockIntersectionObserver.instances[0];

		observer.trigger(true);
		await tick();
		expect(root.dataset.state).toBe("visible");

		observer.trigger(false);
		await tick();
		expect(root.dataset.state).toBe("visible");
	});

	it("once=false: re-arms (drops back to armed) when the node leaves the viewport, and reveals again", async () => {
		const onReveal = vi.fn();
		const { container } = render(Reveal, {
			props: { children: CHILD(), once: false, onReveal },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const observer = MockIntersectionObserver.instances[0];

		observer.trigger(true);
		await tick();
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);

		observer.trigger(false);
		await tick();
		expect(root.dataset.state).toBe("armed");

		observer.trigger(true);
		await tick();
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(2);
	});

	it("trigger='mount': reveals on the next frame with zero IO instances created", async () => {
		const onReveal = vi.fn();
		const { container } = render(Reveal, {
			props: { children: CHILD(), trigger: "mount", onReveal },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(root.dataset.state).toBe("armed");

		runFrames();
		await tick();

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("trigger='manual': tracks `active` directly, with zero IO instances created", async () => {
		const onReveal = vi.fn();
		const { container, rerender } = render(Reveal, {
			props: { children: CHILD(), trigger: "manual", active: false, onReveal },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(root.dataset.state).toBe("armed");

		await rerender({ children: CHILD(), trigger: "manual", active: true, onReveal });
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);

		await rerender({ children: CHILD(), trigger: "manual", active: false, onReveal });
		expect(root.dataset.state).toBe("armed");
	});

	it("focusin reveals immediately, even under trigger='manual' with active=false", async () => {
		const { container } = render(Reveal, {
			props: { children: CHILD(), trigger: "manual", active: false },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		root.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await tick();

		expect(root.dataset.state).toBe("visible");
	});

	it("once=false: never re-hides while focus is inside the node, and re-arms once it isn't", async () => {
		const { container } = render(Reveal, {
			props: { children: CHILD(), once: false },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const child = root.querySelector("p") as HTMLElement;
		child.tabIndex = 0;
		const observer = MockIntersectionObserver.instances[0];

		observer.trigger(true);
		await tick();
		expect(root.dataset.state).toBe("visible");

		child.focus();
		expect(root.contains(document.activeElement)).toBe(true);

		observer.trigger(false);
		await tick();
		expect(root.dataset.state).toBe("visible"); // guarded: focus is still inside

		child.blur();
		observer.trigger(false);
		await tick();
		expect(root.dataset.state).toBe("armed");
	});

	it("as='ul' renders a <ul> element (queried by tag, not class, to catch a svelte:element regression)", () => {
		const { container } = render(Reveal, { props: { children: CHILD(), as: "ul" } });
		const el = container.querySelector("ul");
		expect(el).not.toBeNull();
		expect(el?.classList.contains("ft-reveal")).toBe(true);
	});

	it("merges a custom class with the base ft-reveal class", () => {
		const { container } = render(Reveal, {
			props: { children: CHILD(), class: "my-reveal" },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.classList.contains("my-reveal")).toBe(true);
	});

	it("writes no inline CSS custom properties at default props — the CSS fallback chain supplies them instead", () => {
		const { container } = render(Reveal, { props: { children: CHILD() } });
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.style.getPropertyValue("--ft-reveal-duration")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-delay")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-easing")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-distance")).toBe("");
	});

	it("writes duration/delay/easing/distance as inline CSS custom properties only when they differ from the default", () => {
		const { container } = render(Reveal, {
			props: { children: CHILD(), duration: 500, delay: 40, easing: "linear", distance: 24 },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.style.getPropertyValue("--ft-reveal-duration")).toBe("500ms");
		expect(root.style.getPropertyValue("--ft-reveal-delay")).toBe("40ms");
		expect(root.style.getPropertyValue("--ft-reveal-easing")).toBe("linear");
		expect(root.style.getPropertyValue("--ft-reveal-distance")).toBe("24px");
	});

	it("a caller's onfocusin still runs alongside the component's own focus handling", async () => {
		const onfocusin = vi.fn();
		const { container } = render(Reveal, {
			props: { children: CHILD(), trigger: "manual", active: false, onfocusin },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		root.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await tick();

		expect(root.dataset.state).toBe("visible");
		expect(onfocusin).toHaveBeenCalledTimes(1);
	});

	describe("preset", () => {
		const PRESET_NAMES = [
			"fade",
			"fade-up",
			"fade-down",
			"fade-left",
			"fade-right",
			"scale",
		] as const;

		for (const name of PRESET_NAMES) {
			it(`preset="${name}" sets data-preset="${name}"`, () => {
				const { container } = render(Reveal, { props: { children: CHILD(), preset: name } });
				const root = container.querySelector(".ft-reveal") as HTMLElement;
				expect(root.dataset.preset).toBe(name);
			});
		}
	});

	describe("initial (SSR starting state)", () => {
		/**
		 * `@testing-library/svelte`'s `render()` always calls `flushSync()`
		 * right after mounting, so by the time it returns, `onMount`'s
		 * idle→armed flip has already run for BOTH `initial` values — the two
		 * become indistinguishable through it (confirmed against the Wave-1
		 * audit's own note: "renders with data-state idle... is not
		 * observable via render()"). Calling Svelte's raw `mount()` directly
		 * and reading the DOM BEFORE any `tick()`/`flushSync()` captures the
		 * template's true starting value instead — the literal thing SSR (and
		 * pre-hydration client HTML) would show.
		 */
		function mountRaw(props: Record<string, unknown>) {
			const target = document.createElement("div");
			document.body.appendChild(target);
			const instance = mount(RevealHarness, { target, props });
			const state = target.querySelector(".ft-reveal")?.getAttribute("data-state");
			return { instance, target, state };
		}

		it("initial='hidden' (default) starts as data-state=armed", () => {
			const { instance, target, state } = mountRaw({});
			expect(state).toBe("armed");
			unmount(instance);
			target.remove();
		});

		it("initial='visible' starts as data-state=idle, then the mount effect flips it to armed", async () => {
			const { instance, target, state } = mountRaw({ initial: "visible" });
			expect(state).toBe("idle");

			await tick();
			expect(target.querySelector(".ft-reveal")?.getAttribute("data-state")).toBe("armed");

			unmount(instance);
			target.remove();
		});
	});

	describe("stagger", () => {
		it("stagger>0 sets data-stagger and writes an increasing --ft-reveal-child-delay per child, from='first'", () => {
			const { container } = render(RevealHarness, {
				props: { count: 4, stagger: 50, from: "first" },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(root.dataset.stagger).toBe("");

			const kids = Array.from(root.children) as HTMLElement[];
			expect(kids).toHaveLength(4);
			const delays = kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"));
			expect(delays).toEqual(["0ms", "50ms", "100ms", "150ms"]);
		});

		it("from='center' is symmetric around the middle item", () => {
			const { container } = render(RevealHarness, {
				props: { count: 5, stagger: 50, from: "center" },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as HTMLElement[];
			const delays = kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"));
			// distance from center (index 2) is 2,1,0,1,2 → ×50ms
			expect(delays).toEqual(["100ms", "50ms", "0ms", "50ms", "100ms"]);
		});

		it("compresses (not clips) a 40-child stagger to the 600ms item cap", () => {
			const { container } = render(RevealHarness, {
				props: { count: 40, stagger: 50, from: "first" },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as HTMLElement[];
			expect(kids).toHaveLength(40);
			const delays = kids.map((k) =>
				Number(k.style.getPropertyValue("--ft-reveal-child-delay").replace("ms", ""))
			);
			expect(Math.max(...delays)).toBeLessThanOrEqual(600);
			// still strictly increasing, i.e. compressed, not clipped to a flat cap
			for (let i = 1; i < delays.length; i++) {
				expect(delays[i]).toBeGreaterThan(delays[i - 1]);
			}
		});

		it("stagger=0 (default): the root itself carries no data-stagger attribute", () => {
			const { container } = render(Reveal, { props: { children: CHILD() } });
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(root.hasAttribute("data-stagger")).toBe(false);
		});

		it("re-indexes via MutationObserver when the child list itself changes", async () => {
			const { container, rerender } = render(RevealHarness, {
				props: { count: 3, stagger: 50, from: "first" },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(Array.from(root.children)).toHaveLength(3);

			await rerender({ count: 5, stagger: 50, from: "first" });
			await vi.waitFor(() => {
				expect(Array.from(root.children)).toHaveLength(5);
			});

			const kids = Array.from(root.children) as HTMLElement[];
			const delays = kids.map((k) =>
				Number(k.style.getPropertyValue("--ft-reveal-child-delay").replace("ms", ""))
			);
			expect(delays).toEqual([0, 50, 100, 150, 200]);
			for (let i = 1; i < delays.length; i++) {
				expect(delays[i]).toBeGreaterThan(delays[i - 1]);
			}
		});

		it("data-reveal-skip excludes a child from the delay and closes up the remaining indices", () => {
			const { container } = render(RevealHarness, {
				props: { count: 4, stagger: 50, from: "first", skipIndex: 1 },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as HTMLElement[];
			expect(kids).toHaveLength(4);
			expect(kids[1].hasAttribute("data-reveal-skip")).toBe(true);
			expect(kids[1].style.getPropertyValue("--ft-reveal-child-delay")).toBe("");
			// The skipped child (index 1) is excluded from the walk entirely, so
			// the remaining three (indices 0, 2, 3) close up as 0/1/2.
			expect(kids[0].style.getPropertyValue("--ft-reveal-child-delay")).toBe("0ms");
			expect(kids[2].style.getPropertyValue("--ft-reveal-child-delay")).toBe("50ms");
			expect(kids[3].style.getPropertyValue("--ft-reveal-child-delay")).toBe("100ms");
		});
	});

	// Reveal never reads matchMedia itself — the reduced-motion guarantee is
	// CSS-only (the hiding rules live inside `@media (prefers-reduced-motion:
	// no-preference)`). This test only re-confirms the state machine doesn't
	// care either way, which trigger="mount" above already shows; it does NOT
	// assert the actual reduced-motion CSS contract (that every hidden rule
	// sits inside that media query) — that would need compiling the
	// component's `<style>` block, which no test in this file does.
	it("reduced motion: the data-state machine (and onReveal) is unaffected — Reveal has no JS reduced-motion branch", async () => {
		stubMatchMedia(true);
		const onReveal = vi.fn();
		const { container } = render(Reveal, {
			props: { children: CHILD(), trigger: "mount", onReveal },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		runFrames();
		await tick();

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("dropping stagger back to 0 clears the --ft-reveal-child-delay it wrote on every child", async () => {
		const { container, rerender } = render(RevealHarness, {
			props: { count: 3, stagger: 50, from: "first" },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const kidsBefore = Array.from(root.children) as HTMLElement[];
		expect(
			kidsBefore.every((k) => k.style.getPropertyValue("--ft-reveal-child-delay") !== "")
		).toBe(true);

		await rerender({ count: 3, stagger: 0, from: "first" });

		const kidsAfter = Array.from(root.children) as HTMLElement[];
		expect(kidsAfter.every((k) => k.style.getPropertyValue("--ft-reveal-child-delay") === "")).toBe(
			true
		);
	});

	it("unmount disconnects the IntersectionObserver and the stagger MutationObserver", () => {
		const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");
		const { container, unmount: unmountComponent } = render(RevealHarness, {
			props: { count: 3, stagger: 50 },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		const observer = MockIntersectionObserver.instances[0];

		unmountComponent();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
		expect(disconnectSpy).toHaveBeenCalled();
	});

	it("unmount cancels a pending trigger='mount' frame before it fires", () => {
		const { unmount: unmountComponent } = render(Reveal, {
			props: { children: CHILD(), trigger: "mount" },
		});
		expect(frames.size).toBe(1);

		const caf = vi.spyOn(globalThis, "cancelAnimationFrame");
		unmountComponent();

		expect(caf).toHaveBeenCalledTimes(1);
		expect(frames.size).toBe(0);
	});
});
