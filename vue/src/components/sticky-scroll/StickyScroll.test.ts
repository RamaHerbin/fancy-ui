import { readFileSync } from "node:fs";
import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, watch, type Component, type PropType } from "vue";
import StickyScroll from "./StickyScroll.vue";

interface Item {
	id: string;
	label: string;
}

function items(n: number): Item[] {
	return Array.from({ length: n }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` }));
}

/** The `number-ticker`/`in-view.test.ts` capturing-mock archetype: a real
 * IntersectionObserver never fires under jsdom, so a mock that records every
 * constructed instance (one per `<section>`, since the in-view core is
 * attached per-node) and exposes a manual `trigger()` is the only way to
 * simulate a section crossing the centre-line rootMargin. */
class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	options: IntersectionObserverInit | undefined;
	observed: Element[] = [];

	disconnect = vi.fn(() => {
		this.observed = [];
	});
	observe = vi.fn((el: Element) => {
		this.observed.push(el);
	});
	unobserve = vi.fn();

	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.callback = callback;
		this.options = options;
		MockIntersectionObserver.instances.push(this);
	}

	trigger(isIntersecting: boolean) {
		this.callback(
			[{ isIntersecting, target: this.observed[0] } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

/**
 * The Vue counterpart of the source's `.test.svelte` harness: real scoped
 * slots, and `v-model:activeIndex` echoed into the DOM so the bound value
 * itself (not just its downstream `data-active` effect) is observable from a
 * `.ts` test file.
 */
const Harness = defineComponent({
	props: {
		items: { type: Array as PropType<Item[]>, required: true },
		activeIndex: { type: Number, default: undefined },
		panelSide: { type: String as PropType<"start" | "end">, default: undefined },
		crossfade: { type: Boolean, default: undefined },
		panelClass: { type: String, default: undefined },
		panelHidden: { type: Boolean, default: undefined },
		onChange: {
			type: Function as PropType<(index: number, item: Item) => void>,
			default: undefined,
		},
		class: { type: String, default: undefined },
	},
	setup(props) {
		const current = ref(props.activeIndex ?? 0);
		watch(
			() => props.activeIndex,
			(v) => {
				if (v !== undefined) current.value = v;
			}
		);

		return () => [
			h(
				// `h()` cannot carry the SFC's generic parameter or its required
				// scoped slots through its own overloads, so the harness calls it
				// untyped and annotates the slot parameters itself. The generic
				// surface is exercised by `<StickyScroll>` in a real template, the
				// way the source's `.test.svelte` harness did.
				StickyScroll as unknown as Component,
				{
					items: props.items,
					activeIndex: current.value,
					"onUpdate:activeIndex": (v: number) => {
						current.value = v;
					},
					panelSide: props.panelSide,
					crossfade: props.crossfade,
					panelClass: props.panelClass,
					panelHidden: props.panelHidden,
					onChange: props.onChange,
					class: props.class,
				},
				{
					item: (p: { item: Item; index: number; active: boolean }) =>
						h("span", { class: "row", "data-active": p.active }, `${p.index}:${p.item.label}`),
					panel: (p: { item: Item; index: number }) =>
						h("div", { class: "panel-content" }, `panel ${p.index}:${p.item.label}`),
				}
			),
			h("span", { "data-testid": "active-index" }, String(current.value)),
		];
	},
});

/** `transition: false` un-stubs `<Transition>`: the test-utils layer under
 * `@testing-library/vue` replaces it with an inert `<transition-stub>` by
 * default, which would swallow the panel crossfade's JS hooks entirely. */
interface HarnessProps {
	items: Item[];
	activeIndex?: number;
	panelSide?: "start" | "end";
	crossfade?: boolean;
	panelClass?: string;
	panelHidden?: boolean;
	onChange?: (index: number, item: Item) => void;
	class?: string;
}

function renderHarness(props: HarnessProps) {
	return render(Harness, { props, global: { stubs: { transition: false } } });
}

function sections(container: Element): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(".ft-stickyscroll-item")];
}

function root(container: Element): HTMLElement {
	return container.querySelector(".ft-stickyscroll") as HTMLElement;
}

function activeIndexText(container: Element): string | null {
	return container.querySelector('[data-testid="active-index"]')?.textContent ?? null;
}

describe("StickyScroll", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		MockIntersectionObserver.instances = [];
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders one section per item, and the panel with the active item's content", () => {
		const { container } = renderHarness({ items: items(3) });

		expect(sections(container)).toHaveLength(3);
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 0:Item 0");
	});

	it("passes (item, index, active) to the item slot — active true only for the current row", () => {
		const { container } = renderHarness({ items: items(3), activeIndex: 1 });

		const rows = [...container.querySelectorAll(".row")];
		expect(rows.map((r) => r.textContent)).toEqual(["0:Item 0", "1:Item 1", "2:Item 2"]);
		expect(rows.map((r) => r.getAttribute("data-active"))).toEqual(["false", "true", "false"]);
	});

	it("a capturing IO mock moving from section 0 to section 1 updates data-active, bound activeIndex, and fires onChange", async () => {
		const onChange = vi.fn();
		const { container } = renderHarness({ items: items(3), onChange });
		await nextTick(); // the in-view core attaches from a post-flush watcher

		expect(sections(container).map((s) => s.dataset.active)).toEqual(["true", "false", "false"]);
		expect(activeIndexText(container)).toBe("0");

		MockIntersectionObserver.instances[1]!.trigger(true);
		await nextTick();

		expect(sections(container).map((s) => s.dataset.active)).toEqual(["false", "true", "false"]);
		expect(activeIndexText(container)).toBe("1");
		expect(onChange).toHaveBeenCalledExactlyOnceWith(1, expect.objectContaining({ id: "item-1" }));
	});

	it("holds its last value when nothing intersects — leaving a section (intersecting: false) does not move activeIndex", async () => {
		const onChange = vi.fn();
		const { container } = renderHarness({ items: items(3), onChange });
		await nextTick(); // the in-view core attaches from a post-flush watcher

		MockIntersectionObserver.instances[0]!.trigger(false);
		await nextTick();

		expect(sections(container)[0]!.dataset.active).toBe("true"); // unchanged
		expect(activeIndexText(container)).toBe("0");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("every section observes with the centre-line rootMargin, threshold 0, once: false", async () => {
		renderHarness({ items: items(2) });
		await nextTick(); // the in-view core attaches from a post-flush watcher

		expect(MockIntersectionObserver.instances).toHaveLength(2);
		for (const instance of MockIntersectionObserver.instances) {
			expect(instance.options?.rootMargin).toBe("-50% 0px -50% 0px");
			expect(instance.options?.threshold).toBe(0);
		}
	});

	it("panelSide defaults to end and reflects into data-panel-side", () => {
		const { container } = renderHarness({ items: items(2) });
		expect(root(container).dataset.panelSide).toBe("end");
		cleanup();

		const { container: start } = renderHarness({ items: items(2), panelSide: "start" });
		expect(start.querySelector(".ft-stickyscroll")?.getAttribute("data-panel-side")).toBe("start");
	});

	it("panelHidden defaults to true (aria-hidden) and can be turned off", () => {
		const { container } = renderHarness({ items: items(2) });
		expect(container.querySelector(".ft-stickyscroll-panel")?.getAttribute("aria-hidden")).toBe(
			"true"
		);
		cleanup();

		const { container: shown } = renderHarness({ items: items(2), panelHidden: false });
		expect(shown.querySelector(".ft-stickyscroll-panel")?.hasAttribute("aria-hidden")).toBe(false);
	});

	it("focusin on a section activates it", async () => {
		const onChange = vi.fn();
		const { container } = renderHarness({ items: items(3), onChange });

		const target = sections(container)[2]!.querySelector(".row") as HTMLElement;
		await fireEvent.focusIn(target);

		expect(sections(container).map((s) => s.dataset.active)).toEqual(["false", "false", "true"]);
		expect(onChange).toHaveBeenCalledExactlyOnceWith(2, expect.objectContaining({ id: "item-2" }));
	});

	it("reduced motion: the panel swap is synchronous — the sampler's own duration:0 fast path, no Element.prototype.animate call", async () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query.includes("prefers-reduced-motion"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}));
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container, rerender } = renderHarness({ items: items(3), activeIndex: 0 });
		await nextTick();

		await rerender({ items: items(3), activeIndex: 1 });
		await nextTick();

		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 1:Item 1");
		expect(container.querySelectorAll(".ft-stickyscroll-panel-frame")).toHaveLength(1);
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("with default props (motion on), the panel swap actually crossfades: Element.prototype.animate runs and both frames briefly coexist", async () => {
		// Mid-swap the outgoing frame's outro and the incoming frame's intro
		// genuinely overlap in the DOM — that overlap is exactly what
		// `.ft-stickyscroll-panel-frame`'s `grid-area: 1/1` exists for. It is
		// sampled at the instant each leg calls `animate()` rather than from
		// the test body: the swap is driven by microtasks here (the WAAPI stub
		// in test-setup.ts finishes on one), so any `await` in the test would
		// let the outro land first.
		const frameCounts: number[] = [];
		let container!: Element;
		const realAnimate = Element.prototype.animate;
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		animateSpy.mockImplementation(function (
			this: Element,
			...args: Parameters<Element["animate"]>
		) {
			frameCounts.push(container.querySelectorAll(".ft-stickyscroll-panel-frame").length);
			return realAnimate.apply(this, args);
		});

		const rendered = renderHarness({ items: items(3), activeIndex: 0 });
		container = rendered.container;
		await nextTick();

		await rendered.rerender({ items: items(3), activeIndex: 1 });
		await nextTick();

		expect(Math.max(...frameCounts)).toBe(2);

		await vi.waitFor(() => {
			expect(container.querySelectorAll(".ft-stickyscroll-panel-frame")).toHaveLength(1);
		});
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 1:Item 1");
		expect(animateSpy).toHaveBeenCalled();
	});

	it("crossfade={false} also takes the synchronous path, independent of reduced motion", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = renderHarness({
			items: items(2),
			activeIndex: 0,
			crossfade: false,
		});
		await nextTick();

		await rerender({ items: items(2), activeIndex: 1, crossfade: false });
		await nextTick();

		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 1:Item 1");
		expect(container.querySelectorAll(".ft-stickyscroll-panel-frame")).toHaveLength(1);
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("an empty items list renders no sections and no panel, without crashing", () => {
		const { container } = renderHarness({ items: [] });

		expect(sections(container)).toHaveLength(0);
		expect(container.querySelector(".ft-stickyscroll-panel")).toBeNull();
	});

	it("a single item renders sanely — one section, activeIndex stays 0", () => {
		const { container } = renderHarness({ items: items(1) });

		expect(sections(container)).toHaveLength(1);
		expect(sections(container)[0]!.dataset.active).toBe("true");
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 0:Item 0");
	});

	it("activeIndex clamps for panel rendering if it is out of range for a shrunk items list", async () => {
		const { container, rerender } = renderHarness({ items: items(3), activeIndex: 2 });
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 2:Item 2");

		await rerender({ items: items(1), activeIndex: 2 });
		await nextTick();

		await vi.waitFor(() => {
			expect(container.querySelectorAll(".ft-stickyscroll-panel-frame")).toHaveLength(1);
		});
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 0:Item 0");
	});

	it("merges a custom class and panelClass", () => {
		const { container } = renderHarness({
			items: items(1),
			class: "my-scroll",
			panelClass: "my-panel",
		});
		expect(root(container).className).toContain("ft-stickyscroll");
		expect(root(container).className).toContain("my-scroll");
		expect(container.querySelector(".ft-stickyscroll-panel")?.className).toContain("my-panel");
	});

	it("two instances on the same page don't cross-talk: triggering one's IO mock leaves the other's activeIndex untouched", async () => {
		const { container: first } = renderHarness({ items: items(2) });
		const { container: second } = renderHarness({ items: items(2) });
		await nextTick(); // the in-view core attaches from a post-flush watcher

		expect(activeIndexText(first)).toBe("0");
		expect(activeIndexText(second)).toBe("0");

		// Instance order: sections 0-1 belong to `first`, 2-3 to `second`.
		MockIntersectionObserver.instances[3]!.trigger(true);
		await nextTick();

		expect(activeIndexText(second)).toBe("1");
		expect(activeIndexText(first)).toBe("0");
	});

	// jsdom applies no scoped stylesheet and evaluates no container query at
	// all, so the layout half of the contract is asserted against the source
	// directly — the `button-group`/`code-diff` archetype in this repo.
	it("stacks by flex wrapping, and never tries to restyle the query container from inside its own @container block", () => {
		const source = readFileSync("src/components/sticky-scroll/StickyScroll.vue", "utf8");

		// The root wraps on its own...
		expect(source).toMatch(/\.ft-stickyscroll \{[^}]*display:\s*flex/);
		expect(source).toMatch(/\.ft-stickyscroll \{[^}]*flex-wrap:\s*wrap/);
		// ...and both children carry the basis that decides where it wraps.
		expect(source).toMatch(/\.ft-stickyscroll-items \{[^}]*flex:\s*1 1 min\(100%, 20rem\)/);
		expect(source).toMatch(/\.ft-stickyscroll-panel \{[^}]*flex:\s*1 1 min\(100%, 20rem\)/);

		// An element is styled by the query containers ABOVE it, never by its
		// own `container-type`, so the @container block must only ever select
		// descendants of `.ft-stickyscroll` — a rule for the root itself in
		// here would silently never apply.
		// Anchored to a line that STARTS the at-rule, so the prose mentions of
		// `@container` in the comments above it can't be picked up instead.
		// An SFC `<style>` block is formatted at column zero, so the at-rule
		// and its closing brace sit one indent level up from the source's.
		const block = source.match(/^@container[^{]*\{([\s\S]*?)\n\}/m);
		expect(block).not.toBeNull();
		expect(block![1]).toMatch(/\.ft-stickyscroll-panel \{/);
		expect(block![1]).not.toMatch(/\.ft-stickyscroll[\s[]*\{/);
	});

	it("cleanup: unmount disconnects every section's observer", async () => {
		const { unmount } = renderHarness({ items: items(4) });
		await nextTick(); // the in-view core attaches from a post-flush watcher

		expect(MockIntersectionObserver.instances).toHaveLength(4);
		unmount();

		for (const instance of MockIntersectionObserver.instances) {
			expect(instance.disconnect).toHaveBeenCalledTimes(1);
		}
	});
});
