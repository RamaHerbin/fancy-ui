import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Magnetic } from "./Magnetic.js";

/**
 * Capturing IntersectionObserver mock — the `number-ticker`/`in-view.test.ts`
 * archetype. Magnetic constructs its observer by calling the `observeInView`
 * core as a plain function (not via the `useInView` hook, see the component's
 * own comment on why), but the constructor it reaches is the same global
 * `IntersectionObserver` this mock replaces.
 */
class MockIntersectionObserver {
	static instances: MockIntersectionObserver[] = [];
	callback: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
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

/** Frames are captured rather than run — matching `raf.test.ts`'s house
 * pattern — so `runFrames()` only advances when a test says so. */
let frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 0;
function runFrames() {
	const pending = [...frames.values()];
	frames.clear();
	for (const frame of pending) frame(performance.now());
}

/** Same shape as `media-query.test.tsx`'s `stubMatchMedia`, keyed on the query
 * string rather than a blanket value for every query (a blanket
 * `matches: true` would also flip an unrelated query like `(hover: hover)`
 * the moment Magnetic ever queries one). Returns a live emitter so a test can
 * simulate `prefers-reduced-motion` changing at runtime, not just fix it once
 * at mount. Stateful (`current`) because `useMediaQuery` re-reads
 * `window.matchMedia(query).matches` as its snapshot after a change event. */
function stubMatchMedia(reducedMotion: boolean) {
	let current = reducedMotion;
	let handler: ((event: MediaQueryListEvent) => void) | undefined;
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: query.includes("prefers-reduced-motion") ? current : false,
			media: query,
			onchange: null,
			addEventListener: (_type: string, h: (event: MediaQueryListEvent) => void) => {
				handler = h;
			},
			removeEventListener: (_type: string, h: (event: MediaQueryListEvent) => void) => {
				if (handler === h) handler = undefined;
			},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
	return {
		fireChange(matches: boolean) {
			current = matches;
			handler?.({ matches } as MediaQueryListEvent);
		},
	};
}

/** jsdom's `getBoundingClientRect` is always all-zero; every test that needs
 * real geometry stubs it onto the specific rendered node. */
function stubRect(
	el: HTMLElement,
	rect: { left: number; top: number; width: number; height: number }
) {
	el.getBoundingClientRect = () =>
		({
			left: rect.left,
			top: rect.top,
			right: rect.left + rect.width,
			bottom: rect.top + rect.height,
			width: rect.width,
			height: rect.height,
			x: rect.left,
			y: rect.top,
			toJSON: () => ({}),
		}) as DOMRect;
}

const CHILD = (
	<button type="button">Hover me</button>
);

/** 100..140 on both axes — a 40×40 box with room on every side for both an
 * "inside the literal box" and an "inside the inflated field only" point. */
const BOX = { left: 100, top: 100, width: 40, height: 40 };

/** The jsdom version this package pins does not implement `PointerEvent`.
 * A `MouseEvent` of the same type carries the coordinates; the two
 * pointer-specific fields the handler reads (`pointerType`, `isPrimary`)
 * are assigned on afterwards so the guards are still exercised. */
function pointerEvent(type: string, init: PointerEventInit = {}): Event {
	if (typeof PointerEvent !== "undefined") return new PointerEvent(type, init);
	const event = new MouseEvent(type, init);
	Object.defineProperties(event, {
		pointerType: { value: init.pointerType },
		isPrimary: { value: init.isPrimary },
	});
	return event;
}

function move(x: number, y: number, opts: Partial<PointerEventInit> = {}) {
	window.dispatchEvent(
		pointerEvent("pointermove", {
			clientX: x,
			clientY: y,
			isPrimary: true,
			pointerType: "mouse",
			...opts,
		})
	);
}

/**
 * The `data-state` attribute is rendered by React from state, so a state
 * write made from a raw `window`/`document` listener (attached outside any
 * React event handler) does not flush the DOM until React re-renders —
 * unlike the `--ft-magnetic-x/y` vars (written by a direct, synchronous
 * `style.setProperty` call). Every dispatch that can flip `data-state` runs
 * the frame queue inside `act()` before assertions read the DOM.
 */
async function moveAndFlush(x: number, y: number, opts: Partial<PointerEventInit> = {}) {
	await act(async () => {
		move(x, y, opts);
		runFrames();
	});
}

function readVars(inner: HTMLElement) {
	return {
		x: inner.style.getPropertyValue("--ft-magnetic-x"),
		y: inner.style.getPropertyValue("--ft-magnetic-y"),
	};
}

describe("Magnetic", () => {
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

	/** Renders, stubs the outer node's rect to `BOX`, and (unless
	 * `skipIntersect`) drives the observer to report intersecting so the
	 * window listener is actually attached — the state most tests want to
	 * start from. */
	function mount(
		props: Record<string, unknown> = {},
		{ skipIntersect = false }: { skipIntersect?: boolean } = {}
	) {
		const { container, rerender, unmount } = render(<Magnetic {...props}>{CHILD}</Magnetic>);
		const outer = container.querySelector(".ft-magnetic") as HTMLElement;
		const inner = container.querySelector(".ft-magnetic-inner") as HTMLElement;
		stubRect(outer, BOX);
		if (!skipIntersect) {
			act(() => {
				MockIntersectionObserver.instances.at(-1)?.trigger(true);
			});
		}
		return { container, outer, inner, rerender, unmount };
	}

	it("renders a static outer wrapping a transformed inner, ref bound to the outer node", () => {
		const { outer, inner } = mount();
		expect(outer.classList.contains("ft-magnetic")).toBe(true);
		expect(inner.classList.contains("ft-magnetic-inner")).toBe(true);
		expect(outer.contains(inner)).toBe(true);
		expect(outer.querySelector("button")?.textContent).toBe("Hover me");
	});

	it("forwards ref to the outer node", () => {
		const ref = { current: null as HTMLDivElement | null };
		const { container } = render(<Magnetic ref={ref}>{CHILD}</Magnetic>);
		expect(ref.current).toBe(container.querySelector(".ft-magnetic"));
	});

	it("starts idle with no inline pull vars, and default radius left off the inline style", () => {
		const { outer, inner } = mount();
		expect(outer.dataset.state).toBe("idle");
		expect(outer.style.getPropertyValue("--ft-magnetic-radius")).toBe("");
		expect(inner.style.getPropertyValue("--ft-magnetic-x")).toBe("");
	});

	it("writes --ft-magnetic-radius inline only when radius differs from the default", () => {
		const { outer } = mount({ radius: 80 });
		expect(outer.style.getPropertyValue("--ft-magnetic-radius")).toBe("80px");
	});

	it("activates on a pointermove inside the literal box and writes clamped pull vars", async () => {
		const { outer, inner } = mount();
		// Center is (120, 120); strength defaults to 0.35, well under max (24).
		await moveAndFlush(130, 125);

		expect(outer.dataset.state).toBe("active");
		const vars = readVars(inner);
		expect(vars.x).toBe(`${(130 - 120) * 0.35}px`);
		expect(vars.y).toBe(`${(125 - 120) * 0.35}px`);
	});

	it("activates on a pointermove outside the literal box but inside the radius-inflated field", async () => {
		const { outer } = mount({ radius: 40 });
		// x=150 is 10px past the box's right edge (140) — outside the box,
		// inside the 40px field. This is the test that proves Magnetic reacts
		// before the pointer ever touches the element, not on hover.
		await moveAndFlush(150, 120);

		expect(outer.dataset.state).toBe("active");
	});

	it("stays idle at 0px for a pointer entirely outside the inflated field", async () => {
		const { outer, inner } = mount({ radius: 40 });
		await moveAndFlush(500, 500);

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
	});

	it("releases back to idle/0px when the pointer moves from inside the field to outside it", async () => {
		const { outer, inner } = mount();
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");

		await moveAndFlush(9999, 9999);

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
	});

	it("clamps the pull to max instead of the raw strength product", async () => {
		const { inner } = mount({ strength: 1, max: 5, radius: 100 });
		// Offset from center is 90px on both axes; raw product (90) would
		// blow past max (5) without the clamp.
		await moveAndFlush(210, 210);

		expect(readVars(inner)).toEqual({ x: "5px", y: "5px" });
	});

	it("ignores a touch pointer inside the field", async () => {
		const { outer, inner } = mount();
		await moveAndFlush(130, 125, { pointerType: "touch" });

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "", y: "" });
	});

	it("ignores a non-primary pointer inside the field", async () => {
		const { outer } = mount();
		await moveAndFlush(130, 125, { isPrimary: false });

		expect(outer.dataset.state).toBe("idle");
	});

	it("releases on a document pointerleave (pointer dragged off the whole viewport)", async () => {
		const { outer, inner } = mount();
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");

		await act(async () => {
			document.dispatchEvent(pointerEvent("pointerleave"));
		});

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
	});

	it("releases on a window blur (a tab switch fires no pointerleave at all)", async () => {
		const { outer, inner } = mount();
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");

		await act(async () => {
			window.dispatchEvent(new Event("blur"));
		});

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
	});

	it("does not attach the window pointermove listener before the observer reports intersecting", async () => {
		const addSpy = vi.spyOn(window, "addEventListener");
		const { outer } = mount({}, { skipIntersect: true });

		await moveAndFlush(130, 125);

		expect(outer.dataset.state).toBe("idle");
		expect(addSpy.mock.calls.some(([type]) => type === "pointermove")).toBe(false);
	});

	it("attaches the window pointermove listener once the observer reports intersecting", async () => {
		const { outer } = mount({}, { skipIntersect: true });
		act(() => {
			MockIntersectionObserver.instances.at(-1)!.trigger(true);
		});

		await moveAndFlush(130, 125);

		expect(outer.dataset.state).toBe("active");
	});

	it("detaches and releases when the observer reports leaving the viewport", async () => {
		const { outer, inner } = mount();
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");

		const removeSpy = vi.spyOn(window, "removeEventListener");
		act(() => {
			MockIntersectionObserver.instances.at(-1)!.trigger(false);
		});

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
		expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
	});

	it("disabled: attaches no listeners at all and ignores an in-field pointermove", async () => {
		const addSpy = vi.spyOn(window, "addEventListener");
		const { outer, inner } = mount({ disabled: true });

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(addSpy.mock.calls.some(([type]) => type === "pointermove")).toBe(false);

		await moveAndFlush(130, 125);

		expect(outer.dataset.state).toBe("idle");
		// Pinned to the literal 0px, not merely untouched: the same `release()`
		// path a live "pointer left the field" transition uses.
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
		expect(outer.dataset.disabled).toBe("true");
	});

	it("reduced motion: attaches no listeners at all and ignores an in-field pointermove", async () => {
		stubMatchMedia(true);
		const addSpy = vi.spyOn(window, "addEventListener");
		const { outer, inner } = mount();

		expect(MockIntersectionObserver.instances).toHaveLength(0);
		expect(addSpy.mock.calls.some(([type]) => type === "pointermove")).toBe(false);

		await moveAndFlush(130, 125);

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
	});

	it("reduced motion flipping on mid-interaction (a runtime change, not just at mount) tears the field down and releases", async () => {
		const emitter = stubMatchMedia(false);
		const { outer, inner } = mount();
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");

		const removeSpy = vi.spyOn(window, "removeEventListener");
		act(() => {
			emitter.fireChange(true);
		});

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
		expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
	});

	it("toggling disabled on mid-interaction tears the field down and releases", async () => {
		const { outer, inner, rerender } = mount();
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");

		const removeSpy = vi.spyOn(window, "removeEventListener");
		rerender(<Magnetic disabled>{CHILD}</Magnetic>);

		expect(outer.dataset.state).toBe("idle");
		expect(readVars(inner)).toEqual({ x: "0px", y: "0px" });
		expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));

		// Re-arming after disabled flips back off must work too — the same
		// gate has to open again, not just close once.
		removeSpy.mockRestore();
		rerender(<Magnetic disabled={false}>{CHILD}</Magnetic>);
		act(() => {
			MockIntersectionObserver.instances.at(-1)!.trigger(true);
		});
		await moveAndFlush(130, 125);
		expect(outer.dataset.state).toBe("active");
	});

	it("a radius prop change rebuilds the field with the new value", async () => {
		const { outer, rerender } = mount({ radius: 10 });
		// 150 is outside a 10px-inflated field (box right edge 140 + 10 = 150,
		// exclusive-outside just past it at 151 to avoid an edge-inclusive flake).
		await moveAndFlush(151, 120);
		expect(outer.dataset.state).toBe("idle");

		rerender(<Magnetic radius={80}>{CHILD}</Magnetic>);
		act(() => {
			MockIntersectionObserver.instances.at(-1)!.trigger(true);
		});
		await moveAndFlush(151, 120);

		expect(outer.dataset.state).toBe("active");
		expect(outer.style.getPropertyValue("--ft-magnetic-radius")).toBe("80px");
	});

	it("unmount disconnects the observer, removes every listener, and cancels a pending frame", () => {
		const { outer, unmount } = mount();
		// Get an in-flight frame queued so teardown-of-a-pending-frame is
		// actually exercised, not just the listener removal.
		move(130, 125);
		expect(frames.size).toBe(1);

		const observer = MockIntersectionObserver.instances.at(-1)!;
		const removeWindow = vi.spyOn(window, "removeEventListener");
		const removeDoc = vi.spyOn(document, "removeEventListener");
		const caf = vi.spyOn(globalThis, "cancelAnimationFrame");

		unmount();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
		expect(removeWindow).toHaveBeenCalledWith("pointermove", expect.any(Function));
		expect(removeWindow).toHaveBeenCalledWith("blur", expect.any(Function));
		expect(removeDoc).toHaveBeenCalledWith("pointerleave", expect.any(Function));
		expect(caf).toHaveBeenCalledTimes(1);
		expect(outer.isConnected).toBe(false);
	});
});
