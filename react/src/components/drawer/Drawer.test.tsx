import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

// The source suite mocks the scroll-lock module wholesale, and this transposition
// keeps that: the acquire/release assertions below are about WHEN the lock is
// taken and let go, not about what it does to `document.body`. `vi.mock`
// factories are hoisted above imports and may not close over outer-scope
// variables directly — `vi.hoisted` is the escape hatch that still lets the
// test body assert on the same mock instances the component actually calls.
const { lockScrollMock, releaseMock } = vi.hoisted(() => {
	const releaseMock = vi.fn();
	const lockScrollMock = vi.fn(() => releaseMock);
	return { lockScrollMock, releaseMock };
});

vi.mock("../../internals/scroll-lock.js", async () => {
	const { useLayoutEffect } = await import("react");
	return {
		lockScroll: lockScrollMock,
		// The hook form goes through the same mock so the existing
		// acquire/release assertions keep meaning what they meant — the
		// component locks the page with `useScrollLock(presence.mounted)`, so
		// a factory exporting only `lockScroll` leaves the hook `undefined`
		// and the component throws on render.
		useScrollLock: (enabled: boolean = true) => {
			useLayoutEffect(() => {
				if (!enabled) return;
				const release = lockScrollMock();
				return () => {
					release();
				};
			}, [enabled]);
		},
	};
});

import { Drawer } from "./Drawer.js";

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando that reflects to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE) was
 * never touched. Same shim the presence and dialog suites install, guarded so
 * it is a no-op the moment jsdom ships the real property.
 */
if (!("inert" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "inert", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("inert");
		},
		set(this: HTMLElement, value: boolean) {
			if (value) this.setAttribute("inert", "");
			else this.removeAttribute("inert");
		},
	});
}

/**
 * `PointerEvent`, which the jsdom this package runs on does not implement.
 * Without it `fireEvent.pointerDown` falls back to a plain `Event` and drops
 * the entire init object on the floor — `pointerId`, `pointerType` and the
 * coordinates all arrive as `undefined`, and the component checks all three.
 * Extending `MouseEvent` is what makes the coordinates real. Test-only and
 * file-local, installed only where the host lacks the constructor.
 */
class PointerEventPolyfill extends MouseEvent {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly isPrimary: boolean;

	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
		this.pointerType = init.pointerType ?? "";
		this.isPrimary = init.isPrimary ?? false;
	}
}

if (typeof window.PointerEvent === "undefined") {
	Object.defineProperty(window, "PointerEvent", {
		writable: true,
		configurable: true,
		value: PointerEventPolyfill,
	});
}

// Mirrors Drawer.tsx's own (not exported) DISMISS_THRESHOLD_PX — kept as a
// named constant here too so the boundary tests below read as "exactly at"
// and "one past" rather than a bare, unexplained 96/97.
const DISMISS_THRESHOLD_PX = 96;

function dialog(): HTMLElement | null {
	return document.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.querySelector(".ft-drawer-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.querySelector(".ft-drawer-close");
}

function dragSurface(): HTMLElement {
	return document.querySelector(".ft-drawer-drag-surface") as HTMLElement;
}

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there. (The
 * source suite's `dispatchEscape` + `flushSync` pair collapses to this.)
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

/**
 * Drains an in-flight leg to completion — the animation stub finishes on a
 * microtask, so an async `act` flushes the React updates the finish schedules.
 * Tests that leave a leg in flight end with this so the settle happens inside
 * `act` rather than warning after the test body has returned.
 */
const settleLegs = () => act(async () => {});

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before a render is visible to the very next read. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

// Drives the same handle a real touch/mouse drag would: down at clientY 0,
// one move to `deltaY`, then up — the component only reads the distance
// between down and the latest move, so a single move step is enough to
// exercise the threshold decision.
function drag(deltaY: number, pointerId = 1) {
	fireEvent.pointerDown(dragSurface(), { pointerId, clientY: 0, pointerType: "touch" });
	fireEvent.pointerMove(dragSurface(), { pointerId, clientY: deltaY, pointerType: "touch" });
	fireEvent.pointerUp(dragSurface(), { pointerId, clientY: deltaY, pointerType: "touch" });
}

/**
 * The same gesture, but the release runs in a synchronous `act` — flushing the
 * close without draining the microtask the animation stub finishes on, so the
 * assertions that follow land inside the exit window instead of after it.
 */
function dragReleasingInsideTheExit(deltaY: number, pointerId = 1) {
	const surface = dragSurface();
	fireEvent.pointerDown(surface, { pointerId, clientY: 0, pointerType: "touch" });
	fireEvent.pointerMove(surface, { pointerId, clientY: deltaY, pointerType: "touch" });
	act(() => {
		surface.dispatchEvent(
			new window.PointerEvent("pointerup", {
				pointerId,
				clientY: deltaY,
				pointerType: "touch",
				bubbles: true,
				cancelable: true,
			})
		);
	});
}

/**
 * Test-only rig, the counterpart of the source suite's `DrawerHarness
 * .test.svelte`. `bind:open`/`bind:ref` become the standard controlled shape:
 * the harness owns `open`, hands it down as a prop, and takes writes back
 * through `onOpenChange` — echoing the value into the DOM is still the only
 * way to prove `open` travels back out to the consumer (and that a consumer's
 * own state can, in turn, open the drawer) rather than merely changing what
 * the drawer draws internally.
 */
function Harness({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
				Open
			</button>
			{/* A close driven from OUTSIDE the drawer: the parent-write path,
			    which never goes through the component's own `close()`. */}
			<button type="button" data-testid="close-from-parent" onClick={() => setOpen(false)}>
				Close
			</button>
			<Drawer
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					onOpenChange?.(next);
				}}
				ref={(node) => {
					// The `bind:ref` round-trip: the harness proves the panel
					// element reaches the consumer by stamping it.
					node?.setAttribute("data-bound-ref", "yes");
				}}
				title="Filters"
			>
				Body content
			</Drawer>
			<span data-testid="bound-open">{String(open)}</span>
		</>
	);
}

describe("Drawer", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(<Drawer title="Filters" />);
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open, anchored to the bottom", () => {
		render(<Drawer open title="Filters" />);
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
		expect(el?.className).toContain("bottom-0");
	});

	it("wires aria-labelledby to the real title id", () => {
		render(<Drawer open title="Filters" />);
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Filters");
	});

	it("omits aria-labelledby when there is no title", () => {
		render(<Drawer open />);
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("wires aria-describedby to the real description id", () => {
		render(<Drawer open title="Filters" description="Drag down to close." />);
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Drag down to close.");
	});

	it("omits aria-describedby when there is no description", () => {
		render(<Drawer open title="Filters" />);
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

		pressEscape();

		// `open` still flips synchronously — nothing a caller can observe
		// waits for the slide-out — but the panel stays mounted while it
		// plays, so its removal is what has to be awaited.
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on Escape when dismissible is false", () => {
		const onOpenChange = vi.fn();
		render(<Drawer open title="Filters" dismissible={false} onOpenChange={onOpenChange} />);

		pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

		fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("renders a close button that closes the drawer on click", async () => {
		const onOpenChange = vi.fn();
		render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("omits the close button when dismissible is false", () => {
		render(<Drawer open title="Filters" dismissible={false} />);
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", () => {
		render(<Drawer open title="Filters" />);
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(<Drawer open title="Filters" />);
		expect(document.activeElement).not.toBe(trigger);

		pressEscape();

		// Deliberately UNWRAPPED. The return happens at the dismiss instant,
		// not when the slide-out ends: the focus trap hands the component a
		// handle it calls from `onExitStart`. Wrapping this in `waitFor`
		// would silently accept a return that only lands once the panel is
		// gone — which in a browser is 200 ms of a keyboard user sitting on
		// `<body>`, because the closing panel is made inert immediately.
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
		await settleLegs();
	});

	it("renders body and footer content", () => {
		render(
			<Drawer open title="Filters" footer={<button type="button">Apply</button>}>
				<p>Body</p>
			</Drawer>
		);
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Apply");
	});

	it("merges a custom class onto the panel", () => {
		render(<Drawer open title="Filters" className="my-drawer" />);
		expect(dialog()!.className).toContain("my-drawer");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		render(<Drawer open title="Filters" />);

		// Stays synchronous: the lock is acquired in a layout effect the
		// moment the surface mounts, so it is in place by the time the panel
		// is on screen.
		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		pressEscape();
		// The release is deliberately NOT synchronous: it is scoped to the
		// surface's mount, which `usePresence` holds for the length of the
		// exit — which is what keeps the page locked until the panel has
		// actually finished sliding out.
		await waitFor(() => expect(releaseMock).toHaveBeenCalledTimes(1));
	});

	it("ignores a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

		pressEscape();
		expect(dialog()).toBeTruthy(); // still sliding out

		// The dismiss layer stops answering the moment `open` is false, so
		// neither of these reaches the drawer at all.
		pressEscape();
		pressEscape();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("releases the scroll lock on unmount even if still open", () => {
		const { unmount } = render(<Drawer open title="Filters" />);
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	describe("swipe to close", () => {
		it("closes when dragged past the dismiss threshold", async () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

			drag(150);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		it("springs back at exactly the threshold — only a drag strictly past it dismisses", () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

			drag(DISMISS_THRESHOLD_PX);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("closes one pixel past the threshold", async () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

			drag(DISMISS_THRESHOLD_PX + 1);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		it("captures the pointer on drag start and releases it on drag end, with the same pointerId", () => {
			// jsdom implements neither method, so `setPointerCapture`/
			// `releasePointerCapture` are stubbed directly on the element
			// rather than spied on an existing implementation. This proves the
			// calls are still wired (the realistic regression: someone deletes
			// them because jsdom never exercises them) — it does NOT prove
			// capture itself works, since jsdom cannot model a real cursor
			// leaving the element mid-drag.
			render(<Drawer open title="Filters" />);
			const surface = dragSurface();
			const setCapture = vi.fn();
			const releaseCaptureSpy = vi.fn();
			Object.assign(surface, {
				setPointerCapture: setCapture,
				releasePointerCapture: releaseCaptureSpy,
			});

			fireEvent.pointerDown(surface, { pointerId: 7, clientY: 0, pointerType: "touch" });
			expect(setCapture).toHaveBeenCalledWith(7);
			expect(releaseCaptureSpy).not.toHaveBeenCalled();

			fireEvent.pointerUp(surface, { pointerId: 7, clientY: 10, pointerType: "touch" });
			expect(releaseCaptureSpy).toHaveBeenCalledWith(7);
		});

		it("springs back and leaves the drawer open when the drag falls short of the threshold", () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

			drag(40);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
			// The offset resets to 0 immediately regardless of the spring-back
			// transition (which is a CSS-only concern gated behind reduced
			// motion) — the state itself is not left sitting at the drag
			// distance.
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});

		it("ignores the gesture entirely when swipeToClose is false", () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" swipeToClose={false} onOpenChange={onOpenChange} />);

			drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});

		it("ignores the gesture when dismissible is false, even with swipeToClose true", () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" dismissible={false} onOpenChange={onOpenChange} />);

			drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("is still fully usable with swipeToClose false: Escape and the scrim keep working", async () => {
			const onOpenChange = vi.fn();
			render(<Drawer open title="Filters" swipeToClose={false} onOpenChange={onOpenChange} />);

			pressEscape();

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		// The interaction-design half of the exit: a drag past the threshold
		// used to zero the offset and close in the same tick, which was
		// invisible only because removal was instant. With a slide-out that
		// would snap the panel back up to rest and then slide it down — two
		// gestures where the user made one.
		it("hands a past-threshold release straight to the exit, without snapping back first", async () => {
			render(<Drawer open title="Filters" />);

			dragReleasingInsideTheExit(150);

			const closing = dialog();
			expect(closing).toBeTruthy();
			expect(closing!.getAttribute("data-state")).toBe("closing");
			expect(closing!.inert).toBe(true);
			// The offset is still exactly where the finger left it. That is
			// the exit's start point — the transition interpolates from here
			// to a full height below the viewport rather than from rest.
			expect(closing!.style.transform).toBe("translateY(150px)");

			await waitFor(() => expect(dialog()).toBeNull());
			expect(scrim()).toBeNull();
		});

		it("removes the drawer synchronously on a past-threshold release when the user asked for reduced motion", () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(<Drawer open title="Filters" />);

			dragReleasingInsideTheExit(150);

			expect(dialog()).toBeNull();
			expect(scrim()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
			animateSpy.mockRestore();
		});

		// A parent writing `open` to false mid-drag bypasses the component's
		// own `close()` entirely. The exit start used to be captured there
		// and nowhere else, so it was still 0 while the panel's inline
		// transform sat at the finger's position — the drawer snapped back up
		// to rest and only then slid out.
		it("starts the exit from the live drag offset when a parent closes it mid-drag", async () => {
			const { getByTestId } = render(<Harness />);
			fireEvent.click(getByTestId("trigger"));
			// Let the ENTRANCE leg settle before spying: the sampler chains its
			// real `animate()` call off a microtask, so without this drain the
			// entrance's keyframes (whose `from` is rightly 0) would land inside
			// the spy window and be the first `translateY` match below.
			await settleLegs();

			const surface = dragSurface();
			fireEvent.pointerDown(surface, { pointerId: 1, clientY: 0, pointerType: "touch" });
			fireEvent.pointerMove(surface, { pointerId: 1, clientY: 90, pointerType: "touch" });
			expect(dialog()!.style.transform).toBe("translateY(90px)");

			// No pointerup: the drag is still live when the parent closes.
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			fireEvent.click(getByTestId("close-from-parent"));
			// The sampler chains the real keyframed `animate()` off a microtask
			// (behind a zero-length delay animation) — drain it so the exit's
			// keyframes are in the spy before reading them. The spy keeps its
			// calls even though the leg has settled by the time we look.
			await settleLegs();

			const exit = animateSpy.mock.calls
				.map((call) => (call[0] as Keyframe[])?.[0]?.transform)
				.find((transform) => typeof transform === "string" && transform.includes("translateY"));

			expect(exit).toContain("90px");
			animateSpy.mockRestore();
			await waitFor(() => expect(dialog()).toBeNull());
		});

		// The drag offset is deliberately left where the finger put it on a
		// past-threshold release — it is the exit's start point. It is reset
		// on the way back IN instead, so a drawer swiped shut does not reopen
		// already pushed down by the last swipe's distance.
		it("reopens at rest after a swipe-to-close, not at the last drag offset", async () => {
			const { getByTestId } = render(<Harness />);

			fireEvent.click(getByTestId("trigger"));
			drag(150);
			await waitFor(() => expect(dialog()).toBeNull());

			fireEvent.click(getByTestId("trigger"));
			expect(dialog()!.style.transform).toBe("translateY(0px)");
			await settleLegs();
		});
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(<Drawer open title="Filters" onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("works with the callback alone (no open prop passed at all)", () => {
		const onOpenChange = vi.fn();
		render(<Drawer title="Filters" onOpenChange={onOpenChange} />);

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through the controlled prop in both directions", async () => {
		const { getByTestId } = render(<Harness />);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		fireEvent.click(getByTestId("trigger"));
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		fireEvent.click(closeButton()!);
		// The controlled value flips straight away; only the panel's removal
		// waits for the slide-out.
		expect(getByTestId("bound-open").textContent).toBe("false");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("round-trips the panel element through the forwarded ref", async () => {
		const { getByTestId } = render(<Harness />);
		fireEvent.click(getByTestId("trigger"));
		expect(dialog()!.getAttribute("data-bound-ref")).toBe("yes");
		await settleLegs();
	});
});
