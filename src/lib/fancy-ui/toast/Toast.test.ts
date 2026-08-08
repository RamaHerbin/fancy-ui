import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Toaster from "./Toaster.svelte";
import { toast, dismissToast, toastStore } from "./store.svelte.js";

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
		await vi.advanceTimersByTimeAsync(0);
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

		expect(toastPanels()).toHaveLength(0);
	});

	it("keeps at most 4 toasts, dismissing the oldest to make room for the newest", async () => {
		render(Toaster);
		toast({ title: "One", duration: Infinity });
		toast({ title: "Two", duration: Infinity });
		toast({ title: "Three", duration: Infinity });
		toast({ title: "Four", duration: Infinity });
		toast({ title: "Five", duration: Infinity });
		await vi.advanceTimersByTimeAsync(0);

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
		await vi.advanceTimersByTimeAsync(0);

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
		await vi.advanceTimersByTimeAsync(0);

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

	it("is a no-op outside the browser", () => {
		vi.stubGlobal("window", undefined);

		const id = toast({ title: "Server side" });

		expect(id).toBe("");
		expect(toastStore.items).toHaveLength(0);
	});
});
