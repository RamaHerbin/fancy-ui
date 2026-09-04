import { StrictMode, createElement } from "react";
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeInView, useInView } from "./in-view.js";

// Shape 2 for `observeInView` — the Svelte suite already drove the action
// directly against a hand-built node, so it transposes with the import line and
// the fail-visible handle's shape (see the last test) as the only edits. Shape 4
// for the hook that wraps it.

/** Capturing IntersectionObserver mock, kept local rather than reusing
 * `test-setup.ts`'s shared fake: these assertions count `disconnect()` calls
 * PER INSTANCE, which needs a per-instance spy. */
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

	trigger(isIntersecting: boolean, target: Element | undefined = this.observed[0]) {
		this.callback(
			[{ isIntersecting, target } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

function makeNode(): HTMLElement {
	return document.createElement("div");
}

/** The most recently constructed mock — every test's observer under test. */
function latest(): MockIntersectionObserver {
	return MockIntersectionObserver.instances.at(-1)!;
}

describe("observeInView", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		MockIntersectionObserver.instances = [];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("observes with the default threshold, rootMargin and root", () => {
		observeInView(makeNode(), { onChange: vi.fn() });
		const observer = latest();

		expect(observer.options?.threshold).toBe(0.1);
		expect(observer.options?.rootMargin).toBe("0px");
		expect(observer.options?.root).toBe(null);
	});

	it("passes threshold/rootMargin/root through to the constructor", () => {
		const root = document.createElement("div");
		observeInView(makeNode(), { onChange: vi.fn(), threshold: [0, 0.5], rootMargin: "10px", root });
		const observer = latest();

		expect(observer.options?.threshold).toEqual([0, 0.5]);
		expect(observer.options?.rootMargin).toBe("10px");
		expect(observer.options?.root).toBe(root);
	});

	it("once=true (default) disconnects after the first true", () => {
		const onChange = vi.fn();
		observeInView(makeNode(), { onChange });
		const observer = latest();

		observer.trigger(true);

		expect(onChange).toHaveBeenCalledExactlyOnceWith(true, expect.anything());
		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});

	it("once=false keeps observing and re-fires on every entry, including leaving", () => {
		const onChange = vi.fn();
		observeInView(makeNode(), { onChange, once: false });
		const observer = latest();

		observer.trigger(true);
		observer.trigger(false);
		observer.trigger(true);

		expect(onChange.mock.calls.map((call) => call[0])).toEqual([true, false, true]);
		expect(observer.disconnect).not.toHaveBeenCalled();
	});

	it("destroy() disconnects", () => {
		const handle = observeInView(makeNode(), { onChange: vi.fn(), once: false });
		const observer = latest();

		handle.destroy();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});

	it("update() swaps the callback WITHOUT rebuilding the observer when threshold/rootMargin/root are unchanged", () => {
		const first = vi.fn();
		const second = vi.fn();
		const handle = observeInView(makeNode(), { onChange: first, once: false });
		const countBefore = MockIntersectionObserver.instances.length;

		handle.update({ onChange: second, once: false });
		expect(MockIntersectionObserver.instances.length).toBe(countBefore); // no new observer

		const observer = latest();
		observer.trigger(true);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledExactlyOnceWith(true, expect.anything());
	});

	it("update() rebuilds the observer when rootMargin changes", () => {
		const onChange = vi.fn();
		const handle = observeInView(makeNode(), { onChange, rootMargin: "0px" });
		const previous = latest();

		handle.update({ onChange, rootMargin: "20px" });

		expect(MockIntersectionObserver.instances.length).toBe(2);
		expect(previous.disconnect).toHaveBeenCalledTimes(1);
		expect(latest().options?.rootMargin).toBe("20px");
	});

	it("update() picks up a changed `once` on the NEXT fire without rebuilding", () => {
		const onChange = vi.fn();
		const handle = observeInView(makeNode(), { onChange, once: true });
		const observer = latest();

		handle.update({ onChange, once: false });
		observer.trigger(true);
		observer.trigger(true);

		expect(onChange).toHaveBeenCalledTimes(2); // did not disconnect after the first
		expect(MockIntersectionObserver.instances).toHaveLength(1); // never rebuilt
	});

	it("once=true never rebuilds after it has already fired, so a later threshold/rootMargin/root change cannot deliver a second onChange(true)", () => {
		const onChange = vi.fn();
		const handle = observeInView(makeNode(), { onChange, threshold: 0.1 });
		const first = latest();
		const instanceCountAfterFirstFire = MockIntersectionObserver.instances.length;

		// Fires once, disconnects. A real, already-disconnected
		// IntersectionObserver can never call its callback again — so the
		// only way a second onChange(true) could ever happen is via a
		// freshly built REPLACEMENT observer. That is exactly what a naive
		// `update()` (rebuild whenever threshold/rootMargin/root changes,
		// unconditionally) would do.
		first.trigger(true);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(first.disconnect).toHaveBeenCalledTimes(1);

		// A reactive threshold prop on the consuming component changes
		// post-fire — this would normally force a rebuild, but `once: true`
		// having already fired must keep `build()` a no-op: no replacement
		// observer, so nothing left that could ever fire again.
		handle.update({ onChange, threshold: 0.5 });

		expect(MockIntersectionObserver.instances.length).toBe(instanceCountAfterFirstFire);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("N instances on sibling nodes are independent", () => {
		const onA = vi.fn();
		const onB = vi.fn();
		observeInView(makeNode(), { onChange: onA });
		observeInView(makeNode(), { onChange: onB });
		const [a, b] = MockIntersectionObserver.instances.slice(-2);

		a!.trigger(true);
		expect(onA).toHaveBeenCalledTimes(1);
		expect(onB).not.toHaveBeenCalled();

		b!.trigger(true);
		expect(onB).toHaveBeenCalledTimes(1);
	});

	it("no-IO fallback reports visible once, synchronously, and hands back an inert handle", () => {
		vi.stubGlobal("IntersectionObserver", undefined);

		const onChange = vi.fn();
		const handle = observeInView(makeNode(), { onChange });

		expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
		// The Svelte action returned a bare `{}` here, because the framework
		// probes for `update`/`destroy` before calling them. A plain function
		// cannot, so the handle keeps its shape and both methods are no-ops:
		// nothing was ever constructed, so there is nothing to update or tear
		// down (contract §5.11's signature).
		expect(() => handle.update({ onChange })).not.toThrow();
		expect(() => handle.destroy()).not.toThrow();
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});
});

describe("useInView", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		MockIntersectionObserver.instances = [];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns false until the node intersects, then true", () => {
		const node = makeNode();
		const { result } = renderHook(() => useInView(node));
		expect(result.current).toBe(false);

		act(() => latest().trigger(true));
		expect(result.current).toBe(true);
	});

	it("observes the node with the same resolved init the core uses", () => {
		const node = makeNode();
		renderHook(() => useInView(node));

		const observer = latest();
		expect(observer.observed).toEqual([node]);
		expect(observer.options).toEqual({ threshold: 0.1, rootMargin: "0px", root: null });
	});

	it("forwards the entry to onChange as well as returning the state", () => {
		const onChange = vi.fn();
		const node = makeNode();
		renderHook(() => useInView(node, { onChange, once: false }));

		act(() => latest().trigger(true));
		act(() => latest().trigger(false));

		expect(onChange.mock.calls.map((call) => call[0])).toEqual([true, false]);
		expect(onChange.mock.calls[0]?.[1]).toMatchObject({ target: node });
	});

	it("observes nothing for a null node", () => {
		renderHook(() => useInView(null));
		expect(MockIntersectionObserver.instances).toHaveLength(0);
	});

	it("observes nothing while enabled is false, and starts when it flips", () => {
		const node = makeNode();
		const { rerender } = renderHook(({ enabled }) => useInView(node, { enabled }), {
			initialProps: { enabled: false },
		});
		expect(MockIntersectionObserver.instances).toHaveLength(0);

		rerender({ enabled: true });
		expect(MockIntersectionObserver.instances).toHaveLength(1);
	});

	it("disconnects on unmount", () => {
		const node = makeNode();
		const { unmount } = renderHook(() => useInView(node));
		const observer = latest();

		unmount();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});

	it("rebuilds for a changed rootMargin, never for a new onChange identity", () => {
		const node = makeNode();
		const seen: boolean[] = [];
		const { rerender } = renderHook(
			({ rootMargin }) =>
				useInView(node, { rootMargin, once: false, onChange: (v) => seen.push(v) }),
			{ initialProps: { rootMargin: "0px" } }
		);

		// A brand-new inline `onChange` closure on every render, and no rebuild.
		rerender({ rootMargin: "0px" });
		expect(MockIntersectionObserver.instances).toHaveLength(1);

		rerender({ rootMargin: "20px" });
		expect(MockIntersectionObserver.instances).toHaveLength(2);
		expect(latest().options?.rootMargin).toBe("20px");

		act(() => latest().trigger(true));
		expect(seen).toEqual([true]);
	});

	it("once (the default) survives a rebuild — a later threshold change cannot deliver a second true", () => {
		const onChange = vi.fn();
		const node = makeNode();
		const { rerender } = renderHook(({ threshold }) => useInView(node, { threshold, onChange }), {
			initialProps: { threshold: 0.1 },
		});

		act(() => latest().trigger(true));
		expect(onChange).toHaveBeenCalledTimes(1);

		rerender({ threshold: 0.5 });

		expect(MockIntersectionObserver.instances).toHaveLength(1); // no replacement observer
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("once: false keeps reporting, including on the way out", () => {
		const node = makeNode();
		const { result } = renderHook(() => useInView(node, { once: false }));

		act(() => latest().trigger(true));
		expect(result.current).toBe(true);

		act(() => latest().trigger(false));
		expect(result.current).toBe(false);
	});

	it("fails visible: no IntersectionObserver reports true before the first paint", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const onChange = vi.fn();

		const { result } = renderHook(() => useInView(makeNode(), { onChange }));

		expect(result.current).toBe(true);
		expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
	});

	/*
	 * §9.4's StrictMode row, whose leak counter for this module is live
	 * observers. The rehearsal runs the layout effect, its cleanup, then the
	 * effect again, so a second IntersectionObserver is always constructed —
	 * what must not happen is the first one surviving it. `firedOnce` makes
	 * this the sharpest case in the unit: it is written from inside the
	 * observer callback and read as the effect's own early return, so an edit
	 * that moved the construction out of the effect, or dropped
	 * `handle.destroy()`, would strand a live observer on the node and every
	 * other case here would stay green.
	 *
	 * The file is `.ts`, so the tree is built with `createElement` rather than
	 * JSX.
	 */
	it("leaves exactly one live observer under StrictMode, and none observing after unmount", () => {
		const node = makeNode();
		function Probe() {
			useInView(node);
			return null;
		}

		const { unmount } = render(createElement(StrictMode, null, createElement(Probe)));

		expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0);
		const live = MockIntersectionObserver.instances.filter((o) => o.observed.includes(node));
		expect(live).toHaveLength(1);

		unmount();
		expect(MockIntersectionObserver.instances.filter((o) => o.observed.includes(node))).toHaveLength(
			0
		);
	});
});
