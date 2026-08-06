import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCopy } from "./clipboard.svelte.js";

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
