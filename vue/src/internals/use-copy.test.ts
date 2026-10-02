import { render, cleanup } from "@testing-library/vue";
import { defineComponent, effectScope, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopy } from "./use-copy.js";
import type { UseCopyState } from "./use-copy.js";

/** jsdom ships no navigator.clipboard, so every test installs its own. */
function stubClipboard(writeText: unknown) {
	Object.defineProperty(navigator, "clipboard", {
		value: writeText === undefined ? undefined : { writeText },
		configurable: true,
	});
}

/** Mounts `useCopy` in a real component scope and hands the state back. */
function mountCopy(resetMs?: number) {
	let state!: UseCopyState;
	const Harness = defineComponent({
		setup() {
			state = useCopy(resetMs);
			return () => h("div");
		},
	});
	const { unmount } = render(Harness);
	return { state, unmount };
}

describe("useCopy", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		stubClipboard(undefined);
	});

	it("exposes the factory's surface minus destroy (D-V12)", () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { state } = mountCopy();

		expect(Object.keys(state).sort()).toEqual(["copied", "copy"]);
		expect("destroy" in state).toBe(false);
	});

	it("touches nothing at construction: no clipboard read, no timer", () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { state } = mountCopy();

		expect(state.copied).toBe(false);
		expect(writeText).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("flips copied through the component's own reactive state", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { state } = mountCopy(500);

		await expect(state.copy("hello")).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith("hello");
		expect(state.copied).toBe(true);

		await vi.advanceTimersByTimeAsync(500);
		expect(state.copied).toBe(false);
	});

	it("reports failure without flipping copied", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { state } = mountCopy();

		await expect(state.copy("hello")).resolves.toBe(false);
		expect(state.copied).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	// The whole reason the composable exists: the factory's `destroy()` is wired
	// to the scope rather than left to every consumer, so a pending reset cannot
	// outlive the component that armed it.
	it("cancels a pending reset on unmount", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { state, unmount } = mountCopy(500);

		await state.copy("hello");
		expect(vi.getTimerCount()).toBe(1);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(1000);
	});

	// A copy resolving after unmount is the permission-prompt case: the write
	// itself succeeded, so the promise still resolves true, but the flag the
	// scope no longer owns must stay put and no timer may be armed.
	it("leaves a write that lands after unmount inert", async () => {
		let settle!: () => void;
		const pending = new Promise<void>((resolve) => {
			settle = resolve;
		});
		stubClipboard(vi.fn().mockReturnValue(pending));
		const { state, unmount } = mountCopy(500);

		const result = state.copy("hello");
		unmount();
		settle();

		await expect(result).resolves.toBe(true);
		expect(state.copied).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("is disposed by a plain effect scope too, not only by a component", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const scope = effectScope();
		const state = scope.run(() => useCopy(500))!;

		await state.copy("hello");
		expect(vi.getTimerCount()).toBe(1);

		scope.stop();
		expect(vi.getTimerCount()).toBe(0);
	});
});
