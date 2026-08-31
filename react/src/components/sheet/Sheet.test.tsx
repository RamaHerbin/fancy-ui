import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { Sheet } from "./Sheet.js";
import type { SheetSide, SheetSize } from "./Sheet.js";

// Transposed assertion-for-assertion from the source suite. The source mocks
// its scroll-lock module because `use:scrollLock` is an action; here the lock
// runs for real and the acquire/release assertions read the observable it
// writes — `document.body.style.position` — the same way the dialog suite
// does. The `bind:open`/`bind:ref` harness (a `.test.svelte` file there only
// because Svelte components need their own file) becomes the plain component
// below.

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando that reflects to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE, which
 * is what `:not([inert])` selectors and assistive tech key on) was never
 * touched. Guarded so it is a no-op the moment jsdom ships the real property.
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

function dialog(): HTMLElement | null {
	return document.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.querySelector(".ft-sheet-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.querySelector(".ft-sheet-close");
}

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there. (The
 * source's `dispatchEscape` + `flushSync` pair, in React clothing.)
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

function pointerDownOn(target: HTMLElement) {
	const init = { bubbles: true, cancelable: true };
	// The jsdom version this package pins does not implement `PointerEvent`.
	// A `MouseEvent` of the same type carries everything the handler reads
	// (`type` and `target`), so the assertions are unaffected.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Drains an exit (or entrance) leg to completion. The animation stub finishes
 * on a microtask; a leg that settles after the test body has returned updates
 * React state outside `act` and prints a warning per sheet, so every test
 * that leaves one in flight ends with this.
 */
const settleLegs = () => act(async () => {});

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before a render is visible to the very next read. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

/**
 * The React spelling of `SheetHarness.test.svelte`: the source needed a
 * dedicated Svelte file because `bind:` cannot be expressed from a `.ts`
 * test; here the two bindings become a controlled `open` written back from
 * `onOpenChange`, and a callback ref standing in for `bind:ref`.
 */
function SheetHarness({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
				Open
			</button>
			<Sheet
				open={open}
				onOpenChange={(value) => {
					setOpen(value);
					onOpenChange?.(value);
				}}
				ref={(node) => {
					node?.setAttribute("data-bound-ref", "yes");
				}}
				title="Settings"
			>
				Body content
			</Sheet>
			<span data-testid="bound-open">{String(open)}</span>
		</>
	);
}

describe("Sheet", () => {
	beforeEach(() => {
		// The scroll lock restores the page offset with `window.scrollTo`,
		// which jsdom does not implement — unmocked it floods the run with
		// "Not implemented" console noise on every release.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders nothing while closed", () => {
		render(<Sheet title="Settings" />);
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open", () => {
		render(<Sheet open title="Settings" />);
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("wires aria-labelledby to the real title id", () => {
		render(<Sheet open title="Settings" />);
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Settings");
	});

	it("omits aria-labelledby when there is no title", () => {
		render(<Sheet open />);
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("wires aria-describedby to the real description id", () => {
		render(<Sheet open title="Settings" description="Update your preferences." />);
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Update your preferences.");
	});

	it("omits aria-describedby when there is no description", () => {
		render(<Sheet open title="Settings" />);
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" onOpenChange={onOpenChange} />);

		pressEscape();

		// `open` still flips synchronously — nothing a caller can observe
		// waits for the slide-out — but the panel stays mounted while it
		// plays, so its removal is what has to be awaited.
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on Escape when dismissible is false", () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" dismissible={false} onOpenChange={onOpenChange} />);

		pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" onOpenChange={onOpenChange} />);

		pointerDownOn(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on scrim click when dismissible is false", () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" dismissible={false} onOpenChange={onOpenChange} />);

		pointerDownOn(scrim()!);

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("renders a close button that closes the sheet on click", async () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("omits the close button when dismissible is false", () => {
		render(<Sheet open title="Settings" dismissible={false} />);
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", () => {
		render(<Sheet open title="Settings" />);
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(<Sheet open title="Settings" />);
		expect(document.activeElement).not.toBe(trigger);

		pressEscape();

		// Deliberately UNWRAPPED. The return happens at the dismiss instant,
		// not when the slide-out ends: the focus trap hands the component a
		// handle it calls from `onExitStart`. Wrapping this in `waitFor`
		// would silently accept a return that only lands once the panel is
		// gone — which in a browser is 200 ms of a keyboard user sitting on
		// `<body>`, because the closing panel is made inert immediately.
		expect(document.activeElement).toBe(trigger);
		await settleLegs();
		trigger.remove();
	});

	it.each<{ side: SheetSide; border: string; axisClass: string; otherAxisClass: string }>([
		// `axisClass`/`otherAxisClass` catch WIDTH_CLASSES/HEIGHT_CLASSES being
		// swapped in `dimensionClasses`: a horizontal side (left/right) sizes
		// with a fixed width and `h-dvh`; a vertical side (top/bottom) sizes
		// with a fixed height and `w-full` — asserting only the position
		// classes would pass even with the two swapped.
		{ side: "left", border: "border-r", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "right", border: "border-l", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "top", border: "border-b", axisClass: "w-full", otherAxisClass: "h-dvh" },
		{ side: "bottom", border: "border-t", axisClass: "w-full", otherAxisClass: "h-dvh" },
	])(
		"renders side=$side with its own data-side, border side and sizing axis",
		({ side, border, axisClass, otherAxisClass }) => {
			render(<Sheet open title="Settings" side={side} />);
			const el = dialog()!;
			expect(el.getAttribute("data-side")).toBe(side);
			expect(el.className).toContain(`${side}-0`);
			expect(el.className).toContain(
				side === "left" || side === "right" ? "inset-y-0" : "inset-x-0"
			);
			expect(el.className).toContain(border);
			expect(el.className).toContain(axisClass);
			expect(el.className).not.toContain(otherAxisClass);
		}
	);

	it("defaults to side right", () => {
		render(<Sheet open title="Settings" />);
		expect(dialog()!.getAttribute("data-side")).toBe("right");
	});

	it.each<[SheetSize, string]>([
		["sm", "w-[20rem]"],
		["md", "w-[24rem]"],
		["lg", "w-[32rem]"],
	])("size=%s sets the matching width class on a horizontal side (right)", (size, widthClass) => {
		render(<Sheet open title="Settings" side="right" size={size} />);
		expect(dialog()!.className).toContain(widthClass);
	});

	it.each<[SheetSize, string]>([
		["sm", "h-[14rem]"],
		["md", "h-[18rem]"],
		["lg", "h-[24rem]"],
	])("size=%s sets the matching height class on a vertical side (bottom)", (size, heightClass) => {
		render(<Sheet open title="Settings" side="bottom" size={size} />);
		expect(dialog()!.className).toContain(heightClass);
	});

	it("defaults to size md", () => {
		render(<Sheet open title="Settings" side="right" />);
		expect(dialog()!.className).toContain("w-[24rem]");
	});

	it("renders body and footer content", () => {
		render(
			<Sheet
				open
				title="Settings"
				footer={<button type="button">Save</button>}
			>
				<p>Body</p>
			</Sheet>
		);
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Save");
	});

	it("merges a custom class onto the panel", () => {
		render(<Sheet open title="Settings" className="my-sheet" />);
		expect(dialog()!.className).toContain("my-sheet");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		render(<Sheet open title="Settings" />);

		// Stays synchronous: the lock is acquired in a layout effect the
		// moment the surface mounts, so it is in place by the time the panel
		// is on screen.
		expect(document.body.style.position).toBe("fixed");

		pressEscape();
		// The release is deliberately NOT synchronous: it is scoped to the
		// surface's MOUNT, which `usePresence` holds for the length of the
		// exit — which is what keeps the page locked until the panel has
		// actually finished sliding out.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	it("releases the scroll lock on unmount even if still open", async () => {
		const { unmount } = render(<Sheet open title="Settings" />);
		expect(document.body.style.position).toBe("fixed");

		unmount();
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	it("never acquires the scroll lock while closed", () => {
		render(<Sheet title="Settings" />);
		expect(document.body.style.position).toBe("");
	});

	// The exit protocol's own regression guards. Between the dismiss and the
	// unmount there is a window — 200 ms in a browser, a couple of
	// microtasks under the animation stub — and these pin what must be true
	// inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(<Sheet open title="Settings" />);
		expect(dialog()!.getAttribute("data-state")).toBe("open");

		pressEscape();

		const closing = dialog();
		expect(closing).toBeTruthy();
		// An ordinary React attribute here (divergence D-2), carrying
		// `surfaceState`'s two values.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// `usePresence` sets this on every registered node for the whole
		// exit. The assertion is here so nobody removes the transition
		// without noticing that a closing modal would go interactive again.
		expect(closing!.inert).toBe(true);
		// `data-side` survives the deletion of the keyframes it used to
		// select: it is part of the component's semantics, not decoration.
		expect(closing!.getAttribute("data-side")).toBe("right");

		await waitFor(() => expect(dialog()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("ignores a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" onOpenChange={onOpenChange} />);

		pressEscape();
		expect(dialog()).toBeTruthy(); // still sliding out

		// The dismiss layer stops answering the moment `open` is false, so
		// neither of these reaches the sheet at all.
		pressEscape();
		pressEscape();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	// The fast path: a duration of zero makes `runTransition` finish the
	// transition synchronously and never touch `element.animate()`, so a
	// visitor who asked for less motion gets exactly the synchronous close
	// this component had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(<Sheet open title="Settings" />);
		expect(dialog()).toBeTruthy();

		pressEscape();

		expect(dialog()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(<Sheet open title="Settings" onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("works with the callback alone (no open prop passed at all)", () => {
		const onOpenChange = vi.fn();
		render(<Sheet title="Settings" onOpenChange={onOpenChange} />);

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through the controlled pair in both directions", async () => {
		const { getByTestId } = render(<SheetHarness />);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		fireEvent.click(getByTestId("trigger"));
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		fireEvent.click(closeButton()!);
		// The bound value flips straight away; only the panel's removal waits
		// for the slide-out.
		expect(getByTestId("bound-open").textContent).toBe("false");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("round-trips the panel element through the forwarded ref", async () => {
		const { getByTestId } = render(<SheetHarness />);
		fireEvent.click(getByTestId("trigger"));
		expect(dialog()!.getAttribute("data-bound-ref")).toBe("yes");
		await settleLegs();
	});
});
