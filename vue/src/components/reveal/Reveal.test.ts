import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import type { StaggerFrom } from "../../internals/motion/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Reveal from "./Reveal.vue";

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

/** Same shape as `internals/motion/media-query.test.ts`'s stub. */
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

const CHILD = { default: "<p>content</p>" };

/**
 * Inline stand-in for the Svelte `RevealHarness.test.svelte`: real template
 * children (plain text, or N sibling elements) around a real `<Reveal>`.
 * `skipIndex`, when set, tags that one child `data-reveal-skip`; `svgIndex`,
 * when set, renders that one child as a real `<svg>` (an `SVGElement`, not an
 * `HTMLElement`) so the stagger walk is covered over a namespaced child.
 * Everything else falls through `$attrs` to `Reveal` itself.
 */
const Harness = defineComponent({
	name: "RevealHarness",
	inheritAttrs: false,
	props: {
		count: { type: Number, default: undefined },
		skipIndex: { type: Number, default: undefined },
		svgIndex: { type: Number, default: undefined },
		stagger: { type: Number, default: undefined },
		from: { type: [String, Number] as PropType<StaggerFrom>, default: undefined },
		initial: { type: String as PropType<"hidden" | "visible">, default: undefined },
	},
	setup(props) {
		return () =>
			h(Reveal, { stagger: props.stagger, from: props.from, initial: props.initial }, {
				default: () =>
					props.count
						? Array.from({ length: props.count }, (_unused, i) =>
								h(
									i === props.svgIndex ? "svg" : "div",
									{
										key: i,
										"data-idx": i,
										"data-reveal-skip": i === props.skipIndex ? "" : undefined,
									},
									i === props.svgIndex ? undefined : `item ${i}`
								)
							)
						: "Hello",
			});
	},
});

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

	it("trigger='view' (default): renders armed immediately, with one IO instance observing", async () => {
		const { container } = render(Reveal, { slots: CHILD });
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(root.dataset.state).toBe("armed");
		expect(root.dataset.preset).toBe("fade-up");

		// The observer attaches from the internals composable's post-flush
		// watcher on the element ref, which lands a microtask after mount.
		await nextTick();
		expect(MockIntersectionObserver.instances).toHaveLength(1);
		expect(MockIntersectionObserver.instances[0]!.observe).toHaveBeenCalledTimes(1);
	});

	it("trigger='view': IO reporting intersecting flips to visible and fires onReveal once", async () => {
		const onReveal = vi.fn();
		const { container } = render(Reveal, { props: { onReveal }, slots: CHILD });
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		await nextTick();

		MockIntersectionObserver.instances[0]!.trigger(true);
		await nextTick();

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("once=true (default): a later isIntersecting=false does nothing once visible", async () => {
		const { container } = render(Reveal, { slots: CHILD });
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		await nextTick();
		const observer = MockIntersectionObserver.instances[0]!;

		observer.trigger(true);
		await nextTick();
		expect(root.dataset.state).toBe("visible");

		observer.trigger(false);
		await nextTick();
		expect(root.dataset.state).toBe("visible");
	});

	it("once=false: re-arms (drops back to armed) when the node leaves the viewport, and reveals again", async () => {
		const onReveal = vi.fn();
		const { container } = render(Reveal, {
			props: { once: false, onReveal },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		await nextTick();
		const observer = MockIntersectionObserver.instances[0]!;

		observer.trigger(true);
		await nextTick();
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);

		observer.trigger(false);
		await nextTick();
		expect(root.dataset.state).toBe("armed");

		observer.trigger(true);
		await nextTick();
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(2);
	});

	it("trigger='mount': reveals on the next frame with zero IO instances created", async () => {
		const onReveal = vi.fn();
		const { container } = render(Reveal, {
			props: { trigger: "mount", onReveal },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(root.dataset.state).toBe("armed");

		runFrames();
		await nextTick();

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("trigger='manual': tracks `active` directly, with zero IO instances created", async () => {
		const onReveal = vi.fn();
		const { container, rerender } = render(Reveal, {
			props: { trigger: "manual", active: false, onReveal },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(root.dataset.state).toBe("armed");

		await rerender({ trigger: "manual", active: true, onReveal });
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);

		await rerender({ trigger: "manual", active: false, onReveal });
		expect(root.dataset.state).toBe("armed");
	});

	it("focusin reveals immediately, even under trigger='manual' with active=false", async () => {
		const { container } = render(Reveal, {
			props: { trigger: "manual", active: false },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		root.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await nextTick();

		expect(root.dataset.state).toBe("visible");
	});

	it("once=false: never re-hides while focus is inside the node, and re-arms once it isn't", async () => {
		const { container } = render(Reveal, {
			props: { once: false },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const child = root.querySelector("p") as HTMLElement;
		child.tabIndex = 0;
		await nextTick();
		const observer = MockIntersectionObserver.instances[0]!;

		observer.trigger(true);
		await nextTick();
		expect(root.dataset.state).toBe("visible");

		child.focus();
		expect(root.contains(document.activeElement)).toBe(true);

		observer.trigger(false);
		await nextTick();
		expect(root.dataset.state).toBe("visible"); // guarded: focus is still inside

		child.blur();
		observer.trigger(false);
		await nextTick();
		expect(root.dataset.state).toBe("armed");
	});

	it("as='ul' renders a <ul> element (queried by tag, not class, to catch a dynamic-tag regression)", () => {
		const { container } = render(Reveal, { props: { as: "ul" }, slots: CHILD });
		const el = container.querySelector("ul");
		expect(el).not.toBeNull();
		expect(el?.classList.contains("ft-reveal")).toBe(true);
	});

	it("merges a custom class with the base ft-reveal class", () => {
		const { container } = render(Reveal, {
			props: { class: "my-reveal" },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.classList.contains("my-reveal")).toBe(true);
	});

	it("writes no inline CSS custom properties at default props — the CSS fallback chain supplies them instead", () => {
		const { container } = render(Reveal, { slots: CHILD });
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.style.getPropertyValue("--ft-reveal-duration")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-delay")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-easing")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-distance")).toBe("");
	});

	it("writes duration/delay/easing/distance as inline CSS custom properties only when they differ from the default", () => {
		const { container } = render(Reveal, {
			props: { duration: 500, delay: 40, easing: "linear", distance: 24 },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.style.getPropertyValue("--ft-reveal-duration")).toBe("500ms");
		expect(root.style.getPropertyValue("--ft-reveal-delay")).toBe("40ms");
		expect(root.style.getPropertyValue("--ft-reveal-easing")).toBe("linear");
		expect(root.style.getPropertyValue("--ft-reveal-distance")).toBe("24px");
	});

	it("a caller's focusin listener still runs alongside the component's own focus handling", async () => {
		const onFocusin = vi.fn();
		const { container } = render(Reveal, {
			props: { trigger: "manual", active: false },
			attrs: { onFocusin },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		root.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await nextTick();

		expect(root.dataset.state).toBe("visible");
		expect(onFocusin).toHaveBeenCalledTimes(1);
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
				const { container } = render(Reveal, { props: { preset: name }, slots: CHILD });
				const root = container.querySelector(".ft-reveal") as HTMLElement;
				expect(root.dataset.preset).toBe(name);
			});
		}
	});

	describe("initial (SSR starting state)", () => {
		/**
		 * Mounting queues the component's re-render as a microtask job, so the
		 * DOM read taken straight after `render()` — before any `nextTick()` —
		 * still shows the template's true starting value: the literal thing SSR
		 * (and pre-hydration client HTML) would show. The `onMounted`
		 * idle→armed flip only lands on the next flush.
		 */
		it("initial='hidden' (default) starts as data-state=armed", () => {
			const { container } = render(Harness);
			expect(container.querySelector(".ft-reveal")?.getAttribute("data-state")).toBe("armed");
		});

		it("initial='visible' starts as data-state=idle, then the mount hook flips it to armed", async () => {
			const { container } = render(Harness, { props: { initial: "visible" } });
			expect(container.querySelector(".ft-reveal")?.getAttribute("data-state")).toBe("idle");

			await nextTick();
			expect(container.querySelector(".ft-reveal")?.getAttribute("data-state")).toBe("armed");
		});
	});

	describe("stagger", () => {
		it("stagger>0 sets data-stagger and writes an increasing --ft-reveal-child-delay per child, from='first'", () => {
			const { container } = render(Harness, {
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
			const { container } = render(Harness, {
				props: { count: 5, stagger: 50, from: "center" },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as HTMLElement[];
			const delays = kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"));
			// distance from center (index 2) is 2,1,0,1,2 → ×50ms
			expect(delays).toEqual(["100ms", "50ms", "0ms", "50ms", "100ms"]);
		});

		it("compresses (not clips) a 40-child stagger to the 600ms item cap", () => {
			const { container } = render(Harness, {
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
				expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
			}
		});

		it("stagger=0 (default): the root itself carries no data-stagger attribute", () => {
			const { container } = render(Reveal, { slots: CHILD });
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(root.hasAttribute("data-stagger")).toBe(false);
		});

		it("re-indexes via MutationObserver when the child list itself changes", async () => {
			const { container, rerender } = render(Harness, {
				props: { count: 3, stagger: 50, from: "first" },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(Array.from(root.children)).toHaveLength(3);

			await rerender({ count: 5, stagger: 50, from: "first" });
			await vi.waitFor(() => {
				expect(Array.from(root.children)).toHaveLength(5);
			});

			await vi.waitFor(() => {
				const kids = Array.from(root.children) as HTMLElement[];
				const delays = kids.map((k) =>
					Number(k.style.getPropertyValue("--ft-reveal-child-delay").replace("ms", ""))
				);
				expect(delays).toEqual([0, 50, 100, 150, 200]);
			});

			const kids = Array.from(root.children) as HTMLElement[];
			const delays = kids.map((k) =>
				Number(k.style.getPropertyValue("--ft-reveal-child-delay").replace("ms", ""))
			);
			for (let i = 1; i < delays.length; i++) {
				expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
			}
		});

		it("staggers a direct <svg> child too, and clears its var on teardown", async () => {
			// The stagger CSS targets every direct element child (`> *`), so an
			// SVG icon animates whether or not the walk reaches it — leaving it
			// out would animate the icon on a 0ms fallback delay while its
			// siblings stagger around it.
			const { container, rerender } = render(Harness, {
				props: { count: 3, stagger: 50, from: "first", svgIndex: 1 },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as (HTMLElement | SVGElement)[];

			expect(kids[1]!).toBeInstanceOf(SVGElement);
			expect(kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"))).toEqual([
				"0ms",
				"50ms",
				"100ms",
			]);

			await rerender({ count: 3, stagger: 0, from: "first", svgIndex: 1 });
			expect(kids.every((k) => k.style.getPropertyValue("--ft-reveal-child-delay") === "")).toBe(
				true
			);
		});

		// Vue-specific regression (no Svelte counterpart): Svelte's stagger
		// `$effect` reads `ref`, so swapping `as` re-runs it against the new
		// element. The Vue walk therefore takes the element ref as a watch
		// source; without it the new root's children would never get a delay
		// and the MutationObserver would stay bound to the detached old node.
		it("follows the element when `as` swaps it: re-walks the new root and re-binds the MutationObserver", async () => {
			const { container, rerender } = render(Reveal, {
				props: { stagger: 40, as: "div" },
				slots: { default: '<div data-idx="0">a</div><div data-idx="1">b</div>' },
			});
			const before = container.querySelector(".ft-reveal") as HTMLElement;
			expect(
				Array.from(before.children).map((k) =>
					(k as HTMLElement).style.getPropertyValue("--ft-reveal-child-delay")
				)
			).toEqual(["0ms", "40ms"]);

			await rerender({ stagger: 40, as: "ul" });

			const after = container.querySelector("ul") as HTMLElement;
			expect(after).not.toBe(before);
			expect(
				Array.from(after.children).map((k) =>
					(k as HTMLElement).style.getPropertyValue("--ft-reveal-child-delay")
				)
			).toEqual(["0ms", "40ms"]);
			// the vars the walk wrote on the node it no longer owns are cleaned up
			expect(
				Array.from(before.children).every(
					(k) => (k as HTMLElement).style.getPropertyValue("--ft-reveal-child-delay") === ""
				)
			).toBe(true);

			after.appendChild(document.createElement("div"));
			await vi.waitFor(() => {
				expect(
					Array.from(after.children).map((k) =>
						(k as HTMLElement).style.getPropertyValue("--ft-reveal-child-delay")
					)
				).toEqual(["0ms", "40ms", "80ms"]);
			});
		});

		it("data-reveal-skip excludes a child from the delay and closes up the remaining indices", () => {
			const { container } = render(Harness, {
				props: { count: 4, stagger: 50, from: "first", skipIndex: 1 },
			});
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as HTMLElement[];
			expect(kids).toHaveLength(4);
			expect(kids[1]!.hasAttribute("data-reveal-skip")).toBe(true);
			expect(kids[1]!.style.getPropertyValue("--ft-reveal-child-delay")).toBe("");
			// The skipped child (index 1) is excluded from the walk entirely, so
			// the remaining three (indices 0, 2, 3) close up as 0/1/2.
			expect(kids[0]!.style.getPropertyValue("--ft-reveal-child-delay")).toBe("0ms");
			expect(kids[2]!.style.getPropertyValue("--ft-reveal-child-delay")).toBe("50ms");
			expect(kids[3]!.style.getPropertyValue("--ft-reveal-child-delay")).toBe("100ms");
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
			props: { trigger: "mount", onReveal },
			slots: CHILD,
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		runFrames();
		await nextTick();

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("dropping stagger back to 0 clears the --ft-reveal-child-delay it wrote on every child", async () => {
		const { container, rerender } = render(Harness, {
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

	it("unmount disconnects the IntersectionObserver and the stagger MutationObserver", async () => {
		const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");
		const { container, unmount: unmountComponent } = render(Harness, {
			props: { count: 3, stagger: 50 },
		});
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");
		await nextTick();

		const observer = MockIntersectionObserver.instances[0]!;

		unmountComponent();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
		expect(disconnectSpy).toHaveBeenCalled();
	});

	it("unmount cancels a pending trigger='mount' frame before it fires", () => {
		const { unmount: unmountComponent } = render(Reveal, {
			props: { trigger: "mount" },
			slots: CHILD,
		});
		expect(frames.size).toBe(1);

		const caf = vi.spyOn(globalThis, "cancelAnimationFrame");
		unmountComponent();

		expect(caf).toHaveBeenCalledTimes(1);
		expect(frames.size).toBe(0);
	});
});
