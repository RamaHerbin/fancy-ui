import { render, cleanup, waitFor } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import HoverCard from "./HoverCard.svelte";
import Harness from "./HoverCardHarness.test.svelte";
import AriaHarness from "./HoverCardAriaHarness.test.svelte";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function pointerEnter(el: Element) {
	el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, cancelable: true }));
}

function pointerLeave(el: Element) {
	el.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, cancelable: true }));
}

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function triggerWrapper(): HTMLElement {
	return document.querySelector(".ft-hover-card-trigger") as HTMLElement;
}

function panel(): HTMLElement | null {
	return document.body.querySelector(".ft-hover-card-panel");
}

/** Replaces `window.matchMedia` wholesale, the pattern `media-query.svelte.ts`
 * documents and `_internals/motion/anchored.test.ts` already uses — the
 * transition resolves it fresh on every call, so an override installed before
 * the card opens is what the entrance reads. */
function stubMatchMedia(matches: boolean) {
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

/** Pins every element's rect flush against the bottom edge of the viewport,
 * which is the one condition `computePosition` needs to flip a `side: "bottom"`
 * request to `"top"` (`anchor.bottom + offset + floating.height > viewport.height`).
 * jsdom reports all-zero rects otherwise, so without this stub nothing in the
 * suite ever exercises a flip — and a flip is the only case where the resolved
 * side differs from the requested one the card seeds itself with.
 *
 * The rect is internally consistent (`top = bottom - height`) because the same
 * value is read twice: once as the anchor and once as the floating element.
 * `bottom` is read from `window.innerHeight` rather than hardcoded to jsdom's
 * 768 so the overflow stays true whatever viewport the runner defaults to. The
 * opposite side deliberately still fits (`top - height - offset > 0`), so the
 * flip lands somewhere real instead of picking the lesser of two overflows.
 * `vi.restoreAllMocks()` in `afterEach` removes it. */
function pinRectsToViewportBottom() {
	const bottom = window.innerHeight;
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
		top: bottom - 200,
		bottom,
		left: 0,
		right: 100,
		width: 100,
		height: 200,
		x: 0,
		y: bottom - 200,
		toJSON: () => ({}),
	} as DOMRect);
}

const trigger = () => snippet('<button type="button">@handle</button>');
const content = () => snippet("<p>Rama Herbin — 1.2k followers</p>");

describe("HoverCard", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.useRealTimers();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("renders the trigger and stays closed until interaction", () => {
		render(HoverCard, { props: { trigger: trigger(), children: content() } });
		expect(document.querySelector("button")?.textContent).toBe("@handle");
		expect(panel()).toBeNull();
	});

	it("opens after openDelay on pointerenter, not a moment before", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { onOpenChange, openDelay: 300, trigger: trigger(), children: content() },
		});

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(299);
		expect(panel()).toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).not.toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it("cancels the open if the pointer leaves the trigger before openDelay elapses", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { onOpenChange, openDelay: 300, trigger: trigger(), children: content() },
		});

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(150);
		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(1000);

		await waitFor(() => expect(panel()).toBeNull());
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes after closeDelay once the pointer leaves the trigger", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});
		expect(panel()).not.toBeNull();

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(149);
		expect(panel()).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		// `onOpenChange` still fires the moment the delay is up — `open` flips
		// synchronously. The removal is the half that now trails it by the
		// length of the exit.
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("stays open when the pointer travels from the trigger to the card before closeDelay elapses", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(100);
		// The pointer lands on the card before the pending close fires.
		pointerEnter(panel()!);
		await vi.advanceTimersByTimeAsync(1000);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes after closeDelay once the pointer leaves the card behind it", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(100);
		pointerEnter(panel()!);
		pointerLeave(panel()!);
		await vi.advanceTimersByTimeAsync(149);
		expect(panel()).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("opens immediately on focus, without waiting for openDelay", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { onOpenChange, openDelay: 300, trigger: trigger(), children: content() },
		});
		const button = document.querySelector("button") as HTMLButtonElement;

		button.focus();
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it("closes immediately on blur, without waiting for closeDelay", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				closeDelay: 150,
				trigger: trigger(),
				children: content(),
			},
		});
		const button = document.querySelector("button") as HTMLButtonElement;
		button.focus();
		await vi.advanceTimersByTimeAsync(0);
		onOpenChange.mockClear();

		button.blur();
		await vi.advanceTimersByTimeAsync(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	// The README says nothing inside the card should be interactive, but this
	// is the safety net for a caller who does it anyway: focus leaving the
	// trigger for something genuinely inside the card must not unmount the
	// card out from under that focus move — only a mouse click on the same
	// element would otherwise "work", which is exactly the asymmetry this
	// guards against.
	it("does not close when focus moves from the trigger into the panel", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: {
				open: true,
				onOpenChange,
				trigger: trigger(),
				children: snippet('<a href="#" data-testid="card-link">Link</a>'),
			},
		});
		const wrapper = triggerWrapper();
		const link = document.body.querySelector('[data-testid="card-link"]') as HTMLElement;
		expect(link).not.toBeNull();

		wrapper.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: link }));
		await vi.advanceTimersByTimeAsync(0);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("still closes when focus moves somewhere outside the panel", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { open: true, onOpenChange, trigger: trigger(), children: content() },
		});
		const wrapper = triggerWrapper();
		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);

		wrapper.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: elsewhere }));
		await vi.advanceTimersByTimeAsync(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
		elsewhere.remove();
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { open: true, onOpenChange, trigger: trigger(), children: content() },
		});

		pressEscape();
		await vi.advanceTimersByTimeAsync(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("hands the trigger snippet the panel's id, undefined while closed", async () => {
		render(AriaHarness);
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;
		expect(button.getAttribute("aria-describedby")).toBeNull();

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		const describedBy = button.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		expect(panel()!.id).toBe(describedBy);
	});

	it("clears the trigger snippet's descriptionId back to undefined once closed", async () => {
		render(AriaHarness);
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		expect(button.getAttribute("aria-describedby")).toBeTruthy();

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(150);
		expect(button.getAttribute("aria-describedby")).toBeNull();
	});

	it("works uncontrolled, with neither open nor onOpenChange passed in", async () => {
		render(HoverCard, { props: { trigger: trigger(), children: content() } });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		expect(panel()).not.toBeNull();
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		render(HoverCard, {
			props: { open: true, side: "right", align: "start", trigger: trigger(), children: content() },
		});
		await vi.advanceTimersByTimeAsync(0);

		// jsdom reports every rect as zeroes, so `computePosition` never
		// overflows and never flips — this pins the un-flipped path
		// deterministically. `right` + `start` puts the origin on the card's
		// left-top corner, the corner touching the trigger.
		const el = panel()!;
		expect(el.getAttribute("data-side")).toBe("right");
		expect(el.getAttribute("data-align")).toBe("start");
		expect(el.style.transformOrigin).toBe("left top");
	});

	it("follows a flip: the resolved side wins over the requested one, and the origin moves with it", async () => {
		pinRectsToViewportBottom();
		render(HoverCard, {
			props: { openDelay: 300, side: "bottom", trigger: trigger(), children: content() },
		});

		// Opened through the real pointer path rather than `open: true`, so the
		// card mounts into an already-running block: `anchorPosition`'s user
		// effect reports the flip, and the render effect behind `data-side` /
		// `style:transform-origin` has to correct the seeded value in the same
		// flush. That ordering is the only reason the seed is safe.
		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		// The card seeds `resolvedSide` from the REQUESTED side, so this is the
		// only assertion in the file that fails if `onPlacement` is deleted:
		// the request was `bottom`, the card could not fit there, and it now
		// grows out of its own bottom edge — the edge touching the trigger
		// below it — instead of the top edge the request implied.
		const el = panel()!;
		expect(el.getAttribute("data-side")).toBe("top");
		expect(el.style.transformOrigin).toBe("center bottom");
	});

	it("rises from the shared scale floor, with no travel of its own", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { openDelay: 300, trigger: trigger(), children: content() } });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		// Svelte samples the transition's `css(t, u)` into WAAPI keyframes, so
		// these are the direct evidence of what the entrance animates. The
		// card used to add 4px of `translateY` on top of a `0.96` scale; both
		// are gone on purpose — the travel now lives in the growth origin
		// asserted above, and the floor is the one shared `0.92`.
		expect(animateSpy).toHaveBeenCalled();
		const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
		expect(keyframes.at(0)).toMatchObject({ opacity: "0", transform: "scale(0.92)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "1", transform: "scale(1)" });
		expect(keyframes.every((frame) => !String(frame.transform).includes("translate"))).toBe(true);
	});

	it("plays no entrance at all when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { openDelay: 300, trigger: trigger(), children: content() } });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		// `anchored` collapses the duration to 0, and Svelte's own
		// falsy-duration fast path then skips `element.animate()` entirely —
		// the card is simply there, in the frame it mounted. Its visibility
		// never depended on the animation; `{#if open}` alone decides that.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The exit's own regression guards. Between the dismiss and the unmount
	// there is now a window — 150 ms in a browser, a couple of microtasks
	// under the WAAPI stub — and these pin what must be true inside it.
	//
	// `flushSync()` rather than an awaited helper throughout: every `await`
	// crosses a microtask boundary, which under the stub is enough for the
	// whole exit to finish. Flushing synchronously is the only way to land
	// inside the window at all.
	it("keeps the card mounted, inert and marked closing for the length of the exit", async () => {
		render(HoverCard, { props: { open: true, trigger: trigger(), children: content() } });
		await vi.advanceTimersByTimeAsync(0);
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		flushSync();

		const closing = panel();
		expect(closing).toBeTruthy();
		// Written imperatively from `onoutrostart`. A reactive `data-state`
		// would never reach the DOM: Svelte marks the branch inert before it
		// plays the outro and the scheduler skips inert effects.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Svelte sets this itself on any element carrying a `transition:`, for
		// the whole exit — which is what stops the pointer interacting with a
		// card it has already left.
		expect(closing!.inert).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
	});

	it("leaves on the exit rung: the departure curve, half the entrance's scale delta", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { openDelay: 300, trigger: trigger(), children: content() } });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		animateSpy.mockClear();

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());

		// Svelte samples the transition's `css(t, u)` into these keyframes, so
		// they are the direct evidence of what the exit animates: from resting
		// to the `0.96` floor, which is HALF the entrance's delta off `0.92`.
		// `duration` is the shared `DURATIONS.fast`, the same 150 ms the
		// entrance takes — an anchored surface passes no timing params at all.
		const call = animateSpy.mock.calls.at(-1)!;
		const keyframes = call[0] as Keyframe[];
		const options = call[1] as KeyframeAnimationOptions;
		expect(options.duration).toBe(150);
		expect(keyframes.at(0)).toMatchObject({ opacity: "1", transform: "scale(1)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "0", transform: "scale(0.96)" });
	});

	// The race a hover surface creates that a click surface does not: pointers
	// change their mind. One bidirectional `transition:` reverses the outro on
	// the SAME node rather than mounting a second card behind the first, which
	// is the failure a split `in:`/`out:` pair would produce here.
	it("reverses a card the pointer comes back to mid-exit, rather than mounting a second one", async () => {
		render(HoverCard, {
			props: { open: true, openDelay: 0, closeDelay: 0, trigger: trigger(), children: content() },
		});
		await vi.advanceTimersByTimeAsync(0);
		const first = panel();
		expect(first).toBeTruthy();

		pressEscape();
		flushSync();
		expect(panel()!.getAttribute("data-state")).toBe("closing");

		// Back on the trigger before the fade is over. `advanceTimersByTime` is
		// the SYNCHRONOUS form on purpose — its async sibling awaits between
		// timers, and that await would end the exit window before the reopen
		// ever lands.
		pointerEnter(triggerWrapper());
		vi.advanceTimersByTime(0);
		flushSync();

		expect(document.body.querySelectorAll(".ft-hover-card-panel")).toHaveLength(1);
		expect(panel()).toBe(first);
		expect(panel()!.getAttribute("data-state")).toBe("open");
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, {
			props: { open: true, onOpenChange, trigger: trigger(), children: content() },
		});
		await vi.advanceTimersByTimeAsync(0);

		pressEscape();
		flushSync();
		expect(panel()).not.toBeNull(); // still fading

		pressEscape();
		pressEscape();
		flushSync();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// `anchored` collapses the duration to 0 under reduced motion, and
	// Svelte's own falsy-duration fast path then calls `on_finish()`
	// synchronously and never touches `element.animate()` — so a visitor who
	// asked for less motion gets exactly the synchronous close this component
	// had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { open: true, trigger: trigger(), children: content() } });
		await vi.advanceTimersByTimeAsync(0);
		expect(panel()).not.toBeNull();

		pressEscape();
		flushSync();

		expect(panel()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips open through bind:open", async () => {
		const { getByTestId } = render(Harness);
		expect(getByTestId("bound-open").textContent).toBe("false");

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		expect(getByTestId("bound-open").textContent).toBe("true");
	});
});
