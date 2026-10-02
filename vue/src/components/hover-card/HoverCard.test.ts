import { cleanup, render, waitFor } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import HoverCard from "./HoverCard.vue";

/**
 * Transposed assertion-for-assertion from the source component's suite. Four
 * shapes changed and nothing else did:
 *
 * - The snippets become slots: `createRawSnippet(...)` is a slot string, and
 *   the `trigger` snippet's positional `descriptionId` argument is a scoped
 *   slot prop of the same name.
 * - The two `*.test.svelte` harnesses collapse. The aria one becomes a scoped
 *   slot string (which is exactly what it was proving: a real, re-rendered
 *   slot, not a render function evaluated once); the `bind:open` one becomes an
 *   inline component driving `open` / `onUpdate:open` by hand.
 * - `flushSync()` becomes an awaited flush. `await nextTick()` lands INSIDE the
 *   exit window — the leading dummy animation's callback has run by then, the
 *   main leg's has not — which is where the mounted/inert/closing assertions
 *   belong. The reversal case needs one microtask less than that and awaits a
 *   bare resolved promise instead; see its own comment.
 * - This package's jsdom has no `PointerEvent`; `MouseEvent` carries every
 *   field the component and the dismiss layer read.
 *
 * No `inert` shim, deliberately (the internals suite makes the same call). jsdom
 * implements no `inert` IDL property, so the presence clock writes the
 * ATTRIBUTE and `hasAttribute` observes production behaviour directly — the
 * source's `.inert` property read is the one assertion that could not survive
 * unchanged.
 */

const TRIGGER = '<button type="button">@handle</button>';
const CONTENT = "<p>Rama Herbin — 1.2k followers</p>";

function slots(children: string = CONTENT) {
	return { trigger: TRIGGER, default: children };
}

/** jsdom does not implement `PointerEvent`; `MouseEvent` carries every field
 * the handlers read. */
function pointerEvent(type: string): Event {
	const Ctor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	return new Ctor(type, { bubbles: true, cancelable: true });
}

function pointerEnter(el: Element) {
	el.dispatchEvent(pointerEvent("pointerenter"));
}

function pointerLeave(el: Element) {
	el.dispatchEvent(pointerEvent("pointerleave"));
}

/** Dispatches Escape SYNCHRONOUSLY, unlike `fireEvent.keyDown`, which awaits a
 * tick of its own — anything awaited between the dismiss and an assertion has
 * already spent part of the exit window. */
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

/** Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses — the transition resolves it fresh on every call, so an override
 * installed before the card opens is what the entrance reads. */
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
 * `bottom` is read from `window.innerHeight` rather than hardcoded so the
 * overflow stays true whatever viewport the runner defaults to. The opposite
 * side deliberately still fits (`top - height - offset > 0`), so the flip lands
 * somewhere real instead of picking the lesser of two overflows.
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

describe("HoverCard", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		// The source's suite wipes `document.body` wholesale; here the panel is
		// teleported into it alongside the testing library's own container, so
		// only the stragglers go.
		document.body.querySelectorAll(".ft-hover-card-panel").forEach((el) => el.remove());
		vi.useRealTimers();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("renders the trigger and stays closed until interaction", () => {
		render(HoverCard, { slots: slots() });
		expect(document.querySelector("button")?.textContent).toBe("@handle");
		expect(panel()).toBeNull();
	});

	it("opens after openDelay on pointerenter, not a moment before", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, { props: { onOpenChange, openDelay: 300 }, slots: slots() });

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
		render(HoverCard, { props: { onOpenChange, openDelay: 300 }, slots: slots() });

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
			props: { open: true, onOpenChange, closeDelay: 150 },
			slots: slots(),
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
			props: { open: true, onOpenChange, closeDelay: 150 },
			slots: slots(),
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
			props: { open: true, onOpenChange, closeDelay: 150 },
			slots: slots(),
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
		render(HoverCard, { props: { onOpenChange, openDelay: 300 }, slots: slots() });
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
			props: { open: true, onOpenChange, closeDelay: 150 },
			slots: slots(),
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
			props: { open: true, onOpenChange },
			slots: slots('<a href="#" data-testid="card-link">Link</a>'),
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
		render(HoverCard, { props: { open: true, onOpenChange }, slots: slots() });
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
		render(HoverCard, { props: { open: true, onOpenChange }, slots: slots() });

		pressEscape();
		await vi.advanceTimersByTimeAsync(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	// The scoped slot is what the source's aria harness had to be a real
	// `.svelte` file to prove: the id reaches a DOM attribute on the CALLER's
	// own element, through real slot-prop passing, and the slot re-renders when
	// `open` flips.
	const ARIA_SLOTS = {
		trigger:
			'<template #trigger="{ descriptionId }"><button type="button" data-testid="trigger-button" :aria-describedby="descriptionId">@handle</button></template>',
		default: "<p>Card content</p>",
	};

	it("hands the trigger slot the panel's id, undefined while closed", async () => {
		render(HoverCard, { props: { openDelay: 300, closeDelay: 150 }, slots: ARIA_SLOTS });
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;
		expect(button.getAttribute("aria-describedby")).toBeNull();

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		const describedBy = button.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		expect(panel()!.id).toBe(describedBy);
	});

	it("clears the trigger slot's descriptionId back to undefined once closed", async () => {
		render(HoverCard, { props: { openDelay: 300, closeDelay: 150 }, slots: ARIA_SLOTS });
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		expect(button.getAttribute("aria-describedby")).toBeTruthy();

		pointerLeave(triggerWrapper());
		await vi.advanceTimersByTimeAsync(150);
		expect(button.getAttribute("aria-describedby")).toBeNull();
	});

	it("works uncontrolled, with neither open nor onOpenChange passed in", async () => {
		render(HoverCard, { slots: slots() });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		expect(panel()).not.toBeNull();
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		render(HoverCard, {
			props: { open: true, side: "right", align: "start" },
			slots: slots(),
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
		render(HoverCard, { props: { openDelay: 300, side: "bottom" }, slots: slots() });

		// Opened through the real pointer path rather than `open: true`, so the
		// card mounts into an already-running clock: the anchoring watcher
		// reports the flip, and the binding behind `data-side` /
		// `transform-origin` has to correct the seeded value in the same flush.
		// That ordering is the only reason the seed is safe.
		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		await nextTick();

		// The card seeds its placement from the REQUESTED side, so this is the
		// only assertion in the file that fails if the resolved placement is
		// ignored: the request was `bottom`, the card could not fit there, and
		// it now grows out of its own bottom edge — the edge touching the
		// trigger below it — instead of the top edge the request implied.
		const el = panel()!;
		expect(el.getAttribute("data-side")).toBe("top");
		expect(el.style.transformOrigin).toBe("center bottom");
	});

	it("rises from the shared scale floor, with no travel of its own", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { openDelay: 300 }, slots: slots() });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		await nextTick();

		// The sampler turns the transition's `css(t, u)` into WAAPI keyframes, so
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
		render(HoverCard, { props: { openDelay: 300 }, slots: slots() });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		await nextTick();

		// `anchored` collapses the duration to 0, and the sampler's own
		// falsy-duration fast path then skips `element.animate()` entirely —
		// the card is simply there, in the frame it mounted. Its visibility
		// never depended on the animation; the presence clock alone decides that.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The exit's own regression guards. Between the dismiss and the unmount
	// there is a window — 150 ms in a browser, a couple of microtasks under the
	// animation stub — and these pin what must be true inside it.
	it("keeps the card mounted, inert and marked closing for the length of the exit", async () => {
		render(HoverCard, { props: { open: true }, slots: slots() });
		await vi.advanceTimersByTimeAsync(0);
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await nextTick();

		const closing = panel();
		expect(closing).toBeTruthy();
		// An ordinary binding here, carrying the surface vocabulary's TWO
		// values: a presence-mounted subtree stays reactive for the whole exit,
		// so nothing has to be written imperatively.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Written by the presence clock, as an ATTRIBUTE, for the whole exit —
		// which is what stops the pointer interacting with a card it has
		// already left.
		expect(closing!.hasAttribute("inert")).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
	});

	it("leaves on the exit rung: the departure curve, half the entrance's scale delta", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { openDelay: 300 }, slots: slots() });

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);
		await nextTick();
		animateSpy.mockClear();

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());

		// The sampler turns the transition's `css(t, u)` into these keyframes, so
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
	// change their mind. ONE bidirectional leg reverses on the SAME node rather
	// than mounting a second card behind the first, which is the failure a
	// split enter/exit pair would produce here.
	it("reverses a card the pointer comes back to mid-exit, rather than mounting a second one", async () => {
		render(HoverCard, {
			props: { open: true, openDelay: 0, closeDelay: 0 },
			slots: slots(),
		});
		await vi.advanceTimersByTimeAsync(0);
		const first = panel();
		expect(first).toBeTruthy();

		pressEscape();
		// A bare resolved promise, not `nextTick()`: both land after the flush
		// that starts the exit, but `nextTick()`'s promise settles one microtask
		// later — after the leading dummy animation's callback has created the
		// main leg, whose own callback then fires before anything this test
		// queues next. One microtask earlier is the only point at which a reopen
		// still reverses the SAME node instead of letting the exit settle and
		// mounting a fresh one.
		await Promise.resolve();
		expect(panel()!.getAttribute("data-state")).toBe("closing");

		// Back on the trigger before the fade is over. `advanceTimersByTime` is
		// the SYNCHRONOUS form on purpose — its async sibling awaits between
		// timers, and that await would end the exit window before the reopen
		// ever lands.
		pointerEnter(triggerWrapper());
		vi.advanceTimersByTime(0);
		await nextTick();

		expect(document.body.querySelectorAll(".ft-hover-card-panel")).toHaveLength(1);
		expect(panel()).toBe(first);
		expect(panel()!.getAttribute("data-state")).toBe("open");
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(HoverCard, { props: { open: true, onOpenChange }, slots: slots() });
		await vi.advanceTimersByTimeAsync(0);

		pressEscape();
		await nextTick();
		expect(panel()).not.toBeNull(); // still fading

		pressEscape();
		pressEscape();
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// `anchored` collapses the duration to 0, and the sampler's own
	// falsy-duration fast path then calls `onFinish()` synchronously and never
	// touches `element.animate()` — so a visitor who asked for less motion gets
	// exactly the synchronous close this component had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(HoverCard, { props: { open: true }, slots: slots() });
		await vi.advanceTimersByTimeAsync(0);
		expect(panel()).not.toBeNull();

		pressEscape();
		await nextTick();

		expect(panel()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	// The source's harness exists because `bind:` cannot be expressed from a
	// `.ts` test file. Here the same proof is an inline component driving
	// `open` / `onUpdate:open` by hand — which is exactly what `v-model:open`
	// compiles to — and echoing the value into the DOM.
	it("round-trips open through v-model:open", async () => {
		const Harness = defineComponent({
			name: "HoverCardHarness",
			setup() {
				const open = ref(false);
				return () => [
					h(
						HoverCard,
						{
							open: open.value,
							"onUpdate:open": (next: boolean) => {
								open.value = next;
							},
							openDelay: 300,
							closeDelay: 150,
						},
						{
							trigger: () => h("button", { type: "button" }, "@handle"),
							default: () => h("p", "Card content"),
						}
					),
					h("span", { "data-testid": "bound-open" }, String(open.value)),
				];
			},
		});

		const { getByTestId } = render(Harness);
		expect(getByTestId("bound-open").textContent).toBe("false");

		pointerEnter(triggerWrapper());
		await vi.advanceTimersByTimeAsync(300);

		expect(getByTestId("bound-open").textContent).toBe("true");
	});
});
