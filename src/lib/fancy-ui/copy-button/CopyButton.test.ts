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

/**
 * The label span — always the LAST element inside the button, since CopyButton
 * renders it after any custom `children` and passes Button no `iconEnd`. It is
 * the visible label unless something else already owns that (icon-only, or a
 * custom `children`), in which case it is `sr-only`. It no longer carries
 * `aria-live` in the default composition: StatusMorph owns the announcement.
 */
function visibleLabel(container: HTMLElement): HTMLElement {
	return button(container).lastElementChild as HTMLElement;
}

/**
 * StatusMorph's announcement region. Deliberately NOT looked up inside
 * `container`: StatusMorph portals it to `document.body` so its text never
 * joins the button's accessible name.
 */
function liveRegion(): HTMLElement | null {
	return document.querySelector('[role="status"]');
}

/** StatusMorph's root, whose `data-state` is the glyph's own state machine. */
function morph(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-statusmorph");
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
		expect(visibleLabel(container).textContent).toBe("Copy");
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
		expect(visibleLabel(container).textContent).toBe("Copied");
		expect(button(container).className).toContain("ft-copybtn--copied");

		await vi.advanceTimersByTimeAsync(499);
		expect(visibleLabel(container).textContent).toBe("Copied");

		await vi.advanceTimersByTimeAsync(1);
		expect(visibleLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
	});

	it("uses custom label and copiedLabel text", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(CopyButton, {
			props: { value: "hello", label: "Copy link", copiedLabel: "Link copied" },
		});

		expect(visibleLabel(container).textContent).toBe("Copy link");
		await fireEvent.click(button(container));
		await flush();
		expect(visibleLabel(container).textContent).toBe("Link copied");
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

	// A denied clipboard permission used to be indistinguishable from a success:
	// `onCopy` reported it and nothing visible or audible changed. It now draws
	// a cross, swaps the label, and takes the failure skin.
	it("reports false through onCopy when the write rejects, and shows the failure label and skin", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const onCopy = vi.fn();
		const { container } = render(CopyButton, { props: { value: "hello", onCopy } });

		await fireEvent.click(button(container));
		await flush();

		expect(onCopy).toHaveBeenCalledWith("hello", false);
		expect(visibleLabel(container).textContent).toBe("Copy failed");
		expect(button(container).className).toContain("ft-copybtn--failed");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
		expect(morph(container)?.getAttribute("data-state")).toBe("error");
	});

	it("uses a custom errorLabel for both the visible label and the announcement", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(CopyButton, {
			props: { value: "hello", errorLabel: "Nope" },
		});

		await fireEvent.click(button(container));
		await flush();

		expect(visibleLabel(container).textContent).toBe("Nope");
		expect(liveRegion()?.textContent).toBe("Nope");
	});

	// The announcement moved out of CopyButton entirely: StatusMorph owns a
	// single persistent region, portalled to document.body so its text never
	// joins the button's accessible name, and it is the only one — two live
	// regions would announce every copy twice.
	it("announces a failed copy assertively, and a successful one politely, through the portalled region", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(CopyButton, { props: { value: "hello" } });

		expect(liveRegion()).not.toBeNull();
		expect(container.querySelector("[aria-live]")).toBeNull();
		expect(liveRegion()?.textContent?.trim()).toBe("");

		await fireEvent.click(button(container));
		await flush();
		expect(liveRegion()?.getAttribute("aria-live")).toBe("assertive");
		expect(liveRegion()?.textContent).toBe("Copy failed");

		cleanup();

		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const second = render(CopyButton, { props: { value: "hello" } });
		await fireEvent.click(button(second.container));
		await flush();
		expect(liveRegion()?.getAttribute("aria-live")).toBe("polite");
		expect(liveRegion()?.textContent).toBe("Copied");
	});

	it("returns the glyph, the label and the skin to idle together after resetMs following a failure", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(CopyButton, { props: { value: "hello", resetMs: 500 } });

		await fireEvent.click(button(container));
		await flush();
		expect(morph(container)?.getAttribute("data-state")).toBe("error");

		await vi.advanceTimersByTimeAsync(500);
		expect(morph(container)?.getAttribute("data-state")).toBe("idle");
		expect(visibleLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--failed");
	});

	// The glyph is CSS-animated, so reduced motion cannot change what this
	// component computes — which is exactly the assertion worth making: the
	// state machine, the label and the announcement are identical either way,
	// and nothing here reaches for the Web Animations API to get there.
	it("behaves identically under prefers-reduced-motion, and animates nothing through the WAAPI", async () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: true,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}));
		const animate = vi.spyOn(Element.prototype, "animate");
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(CopyButton, { props: { value: "hello" } });

		await fireEvent.click(button(container));
		await flush();

		expect(visibleLabel(container).textContent).toBe("Copy failed");
		expect(morph(container)?.getAttribute("data-state")).toBe("error");
		expect(liveRegion()?.textContent).toBe("Copy failed");
		expect(animate).not.toHaveBeenCalled();

		animate.mockRestore();
		vi.unstubAllGlobals();
	});

	it("re-arms both the glyph and the skin when a second copy lands inside the first window", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(CopyButton, { props: { value: "hello", resetMs: 500 } });

		await fireEvent.click(button(container));
		await flush();
		expect(morph(container)?.getAttribute("data-state")).toBe("success");

		await vi.advanceTimersByTimeAsync(300);
		await fireEvent.click(button(container));
		await flush();

		// 300ms into the first window; if the second click had not re-armed the
		// glyph's timer the way it re-arms `createCopy`'s, this would already be
		// back to idle 200ms from now while the skin ran on for another 300.
		await vi.advanceTimersByTimeAsync(400);
		expect(morph(container)?.getAttribute("data-state")).toBe("success");
		expect(visibleLabel(container).textContent).toBe("Copied");

		await vi.advanceTimersByTimeAsync(100);
		expect(morph(container)?.getAttribute("data-state")).toBe("idle");
		expect(visibleLabel(container).textContent).toBe("Copy");
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
		expect(visibleLabel(container).className).toContain("sr-only");

		await fireEvent.click(el);
		await flush();
		expect(el.getAttribute("aria-label")).toBe("Copied");
		expect(visibleLabel(container).textContent).toBe("Copied");
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

	// Custom children replace `iconStart`, so there is no StatusMorph and no
	// portalled region in this composition — the label span keeps `aria-live`
	// here, and only here, so a custom snippet is not left announcing nothing.
	it("renders custom children instead of the default icon and label, but keeps a hidden live region that still announces the copy", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const custom = createRawSnippet(() => ({ render: () => "<span>Custom</span>" }));
		const { container, getByText } = render(CopyButton, {
			props: { value: "hello", children: custom },
		});

		expect(getByText("Custom")).toBeTruthy();
		expect(morph(container)).toBeNull();
		expect(liveRegion()).toBeNull();
		const live = visibleLabel(container);
		expect(live).not.toBeNull();
		expect(live.className).toContain("sr-only");
		expect(live.getAttribute("aria-live")).toBe("polite");
		expect(live.textContent).toBe("Copy");

		await fireEvent.click(button(container));
		await flush();
		expect(live.textContent).toBe("Copied");
	});

	it("upgrades the custom-children live region to assertive on a failed copy", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const custom = createRawSnippet(() => ({ render: () => "<span>Custom</span>" }));
		const { container } = render(CopyButton, { props: { value: "hello", children: custom } });

		await fireEvent.click(button(container));
		await flush();

		const live = visibleLabel(container);
		expect(live.getAttribute("aria-live")).toBe("assertive");
		expect(live.textContent).toBe("Copy failed");
	});

	it("renders the copy glyph through StatusMorph's idle slot, at the icon footprint", () => {
		const { container } = render(CopyButton, { props: { value: "hello" } });
		const el = morph(container);

		expect(el).not.toBeNull();
		expect(el?.getAttribute("data-state")).toBe("idle");
		expect(el?.getAttribute("data-tone")).toBe("semantic");
		// The inline style beats StatusMorph's own scoped sizing rule; a
		// `size-4` utility would lose to it, since utilities are layered.
		expect(el?.getAttribute("style")).toContain("width: 1rem");
		// The cross resolves through the SAME chain as the failure skin around
		// it. StatusMorph's own last-resort red and the skin's (Toast's) are two
		// different reds, and the package ships no stylesheet, so "neither token
		// declared" is the out-of-the-box case — without this the default theme
		// paints a 16px cross in one red inside a label and border in another.
		expect(el?.getAttribute("style")).toContain("--ft-statusmorph-error: var(--ft-status-error,");
		expect(el?.querySelector(".ft-statusmorph-idle svg")).not.toBeNull();
	});

	it("shows only the failure skin when a copy fails inside a standing success window", async () => {
		stubClipboard(
			vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"))
		);
		const { container } = render(CopyButton, { props: { value: "hello", resetMs: 2000 } });

		await fireEvent.click(button(container));
		await flush();
		expect(button(container).className).toContain("ft-copybtn--copied");

		await vi.advanceTimersByTimeAsync(500);
		await fireEvent.click(button(container));
		await flush();

		// `createCopy.copy()` returns from its `catch` before it touches
		// `copied`, so the success flag is still standing 500ms into its own 2s
		// window. The skin must not be: one attempt, one outcome, one class.
		expect(button(container).className).toContain("ft-copybtn--failed");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
		expect(visibleLabel(container).textContent).toBe("Copy failed");
	});

	it("treats resetMs={0} as revert-immediately for the glyph too, not never-revert", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(CopyButton, { props: { value: "hello", resetMs: 0 } });

		await fireEvent.click(button(container));
		await flush();
		await vi.advanceTimersByTimeAsync(10);

		// StatusMorph documents `resetAfter: 0` as "no timer at all, manual
		// reset only", while `createCopy` reads the same 0 as "revert on the
		// next tick". Left unclamped, the label would revert and the cross would
		// stay on screen for good — so the call site passes 1ms instead.
		expect(morph(container)?.getAttribute("data-state")).toBe("idle");
		expect(visibleLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--failed");
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
		expect(visibleLabel(container).textContent).toBe("Copied");

		// If the new 50ms value had taken effect, this would already be reverted.
		await vi.advanceTimersByTimeAsync(50);
		expect(visibleLabel(container).textContent).toBe("Copied");

		// The original 500ms window is what actually governs the revert.
		await vi.advanceTimersByTimeAsync(450);
		expect(visibleLabel(container).textContent).toBe("Copy");
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
