import { render, cleanup, createEvent, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

// `vi.mock` factories are hoisted above imports and may not close over
// outer-scope variables directly — `vi.hoisted` is the escape hatch that
// still lets the test body assert on the same mock instances the component
// actually calls.
const { lockScrollMock, releaseMock } = vi.hoisted(() => {
	const releaseMock = vi.fn();
	const lockScrollMock = vi.fn(() => releaseMock);
	return { lockScrollMock, releaseMock };
});

vi.mock("../_internals/scroll-lock.js", () => ({
	lockScroll: lockScrollMock,
	// The action form goes through the same mock so the existing
	// acquire/release assertions keep meaning what they meant — and it has to
	// be here at all now: the component locks the page with `use:scrollLock`
	// rather than an `$effect`, so a factory exporting only `lockScroll`
	// leaves the action `undefined` and the component throws on open.
	scrollLock: () => ({ destroy: lockScrollMock() }),
}));

import Drawer from "./Drawer.svelte";
import Harness from "./DrawerHarness.test.svelte";

// Mirrors Drawer.svelte's own (not exported) DISMISS_THRESHOLD_PX — kept as a
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

function pressEscape() {
	return fireEvent.keyDown(document, { key: "Escape" });
}

/**
 * Escape, dispatched WITHOUT awaiting testing-library's own flush.
 *
 * `fireEvent` awaits a promise of its own on top of `tick()`, and those extra
 * microtask turns are exactly long enough for the stubbed Web Animations API
 * to fire `onfinish` and let Svelte destroy the branch — so a test that awaits
 * it can never observe the exit window it is trying to assert on. A bare
 * dispatch followed by `flushSync()` runs the whole close synchronously and
 * stops there, right inside the window.
 */
function dispatchEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

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
async function drag(deltaY: number, pointerId = 1) {
	await fireEvent.pointerDown(dragSurface(), { pointerId, clientY: 0, pointerType: "touch" });
	await fireEvent.pointerMove(dragSurface(), { pointerId, clientY: deltaY, pointerType: "touch" });
	await fireEvent.pointerUp(dragSurface(), { pointerId, clientY: deltaY, pointerType: "touch" });
}

/**
 * The same gesture, but the release is dispatched raw and flushed
 * synchronously — see `dispatchEscape` for why awaiting `fireEvent` here would
 * step straight over the exit window. `createEvent` is what makes the raw
 * dispatch equivalent to the awaited one: it fills in `pointerId`/`clientY` on
 * a jsdom `PointerEvent` that would otherwise drop them, and the component
 * checks both.
 */
async function dragReleasingInsideTheExit(deltaY: number, pointerId = 1) {
	const surface = dragSurface();
	await fireEvent.pointerDown(surface, { pointerId, clientY: 0, pointerType: "touch" });
	await fireEvent.pointerMove(surface, { pointerId, clientY: deltaY, pointerType: "touch" });
	surface.dispatchEvent(
		createEvent.pointerUp(surface, { pointerId, clientY: deltaY, pointerType: "touch" })
	);
	flushSync();
}

describe("Drawer", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(Drawer, { props: { title: "Filters" } });
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open, anchored to the bottom", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
		expect(el?.className).toContain("bottom-0");
	});

	it("wires aria-labelledby to the real title id", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Filters");
	});

	it("omits aria-labelledby when there is no title", () => {
		render(Drawer, { props: { open: true } });
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("wires aria-describedby to the real description id", () => {
		render(Drawer, {
			props: { open: true, title: "Filters", description: "Drag down to close." },
		});
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Drag down to close.");
	});

	it("omits aria-describedby when there is no description", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await pressEscape();

		// `open` still flips synchronously — nothing a caller can observe
		// waits for the slide-out — but the panel stays mounted while it
		// plays, so its removal is what has to be awaited.
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, {
			props: { open: true, title: "Filters", dismissible: false, onOpenChange },
		});

		await pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("renders a close button that closes the drawer on click", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("omits the close button when dismissible is false", () => {
		render(Drawer, { props: { open: true, title: "Filters", dismissible: false } });
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", () => {
		render(Drawer, { props: { open: true, title: "Filters" } });
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(Drawer, { props: { open: true, title: "Filters" } });
		expect(document.activeElement).not.toBe(trigger);

		await pressEscape();

		// Deliberately UNWRAPPED. The return happens at the dismiss instant,
		// not when the slide-out ends: the focus trap hands the component a
		// handle it calls from `onoutrostart`. Wrapping this in `waitFor`
		// would silently accept a return that only lands once the panel is
		// gone — which in a browser is 200 ms of a keyboard user sitting on
		// `<body>`, because the closing panel is made inert immediately.
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it("renders body and footer snippet content", () => {
		render(Drawer, {
			props: {
				open: true,
				title: "Filters",
				children: snippet("<p>Body</p>"),
				footer: snippet('<button type="button">Apply</button>'),
			},
		});
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Apply");
	});

	it("merges a custom class onto the panel", () => {
		render(Drawer, { props: { open: true, title: "Filters", class: "my-drawer" } });
		expect(dialog()!.className).toContain("my-drawer");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		render(Drawer, { props: { open: true, title: "Filters" } });

		// Stays synchronous: `use:scrollLock` acquires at mount, so the lock is
		// in place by the time the panel is on screen.
		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		await pressEscape();
		// The release is deliberately NOT synchronous any more: the action's
		// `destroy()` is delayed by the exit transition, which is what keeps
		// the page locked until the panel has actually finished sliding out.
		await waitFor(() => expect(releaseMock).toHaveBeenCalledTimes(1));
	});

	it("ignores a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		dispatchEscape();
		flushSync();
		expect(dialog()).toBeTruthy(); // still sliding out

		// The dismiss layer stops answering the moment `open` is false, so
		// neither of these reaches the drawer at all.
		dispatchEscape();
		dispatchEscape();
		flushSync();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("releases the scroll lock on unmount even if still open", () => {
		const { unmount } = render(Drawer, { props: { open: true, title: "Filters" } });
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	describe("swipe to close", () => {
		it("closes when dragged past the dismiss threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(150);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		it("springs back at exactly the threshold — only a drag strictly past it dismisses", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(DISMISS_THRESHOLD_PX);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("closes one pixel past the threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(DISMISS_THRESHOLD_PX + 1);

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		it("captures the pointer on drag start and releases it on drag end, with the same pointerId", async () => {
			// jsdom implements neither method, so `setPointerCapture`/
			// `releasePointerCapture` are stubbed directly on the element
			// rather than spied on an existing implementation. This proves the
			// calls are still wired (the realistic regression: someone deletes
			// them because jsdom never exercises them) — it does NOT prove
			// capture itself works, since jsdom cannot model a real cursor
			// leaving the element mid-drag.
			render(Drawer, { props: { open: true, title: "Filters" } });
			const surface = dragSurface();
			const setCapture = vi.fn();
			const releaseCaptureSpy = vi.fn();
			Object.assign(surface, {
				setPointerCapture: setCapture,
				releasePointerCapture: releaseCaptureSpy,
			});

			await fireEvent.pointerDown(surface, { pointerId: 7, clientY: 0, pointerType: "touch" });
			expect(setCapture).toHaveBeenCalledWith(7);
			expect(releaseCaptureSpy).not.toHaveBeenCalled();

			await fireEvent.pointerUp(surface, { pointerId: 7, clientY: 10, pointerType: "touch" });
			expect(releaseCaptureSpy).toHaveBeenCalledWith(7);
		});

		it("springs back and leaves the drawer open when the drag falls short of the threshold", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

			await drag(40);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
			// The offset resets to 0 immediately regardless of the spring-back
			// transition (which is a CSS-only concern gated behind reduced
			// motion) — the state itself is not left sitting at the drag
			// distance.
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});

		it("ignores the gesture entirely when swipeToClose is false", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", swipeToClose: false, onOpenChange },
			});

			await drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});

		it("ignores the gesture when dismissible is false, even with swipeToClose true", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", dismissible: false, onOpenChange },
			});

			await drag(150);

			expect(onOpenChange).not.toHaveBeenCalled();
			expect(dialog()).not.toBeNull();
		});

		it("is still fully usable with swipeToClose false: Escape and the scrim keep working", async () => {
			const onOpenChange = vi.fn();
			render(Drawer, {
				props: { open: true, title: "Filters", swipeToClose: false, onOpenChange },
			});

			await pressEscape();

			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(dialog()).toBeNull());
		});

		// The interaction-design half of the exit: a drag past the threshold
		// used to zero the offset and close in the same tick, which was
		// invisible only because removal was instant. With a slide-out that
		// would snap the panel back up to rest and then slide it down — two
		// gestures where the user made one.
		it("hands a past-threshold release straight to the exit, without snapping back first", async () => {
			render(Drawer, { props: { open: true, title: "Filters" } });

			await dragReleasingInsideTheExit(150);

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

		it("removes the drawer synchronously on a past-threshold release when the user asked for reduced motion", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(Drawer, { props: { open: true, title: "Filters" } });

			await dragReleasingInsideTheExit(150);

			expect(dialog()).toBeNull();
			expect(scrim()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
			animateSpy.mockRestore();
		});

		// A parent writing the bound `open` to false mid-drag bypasses the
		// component's own `close()` entirely. The exit start used to be
		// captured there and nowhere else, so it was still 0 while the panel's
		// inline transform sat at the finger's position — the drawer snapped
		// back up to rest and only then slid out.
		it("starts the exit from the live drag offset when a parent closes it mid-drag", async () => {
			const { getByTestId } = render(Harness);
			await fireEvent.click(getByTestId("trigger"));

			const surface = dragSurface();
			await fireEvent.pointerDown(surface, { pointerId: 1, clientY: 0, pointerType: "touch" });
			await fireEvent.pointerMove(surface, { pointerId: 1, clientY: 90, pointerType: "touch" });
			expect(dialog()!.style.transform).toBe("translateY(90px)");

			// No pointerup: the drag is still live when the parent closes.
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			await fireEvent.click(getByTestId("close-from-parent"));

			const exit = animateSpy.mock.calls
				.map((call) => (call[0] as Keyframe[])?.[0]?.transform)
				.find((transform) => typeof transform === "string" && transform.includes("translateY"));

			expect(exit).toContain("90px");
			animateSpy.mockRestore();
		});

		// The drag offset is deliberately left where the finger put it, and
		// it cannot be cleared from inside the closing block — Svelte marks
		// that branch inert before the outro. It is reset on the way back IN
		// instead, so a drawer swiped shut does not reopen already pushed
		// down by the last swipe's distance.
		it("reopens at rest after a swipe-to-close, not at the last drag offset", async () => {
			const { getByTestId } = render(Harness);

			await fireEvent.click(getByTestId("trigger"));
			await drag(150);
			await waitFor(() => expect(dialog()).toBeNull());

			await fireEvent.click(getByTestId("trigger"));
			expect(dialog()!.style.transform).toBe("translateY(0px)");
		});
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { open: true, title: "Filters", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("works with the callback alone (no open prop passed at all)", () => {
		const onOpenChange = vi.fn();
		render(Drawer, { props: { title: "Filters", onOpenChange } });

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through bind:open in both directions", async () => {
		const { getByTestId } = render(Harness);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		await fireEvent.click(closeButton()!);
		// The bound value flips straight away; only the panel's removal waits
		// for the slide-out.
		expect(getByTestId("bound-open").textContent).toBe("false");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("round-trips the panel element through bind:ref", async () => {
		const { getByTestId } = render(Harness);
		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()!.getAttribute("data-bound-ref")).toBe("yes");
	});
});
