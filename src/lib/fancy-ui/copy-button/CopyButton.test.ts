import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CopyButton from "./CopyButton.svelte";
import { sound } from "../sound/sound.svelte.js";

/** jsdom ships no navigator.clipboard, so every test installs its own. */
function stubClipboard(writeText: unknown) {
	Object.defineProperty(navigator, "clipboard", {
		value: writeText === undefined ? undefined : { writeText },
		configurable: true,
	});
}

function button(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

function liveLabel(container: HTMLElement): HTMLElement {
	return container.querySelector('[aria-live="polite"]') as HTMLElement;
}

/**
 * `handleClick` awaits two nested promises (the mocked `writeText`, then
 * `copyState.copy`) before the `copied` state is written, and a plain
 * `fireEvent.click` await only flushes as far as Svelte's own tick. Advancing
 * fake timers by zero drains the whole microtask queue in between, which is
 * the reliable way to observe the settled state.
 */
async function flush() {
	await vi.advanceTimersByTimeAsync(0);
}

describe("CopyButton", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		stubClipboard(undefined);
	});

	it("renders the idle label by default", () => {
		const { container } = render(CopyButton, { props: { value: "npm install" } });
		expect(liveLabel(container).textContent).toBe("Copy");
		expect(button(container).getAttribute("aria-label")).toBeNull();
	});

	it("writes the value to the clipboard on click", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { container } = render(CopyButton, { props: { value: "npm install fancy-ui-svelte" } });

		await fireEvent.click(button(container));
		await flush();

		expect(writeText).toHaveBeenCalledWith("npm install fancy-ui-svelte");
	});

	it("swaps to the copied label after a successful copy, then reverts after resetMs", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(CopyButton, { props: { value: "hello", resetMs: 500 } });

		await fireEvent.click(button(container));
		await flush();
		expect(liveLabel(container).textContent).toBe("Copied");
		expect(button(container).className).toContain("ft-copybtn--copied");

		await vi.advanceTimersByTimeAsync(499);
		expect(liveLabel(container).textContent).toBe("Copied");

		await vi.advanceTimersByTimeAsync(1);
		expect(liveLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
	});

	it("uses custom label and copiedLabel text", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(CopyButton, {
			props: { value: "hello", label: "Copy link", copiedLabel: "Link copied" },
		});

		expect(liveLabel(container).textContent).toBe("Copy link");
		await fireEvent.click(button(container));
		await flush();
		expect(liveLabel(container).textContent).toBe("Link copied");
	});

	it("calls onCopy with the value and true after a successful write", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onCopy = vi.fn();
		const { container } = render(CopyButton, { props: { value: "hello", onCopy } });

		await fireEvent.click(button(container));
		await flush();

		expect(onCopy).toHaveBeenCalledTimes(1);
		expect(onCopy).toHaveBeenCalledWith("hello", true);
	});

	it("reports false through onCopy when the write rejects, and stays on the idle label", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const onCopy = vi.fn();
		const { container } = render(CopyButton, { props: { value: "hello", onCopy } });

		await fireEvent.click(button(container));
		await flush();

		expect(onCopy).toHaveBeenCalledWith("hello", false);
		expect(liveLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
	});

	it("reports false through onCopy when the clipboard API is unavailable", async () => {
		stubClipboard(undefined);
		const onCopy = vi.fn();
		const { container } = render(CopyButton, { props: { value: "hello", onCopy } });

		await fireEvent.click(button(container));
		await flush();

		expect(onCopy).toHaveBeenCalledWith("hello", false);
	});

	it("exposes the accessible name through aria-label when iconOnly, and hides the visible text", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(CopyButton, { props: { value: "hello", iconOnly: true } });
		const el = button(container);

		expect(el.getAttribute("aria-label")).toBe("Copy");
		expect(liveLabel(container).className).toContain("sr-only");

		await fireEvent.click(el);
		await flush();
		expect(el.getAttribute("aria-label")).toBe("Copied");
		expect(liveLabel(container).textContent).toBe("Copied");
	});

	it("blocks the copy while disabled", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const onCopy = vi.fn();
		const { container } = render(CopyButton, {
			props: { value: "hello", disabled: true, onCopy },
		});
		const el = button(container);

		expect(el.disabled).toBe(true);
		el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		await flush();

		expect(writeText).not.toHaveBeenCalled();
		expect(onCopy).not.toHaveBeenCalled();
	});

	it("passes variant and size through to the underlying Button", () => {
		const { container } = render(CopyButton, {
			props: { value: "hello", variant: "ghost", size: "lg" },
		});
		const className = button(container).className;

		expect(className).toContain("hover:bg-accent");
		expect(className).toContain("text-[14px]");
	});

	it("renders custom children instead of the default icon and label, but keeps a hidden live region that still announces the copy", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const custom = createRawSnippet(() => ({ render: () => "<span>Custom</span>" }));
		const { container, getByText } = render(CopyButton, {
			props: { value: "hello", children: custom },
		});

		expect(getByText("Custom")).toBeTruthy();
		const live = liveLabel(container);
		expect(live).not.toBeNull();
		expect(live.className).toContain("sr-only");
		expect(live.textContent).toBe("Copy");

		await fireEvent.click(button(container));
		await flush();
		expect(live.textContent).toBe("Copied");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(CopyButton, { props: { value: "hello", class: "mt-4" } });
		expect(button(container).className).toContain("mt-4");
		expect(button(container).className).toContain("ft-copybtn");
	});

	it("cancels the pending reset timer on unmount", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container, unmount } = render(CopyButton, {
			props: { value: "hello", resetMs: 500 },
		});

		await fireEvent.click(button(container));
		await flush();
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		// Proves the `$effect` teardown actually called `copyState.destroy()`,
		// not just that the DOM disappeared — a leaked timer would still be
		// sitting in the fake-timer queue here.
		expect(vi.getTimerCount()).toBe(0);
	});

	it("ignores a resetMs prop change after mount — the timer window was fixed at construction", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container, rerender } = render(CopyButton, {
			props: { value: "hello", resetMs: 500 },
		});

		await rerender({ value: "hello", resetMs: 50 });
		await fireEvent.click(button(container));
		await flush();
		expect(liveLabel(container).textContent).toBe("Copied");

		// If the new 50ms value had taken effect, this would already be reverted.
		await vi.advanceTimersByTimeAsync(50);
		expect(liveLabel(container).textContent).toBe("Copied");

		// The original 500ms window is what actually governs the revert.
		await vi.advanceTimersByTimeAsync(450);
		expect(liveLabel(container).textContent).toBe("Copy");
	});

	describe("sound", () => {
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});

		afterEach(() => {
			play.mockClear();
		});

		it("plays the copy cue exactly once after a successful copy, with sound enabled", async () => {
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(CopyButton, { props: { value: "hello", sound: true } });

			await fireEvent.click(button(container));
			await flush();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("copy");
		});

		it("plays the error cue instead, when the write fails, with sound enabled", async () => {
			stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
			const { container } = render(CopyButton, { props: { value: "hello", sound: true } });

			await fireEvent.click(button(container));
			await flush();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("error");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(CopyButton, { props: { value: "hello" } });

			await fireEvent.click(button(container));
			await flush();

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			stubClipboard(writeText);
			const { container } = render(CopyButton, {
				props: { value: "hello", sound: true, disabled: true },
			});

			button(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			await flush();

			expect(writeText).not.toHaveBeenCalled();
			expect(play).not.toHaveBeenCalled();
		});

		// The cue plays after the clipboard promise, by which time the transient
		// user activation may be gone and no context could be created any more.
		it("unlocks the context inside the click, before awaiting the clipboard", async () => {
			const unlock = vi.spyOn(sound, "unlock").mockResolvedValue(true);
			const enabled = vi.spyOn(sound, "enabled", "get").mockReturnValue(true);
			let resolveWrite!: () => void;
			stubClipboard(vi.fn(() => new Promise<void>((resolve) => (resolveWrite = resolve))));
			const { container } = render(CopyButton, { props: { value: "hello", sound: true } });

			await fireEvent.click(button(container));
			expect(unlock).toHaveBeenCalledTimes(1); // before the write settles
			expect(play).not.toHaveBeenCalled();

			resolveWrite();
			await flush();
			expect(play).toHaveBeenCalledWith("copy");

			unlock.mockRestore();
			enabled.mockRestore();
		});

		it("does not unlock anything while the user has sound off", async () => {
			const unlock = vi.spyOn(sound, "unlock").mockResolvedValue(true);
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(CopyButton, { props: { value: "hello", sound: true } });

			await fireEvent.click(button(container));
			await flush();

			expect(unlock).not.toHaveBeenCalled();
			unlock.mockRestore();
		});

		it("does not forward the sound prop to the inner Button — the inner Button plays nothing itself", async () => {
			// If `sound` leaked through to the inner `<Button>`, its own `press` cue
			// would fire on top of CopyButton's own `copy`/`error` cue, doubling the
			// sound for a single click.
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(CopyButton, { props: { value: "hello", sound: true } });

			await fireEvent.click(button(container));
			await flush();

			expect(play).not.toHaveBeenCalledWith("press");
			expect(play).toHaveBeenCalledTimes(1);
		});
	});
});
