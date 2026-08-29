import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal, type RevealProps } from "./Reveal.js";

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

/** Same shape as the motion internals' media-query test stub. */
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

const CHILD = <p>content</p>;

/**
 * Transposed from `RevealHarness.test.svelte`: real sibling elements as
 * direct children (the stagger effect's target). `skipIndex`, when set, tags
 * that one child `data-reveal-skip` so tests can cover the stagger opt-out;
 * `svgIndex`, when set, renders that one child as a real `<svg>` (an
 * `SVGElement`, not an `HTMLElement`) so tests can cover the stagger walk
 * over a namespaced child. `count` unset renders plain text.
 */
function RevealHarness({
	count,
	skipIndex,
	svgIndex,
	...props
}: { count?: number; skipIndex?: number; svgIndex?: number } & Partial<
	Omit<RevealProps, "children">
>) {
	return (
		<Reveal {...props}>
			{count
				? Array.from({ length: count }, (_, i) =>
						i === svgIndex ? (
							<svg key={i} data-idx={i} data-reveal-skip={i === skipIndex ? "" : undefined} />
						) : (
							<div key={i} data-idx={i} data-reveal-skip={i === skipIndex ? "" : undefined}>
								item {i}
							</div>
						)
					)
				: "Hello"}
		</Reveal>
	);
}

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
		const { container } = render(<Reveal>{CHILD}</Reveal>);
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(root.dataset.state).toBe("armed");
		expect(root.dataset.preset).toBe("fade-up");
		expect(MockIntersectionObserver.instances).toHaveLength(1);
		expect(MockIntersectionObserver.instances[0]!.observe).toHaveBeenCalledTimes(1);
	});

	it("trigger='view': IO reporting intersecting flips to visible and fires onReveal once", () => {
		const onReveal = vi.fn();
		const { container } = render(<Reveal onReveal={onReveal}>{CHILD}</Reveal>);
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		act(() => {
			MockIntersectionObserver.instances[0]!.trigger(true);
		});

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("once=true (default): a later isIntersecting=false does nothing once visible", () => {
		const { container } = render(<Reveal>{CHILD}</Reveal>);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const observer = MockIntersectionObserver.instances[0]!;

		act(() => {
			observer.trigger(true);
		});
		expect(root.dataset.state).toBe("visible");

		act(() => {
			observer.trigger(false);
		});
		expect(root.dataset.state).toBe("visible");
	});

	it("once=false: re-arms (drops back to armed) when the node leaves the viewport, and reveals again", () => {
		const onReveal = vi.fn();
		const { container } = render(
			<Reveal once={false} onReveal={onReveal}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const observer = MockIntersectionObserver.instances[0]!;

		act(() => {
			observer.trigger(true);
		});
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);

		act(() => {
			observer.trigger(false);
		});
		expect(root.dataset.state).toBe("armed");

		act(() => {
			observer.trigger(true);
		});
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(2);
	});

	it("trigger='mount': reveals on the next frame with zero IO instances created", () => {
		const onReveal = vi.fn();
		const { container } = render(
			<Reveal trigger="mount" onReveal={onReveal}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(root.dataset.state).toBe("armed");

		act(() => {
			runFrames();
		});

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("trigger='manual': tracks `active` directly, with zero IO instances created", () => {
		const onReveal = vi.fn();
		const { container, rerender } = render(
			<Reveal trigger="manual" active={false} onReveal={onReveal}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(root.dataset.state).toBe("armed");

		rerender(
			<Reveal trigger="manual" active={true} onReveal={onReveal}>
				{CHILD}
			</Reveal>
		);
		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);

		rerender(
			<Reveal trigger="manual" active={false} onReveal={onReveal}>
				{CHILD}
			</Reveal>
		);
		expect(root.dataset.state).toBe("armed");
	});

	it("focusin reveals immediately, even under trigger='manual' with active=false", () => {
		const { container } = render(
			<Reveal trigger="manual" active={false}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		fireEvent.focusIn(root);

		expect(root.dataset.state).toBe("visible");
	});

	it("once=false: never re-hides while focus is inside the node, and re-arms once it isn't", () => {
		const { container } = render(<Reveal once={false}>{CHILD}</Reveal>);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const child = root.querySelector("p") as HTMLElement;
		child.tabIndex = 0;
		const observer = MockIntersectionObserver.instances[0]!;

		act(() => {
			observer.trigger(true);
		});
		expect(root.dataset.state).toBe("visible");

		act(() => {
			child.focus();
		});
		expect(root.contains(document.activeElement)).toBe(true);

		act(() => {
			observer.trigger(false);
		});
		expect(root.dataset.state).toBe("visible"); // guarded: focus is still inside

		act(() => {
			child.blur();
			observer.trigger(false);
		});
		expect(root.dataset.state).toBe("armed");
	});

	it("as='ul' renders a <ul> element (queried by tag, not class, to catch a polymorphic-root regression)", () => {
		const { container } = render(<Reveal as="ul">{CHILD}</Reveal>);
		const el = container.querySelector("ul");
		expect(el).not.toBeNull();
		expect(el?.classList.contains("ft-reveal")).toBe(true);
	});

	it("merges a custom class with the base ft-reveal class", () => {
		const { container } = render(<Reveal className="my-reveal">{CHILD}</Reveal>);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.classList.contains("my-reveal")).toBe(true);
	});

	it("writes no inline CSS custom properties at default props — the CSS fallback chain supplies them instead", () => {
		const { container } = render(<Reveal>{CHILD}</Reveal>);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.style.getPropertyValue("--ft-reveal-duration")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-delay")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-easing")).toBe("");
		expect(root.style.getPropertyValue("--ft-reveal-distance")).toBe("");
	});

	it("writes duration/delay/easing/distance as inline CSS custom properties only when they differ from the default", () => {
		const { container } = render(
			<Reveal duration={500} delay={40} easing="linear" distance={24}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.style.getPropertyValue("--ft-reveal-duration")).toBe("500ms");
		expect(root.style.getPropertyValue("--ft-reveal-delay")).toBe("40ms");
		expect(root.style.getPropertyValue("--ft-reveal-easing")).toBe("linear");
		expect(root.style.getPropertyValue("--ft-reveal-distance")).toBe("24px");
	});

	it("a caller's onFocus still runs alongside the component's own focus handling", () => {
		const onFocus = vi.fn();
		const { container } = render(
			<Reveal trigger="manual" active={false} onFocus={onFocus}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;

		fireEvent.focusIn(root);

		expect(root.dataset.state).toBe("visible");
		expect(onFocus).toHaveBeenCalledTimes(1);
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
				const { container } = render(<Reveal preset={name}>{CHILD}</Reveal>);
				const root = container.querySelector(".ft-reveal") as HTMLElement;
				expect(root.dataset.preset).toBe(name);
			});
		}
	});

	describe("initial (SSR starting state)", () => {
		/**
		 * Transposed from the Svelte suite's raw-`mount()` (no flushSync)
		 * technique: `@testing-library/react`'s `render()` flushes every
		 * effect before returning, so the mount-time idle→armed flip has
		 * already run for BOTH `initial` values by the time the DOM is
		 * readable — the two become indistinguishable through it. The
		 * template's true STARTING value — the literal thing SSR (and
		 * pre-hydration client HTML) would show — is exactly what
		 * `renderToString` emits, so that is what these tests read.
		 */
		function serverState(props: Partial<Omit<RevealProps, "children">>) {
			const html = renderToString(<Reveal {...props}>{CHILD}</Reveal>);
			const host = document.createElement("div");
			host.innerHTML = html;
			return host.querySelector(".ft-reveal")?.getAttribute("data-state");
		}

		it("initial='hidden' (default) starts as data-state=armed", () => {
			expect(serverState({})).toBe("armed");
		});

		it("initial='visible' starts as data-state=idle, then the mount effect flips it to armed", () => {
			expect(serverState({ initial: "visible" })).toBe("idle");

			const { container } = render(<Reveal initial="visible">{CHILD}</Reveal>);
			expect(container.querySelector(".ft-reveal")?.getAttribute("data-state")).toBe("armed");
		});
	});

	describe("stagger", () => {
		it("stagger>0 sets data-stagger and writes an increasing --ft-reveal-child-delay per child, from='first'", () => {
			const { container } = render(<RevealHarness count={4} stagger={50} from="first" />);
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(root.dataset.stagger).toBe("");

			const kids = Array.from(root.children) as HTMLElement[];
			expect(kids).toHaveLength(4);
			const delays = kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"));
			expect(delays).toEqual(["0ms", "50ms", "100ms", "150ms"]);
		});

		it("from='center' is symmetric around the middle item", () => {
			const { container } = render(<RevealHarness count={5} stagger={50} from="center" />);
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as HTMLElement[];
			const delays = kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"));
			// distance from center (index 2) is 2,1,0,1,2 → ×50ms
			expect(delays).toEqual(["100ms", "50ms", "0ms", "50ms", "100ms"]);
		});

		it("compresses (not clips) a 40-child stagger to the 600ms item cap", () => {
			const { container } = render(<RevealHarness count={40} stagger={50} from="first" />);
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
			const { container } = render(<Reveal>{CHILD}</Reveal>);
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(root.hasAttribute("data-stagger")).toBe(false);
		});

		it("re-indexes via MutationObserver when the child list itself changes", async () => {
			const { container, rerender } = render(<RevealHarness count={3} stagger={50} from="first" />);
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			expect(Array.from(root.children)).toHaveLength(3);

			rerender(<RevealHarness count={5} stagger={50} from="first" />);
			await vi.waitFor(() => {
				expect(Array.from(root.children)).toHaveLength(5);
			});

			await vi.waitFor(() => {
				const kids = Array.from(root.children) as HTMLElement[];
				const delays = kids.map((k) =>
					Number(k.style.getPropertyValue("--ft-reveal-child-delay").replace("ms", ""))
				);
				expect(delays).toEqual([0, 50, 100, 150, 200]);
				for (let i = 1; i < delays.length; i++) {
					expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
				}
			});
		});

		it("staggers a direct <svg> child too, and clears its var on teardown", () => {
			// The stagger CSS targets every direct element child (`> *`), so an
			// SVG icon animates whether or not the walk reaches it — leaving it
			// out would animate the icon on a 0ms fallback delay while its
			// siblings stagger around it.
			const { container, rerender } = render(
				<RevealHarness count={3} stagger={50} from="first" svgIndex={1} />
			);
			const root = container.querySelector(".ft-reveal") as HTMLElement;
			const kids = Array.from(root.children) as (HTMLElement | SVGElement)[];

			expect(kids[1]!).toBeInstanceOf(SVGElement);
			expect(kids.map((k) => k.style.getPropertyValue("--ft-reveal-child-delay"))).toEqual([
				"0ms",
				"50ms",
				"100ms",
			]);

			rerender(<RevealHarness count={3} stagger={0} from="first" svgIndex={1} />);
			expect(kids.every((k) => k.style.getPropertyValue("--ft-reveal-child-delay") === "")).toBe(
				true
			);
		});

		it("data-reveal-skip excludes a child from the delay and closes up the remaining indices", () => {
			const { container } = render(
				<RevealHarness count={4} stagger={50} from="first" skipIndex={1} />
			);
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
	// sits inside that media query) — that would need reading reveal.css,
	// which no test in this file does.
	it("reduced motion: the data-state machine (and onReveal) is unaffected — Reveal has no JS reduced-motion branch", () => {
		stubMatchMedia(true);
		const onReveal = vi.fn();
		const { container } = render(
			<Reveal trigger="mount" onReveal={onReveal}>
				{CHILD}
			</Reveal>
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		act(() => {
			runFrames();
		});

		expect(root.dataset.state).toBe("visible");
		expect(onReveal).toHaveBeenCalledTimes(1);
	});

	it("dropping stagger back to 0 clears the --ft-reveal-child-delay it wrote on every child", () => {
		const { container, rerender } = render(<RevealHarness count={3} stagger={50} from="first" />);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		const kidsBefore = Array.from(root.children) as HTMLElement[];
		expect(
			kidsBefore.every((k) => k.style.getPropertyValue("--ft-reveal-child-delay") !== "")
		).toBe(true);

		rerender(<RevealHarness count={3} stagger={0} from="first" />);

		const kidsAfter = Array.from(root.children) as HTMLElement[];
		expect(kidsAfter.every((k) => k.style.getPropertyValue("--ft-reveal-child-delay") === "")).toBe(
			true
		);
	});

	it("unmount disconnects the IntersectionObserver and the stagger MutationObserver", () => {
		const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");
		const { container, unmount: unmountComponent } = render(
			<RevealHarness count={3} stagger={50} />
		);
		const root = container.querySelector(".ft-reveal") as HTMLElement;
		expect(root.dataset.state).toBe("armed");

		const observer = MockIntersectionObserver.instances[0]!;

		unmountComponent();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
		expect(disconnectSpy).toHaveBeenCalled();
	});

	it("unmount cancels a pending trigger='mount' frame before it fires", () => {
		const { unmount: unmountComponent } = render(<Reveal trigger="mount">{CHILD}</Reveal>);
		expect(frames.size).toBe(1);

		const caf = vi.spyOn(globalThis, "cancelAnimationFrame");
		unmountComponent();

		expect(caf).toHaveBeenCalledTimes(1);
		expect(frames.size).toBe(0);
	});
});
