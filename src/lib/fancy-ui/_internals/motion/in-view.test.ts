import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inView } from "./in-view.js";

/** Capturing IntersectionObserver mock — the `number-ticker/NumberTicker.test.ts`
 * archetype, extended with `.observed`/`.options` so a test can assert what
 * each action instance was actually constructed with. */
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

	trigger(isIntersecting: boolean, target: Element = this.observed[0]) {
		this.callback(
			[{ isIntersecting, target } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

function makeNode(): HTMLElement {
	return document.createElement("div");
}

describe("inView", () => {
	beforeEach(() => {
		vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
		MockIntersectionObserver.instances = [];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("observes with the default threshold, rootMargin and root", () => {
		inView(makeNode(), { onChange: vi.fn() });
		const observer = MockIntersectionObserver.instances.at(-1)!;

		expect(observer.options?.threshold).toBe(0.1);
		expect(observer.options?.rootMargin).toBe("0px");
		expect(observer.options?.root).toBe(null);
	});

	it("passes threshold/rootMargin/root through to the constructor", () => {
		const root = document.createElement("div");
		inView(makeNode(), { onChange: vi.fn(), threshold: [0, 0.5], rootMargin: "10px", root });
		const observer = MockIntersectionObserver.instances.at(-1)!;

		expect(observer.options?.threshold).toEqual([0, 0.5]);
		expect(observer.options?.rootMargin).toBe("10px");
		expect(observer.options?.root).toBe(root);
	});

	it("once=true (default) disconnects after the first true", () => {
		const onChange = vi.fn();
		inView(makeNode(), { onChange });
		const observer = MockIntersectionObserver.instances.at(-1)!;

		observer.trigger(true);

		expect(onChange).toHaveBeenCalledExactlyOnceWith(true, expect.anything());
		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});

	it("once=false keeps observing and re-fires on every entry, including leaving", () => {
		const onChange = vi.fn();
		inView(makeNode(), { onChange, once: false });
		const observer = MockIntersectionObserver.instances.at(-1)!;

		observer.trigger(true);
		observer.trigger(false);
		observer.trigger(true);

		expect(onChange.mock.calls.map((call) => call[0])).toEqual([true, false, true]);
		expect(observer.disconnect).not.toHaveBeenCalled();
	});

	it("destroy() disconnects", () => {
		const handle = inView(makeNode(), { onChange: vi.fn(), once: false });
		const observer = MockIntersectionObserver.instances.at(-1)!;

		handle?.destroy?.();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});

	it("update() swaps the callback WITHOUT rebuilding the observer when threshold/rootMargin/root are unchanged", () => {
		const first = vi.fn();
		const second = vi.fn();
		const handle = inView(makeNode(), { onChange: first, once: false });
		const countBefore = MockIntersectionObserver.instances.length;

		handle?.update?.({ onChange: second, once: false });
		expect(MockIntersectionObserver.instances.length).toBe(countBefore); // no new observer

		const observer = MockIntersectionObserver.instances.at(-1)!;
		observer.trigger(true);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledExactlyOnceWith(true, expect.anything());
	});

	it("update() rebuilds the observer when rootMargin changes", () => {
		const onChange = vi.fn();
		const handle = inView(makeNode(), { onChange, rootMargin: "0px" });
		const previous = MockIntersectionObserver.instances.at(-1)!;

		handle?.update?.({ onChange, rootMargin: "20px" });

		expect(MockIntersectionObserver.instances.length).toBe(2);
		expect(previous.disconnect).toHaveBeenCalledTimes(1);
		expect(MockIntersectionObserver.instances.at(-1)!.options?.rootMargin).toBe("20px");
	});

	it("update() picks up a changed `once` on the NEXT fire without rebuilding", () => {
		const onChange = vi.fn();
		const handle = inView(makeNode(), { onChange, once: true });
		const observer = MockIntersectionObserver.instances.at(-1)!;

		handle?.update?.({ onChange, once: false });
		observer.trigger(true);
		observer.trigger(true);

		expect(onChange).toHaveBeenCalledTimes(2); // did not disconnect after the first
		expect(MockIntersectionObserver.instances).toHaveLength(1); // never rebuilt
	});

	it("once=true never rebuilds after it has already fired, so a later threshold/rootMargin/root change cannot deliver a second onChange(true)", () => {
		const onChange = vi.fn();
		const handle = inView(makeNode(), { onChange, threshold: 0.1 });
		const first = MockIntersectionObserver.instances.at(-1)!;
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
		handle?.update?.({ onChange, threshold: 0.5 });

		expect(MockIntersectionObserver.instances.length).toBe(instanceCountAfterFirstFire);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("N instances on sibling nodes are independent", () => {
		const onA = vi.fn();
		const onB = vi.fn();
		inView(makeNode(), { onChange: onA });
		inView(makeNode(), { onChange: onB });
		const [a, b] = MockIntersectionObserver.instances.slice(-2);

		a.trigger(true);
		expect(onA).toHaveBeenCalledTimes(1);
		expect(onB).not.toHaveBeenCalled();

		b.trigger(true);
		expect(onB).toHaveBeenCalledTimes(1);
	});

	it("no-IO fallback reports visible once, synchronously, and returns no update/destroy", () => {
		vi.stubGlobal("IntersectionObserver", undefined);

		const onChange = vi.fn();
		const handle = inView(makeNode(), { onChange });

		expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
		expect(handle).toEqual({});
	});
});
