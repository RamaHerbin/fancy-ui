import { render, cleanup, fireEvent } from "@testing-library/vue";
import { config } from "@vue/test-utils";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Toaster from "./Toaster.vue";
import { toast, dismissToast, toastStore } from "./store.js";

// See `Toast.test.ts`: the mounting helper would otherwise stub the transition
// components out of the tree.
config.global.stubs = { ...config.global.stubs, transition: false, "transition-group": false };

/** The same eight cases as the source suite's `Toast.close.test.ts`. */

const PointerCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;

function resetStore() {
	for (const item of [...toastStore.items]) {
		dismissToast(item.id);
	}
}

function toastPanels(): HTMLElement[] {
	return Array.from(document.querySelectorAll(".ft-toast"));
}

function panel(index: number): HTMLElement {
	const el = toastPanels()[index];
	if (!el) throw new Error(`no toast panel at ${index}`);
	return el;
}

function progressBar(panel: HTMLElement): HTMLElement | null {
	return panel.querySelector(".ft-toast-progress");
}

describe("Toast onClose + progress", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		resetStore();
		document.body.innerHTML = "";
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("1. fires onClose('timeout') exactly once, only after the full duration has elapsed", async () => {
		const onClose = vi.fn();
		render(Toaster);
		toast({ title: "Saved", duration: 1000, onClose });
		await vi.advanceTimersByTimeAsync(999);
		expect(onClose).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledWith("timeout");
		await vi.advanceTimersByTimeAsync(5000);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("2. fires onClose('dismiss') when the close button is pressed", async () => {
		const onClose = vi.fn();
		render(Toaster);
		toast({ title: "Saved", duration: Infinity, onClose });
		await vi.advanceTimersByTimeAsync(0);
		const close = panel(0).querySelector(
			'button[aria-label="Dismiss"]'
		) as HTMLButtonElement;
		await fireEvent.click(close);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledWith("dismiss");
	});

	it("3. fires onClose('dismiss') for a programmatic dismissToast, and never twice for the same toast", async () => {
		const onClose = vi.fn();
		render(Toaster);
		const id = toast({ title: "Saved", duration: Infinity, onClose });
		dismissToast(id);
		dismissToast(id);
		await vi.advanceTimersByTimeAsync(5000);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledWith("dismiss");
	});

	it("4. fires onClose('action') when the action is pressed, does not close the toast, and never fires again", async () => {
		const calls: string[] = [];
		const onClose = vi.fn((reason: string) => calls.push(`close:${reason}`));
		const onClick = vi.fn(() => calls.push("click"));
		render(Toaster);
		const id = toast({
			title: "Deleted",
			duration: Infinity,
			action: { label: "Undo", onClick },
			onClose,
		});
		await vi.advanceTimersByTimeAsync(0);
		const action = panel(0).querySelector("button.ft-toast-action") as HTMLButtonElement;
		await fireEvent.click(action);
		expect(toastStore.items).toHaveLength(1);
		// The reason is settled before the handler runs, so a handler that
		// dismisses the toast cannot turn it into a "dismiss".
		expect(calls).toEqual(["close:action", "click"]);
		dismissToast(id);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("5. fires onClose('evicted') for the oldest toast pushed out by the visible limit", async () => {
		const onClose = vi.fn();
		render(Toaster);
		toast({ title: "first", duration: Infinity, onClose });
		for (let i = 0; i < 3; i++) toast({ title: `n${i}`, duration: Infinity });
		expect(onClose).not.toHaveBeenCalled();
		toast({ title: "fifth", duration: Infinity });
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledWith("evicted");
		expect(toastStore.items).toHaveLength(4);
	});

	it("6. hover at 5.9s of 6s then leaving still leaves the remaining 0.1s before the timeout", async () => {
		const onClose = vi.fn();
		render(Toaster);
		toast({ title: "Deleted", duration: 6000, onClose });
		await vi.advanceTimersByTimeAsync(5900);
		const target = panel(0);
		target.dispatchEvent(new PointerCtor("pointerenter", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(10000);
		expect(onClose).not.toHaveBeenCalled();
		target.dispatchEvent(new PointerCtor("pointerleave", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(99);
		expect(onClose).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledWith("timeout");
	});

	it("7. two quick toasts keep independent callbacks and reasons", async () => {
		const a = vi.fn();
		const b = vi.fn();
		render(Toaster);
		const idA = toast({ title: "A", duration: 6000, onClose: a });
		await vi.advanceTimersByTimeAsync(500);
		toast({ title: "B", duration: 6000, onClose: b });
		dismissToast(idA);
		expect(a).toHaveBeenCalledWith("dismiss");
		expect(b).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(6000);
		expect(b).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledWith("timeout");
		expect(a).toHaveBeenCalledTimes(1);
	});

	it("8. progress renders a bar driven by --toast-duration, paused on hover; absent when off or sticky", async () => {
		render(Toaster);
		toast({ title: "none", duration: 6000 });
		toast({ title: "sticky", duration: Infinity, progress: true });
		toast({ title: "bar", duration: 6000, progress: true });
		await vi.advanceTimersByTimeAsync(0);
		const none = panel(0);
		const sticky = panel(1);
		const bar = panel(2);
		expect(progressBar(none)).toBeNull();
		expect(progressBar(sticky)).toBeNull();
		const el = progressBar(bar) as HTMLElement;
		expect(el).not.toBeNull();
		expect(el.getAttribute("aria-hidden")).toBe("true");
		expect(el.style.getPropertyValue("--toast-duration")).toBe("6000ms");
		expect(el.getAttribute("data-paused")).toBe("false");
		bar.dispatchEvent(new PointerCtor("pointerenter", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(0);
		expect(progressBar(bar)!.getAttribute("data-paused")).toBe("true");
		bar.dispatchEvent(new PointerCtor("pointerleave", { bubbles: true }));
		await vi.advanceTimersByTimeAsync(0);
		expect(progressBar(bar)!.getAttribute("data-paused")).toBe("false");
	});
});
