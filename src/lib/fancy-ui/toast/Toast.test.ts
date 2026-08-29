import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { tick } from "svelte";
import Toaster from "./Toaster.svelte";
import { toast, dismissToast, toastStore } from "./store.svelte.js";
import { DURATIONS } from "../_internals/motion/tokens.js";

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

/**
 * Waits out a dismissed toast's exit transition.
 *
 * The store still removes an item synchronously — every `toastStore.items`
 * assertion below is untouched — but the DOM now lags it by `DURATIONS.exit`,
 * because `Toaster`'s keyed `{#each}` keeps the dismissed toast mounted for
 * the length of `Toast`'s `out:` directive. Any assertion that a panel is
 * *gone* has to wait for that; any assertion that the store forgot it does
 * not.
 *
 * `advanceTimersByTimeAsync` rather than `waitFor`: this suite runs on fake
 * timers throughout, and `test-setup.ts`'s WAAPI stub resolves `onfinish` on a
 * microtask rather than a timer — an async timer advance drains microtasks
 * between callbacks, so it settles both halves deterministically, where
 * `waitFor` polling against a frozen clock would not.
 */
async function settleExit(): Promise<void> {
	await vi.advanceTimersByTimeAsync(DURATIONS.exit);
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
		// `transitions.test.ts` documents the trap this avoids: re-spying an
		// already-mocked prototype property across tests.
		vi.restoreAllMocks();
	});

	it("mounts both live regions empty, before any toast exists", () => {
		render(Toaster);
		expect(politeRegion()).not.toBeNull();
		expect(assertiveRegion()).not.toBeNull();
		expect(politeRegion().textContent).toBe("");
		expect(assertiveRegion().textContent).toBe("");
	});

	it("announces a success toast through the polite region only", async () => {
		render(Toaster);
		toast({
			title: "Theme saved",
			description: "CSS copied to the clipboard.",
			variant: "success",
		});
		await vi.advanceTimersByTimeAsync(0);

		expect(politeRegion().textContent).toBe("Theme saved. CSS copied to the clipboard.");
		expect(assertiveRegion().textContent).toBe("");
	});

	it("announces an info toast through the polite region", async () => {
		render(Toaster);
		toast({ title: "Heads up", variant: "info" });
		await vi.advanceTimersByTimeAsync(0);

		expect(politeRegion().textContent).toBe("Heads up");
	});

	it("announces a loading toast through the polite region", async () => {
		render(Toaster);
		toast({ title: "Publishing…", variant: "loading" });
		await vi.advanceTimersByTimeAsync(0);

		expect(politeRegion().textContent).toBe("Publishing…");
	});

	it("announces an error toast through the assertive region only", async () => {
		render(Toaster);
		toast({ title: "Failed to send", description: "Check your connection.", variant: "error" });
		await vi.advanceTimersByTimeAsync(0);

		expect(assertiveRegion().textContent).toBe("Failed to send. Check your connection.");
		expect(politeRegion().textContent).toBe("");
	});

	it("renders each variant with its own chrome", async () => {
		render(Toaster);
		toast({ title: "Saved", variant: "success" });
		toast({ title: "Failed", variant: "error" });
		toast({ title: "Working", variant: "loading" });
		await vi.advanceTimersByTimeAsync(0);

		expect(toastPanels().map((el) => el.getAttribute("data-variant"))).toEqual([
			"success",
			"error",
			"loading",
		]);
	});

	it("fires the action callback without dismissing the toast", async () => {
		const onClick = vi.fn();
		render(Toaster);
		toast({
			title: "Failed to send",
			variant: "error",
			duration: Infinity,
			action: { label: "Retry", onClick },
		});
		await vi.advanceTimersByTimeAsync(0);

		const actionButton = toastPanels()[0].querySelector(
			"button.ft-toast-action"
		) as HTMLButtonElement;
		await fireEvent.click(actionButton);

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(toastPanels()).toHaveLength(1);
	});

	it("does not auto-dismiss a toast with an action while the pointer is on it", async () => {
		render(Toaster);
		toast({
			title: "Failed to send",
			variant: "error",
			duration: 1000,
			action: { label: "Retry", onClick: () => {} },
		});
		await vi.advanceTimersByTimeAsync(0);
		const panel = toastPanels()[0];

		panel.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(5000);
		expect(toastPanels()).toHaveLength(1);

		panel.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(1000);
		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	// The pause/resume wiring (`hovering`/`focusedWithin`/`syncTimer` in
	// Toast.svelte) is on every toast's root unconditionally — nothing there
	// reads `item.action`. The two tests above only ever construct toasts
	// with an action, so on their own they'd equally pass a version of the
	// code that gated pausing on `item.action` existing. This test is the one
	// that actually proves the protection is unconditional, not incidental
	// to always having tested it alongside an action.
	it("pauses on hover even without an action — the protection isn't scoped to actionable toasts", async () => {
		render(Toaster);
		toast({ title: "Theme saved", variant: "success", duration: 1000 });
		await vi.advanceTimersByTimeAsync(0);
		const panel = toastPanels()[0];
		expect(panel.querySelector(".ft-toast-action")).toBeNull();

		panel.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(5000);
		expect(toastPanels()).toHaveLength(1);

		panel.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(1000);
		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	it("pauses on focus within and resumes on blur, not just on hover", async () => {
		render(Toaster);
		toast({
			title: "Failed to send",
			variant: "error",
			duration: 1000,
			action: { label: "Retry", onClick: () => {} },
		});
		await vi.advanceTimersByTimeAsync(0);
		const actionButton = toastPanels()[0].querySelector(
			"button.ft-toast-action"
		) as HTMLButtonElement;

		actionButton.focus();
		await vi.advanceTimersByTimeAsync(5000);
		expect(toastPanels()).toHaveLength(1);

		actionButton.blur();
		await vi.advanceTimersByTimeAsync(1000);
		await settleExit();
		expect(toastPanels()).toHaveLength(0);
	});

	it("never auto-dismisses when duration is Infinity", async () => {
		render(Toaster);
		toast({ title: "Sticky", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);
		expect(toastPanels()).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(10_000_000);
		expect(toastPanels()).toHaveLength(1);
	});

	it("defaults loading toasts to sticky", async () => {
		render(Toaster);
		toast({ title: "Publishing…", variant: "loading" });
		await vi.advanceTimersByTimeAsync(0);
		expect(toastPanels()).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(60_000);
		expect(toastPanels()).toHaveLength(1);
	});

	it("dismisses programmatically by id", async () => {
		render(Toaster);
		const id = toast({ title: "Bye", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);
		expect(toastPanels()).toHaveLength(1);

		dismissToast(id);
		expect(toastStore.items).toHaveLength(0); // the store forgets it in the same tick…
		await settleExit(); // …the panel takes its exit to leave the DOM
		expect(toastPanels()).toHaveLength(0);
	});

	it("dismisses via its own close button", async () => {
		render(Toaster);
		toast({ title: "Bye", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);

		const closeButton = toastPanels()[0].querySelector(
			'button[aria-label="Dismiss"]'
		) as HTMLButtonElement;
		await fireEvent.click(closeButton);
		await settleExit();

		expect(toastPanels()).toHaveLength(0);
	});

	it("keeps at most 4 toasts, dismissing the oldest to make room for the newest", async () => {
		render(Toaster);
		toast({ title: "One", duration: Infinity });
		toast({ title: "Two", duration: Infinity });
		toast({ title: "Three", duration: Infinity });
		toast({ title: "Four", duration: Infinity });
		toast({ title: "Five", duration: Infinity });
		// The evicted "One" is dismissed like any other toast, so it lingers
		// through its exit — this is a *count* assertion, so it has to wait.
		await settleExit();

		const panels = toastPanels();
		expect(panels).toHaveLength(4);
		expect(panels[0].textContent).toContain("Two");
		expect(panels[3].textContent).toContain("Five");
		expect(panels.some((el) => el.textContent?.includes("One"))).toBe(false);
	});

	it("preserves DOM identity of surviving toasts when one in the middle is dismissed", async () => {
		render(Toaster);
		const aId = toast({ title: "A", duration: Infinity });
		const bId = toast({ title: "B", duration: Infinity });
		const cId = toast({ title: "C", duration: Infinity });
		void aId;
		void cId;
		await vi.advanceTimersByTimeAsync(0);

		const [aEl, , cEl] = toastPanels();
		dismissToast(bId);
		await settleExit();

		const remaining = toastPanels();
		expect(remaining).toHaveLength(2);
		expect(remaining[0]).toBe(aEl);
		expect(remaining[1]).toBe(cEl);
	});

	it("tells apart two toasts with identical content by id, not position", async () => {
		render(Toaster);
		const firstId = toast({ title: "Same title", duration: Infinity });
		const secondId = toast({ title: "Same title", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);
		expect(toastPanels()).toHaveLength(2);

		dismissToast(firstId);
		await settleExit();

		expect(toastPanels()).toHaveLength(1);
		expect(toastStore.items[0]?.id).toBe(secondId);
	});

	it("stops its live timer on unmount, without losing the toast's deadline", async () => {
		const { unmount } = render(Toaster);
		toast({ title: "Paused between viewports", duration: 1000 });
		await vi.advanceTimersByTimeAsync(0);
		expect(toastStore.items).toHaveLength(1);

		unmount();
		// A timer left running through this gap would have fired well before
		// now — this proves it's genuinely stopped, not merely not-yet-due.
		await vi.advanceTimersByTimeAsync(5000);
		expect(toastStore.items).toHaveLength(1);
	});

	it("re-arms a toast a new Toaster inherits, rather than leaving it stuck forever", async () => {
		const { unmount } = render(Toaster);
		toast({ title: "Will resume elsewhere", duration: 1000 });
		await vi.advanceTimersByTimeAsync(200); // 800ms left when the viewport goes away
		expect(toastStore.items).toHaveLength(1);

		unmount();
		await vi.advanceTimersByTimeAsync(5000); // the gap between viewports
		expect(toastStore.items).toHaveLength(1); // still here, still stopped

		// A different Toaster mounts later and inherits the still-pending toast.
		render(Toaster);
		await vi.advanceTimersByTimeAsync(0);

		// Its deadline was already in the past by the time anything remounted
		// to re-arm it, so it dismisses on the very next tick rather than
		// waiting out a fresh duration.
		expect(toastStore.items).toHaveLength(0);
	});

	it("re-arms a toast to its real remaining time, not a fresh duration", async () => {
		const { unmount } = render(Toaster);
		toast({ title: "Resumes with what was left", duration: 2000 });
		await vi.advanceTimersByTimeAsync(0);

		unmount();
		await vi.advanceTimersByTimeAsync(500); // 1500ms still owed when it comes back

		render(Toaster);
		await vi.advanceTimersByTimeAsync(1499);
		expect(toastStore.items).toHaveLength(1); // not yet — this is real remaining time, not 2000ms again

		await vi.advanceTimersByTimeAsync(1);
		expect(toastStore.items).toHaveLength(0);
	});

	it("queues toasts even before any Toaster is mounted", async () => {
		toast({ title: "Early bird", duration: Infinity });
		render(Toaster);
		await vi.advanceTimersByTimeAsync(0);

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
		render(Toaster);
		animateSpy.mockClear(); // the viewport itself animates nothing

		toast({ title: "Hello", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);

		expect(toastPanels()).toHaveLength(1);
		expect(animateSpy).toHaveBeenCalled();
	});

	it("keeps a dismissed toast mounted — and inert — for the length of its exit", async () => {
		render(Toaster);
		const id = toast({ title: "Bye", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);
		const panel = toastPanels()[0];

		// Svelte dispatches `outrostart` on the node carrying `out:`, right
		// after it sets `inert` on it — so this listener samples the exact
		// moment the exit begins, with no timing guesswork.
		let mountedAtOutroStart: boolean | undefined;
		let inertAtOutroStart: boolean | undefined;
		panel.addEventListener("outrostart", () => {
			mountedAtOutroStart = document.body.contains(panel);
			inertAtOutroStart = panel.inert;
		});

		dismissToast(id);
		expect(toastStore.items).toHaveLength(0); // the store never lags

		await settleExit();

		expect(mountedAtOutroStart).toBe(true);
		// A leaving toast must not be reachable: its close and action buttons
		// are still in the DOM for another 200ms, and clicking or tabbing into
		// one of them would act on a toast the user already dismissed. Svelte
		// sets `inert` natively for the length of an outro, which is exactly
		// the guarantee needed here — no `data-state="closing"` protocol
		// required (that lands with the shared close protocol, for surfaces
		// that need to key styling off it).
		expect(inertAtOutroStart).toBe(true);
		expect(toastPanels()).toHaveLength(0);
	});

	it("reduced motion: a dismissed toast leaves in the same tick, with no Element.prototype.animate call", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		render(Toaster);
		const id = toast({ title: "No motion, please", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);
		expect(toastPanels()).toHaveLength(1);

		dismissToast(id);
		await tick();

		// `duration: 0` reaches Svelte's own falsy-duration fast path, which
		// finishes the transition synchronously and never touches the WAAPI —
		// so a reduced-motion user's timings are exactly what they were before
		// this component had any transition at all.
		expect(toastPanels()).toHaveLength(0);
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("dismissing one toast does not disturb a sibling that is still entering", async () => {
		render(Toaster);
		const firstId = toast({ title: "Leaving", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);

		// Two keyed items, one entering and one leaving in the same tick: pausing
		// one item's block must not cancel or steal the other's intro. `preset()`
		// itself is stateless, so this guards the each-block bookkeeping, not the
		// transition factory.
		toast({ title: "Arriving", duration: Infinity });
		dismissToast(firstId);
		await settleExit();

		const remaining = toastPanels();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].textContent).toContain("Arriving");
	});

	it("is a no-op outside the browser", () => {
		vi.stubGlobal("window", undefined);

		const id = toast({ title: "Server side" });

		expect(id).toBe("");
		expect(toastStore.items).toHaveLength(0);
	});
});
