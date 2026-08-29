import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { StickyScroll } from "./StickyScroll.js";

interface Item {
	id: string;
	label: string;
}

function items(n: number): Item[] {
	return Array.from({ length: n }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` }));
}

/** The `number-ticker`/`in-view.test.ts` capturing-mock archetype: a real
 * IntersectionObserver never fires under jsdom, so a mock that records every
 * constructed instance (one per `<section>`, since the observer is applied
 * per-node) and exposes a manual `trigger()` is the only way to simulate a
 * section crossing the centre-line rootMargin. */
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

interface HarnessProps {
	items: Item[];
	activeIndex?: number;
	panelSide?: "start" | "end";
	crossfade?: boolean;
	panelClass?: string;
	panelHidden?: boolean;
	onChange?: (index: number, item: Item) => void;
	className?: string;
}

/**
 * The counterpart of `StickyScrollHarness.test.svelte`: it owns the
 * `activeIndex` state (the React spelling of `bind:activeIndex`) and echoes
 * it into the DOM, so the tests can prove the bound value itself — not just
 * its downstream `data-active` effect — travels back out to the consumer.
 * A prop change from `rerender()` is synced into that state during render,
 * mirroring the parent → child leg of the binding.
 */
function StickyScrollHarness({
	items: itemList,
	activeIndex: activeIndexProp = 0,
	panelSide,
	crossfade,
	panelClass,
	panelHidden,
	onChange,
	className,
}: HarnessProps) {
	const [activeIndex, setActiveIndex] = useState(activeIndexProp);
	const prevProp = useRef(activeIndexProp);
	if (prevProp.current !== activeIndexProp) {
		prevProp.current = activeIndexProp;
		setActiveIndex(activeIndexProp);
	}

	return (
		<>
			<StickyScroll
				items={itemList}
				activeIndex={activeIndex}
				panelSide={panelSide}
				crossfade={crossfade}
				panelClass={panelClass}
				panelHidden={panelHidden}
				onChange={(i, it) => {
					setActiveIndex(i);
					onChange?.(i, it);
				}}
				className={className}
				item={(it, i, active) => (
					<span className="row" data-active={active}>
						{i}:{it.label}
					</span>
				)}
				panel={(it, i) => (
					<div className="panel-content">
						panel {i}:{it.label}
					</div>
				)}
			/>
			<span data-testid="active-index">{activeIndex}</span>
		</>
	);
}

function sections(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll(".ft-stickyscroll-item")] as HTMLElement[];
}

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-stickyscroll") as HTMLElement;
}

function activeIndexText(container: HTMLElement): string | null {
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
		const { container } = render(<StickyScrollHarness items={items(3)} />);

		expect(sections(container)).toHaveLength(3);
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 0:Item 0");
	});

	it("passes (item, index, active) to the item render — active true only for the current row", () => {
		const { container } = render(<StickyScrollHarness items={items(3)} activeIndex={1} />);

		const rows = [...container.querySelectorAll(".row")];
		expect(rows.map((r) => r.textContent)).toEqual(["0:Item 0", "1:Item 1", "2:Item 2"]);
		expect(rows.map((r) => r.getAttribute("data-active"))).toEqual(["false", "true", "false"]);
	});

	it("a capturing IO mock moving from section 0 to section 1 updates data-active, bound activeIndex, and fires onChange", async () => {
		const onChange = vi.fn();
		const { container } = render(<StickyScrollHarness items={items(3)} onChange={onChange} />);

		expect(sections(container).map((s) => s.dataset.active)).toEqual(["true", "false", "false"]);
		expect(activeIndexText(container)).toBe("0");

		act(() => {
			MockIntersectionObserver.instances[1]!.trigger(true);
		});
		await act(async () => {});

		expect(sections(container).map((s) => s.dataset.active)).toEqual(["false", "true", "false"]);
		expect(activeIndexText(container)).toBe("1");
		expect(onChange).toHaveBeenCalledExactlyOnceWith(1, expect.objectContaining({ id: "item-1" }));
	});

	it("holds its last value when nothing intersects — leaving a section (intersecting: false) does not move activeIndex", async () => {
		const onChange = vi.fn();
		const { container } = render(<StickyScrollHarness items={items(3)} onChange={onChange} />);

		act(() => {
			MockIntersectionObserver.instances[0]!.trigger(false);
		});
		await act(async () => {});

		expect(sections(container)[0]!.dataset.active).toBe("true"); // unchanged
		expect(activeIndexText(container)).toBe("0");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("every section observes with the centre-line rootMargin, threshold 0, once: false", () => {
		render(<StickyScrollHarness items={items(2)} />);

		for (const instance of MockIntersectionObserver.instances) {
			expect(instance.options?.rootMargin).toBe("-50% 0px -50% 0px");
			expect(instance.options?.threshold).toBe(0);
		}
	});

	it("panelSide defaults to end and reflects into data-panel-side", () => {
		const { container } = render(<StickyScrollHarness items={items(2)} />);
		expect(root(container).dataset.panelSide).toBe("end");
		cleanup();

		const { container: start } = render(
			<StickyScrollHarness items={items(2)} panelSide="start" />
		);
		expect(start.querySelector(".ft-stickyscroll")?.getAttribute("data-panel-side")).toBe("start");
	});

	it("panelHidden defaults to true (aria-hidden) and can be turned off", () => {
		const { container } = render(<StickyScrollHarness items={items(2)} />);
		expect(container.querySelector(".ft-stickyscroll-panel")?.getAttribute("aria-hidden")).toBe(
			"true"
		);
		cleanup();

		const { container: shown } = render(
			<StickyScrollHarness items={items(2)} panelHidden={false} />
		);
		expect(shown.querySelector(".ft-stickyscroll-panel")?.hasAttribute("aria-hidden")).toBe(false);
	});

	it("focusin on a section activates it", async () => {
		const onChange = vi.fn();
		const { container } = render(<StickyScrollHarness items={items(3)} onChange={onChange} />);

		const target = sections(container)[2]!.querySelector(".row") as HTMLElement;
		fireEvent.focusIn(target);
		await act(async () => {});

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

		const { container, rerender } = render(
			<StickyScrollHarness items={items(3)} activeIndex={0} />
		);
		await act(async () => {});

		rerender(<StickyScrollHarness items={items(3)} activeIndex={1} />);
		await act(async () => {});

		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 1:Item 1");
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("with default props (motion on), the panel swap actually crossfades: Element.prototype.animate runs and both frames briefly coexist", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(
			<StickyScrollHarness items={items(3)} activeIndex={0} />
		);
		await act(async () => {});

		rerender(<StickyScrollHarness items={items(3)} activeIndex={1} />);

		// Mid-swap: the outgoing frame's outro and the incoming frame's intro
		// genuinely overlap in the DOM for a moment — that overlap is exactly
		// what `.ft-stickyscroll-panel-frame`'s `grid-area: 1/1` exists for.
		// This has to be observed before flushing microtasks, since the WAAPI
		// stub in test-setup.ts finishes on a microtask that a later `await`
		// would otherwise let run first.
		expect(container.querySelectorAll(".ft-stickyscroll-panel-frame")).toHaveLength(2);

		await act(async () => {});

		await vi.waitFor(() => {
			expect(container.querySelectorAll(".ft-stickyscroll-panel-frame")).toHaveLength(1);
		});
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 1:Item 1");
		expect(animateSpy).toHaveBeenCalled();
	});

	it("crossfade={false} also takes the synchronous path, independent of reduced motion", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(
			<StickyScrollHarness items={items(2)} activeIndex={0} crossfade={false} />
		);
		await act(async () => {});

		rerender(<StickyScrollHarness items={items(2)} activeIndex={1} crossfade={false} />);
		await act(async () => {});

		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 1:Item 1");
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("an empty items list renders no sections and no panel, without crashing", () => {
		const { container } = render(<StickyScrollHarness items={[]} />);

		expect(sections(container)).toHaveLength(0);
		expect(container.querySelector(".ft-stickyscroll-panel")).toBeNull();
	});

	it("a single item renders sanely — one section, activeIndex stays 0", () => {
		const { container } = render(<StickyScrollHarness items={items(1)} />);

		expect(sections(container)).toHaveLength(1);
		expect(sections(container)[0]!.dataset.active).toBe("true");
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 0:Item 0");
	});

	it("activeIndex clamps for panel rendering if it is out of range for a shrunk items list", async () => {
		const { container, rerender } = render(
			<StickyScrollHarness items={items(3)} activeIndex={2} />
		);
		expect(container.querySelector(".panel-content")?.textContent).toBe("panel 2:Item 2");

		rerender(<StickyScrollHarness items={items(1)} activeIndex={2} />);
		await act(async () => {});

		await vi.waitFor(() => {
			expect(container.querySelector(".panel-content")?.textContent).toBe("panel 0:Item 0");
		});
	});

	it("merges a custom class and panelClass", () => {
		const { container } = render(
			<StickyScrollHarness items={items(1)} className="my-scroll" panelClass="my-panel" />
		);
		expect(root(container).className).toContain("ft-stickyscroll");
		expect(root(container).className).toContain("my-scroll");
		expect(container.querySelector(".ft-stickyscroll-panel")?.className).toContain("my-panel");
	});

	it("two instances on the same page don't cross-talk: triggering one's IO mock leaves the other's activeIndex untouched", async () => {
		const { container: first } = render(<StickyScrollHarness items={items(2)} />);
		const { container: second } = render(<StickyScrollHarness items={items(2)} />);

		expect(activeIndexText(first)).toBe("0");
		expect(activeIndexText(second)).toBe("0");

		// Instance order: sections 0-1 belong to `first`, 2-3 to `second`.
		act(() => {
			MockIntersectionObserver.instances[3]!.trigger(true);
		});
		await act(async () => {});

		expect(activeIndexText(second)).toBe("1");
		expect(activeIndexText(first)).toBe("0");
	});

	// jsdom applies no stylesheet and evaluates no container query at all, so
	// the layout half of the contract is asserted against the source directly
	// — the `button-group`/`code-diff` archetype in this repo.
	it("stacks by flex wrapping, and never tries to restyle the query container from inside its own @container block", () => {
		const source = readFileSync("src/components/sticky-scroll/sticky-scroll.css", "utf8");

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
		const block = source.match(/^@container[^{]*\{([\s\S]*?)\n\}/m);
		expect(block).not.toBeNull();
		expect(block![1]).toMatch(/\.ft-stickyscroll-panel \{/);
		expect(block![1]).not.toMatch(/\.ft-stickyscroll[\s[]*\{/);
	});

	it("cleanup: unmount disconnects every section's observer", () => {
		const { unmount } = render(<StickyScrollHarness items={items(4)} />);

		expect(MockIntersectionObserver.instances).toHaveLength(4);
		unmount();

		for (const instance of MockIntersectionObserver.instances) {
			expect(instance.disconnect).toHaveBeenCalledTimes(1);
		}
	});
});
