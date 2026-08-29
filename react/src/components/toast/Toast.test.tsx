import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DURATIONS } from "../../internals/motion/tokens.js";
import { Toaster } from "./Toaster.js";
import { dismissToast, toast, toastStore } from "./store.js";
import type { ToastOptions } from "./store.js";

/**
 * Transposed assertion-for-assertion from the source suite. Three shapes
 * changed and nothing else did:
 *
 * - Store mutations (`toast()`, `dismissToast()`) drive React state through a
 *   subscription, so each one is wrapped in `act` — the React spelling of the
 *   source's implicit flush.
 * - `pointerenter`/`pointerleave` are DERIVED events in React: the
 *   enter/leave plugin synthesises them from `pointerover`/`pointerout`, so
 *   dispatching a raw `pointerenter` — which is what the source suite does —
 *   would reach no handler at all. `pointerEnter`/`pointerLeave` below are
 *   the same user gesture expressed in the events React actually listens for.
 * - The source sampled `outrostart` — the framework's own transition event,
 *   which has no counterpart here — to observe the exit's first instant. The
 *   same assertions are made synchronously after the dismissing `act`, which
 *   is that exact moment: the exit leg has started, its finish is still a
 *   microtask away.
 */

/**
 * jsdom has no `inert` IDL property at all — setting `el.inert = true`
 * creates a plain expando with no attribute reflection. This shim makes the
 * property reflect to the attribute, matching every real browser. Guarded so
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

/** The store is a module-level singleton — clear it between tests so none leak into the next. */
function resetStore() {
	for (const item of [...toastStore.items]) {
		dismissToast(item.id);
	}
}

function politeRegion(): HTMLElement {
	return document.querySelector('[aria-live="polite"]') as HTMLElement;
}

function assertiveRegion(): HTMLElement {
	return document.querySelector('[aria-live="assertive"]') as HTMLElement;
}

function toastPanels(): HTMLElement[] {
	return Array.from(document.querySelectorAll(".ft-toast"));
}

/** Raises a toast inside `act`, so the store notification's render is flushed. */
function raise(options: ToastOptions): string {
	let id = "";
	act(() => {
		id = toast(options);
	});
	return id;
}

/** Dismisses inside a SYNCHRONOUS `act`: the re-render and the exit's first
 *  layout effect are flushed, but the exit itself — a couple of microtasks
 *  under the animation stub — is still in flight, which is exactly the moment
 *  the mounted-and-inert assertions need to observe. */
function dismiss(id: string) {
	act(() => {
		dismissToast(id);
	});
}

/** Advances fake timers inside `act`, so the state updates their callbacks
 *  schedule are flushed before the next assertion. */
async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

/**
 * Waits out a dismissed toast's exit transition.
 *
 * The store still removes an item synchronously — every `toastStore.items`
 * assertion below is untouched — but the DOM now lags it by `DURATIONS.exit`,
 * because the viewport keeps the dismissed toast mounted for the length of
 * its exit. Any assertion that a panel is *gone* has to wait for that; any
 * assertion that the store forgot it does not.
 *
 * An async timer advance drains microtasks between callbacks, which is what
 * settles the animation stub's microtask-chained finish under fake timers.
 */
async function settleExit(): Promise<void> {
	await advance(DURATIONS.exit);
}

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every transition, so an
 * override installed before the first toast is visible to it. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: matches && query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

/** The source dispatches raw `pointerenter`/`pointerleave`; React's
 *  enter/leave plugin listens for over/out — same gesture, see the header. */
function pointerEnter(el: Element) {
	fireEvent.pointerOver(el);
}

function pointerLeave(el: Element) {
	fireEvent.pointerOut(el);
}

describe("Toast / Toaster", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		resetStore();
		document.body.innerHTML = "";
		vi.useRealTimers();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked prototype property reuses the
		// existing mock rather than layering a new one — restore between
		// tests so no call list leaks forward.
		vi.restoreAllMocks();
	});

	it("mounts both live regions empty, before any toast exists", () => {
		render(<Toaster />);
		expect(politeRegion()).not.toBeNull();
		expect(assertiveRegion()).not.toBeNull();
		expect(politeRegion().textContent).toBe("");
		expect(assertiveRegion().textContent).toBe("");
	});

	it("announces a success toast through the polite region only", async () => {
		render(<Toaster />);
		raise({
			title: "Theme saved",
			description: "CSS copied to the clipboard.",
			variant: "success",
		});
		await advance(0);

		expect(politeRegion().textContent).toBe("Theme saved. CSS copied to the clipboard.");
		expect(assertiveRegion().textContent).toBe("");
	});

	it("announces an info toast through the polite region", async () => {
		render(<Toaster />);
		raise({ title: "Heads up", variant: "info" });
		await advance(0);

		expect(politeRegion().textContent).toBe("Heads up");
	});

	it("announces a loading toast through the polite region", async () => {
		render(<Toaster />);
		raise({ title: "Publishing…", variant: "loading" });
		await advance(0);

		expect(politeRegion().textContent).toBe("Publishing…");
	});

	it("announces an error toast through the assertive region only", async () => {
		render(<Toaster />);
		raise({ title: "Failed to send", description: "Check your connection.", variant: "error" });
		await advance(0);

		expect(assertiveRegion().textContent).toBe("Failed to send. Check your connection.");
		expect(politeRegion().textContent).toBe("");
	});

	it("renders each variant with its own chrome", async () => {
		render(<Toaster />);
		raise({ title: "Saved", variant: "success" });
		raise({ title: "Failed", variant: "error" });
		raise({ title: "Working", variant: "loading" });
		await advance(0);

		expect(toastPanels().map((el) => el.getAttribute("data-variant"))).toEqual([
			"success",
			"error",
			"loading",
		]);
	});

	it("fires the action callback without dismissing the toast", async () => {
		const onClick = vi.fn();
		render(<Toaster />);
		raise({
			title: "Failed to send",
			variant: "error",
			duration: Infinity,
			action: { label: "Retry", onClick },
		});
		await advance(0);

		const actionButton = toastPanels()[0]!.querySelector(
			"button.ft-toast-action"
		) as HTMLButtonElement;
		fireEvent.click(actionButton);

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(toastPanels()).toHaveLength(1);
	});

	it("does not auto-dismiss a toast with an action while the pointer is on it", async () => {
		render(<Toaster />);
		raise({
			title: "Failed to send",
			variant: "error",
			duration: 1000,
			action: { label: "Retry", onClick: () => {} },
		});
		await advance(0);
		const panel = toastPanels()[0]!;

		pointerEnter(panel);
		await advance(5000);
		expect(toastPanels()).toHaveLength(1);

		pointerLeave(panel);
		await advance(1000);
		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	// The pause/resume wiring (`hovering`/`focusedWithin`/`syncTimer` in
	// Toast.tsx) is on every toast's root unconditionally — nothing there
	// reads `item.action`. The two tests above only ever construct toasts
	// with an action, so on their own they'd equally pass a version of the
	// code that gated pausing on `item.action` existing. This test is the one
	// that actually proves the protection is unconditional, not incidental
	// to always having tested it alongside an action.
	it("pauses on hover even without an action — the protection isn't scoped to actionable toasts", async () => {
		render(<Toaster />);
		raise({ title: "Theme saved", variant: "success", duration: 1000 });
		await advance(0);
		const panel = toastPanels()[0]!;
		expect(panel.querySelector(".ft-toast-action")).toBeNull();

		pointerEnter(panel);
		await advance(5000);
		expect(toastPanels()).toHaveLength(1);

		pointerLeave(panel);
		await advance(1000);
		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	it("pauses on focus within and resumes on blur, not just on hover", async () => {
		render(<Toaster />);
		raise({
			title: "Failed to send",
			variant: "error",
			duration: 1000,
			action: { label: "Retry", onClick: () => {} },
		});
		await advance(0);
		const actionButton = toastPanels()[0]!.querySelector(
			"button.ft-toast-action"
		) as HTMLButtonElement;

		act(() => {
			actionButton.focus();
		});
		await advance(5000);
		expect(toastPanels()).toHaveLength(1);

		act(() => {
			actionButton.blur();
		});
		await advance(1000);
		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	it("never auto-dismisses when duration is Infinity", async () => {
		render(<Toaster />);
		raise({ title: "Sticky", duration: Infinity });
		await advance(0);
		expect(toastPanels()).toHaveLength(1);

		await advance(10_000_000);
		expect(toastPanels()).toHaveLength(1);
	});

	it("defaults loading toasts to sticky", async () => {
		render(<Toaster />);
		raise({ title: "Publishing…", variant: "loading" });
		await advance(0);
		expect(toastPanels()).toHaveLength(1);

		await advance(60_000);
		expect(toastPanels()).toHaveLength(1);
	});

	it("dismisses programmatically by id", async () => {
		render(<Toaster />);
		const id = raise({ title: "Bye", duration: Infinity });
		await advance(0);
		expect(toastPanels()).toHaveLength(1);

		dismiss(id);
		expect(toastStore.items).toHaveLength(0); // the store forgets it in the same tick…
		await settleExit(); // …the panel takes its exit to leave the DOM
		expect(toastPanels()).toHaveLength(0);
	});

	it("dismisses via its own close button", async () => {
		render(<Toaster />);
		raise({ title: "Bye", duration: Infinity });
		await advance(0);

		const closeButton = toastPanels()[0]!.querySelector(
			'button[aria-label="Dismiss"]'
		) as HTMLButtonElement;
		fireEvent.click(closeButton);
		await settleExit();

		expect(toastPanels()).toHaveLength(0);
	});

	it("keeps at most 4 toasts, dismissing the oldest to make room for the newest", async () => {
		render(<Toaster />);
		raise({ title: "One", duration: Infinity });
		raise({ title: "Two", duration: Infinity });
		raise({ title: "Three", duration: Infinity });
		raise({ title: "Four", duration: Infinity });
		raise({ title: "Five", duration: Infinity });
		// The evicted "One" is dismissed like any other toast, so it lingers
		// through its exit — this is a *count* assertion, so it has to wait.
		await settleExit();

		const panels = toastPanels();
		expect(panels).toHaveLength(4);
		expect(panels[0]!.textContent).toContain("Two");
		expect(panels[3]!.textContent).toContain("Five");
		expect(panels.some((el) => el.textContent?.includes("One"))).toBe(false);
	});

	it("preserves DOM identity of surviving toasts when one in the middle is dismissed", async () => {
		render(<Toaster />);
		const aId = raise({ title: "A", duration: Infinity });
		const bId = raise({ title: "B", duration: Infinity });
		const cId = raise({ title: "C", duration: Infinity });
		void aId;
		void cId;
		await advance(0);

		const [aEl, , cEl] = toastPanels();
		dismiss(bId);
		await settleExit();

		const remaining = toastPanels();
		expect(remaining).toHaveLength(2);
		expect(remaining[0]).toBe(aEl);
		expect(remaining[1]).toBe(cEl);
	});

	it("tells apart two toasts with identical content by id, not position", async () => {
		render(<Toaster />);
		const firstId = raise({ title: "Same title", duration: Infinity });
		const secondId = raise({ title: "Same title", duration: Infinity });
		await advance(0);
		expect(toastPanels()).toHaveLength(2);

		dismiss(firstId);
		await settleExit();

		expect(toastPanels()).toHaveLength(1);
		expect(toastStore.items[0]?.id).toBe(secondId);
	});

	it("stops its live timer on unmount, without losing the toast's deadline", async () => {
		const { unmount } = render(<Toaster />);
		raise({ title: "Paused between viewports", duration: 1000 });
		await advance(0);
		expect(toastStore.items).toHaveLength(1);

		unmount();
		// A timer left running through this gap would have fired well before
		// now — this proves it's genuinely stopped, not merely not-yet-due.
		await advance(5000);
		expect(toastStore.items).toHaveLength(1);
	});

	it("re-arms a toast a new Toaster inherits, rather than leaving it stuck forever", async () => {
		const { unmount } = render(<Toaster />);
		raise({ title: "Will resume elsewhere", duration: 1000 });
		await advance(200); // 800ms left when the viewport goes away
		expect(toastStore.items).toHaveLength(1);

		unmount();
		await advance(5000); // the gap between viewports
		expect(toastStore.items).toHaveLength(1); // still here, still stopped

		// A different Toaster mounts later and inherits the still-pending toast.
		render(<Toaster />);
		await advance(0);

		// Its deadline was already in the past by the time anything remounted
		// to re-arm it, so it dismisses on the very next tick rather than
		// waiting out a fresh duration.
		expect(toastStore.items).toHaveLength(0);
	});

	it("re-arms a toast to its real remaining time, not a fresh duration", async () => {
		const { unmount } = render(<Toaster />);
		raise({ title: "Resumes with what was left", duration: 2000 });
		await advance(0);

		unmount();
		await advance(500); // 1500ms still owed when it comes back

		render(<Toaster />);
		await advance(1499);
		expect(toastStore.items).toHaveLength(1); // not yet — this is real remaining time, not 2000ms again

		await advance(1);
		expect(toastStore.items).toHaveLength(0);
	});

	it("queues toasts even before any Toaster is mounted", async () => {
		toast({ title: "Early bird", duration: Infinity });
		render(<Toaster />);
		await advance(0);

		expect(toastPanels()).toHaveLength(1);
	});

	// --- Motion -----------------------------------------------------------
	//
	// The exit is the only reason a dismissed toast is not gone from the DOM in
	// the same tick the store forgets it. Everything below either proves that
	// window exists, or proves it collapses to nothing when the user asked for
	// less movement.

	it("animates a toast in when it is raised into an already-mounted viewport", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(<Toaster />);
		animateSpy.mockClear(); // the viewport itself animates nothing

		raise({ title: "Hello", duration: Infinity });
		await advance(0);

		expect(toastPanels()).toHaveLength(1);
		expect(animateSpy).toHaveBeenCalled();
	});

	it("keeps a dismissed toast mounted — and inert — for the length of its exit", async () => {
		render(<Toaster />);
		const id = raise({ title: "Bye", duration: Infinity });
		await advance(0);
		const panel = toastPanels()[0]!;

		dismiss(id);
		expect(toastStore.items).toHaveLength(0); // the store never lags

		// The synchronous `act` above lands exactly where the source's
		// `outrostart` listener sampled: the exit has begun (`inert` is
		// already set on the node carrying it) and its finish is still a
		// microtask away — so the panel must still be in the DOM.
		expect(document.body.contains(panel)).toBe(true);
		// A leaving toast must not be reachable: its close and action buttons
		// are still in the DOM for another 200ms, and clicking or tabbing into
		// one of them would act on a toast the user already dismissed. The
		// presence clock sets `inert` for the length of the exit, which is
		// exactly the guarantee needed here — no `data-state="closing"`
		// protocol required.
		expect(panel.inert).toBe(true);

		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	it("reduced motion: a dismissed toast leaves in the same tick, with no Element.prototype.animate call", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		render(<Toaster />);
		const id = raise({ title: "No motion, please", duration: Infinity });
		await advance(0);
		expect(toastPanels()).toHaveLength(1);

		dismiss(id);

		// `duration: 0` reaches the sampler's own falsy-duration fast path,
		// which finishes the transition synchronously and never touches the
		// WAAPI — so a reduced-motion user's timings are exactly what they
		// were before this component had any transition at all.
		expect(toastPanels()).toHaveLength(0);
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("dismissing one toast does not disturb a sibling that is still entering", async () => {
		render(<Toaster />);
		const firstId = raise({ title: "Leaving", duration: Infinity });
		await advance(0);

		// Two keyed items, one entering and one leaving in the same tick:
		// pausing one item's clock must not cancel or steal the other's intro.
		// `preset()` itself is stateless, so this guards the per-item slot
		// bookkeeping, not the transition factory.
		act(() => {
			toast({ title: "Arriving", duration: Infinity });
			dismissToast(firstId);
		});
		await settleExit();

		const remaining = toastPanels();
		expect(remaining).toHaveLength(1);
		expect(remaining[0]!.textContent).toContain("Arriving");
	});

	it("is a no-op outside the browser", () => {
		vi.stubGlobal("window", undefined);

		const id = toast({ title: "Server side" });

		expect(id).toBe("");
		expect(toastStore.items).toHaveLength(0);
	});
});
