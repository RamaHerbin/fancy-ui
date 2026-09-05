import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { createCopy, useCopy } from "./use-copy.js";

/** jsdom ships no navigator.clipboard, so every test installs its own. */
function stubClipboard(writeText: unknown) {
	Object.defineProperty(navigator, "clipboard", {
		value: writeText === undefined ? undefined : { writeText },
		configurable: true,
	});
}

describe("createCopy", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		stubClipboard(undefined);
	});

	it("resolves true and flips copied on a successful write", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const c = createCopy();

		expect(c.copied).toBe(false);
		await expect(c.copy("hello")).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith("hello");
		expect(c.copied).toBe(true);
	});

	it("resets copied once resetMs has elapsed", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const c = createCopy(500);

		await c.copy("hello");
		await vi.advanceTimersByTimeAsync(499);
		expect(c.copied).toBe(true);

		await vi.advanceTimersByTimeAsync(1);
		expect(c.copied).toBe(false);
	});

	it("restarts the reset window when copying again before it expires", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const c = createCopy(500);

		await c.copy("first");
		await vi.advanceTimersByTimeAsync(400);
		await c.copy("second");

		// The original deadline passes; the restarted one has not.
		await vi.advanceTimersByTimeAsync(200);
		expect(c.copied).toBe(true);

		await vi.advanceTimersByTimeAsync(300);
		expect(c.copied).toBe(false);
	});

	it("resolves false and leaves copied alone when the write is rejected", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const c = createCopy();

		await expect(c.copy("hello")).resolves.toBe(false);
		expect(c.copied).toBe(false);
	});

	it("resolves false without throwing when the clipboard API is missing", async () => {
		stubClipboard(undefined);
		const c = createCopy();

		await expect(c.copy("hello")).resolves.toBe(false);
		expect(c.copied).toBe(false);
	});

	it("ignores a write that only lands after destroy", async () => {
		// A permission prompt can hold the write open across the owner's
		// teardown.
		let settle: () => void = () => {};
		stubClipboard(vi.fn(() => new Promise<void>((resolve) => (settle = resolve))));
		const c = createCopy(500);

		const pending = c.copy("hello");
		c.destroy();
		settle();

		await expect(pending).resolves.toBe(true);
		expect(c.copied).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("lets the newest copy own the flag when an earlier write settles late", async () => {
		const settlers: Array<() => void> = [];
		stubClipboard(vi.fn(() => new Promise<void>((resolve) => settlers.push(resolve))));
		const c = createCopy(500);

		const first = c.copy("first");
		const second = c.copy("second");
		settlers[1]?.();
		await second;
		expect(c.copied).toBe(true);

		// The superseded write resolves afterwards: it must not re-arm the
		// window.
		settlers[0]?.();
		await expect(first).resolves.toBe(true);
		await vi.advanceTimersByTimeAsync(500);
		expect(c.copied).toBe(false);
	});

	it("cancels the pending reset on destroy", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const c = createCopy(500);

		await c.copy("hello");
		c.destroy();
		await vi.advanceTimersByTimeAsync(1000);

		// The flag is frozen where it was: the timer never ran.
		expect(c.copied).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});
});

/*
 * Hook layer. `useCopy` subscribes to a per-instance `createCopy` and
 * destroys it in its own cleanup, so the "call from the consumer's teardown"
 * contract is enforced rather than merely documented.
 */

describe("useCopy", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		stubClipboard(undefined);
	});

	it("starts uncopied and flips true after a successful copy", async () => {
		vi.useFakeTimers();
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { result } = renderHook(() => useCopy());

		expect(result.current.copied).toBe(false);

		await act(async () => {
			await result.current.copy("hello");
		});
		expect(result.current.copied).toBe(true);
	});

	it("re-renders back to false once resetMs elapses", async () => {
		vi.useFakeTimers();
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { result } = renderHook(() => useCopy(500));

		await act(async () => {
			await result.current.copy("hello");
		});
		expect(result.current.copied).toBe(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});
		expect(result.current.copied).toBe(false);
	});

	it("destroys the underlying copy state on unmount, cancelling its pending reset", async () => {
		vi.useFakeTimers();
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { result, unmount } = renderHook(() => useCopy(500));

		await act(async () => {
			await result.current.copy("hello");
		});
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});

/*
 * StrictMode (§9.4). Development React runs a full mount/teardown/mount
 * rehearsal, which fires the hook's cleanup on an instance that is about to
 * be used for real. `destroyed` is a one-way latch on the Svelte side —
 * nothing there ever remounts an owner — so the hook has to un-latch it, or
 * `copy()` returns early forever and the transient label never appears in
 * any dev build.
 */

describe("useCopy under StrictMode", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		stubClipboard(undefined);
	});

	it("still flips copied after the mount/teardown/mount rehearsal", async () => {
		vi.useFakeTimers();
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { result } = renderHook(() => useCopy(500), { wrapper: StrictMode });

		expect(result.current.copied).toBe(false);

		await act(async () => {
			await result.current.copy("hello");
		});
		expect(result.current.copied).toBe(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});
		expect(result.current.copied).toBe(false);
	});

	it("leaves no timer behind when a StrictMode consumer unmounts mid-window", async () => {
		vi.useFakeTimers();
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { result, unmount } = renderHook(() => useCopy(500), { wrapper: StrictMode });

		await act(async () => {
			await result.current.copy("hello");
		});
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("ignores a write that only lands after the real unmount", async () => {
		vi.useFakeTimers();
		let settle: () => void = () => {};
		stubClipboard(vi.fn(() => new Promise<void>((resolve) => (settle = resolve))));
		const { result, unmount } = renderHook(() => useCopy(500), { wrapper: StrictMode });

		const pending = result.current.copy("hello");
		unmount();
		settle();

		await expect(pending).resolves.toBe(true);
		// Nothing arms the instance again after a real unmount, so the write
		// neither resurrects the flag nor schedules a reset that teardown can
		// no longer cancel.
		expect(vi.getTimerCount()).toBe(0);
	});
});
