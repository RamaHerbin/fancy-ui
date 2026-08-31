import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

// `vi.mock` factories are hoisted above imports and may not close over
// outer-scope variables directly — `vi.hoisted` is the escape hatch that
// still lets the test body assert on the same mock instances the component
// actually calls.
const { lockScrollMock, releaseMock } = vi.hoisted(() => {
	const releaseMock = vi.fn();
	const lockScrollMock = vi.fn(() => releaseMock);
	return { lockScrollMock, releaseMock };
});

vi.mock("../_internals/scroll-lock.js", () => ({
	lockScroll: lockScrollMock,
	// The action form goes through the same mock so the existing
	// acquire/release assertions keep meaning what they meant — and it has to
	// be here at all now: the component locks the page with `use:scrollLock`
	// rather than an `$effect`, so a factory exporting only `lockScroll`
	// leaves the action `undefined` and the component throws on open.
	scrollLock: () => ({ destroy: lockScrollMock() }),
}));

import Sheet from "./Sheet.svelte";
import Harness from "./SheetHarness.test.svelte";
import type { SheetSide, SheetSize } from "./Sheet.svelte";
import { sound } from "../sound/sound.svelte.js";

function dialog(): HTMLElement | null {
	return document.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.querySelector(".ft-sheet-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return document.querySelector(".ft-sheet-close");
}

function pressEscape() {
	return fireEvent.keyDown(document, { key: "Escape" });
}

/**
 * Escape, dispatched WITHOUT awaiting testing-library's own flush.
 *
 * `fireEvent` awaits a promise of its own on top of `tick()`, and those extra
 * microtask turns are exactly long enough for the stubbed Web Animations API
 * to fire `onfinish` and let Svelte destroy the branch — so a test that awaits
 * it can never observe the exit window it is trying to assert on. A bare
 * dispatch followed by `flushSync()` runs the whole close synchronously and
 * stops there, right inside the window.
 */
function dispatchEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

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

describe("Sheet", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		lockScrollMock.mockClear();
		releaseMock.mockClear();
	});

	it("renders nothing while closed", () => {
		render(Sheet, { props: { title: "Settings" } });
		expect(dialog()).toBeNull();
	});

	it("renders a modal dialog when open", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		const el = dialog();
		expect(el).not.toBeNull();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("wires aria-labelledby to the real title id", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		const el = dialog()!;
		const labelledby = el.getAttribute("aria-labelledby");
		expect(labelledby).toBeTruthy();
		expect(document.getElementById(labelledby!)?.textContent).toBe("Settings");
	});

	it("omits aria-labelledby when there is no title", () => {
		render(Sheet, { props: { open: true } });
		expect(dialog()!.hasAttribute("aria-labelledby")).toBe(false);
	});

	it("wires aria-describedby to the real description id", () => {
		render(Sheet, {
			props: { open: true, title: "Settings", description: "Update your preferences." },
		});
		const el = dialog()!;
		const describedby = el.getAttribute("aria-describedby");
		expect(describedby).toBeTruthy();
		expect(document.getElementById(describedby!)?.textContent).toBe("Update your preferences.");
	});

	it("omits aria-describedby when there is no description", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.hasAttribute("aria-describedby")).toBe(false);
	});

	it("closes on Escape when dismissible (the default)", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await pressEscape();

		// `open` still flips synchronously — nothing a caller can observe
		// waits for the slide-out — but the panel stays mounted while it
		// plays, so its removal is what has to be awaited.
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false, onOpenChange } });

		await pressEscape();

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("closes when the scrim is clicked", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("does not close on scrim click when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false, onOpenChange } });

		await fireEvent.pointerDown(scrim()!);

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(dialog()).not.toBeNull();
	});

	it("renders a close button that closes the sheet on click", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("omits the close button when dismissible is false", () => {
		render(Sheet, { props: { open: true, title: "Settings", dismissible: false } });
		expect(closeButton()).toBeNull();
	});

	it("moves focus into the panel on open", () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.contains(document.activeElement)).toBe(true);
	});

	it("returns focus to the previously focused element on close", async () => {
		const trigger = document.createElement("button");
		document.body.appendChild(trigger);
		trigger.focus();

		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(document.activeElement).not.toBe(trigger);

		await pressEscape();

		// Deliberately UNWRAPPED. The return happens at the dismiss instant,
		// not when the slide-out ends: the focus trap hands the component a
		// handle it calls from `onoutrostart`. Wrapping this in `waitFor`
		// would silently accept a return that only lands once the panel is
		// gone — which in a browser is 200 ms of a keyboard user sitting on
		// `<body>`, because the closing panel is made inert immediately.
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});

	it.each<{ side: SheetSide; border: string; axisClass: string; otherAxisClass: string }>([
		// `axisClass`/`otherAxisClass` catch WIDTH_CLASSES/HEIGHT_CLASSES being
		// swapped in `dimensionClasses`: a horizontal side (left/right) sizes
		// with a fixed width and `h-dvh`; a vertical side (top/bottom) sizes
		// with a fixed height and `w-full` — asserting only the position
		// classes (as the previous version of this test did) would pass even
		// with the two swapped.
		{ side: "left", border: "border-r", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "right", border: "border-l", axisClass: "h-dvh", otherAxisClass: "w-full" },
		{ side: "top", border: "border-b", axisClass: "w-full", otherAxisClass: "h-dvh" },
		{ side: "bottom", border: "border-t", axisClass: "w-full", otherAxisClass: "h-dvh" },
	])(
		"renders side=$side with its own data-side, border side and sizing axis",
		({ side, border, axisClass, otherAxisClass }) => {
			render(Sheet, { props: { open: true, title: "Settings", side } });
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
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.getAttribute("data-side")).toBe("right");
	});

	it.each<[SheetSize, string]>([
		["sm", "w-[20rem]"],
		["md", "w-[24rem]"],
		["lg", "w-[32rem]"],
	])("size=%s sets the matching width class on a horizontal side (right)", (size, widthClass) => {
		render(Sheet, { props: { open: true, title: "Settings", side: "right", size } });
		expect(dialog()!.className).toContain(widthClass);
	});

	it.each<[SheetSize, string]>([
		["sm", "h-[14rem]"],
		["md", "h-[18rem]"],
		["lg", "h-[24rem]"],
	])("size=%s sets the matching height class on a vertical side (bottom)", (size, heightClass) => {
		render(Sheet, { props: { open: true, title: "Settings", side: "bottom", size } });
		expect(dialog()!.className).toContain(heightClass);
	});

	it("defaults to size md", () => {
		render(Sheet, { props: { open: true, title: "Settings", side: "right" } });
		expect(dialog()!.className).toContain("w-[24rem]");
	});

	it("renders body and footer snippet content", () => {
		render(Sheet, {
			props: {
				open: true,
				title: "Settings",
				children: snippet("<p>Body</p>"),
				footer: snippet('<button type="button">Save</button>'),
			},
		});
		expect(dialog()!.textContent).toContain("Body");
		expect(dialog()!.textContent).toContain("Save");
	});

	it("merges a custom class onto the panel", () => {
		render(Sheet, { props: { open: true, title: "Settings", class: "my-sheet" } });
		expect(dialog()!.className).toContain("my-sheet");
	});

	it("acquires the scroll lock on open and releases it on close", async () => {
		const { unmount } = render(Sheet, { props: { open: true, title: "Settings" } });

		// Stays synchronous: `use:scrollLock` acquires at mount, so the lock is
		// in place by the time the panel is on screen.
		expect(lockScrollMock).toHaveBeenCalledTimes(1);
		expect(releaseMock).not.toHaveBeenCalled();

		await pressEscape();
		// The release is deliberately NOT synchronous any more: the action's
		// `destroy()` is delayed by the exit transition, which is what keeps
		// the page locked until the panel has actually finished sliding out.
		await waitFor(() => expect(releaseMock).toHaveBeenCalledTimes(1));

		unmount();
	});

	it("releases the scroll lock on unmount even if still open", () => {
		const { unmount } = render(Sheet, { props: { open: true, title: "Settings" } });
		expect(lockScrollMock).toHaveBeenCalledTimes(1);

		unmount();
		expect(releaseMock).toHaveBeenCalledTimes(1);
	});

	it("never acquires the scroll lock while closed", () => {
		render(Sheet, { props: { title: "Settings" } });
		expect(lockScrollMock).not.toHaveBeenCalled();
	});

	// The exit protocol's own regression guards. Between the dismiss and the
	// unmount there is now a window — 200 ms in a browser, a couple of
	// microtasks under the stubbed Web Animations API — and these pin what
	// must be true inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()!.getAttribute("data-state")).toBe("open");

		dispatchEscape();
		flushSync();

		const closing = dialog();
		expect(closing).toBeTruthy();
		// Written imperatively from `onoutrostart` — a reactive `data-state`
		// would never reach the DOM, because Svelte marks the branch inert
		// before it plays the outro and the scheduler skips inert effects.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Svelte sets this itself on any element carrying a `transition:`, for
		// the whole exit. The assertion is here so nobody removes the
		// transition without noticing that a closing modal would go
		// interactive again.
		expect(closing!.inert).toBe(true);
		// `data-side` survives the deletion of the keyframes it used to
		// select: it is part of the component's semantics, not decoration.
		expect(closing!.getAttribute("data-side")).toBe("right");

		await waitFor(() => expect(dialog()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("ignores a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		dispatchEscape();
		flushSync();
		expect(dialog()).toBeTruthy(); // still sliding out

		// The dismiss layer stops answering the moment `open` is false, so
		// neither of these reaches the sheet at all.
		dispatchEscape();
		dispatchEscape();
		flushSync();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// The fast path: a duration of zero makes Svelte finish the transition
	// synchronously and never touch `element.animate()`, so a visitor who
	// asked for less motion gets exactly the synchronous close this component
	// had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Sheet, { props: { open: true, title: "Settings" } });
		expect(dialog()).toBeTruthy();

		await pressEscape();

		expect(dialog()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
		animateSpy.mockRestore();
	});

	it("works with a plain non-bound open plus a callback: the callback observes the close, and the panel still unmounts", async () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { open: true, title: "Settings", onOpenChange } });

		await fireEvent.click(closeButton()!);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("works with the callback alone (no open prop passed at all)", () => {
		const onOpenChange = vi.fn();
		render(Sheet, { props: { title: "Settings", onOpenChange } });

		expect(dialog()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("round-trips open through bind:open in both directions", async () => {
		const { getByTestId } = render(Harness);

		expect(dialog()).toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("false");

		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()).not.toBeNull();
		expect(getByTestId("bound-open").textContent).toBe("true");

		await fireEvent.click(closeButton()!);
		// The bound value flips straight away; only the panel's removal waits
		// for the slide-out.
		expect(getByTestId("bound-open").textContent).toBe("false");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("round-trips the panel element through bind:ref", async () => {
		const { getByTestId } = render(Harness);
		await fireEvent.click(getByTestId("trigger"));
		expect(dialog()!.getAttribute("data-bound-ref")).toBe("yes");
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays close exactly once when the close button dismisses", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, { props: { open: true, title: "Settings", sound: true } });

			await fireEvent.click(closeButton()!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays close exactly once on Escape, and close exactly once on a scrim click", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { unmount } = render(Sheet, { props: { open: true, title: "Settings", sound: true } });

			await pressEscape();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
			unmount();

			play.mockClear();
			render(Sheet, { props: { open: true, title: "Settings", sound: true } });
			await fireEvent.pointerDown(scrim()!);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, { props: { open: true, title: "Settings" } });

			await fireEvent.click(closeButton()!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when dismissible is false, even via a synthetic dispatch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, {
				props: { open: true, title: "Settings", dismissible: false, sound: true },
			});

			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});

		// The `if (!open) return` guard inside close() — a second Escape landing
		// during the exit must not double the cue.
		it("ignores a second Escape during the exit — close plays exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Sheet, { props: { open: true, title: "Settings", sound: true } });

			dispatchEscape();
			flushSync();
			expect(dialog()).toBeTruthy(); // still sliding out

			dispatchEscape();
			dispatchEscape();
			flushSync();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		// A bind:open write opening the sheet plays nothing (no open cue exists
		// by design); the close button on the same instance still plays close.
		it("a bind:open-driven open stays silent; the close button on that same instance still plays close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByTestId } = render(Harness, { props: { sound: true } });

			await fireEvent.click(getByTestId("trigger"));
			expect(dialog()).not.toBeNull();
			expect(play).not.toHaveBeenCalled();

			await fireEvent.click(closeButton()!);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});
	});
});
