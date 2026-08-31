import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton.js";
import { sound } from "../../sound/sound.js";

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
 * the visible label unless something else already owns that (icon-only, or
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

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

/**
 * `handleClick` awaits two nested promises (the mocked `writeText`, then
 * `copyState.copy`) before the `copied` state is written, and a plain
 * `fireEvent.click` only flushes React's own synchronous work. Advancing fake
 * timers by zero inside `act` drains the whole microtask queue in between,
 * which is the reliable way to observe the settled state.
 */
const flush = () => advance(0);

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
		const { container } = render(<CopyButton value="npm install" />);
		expect(visibleLabel(container).textContent).toBe("Copy");
		expect(button(container).getAttribute("aria-label")).toBeNull();
	});

	it("writes the value to the clipboard on click", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { container } = render(<CopyButton value="npm install fancy-ui-react" />);

		fireEvent.click(button(container));
		await flush();

		expect(writeText).toHaveBeenCalledWith("npm install fancy-ui-react");
	});

	it("swaps to the copied label after a successful copy, then reverts after resetMs", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(<CopyButton value="hello" resetMs={500} />);

		fireEvent.click(button(container));
		await flush();
		expect(visibleLabel(container).textContent).toBe("Copied");
		expect(button(container).className).toContain("ft-copybtn--copied");

		await advance(499);
		expect(visibleLabel(container).textContent).toBe("Copied");

		await advance(1);
		expect(visibleLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
	});

	it("uses custom label and copiedLabel text", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(
			<CopyButton value="hello" label="Copy link" copiedLabel="Link copied" />
		);

		expect(visibleLabel(container).textContent).toBe("Copy link");
		fireEvent.click(button(container));
		await flush();
		expect(visibleLabel(container).textContent).toBe("Link copied");
	});

	it("calls onCopy with the value and true after a successful write", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onCopy = vi.fn();
		const { container } = render(<CopyButton value="hello" onCopy={onCopy} />);

		fireEvent.click(button(container));
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
		const { container } = render(<CopyButton value="hello" onCopy={onCopy} />);

		fireEvent.click(button(container));
		await flush();

		expect(onCopy).toHaveBeenCalledWith("hello", false);
		expect(visibleLabel(container).textContent).toBe("Copy failed");
		expect(button(container).className).toContain("ft-copybtn--failed");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
		expect(morph(container)?.getAttribute("data-state")).toBe("error");
	});

	it("uses a custom errorLabel for both the visible label and the announcement", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(<CopyButton value="hello" errorLabel="Nope" />);

		fireEvent.click(button(container));
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
		const { container } = render(<CopyButton value="hello" />);

		expect(liveRegion()).not.toBeNull();
		expect(container.querySelector("[aria-live]")).toBeNull();
		expect(liveRegion()?.textContent?.trim()).toBe("");

		fireEvent.click(button(container));
		await flush();
		expect(liveRegion()?.getAttribute("aria-live")).toBe("assertive");
		expect(liveRegion()?.textContent).toBe("Copy failed");

		cleanup();

		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const second = render(<CopyButton value="hello" />);
		fireEvent.click(button(second.container));
		await flush();
		expect(liveRegion()?.getAttribute("aria-live")).toBe("polite");
		expect(liveRegion()?.textContent).toBe("Copied");
	});

	it("returns the glyph, the label and the skin to idle together after resetMs following a failure", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(<CopyButton value="hello" resetMs={500} />);

		fireEvent.click(button(container));
		await flush();
		expect(morph(container)?.getAttribute("data-state")).toBe("error");

		await advance(500);
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
		const { container } = render(<CopyButton value="hello" />);

		fireEvent.click(button(container));
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
		const { container } = render(<CopyButton value="hello" resetMs={500} />);

		fireEvent.click(button(container));
		await flush();
		expect(morph(container)?.getAttribute("data-state")).toBe("success");

		await advance(300);
		fireEvent.click(button(container));
		await flush();

		// 300ms into the first window; if the second click had not re-armed the
		// glyph's timer the way it re-arms `useCopy`'s, this would already be
		// back to idle 200ms from now while the skin ran on for another 300.
		await advance(400);
		expect(morph(container)?.getAttribute("data-state")).toBe("success");
		expect(visibleLabel(container).textContent).toBe("Copied");

		await advance(100);
		expect(morph(container)?.getAttribute("data-state")).toBe("idle");
		expect(visibleLabel(container).textContent).toBe("Copy");
	});

	it("reports false through onCopy when the clipboard API is unavailable", async () => {
		stubClipboard(undefined);
		const onCopy = vi.fn();
		const { container } = render(<CopyButton value="hello" onCopy={onCopy} />);

		fireEvent.click(button(container));
		await flush();

		expect(onCopy).toHaveBeenCalledWith("hello", false);
	});

	it("exposes the accessible name through aria-label when iconOnly, and hides the visible text", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(<CopyButton value="hello" iconOnly />);
		const el = button(container);

		expect(el.getAttribute("aria-label")).toBe("Copy");
		expect(visibleLabel(container).className).toContain("sr-only");

		fireEvent.click(el);
		await flush();
		expect(el.getAttribute("aria-label")).toBe("Copied");
		expect(visibleLabel(container).textContent).toBe("Copied");
	});

	it("blocks the copy while disabled", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const onCopy = vi.fn();
		const { container } = render(<CopyButton value="hello" disabled onCopy={onCopy} />);
		const el = button(container);

		expect(el.disabled).toBe(true);
		fireEvent.click(el);
		await flush();

		expect(writeText).not.toHaveBeenCalled();
		expect(onCopy).not.toHaveBeenCalled();
	});

	it("passes variant and size through to the underlying Button", () => {
		const { container } = render(<CopyButton value="hello" variant="ghost" size="lg" />);
		const className = button(container).className;

		expect(className).toContain("hover:bg-accent");
		expect(className).toContain("text-[14px]");
	});

	// Custom children replace `iconStart`, so there is no StatusMorph and no
	// portalled region in this composition — the label span keeps `aria-live`
	// here, and only here, so custom content is not left announcing nothing.
	it("renders custom children instead of the default icon and label, but keeps a hidden live region that still announces the copy", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container, getByText } = render(
			<CopyButton value="hello">
				<span>Custom</span>
			</CopyButton>
		);

		expect(getByText("Custom")).toBeTruthy();
		expect(morph(container)).toBeNull();
		expect(liveRegion()).toBeNull();
		const live = visibleLabel(container);
		expect(live).not.toBeNull();
		expect(live.className).toContain("sr-only");
		expect(live.getAttribute("aria-live")).toBe("polite");
		expect(live.textContent).toBe("Copy");

		fireEvent.click(button(container));
		await flush();
		expect(live.textContent).toBe("Copied");
	});

	it("upgrades the custom-children live region to assertive on a failed copy", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(
			<CopyButton value="hello">
				<span>Custom</span>
			</CopyButton>
		);

		fireEvent.click(button(container));
		await flush();

		const live = visibleLabel(container);
		expect(live.getAttribute("aria-live")).toBe("assertive");
		expect(live.textContent).toBe("Copy failed");
	});

	// A permission prompt can hold the first write open across a second click,
	// and the two promises then settle in whatever order the user agent chose.
	// `createCopy` already ticket-guards `copied`; without the same guard here
	// the two halves of the same button would contradict each other.
	it("ignores a stale clipboard result that lands after a newer attempt", async () => {
		let settleFirst!: (v: unknown) => void;
		let settleSecond!: (v: unknown) => void;
		const writeText = vi
			.fn()
			.mockImplementationOnce(() => new Promise((_, reject) => (settleFirst = reject)))
			.mockImplementationOnce(() => new Promise((resolve) => (settleSecond = resolve)));
		stubClipboard(writeText);
		const { container } = render(<CopyButton value="hello" />);

		fireEvent.click(button(container));
		fireEvent.click(button(container));

		// The SECOND attempt succeeds first, then the first one's denial lands.
		settleSecond(undefined);
		await flush();
		expect(morph(container)?.getAttribute("data-state")).toBe("success");

		settleFirst(new Error("denied"));
		await flush();
		expect(morph(container)?.getAttribute("data-state")).toBe("success");
		expect(button(container).className).not.toContain("ft-copybtn--failed");
	});

	// StatusMorph's `resetAfter` is the only thing that walks `morphState` back
	// to idle, and custom `children` remove StatusMorph entirely — so the parent
	// has to own the timer for that composition or the failure state sticks
	// forever.
	it("reverts a failed copy to idle after resetMs when custom children replace the morph", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(
			<CopyButton value="hello" resetMs={500}>
				<span>Custom</span>
			</CopyButton>
		);

		fireEvent.click(button(container));
		await flush();

		const live = visibleLabel(container);
		expect(live.textContent).toBe("Copy failed");
		expect(live.getAttribute("aria-live")).toBe("assertive");
		expect(button(container).className).toContain("ft-copybtn--failed");

		await advance(500);

		expect(live.textContent).toBe("Copy");
		expect(live.getAttribute("aria-live")).toBe("polite");
		expect(button(container).className).not.toContain("ft-copybtn--failed");
	});

	it("renders the copy glyph through StatusMorph's idle slot, at the icon footprint", () => {
		const { container } = render(<CopyButton value="hello" />);
		const el = morph(container);

		expect(el).not.toBeNull();
		expect(el?.getAttribute("data-state")).toBe("idle");
		expect(el?.getAttribute("data-tone")).toBe("semantic");
		// The inline style beats StatusMorph's own sizing rule; a `size-4`
		// utility would lose to it, since utilities are layered.
		expect(el?.getAttribute("style")).toContain("width: 1rem");
		// The cross resolves through the SAME chain as the failure skin around
		// it. StatusMorph's own last-resort red and the skin's are two different
		// reds, and the package ships no stylesheet, so "neither token declared"
		// is the out-of-the-box case — without this the default theme paints a
		// 16px cross in one red inside a label and border in another.
		expect(el?.getAttribute("style")).toContain("--ft-statusmorph-error: var(--ft-status-error,");
		expect(el?.querySelector(".ft-statusmorph-idle svg")).not.toBeNull();
	});

	it("shows only the failure skin when a copy fails inside a standing success window", async () => {
		stubClipboard(
			vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"))
		);
		const { container } = render(<CopyButton value="hello" resetMs={2000} />);

		fireEvent.click(button(container));
		await flush();
		expect(button(container).className).toContain("ft-copybtn--copied");

		await advance(500);
		fireEvent.click(button(container));
		await flush();

		// `copy()` returns from its `catch` before it touches `copied`, so the
		// success flag is still standing 500ms into its own 2s window. The skin
		// must not be: one attempt, one outcome, one class.
		expect(button(container).className).toContain("ft-copybtn--failed");
		expect(button(container).className).not.toContain("ft-copybtn--copied");
		expect(visibleLabel(container).textContent).toBe("Copy failed");
	});

	it("treats resetMs={0} as revert-immediately for the glyph too, not never-revert", async () => {
		stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
		const { container } = render(<CopyButton value="hello" resetMs={0} />);

		fireEvent.click(button(container));
		await flush();
		await advance(10);

		// StatusMorph documents `resetAfter: 0` as "no timer at all, manual reset
		// only", while `useCopy` reads the same 0 as "revert on the next tick".
		// Left unclamped, the label would revert and the cross would stay on
		// screen for good — so the call site passes 1ms instead.
		expect(morph(container)?.getAttribute("data-state")).toBe("idle");
		expect(visibleLabel(container).textContent).toBe("Copy");
		expect(button(container).className).not.toContain("ft-copybtn--failed");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(<CopyButton value="hello" className="mt-4" />);
		expect(button(container).className).toContain("mt-4");
		expect(button(container).className).toContain("ft-copybtn");
	});

	it("cancels the pending reset timer on unmount", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container, unmount } = render(<CopyButton value="hello" resetMs={500} />);

		fireEvent.click(button(container));
		await flush();
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		// Proves the hook teardown actually called `copyState.destroy()`, not just
		// that the DOM disappeared — a leaked timer would still be sitting in the
		// fake-timer queue here.
		expect(vi.getTimerCount()).toBe(0);
	});

	it("ignores a resetMs prop change after mount — the timer window was fixed at construction", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container, rerender } = render(<CopyButton value="hello" resetMs={500} />);

		rerender(<CopyButton value="hello" resetMs={50} />);
		fireEvent.click(button(container));
		await flush();
		expect(visibleLabel(container).textContent).toBe("Copied");

		// If the new 50ms value had taken effect, this would already be reverted.
		await advance(50);
		expect(visibleLabel(container).textContent).toBe("Copied");

		// The original 500ms window is what actually governs the revert.
		await advance(450);
		expect(visibleLabel(container).textContent).toBe("Copy");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the copy cue exactly once after a successful copy, with sound enabled", async () => {
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(<CopyButton value="hello" sound />);

			fireEvent.click(button(container));
			await flush();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("copy");
		});

		it("plays the error cue instead, when the write fails, with sound enabled", async () => {
			stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
			const { container } = render(<CopyButton value="hello" sound />);

			fireEvent.click(button(container));
			await flush();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("error");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(<CopyButton value="hello" />);

			fireEvent.click(button(container));
			await flush();

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			stubClipboard(writeText);
			const { container } = render(<CopyButton value="hello" sound disabled />);

			fireEvent.click(button(container));
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
			const { container } = render(<CopyButton value="hello" sound />);

			fireEvent.click(button(container));
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
			const { container } = render(<CopyButton value="hello" sound />);

			fireEvent.click(button(container));
			await flush();

			expect(unlock).not.toHaveBeenCalled();
			unlock.mockRestore();
		});

		it("does not forward the sound prop to the inner Button — the inner Button plays nothing itself", async () => {
			// If `sound` leaked through to the inner `<Button>`, its own `press` cue
			// would fire on top of CopyButton's own `copy`/`error` cue, doubling the
			// sound for a single click.
			stubClipboard(vi.fn().mockResolvedValue(undefined));
			const { container } = render(<CopyButton value="hello" sound />);

			fireEvent.click(button(container));
			await flush();

			expect(play).not.toHaveBeenCalledWith("press");
			expect(play).toHaveBeenCalledTimes(1);
		});
	});
});
