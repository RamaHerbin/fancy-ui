import { createRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("../../internals/use-anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/use-anchor-position.js")>();
	return { ...actual, useAnchorPosition: vi.fn(actual.useAnchorPosition) };
});

import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { attachDismissable } from "../../internals/dismissable.js";
import { Tooltip } from "./Tooltip.js";

// The source's `createRawSnippet` trigger, as plain JSX. The trigger listeners
// are attached imperatively to the wrapper's first rendered child either way,
// so the harness shape carries over one-to-one.
const trigger = <button data-testid="trigger">♥</button>;
const nonFocusableTrigger = <span data-testid="trigger">♥</span>;

function getTrigger(): HTMLButtonElement {
	return document.body.querySelector('[data-testid="trigger"]') as HTMLButtonElement;
}

function bubble(): HTMLElement | null {
	return document.querySelector(".ft-tooltip");
}

/** Advances fake timers inside `act`, so the state updates their callbacks
 *  schedule are flushed before the next assertion. */
async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

/**
 * Drains the entrance leg's microtasks: `runTransition` always creates a
 * leading dummy animation first and only builds the sampled keyframes in its
 * `onfinish`, so the real leg is one microtask away — draining it is what
 * makes `calls.at(-1)` the entrance rather than the dummy.
 */
async function settle() {
	await act(async () => {});
	await act(async () => {});
}

/** Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses — `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before the bubble opens is what the entrance reads. */
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
 * side differs from the requested one the bubble seeds itself with.
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

describe("Tooltip", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		document.body.querySelectorAll(".ft-tooltip").forEach((el) => el.remove());
		vi.mocked(useAnchorPosition).mockClear();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("does not render the bubble until opened", () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		expect(bubble()).toBeNull();
	});

	it("opens on focus immediately, with no delay", async () => {
		render(
			<Tooltip content="Add to favorites" openDelay={500}>
				{trigger}
			</Tooltip>
		);
		await advance(0);

		fireEvent.focus(getTrigger());
		// No `advanceTimersByTime` call at all — a focus open must not need
		// the clock to move forward.
		expect(bubble()).not.toBeNull();
		expect(bubble()?.textContent).toBe("Add to favorites");
	});

	it("opens on hover only after openDelay elapses", async () => {
		render(
			<Tooltip content="Add to favorites" openDelay={500}>
				{trigger}
			</Tooltip>
		);

		fireEvent.pointerEnter(getTrigger());
		expect(bubble()).toBeNull();

		await advance(499);
		expect(bubble()).toBeNull();

		await advance(1);
		expect(bubble()).not.toBeNull();
	});

	it("closes on blur", async () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		const triggerEl = getTrigger();

		fireEvent.focus(triggerEl);
		expect(bubble()).not.toBeNull();

		fireEvent.blur(triggerEl);
		expect(bubble()).toBeNull();
	});

	it("closes on Escape without moving focus off the trigger", async () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		const triggerEl = getTrigger();

		// `fireEvent.focus` dispatches a `focus` event without moving jsdom's
		// real `document.activeElement` — calling `.focus()` directly does
		// both, which this assertion needs.
		act(() => {
			triggerEl.focus();
		});
		expect(bubble()).not.toBeNull();

		fireEvent.keyDown(triggerEl, { key: "Escape" });
		expect(bubble()).toBeNull();
		expect(document.activeElement).toBe(triggerEl);
	});

	it("participates in the shared dismissable stack — only the top-most layer reacts to Escape", async () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		const triggerEl = getTrigger();

		fireEvent.focus(triggerEl);
		expect(bubble()).not.toBeNull();

		// A second layer mounts on top, the way an overlay opened while the
		// tooltip happens to be showing would (e.g. a Popover on some other
		// control). It, not the tooltip, is top-of-stack now.
		const outer = document.createElement("div");
		document.body.appendChild(outer);
		const onOuterDismiss = vi.fn();
		const outerLayer = attachDismissable(outer, { onDismiss: onOuterDismiss });

		fireEvent.keyDown(document, { key: "Escape" });
		expect(onOuterDismiss).toHaveBeenCalledTimes(1);
		expect(bubble()).not.toBeNull(); // the tooltip did not also react

		outerLayer.destroy();
		outer.remove();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(bubble()).toBeNull(); // now top-of-stack, so this Escape is its own
	});

	it("disabled suppresses it entirely — no open on hover or focus, no aria-describedby", async () => {
		render(
			<Tooltip content="Add to favorites" disabled>
				{trigger}
			</Tooltip>
		);
		const triggerEl = getTrigger();
		await advance(0);
		expect(triggerEl.hasAttribute("aria-describedby")).toBe(false);

		fireEvent.focus(triggerEl);
		expect(bubble()).toBeNull();

		fireEvent.pointerEnter(triggerEl);
		await advance(1000);
		expect(bubble()).toBeNull();
	});

	it("toggling disabled mid-flight closes an open tooltip, and does not pop it back open on re-enable without a fresh hover", async () => {
		const { rerender } = render(
			<Tooltip content="Add to favorites" openDelay={500} disabled={false}>
				{trigger}
			</Tooltip>
		);
		const triggerEl = getTrigger();

		fireEvent.pointerEnter(triggerEl);
		await advance(500);
		expect(bubble()).not.toBeNull();

		// The pointer never leaves — only `disabled` changes.
		rerender(
			<Tooltip content="Add to favorites" openDelay={500} disabled={true}>
				{trigger}
			</Tooltip>
		);
		expect(bubble()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);

		rerender(
			<Tooltip content="Add to favorites" openDelay={500} disabled={false}>
				{trigger}
			</Tooltip>
		);
		// Must not reappear instantly — nothing re-entered, so this has to go
		// through `show()` and wait out `openDelay` again like any other open.
		expect(bubble()).toBeNull();
		await advance(499);
		expect(bubble()).toBeNull();
		await advance(1);
		expect(bubble()).not.toBeNull();
	});

	it("aria-describedby is absent while closed and points at the bubble's real id once open", async () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		const triggerEl = getTrigger();
		await advance(0);
		// Nothing in the DOM to point at yet — the bubble doesn't mount until
		// open, so the attribute itself must not be there either.
		expect(triggerEl.hasAttribute("aria-describedby")).toBe(false);

		fireEvent.focus(triggerEl);
		const describedBy = triggerEl.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		expect(bubble()?.id).toBe(describedBy);

		fireEvent.blur(triggerEl);
		expect(triggerEl.hasAttribute("aria-describedby")).toBe(false);
	});

	it("appends to a describedby the trigger already had, and gives it back untouched on close", async () => {
		// A trigger that already points at something — a hint line, a live
		// status — is the ordinary case, not an exotic one. Overwriting that
		// list for the length of a hover silences the description the consumer
		// wrote, and removing the attribute on close deletes it for good.
		render(
			<Tooltip content="Add to favorites">
				<button data-testid="trigger" aria-describedby="own-hint">
					♥
				</button>
			</Tooltip>
		);
		const triggerEl = getTrigger();
		await advance(0);
		expect(triggerEl.getAttribute("aria-describedby")).toBe("own-hint");

		fireEvent.focus(triggerEl);
		const bubbleId = bubble()?.id as string;
		expect(bubbleId).toBeTruthy();
		expect(triggerEl.getAttribute("aria-describedby")).toBe(`own-hint ${bubbleId}`);

		fireEvent.blur(triggerEl);
		expect(triggerEl.getAttribute("aria-describedby")).toBe("own-hint");

		// And again, so a second open cannot stack a duplicate id.
		fireEvent.focus(triggerEl);
		expect(triggerEl.getAttribute("aria-describedby")).toBe(`own-hint ${bubbleId}`);
	});

	it("passes side, align and offset through to the anchor-position hook", async () => {
		render(
			<Tooltip content="Add to favorites" side="right" align="start" offset={12}>
				{trigger}
			</Tooltip>
		);

		fireEvent.focus(getTrigger());

		const [, opts] = vi.mocked(useAnchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "right", align: "start", offset: 12 });
		expect((opts.anchor as () => HTMLElement | null)()).toBe(getTrigger());
	});

	it("defaults to side top, align center, offset 6", async () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);

		fireEvent.focus(getTrigger());

		const [, opts] = vi.mocked(useAnchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "top", align: "center", offset: 6 });
	});

	it("leaving before the open timer fires cancels it, instead of racing a later close timer", async () => {
		// closeDelay must be nonzero for this to mean anything: at the default
		// 0, `hide()` resolves synchronously and never schedules a second
		// timer at all, so there is nothing for the cancelled open timer to
		// race against — this exact test used to pass even with `hide()`'s
		// own `clearTimers()` call deleted, for that reason.
		render(
			<Tooltip content="Add to favorites" openDelay={500} closeDelay={100}>
				{trigger}
			</Tooltip>
		);
		const triggerEl = getTrigger();

		fireEvent.pointerEnter(triggerEl); // schedules an open timer for t=500
		await advance(200);
		fireEvent.pointerLeave(triggerEl); // must cancel it — schedules its own close timer for t=300, well clear of t=500

		// Advance past both t=300 and the open timer's original t=500 with no
		// further events. If the open timer survived the leave, it would fire
		// here and pop the bubble open with nothing hovering or focused.
		await advance(1000);
		expect(bubble()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("hovering onto the tooltip bubble itself keeps it open instead of closing it", async () => {
		render(
			<Tooltip content="Add to favorites" openDelay={0}>
				{trigger}
			</Tooltip>
		);
		const triggerEl = getTrigger();

		fireEvent.pointerEnter(triggerEl);
		expect(bubble()).not.toBeNull();

		// The pointer reaches the bubble before it leaves the trigger — both
		// report "hovered" at once, which is the case a single shared flag
		// gets wrong (see the component's comment on `contentHovered`).
		fireEvent.pointerEnter(bubble()!);
		fireEvent.pointerLeave(triggerEl);
		expect(bubble()).not.toBeNull();

		fireEvent.pointerLeave(bubble()!);
		expect(bubble()).toBeNull();
	});

	it("leaving both hover and focus closes it exactly once, even when the two race", async () => {
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		const triggerEl = getTrigger();

		fireEvent.focus(triggerEl);
		fireEvent.pointerEnter(triggerEl);
		expect(bubble()).not.toBeNull();

		// Both "leave" events fire in the same tick, racing each other.
		fireEvent.blur(triggerEl);
		fireEvent.pointerLeave(triggerEl);

		expect(bubble()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("clears its timers on unmount", async () => {
		const { unmount } = render(
			<Tooltip content="Add to favorites" openDelay={500}>
				{trigger}
			</Tooltip>
		);
		const triggerEl = getTrigger();

		fireEvent.pointerEnter(triggerEl);
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();
		expect(vi.getTimerCount()).toBe(0);

		await advance(1000);
		expect(bubble()).toBeNull();
	});

	it("warns in development when the first child is not a focusable element", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<Tooltip content="Add to favorites">{nonFocusableTrigger}</Tooltip>);
		await advance(0);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain("[Tooltip]");
		warn.mockRestore();
	});

	it("does not warn when the first child is a real focusable element", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);
		await advance(0);

		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		render(
			<Tooltip content="Add to favorites" side="right" align="start">
				{trigger}
			</Tooltip>
		);

		fireEvent.focus(getTrigger());

		// jsdom reports every rect as zeroes, so `computePosition` never
		// overflows and never flips — this pins the un-flipped path
		// deterministically. `right` + `start` puts the origin on the
		// bubble's left-top corner, the corner touching the trigger.
		const el = bubble()!;
		expect(el.getAttribute("data-side")).toBe("right");
		expect(el.getAttribute("data-align")).toBe("start");
		expect(el.style.transformOrigin).toBe("left top");
	});

	it("follows a flip: the resolved side wins over the requested one, and the origin moves with it", async () => {
		pinRectsToViewportBottom();
		render(
			<Tooltip content="Add to favorites" side="bottom">
				{trigger}
			</Tooltip>
		);

		fireEvent.focus(getTrigger());

		// The bubble seeds its placement from the REQUESTED side, so this is
		// the only assertion in the file that fails if the placement report is
		// deleted: the request was `bottom`, the bubble could not fit there,
		// and `data-side` — the hook a consumer points a caret or a custom
		// style at — must report where it actually landed. The origin is
		// still written even though `scale: false` means nothing grows from
		// it, so a consumer's own transform has the same anchor every other
		// panel exposes.
		const el = bubble()!;
		expect(el.getAttribute("data-side")).toBe("top");
		expect(el.style.transformOrigin).toBe("center bottom");
	});

	it("fades in without ever scaling — a label, not a surface", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);

		fireEvent.focus(getTrigger());
		await settle();

		// The sampler writes the transition's `css(t, u)` into WAAPI keyframes,
		// so the keyframes it hands `element.animate()` are the direct evidence
		// of what the entrance animates. Tooltip is the one panel that passes
		// `scale: false`: no `transform` key must ever appear here, or the
		// bubble has quietly acquired a compositing layer and a "grew out of
		// the trigger" gesture that a label should not have.
		expect(animateSpy).toHaveBeenCalled();
		const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
		expect(keyframes.every((frame) => !("transform" in frame))).toBe(true);
		expect(keyframes.at(0)).toMatchObject({ opacity: "0" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "1" });
	});

	it("plays no entrance at all when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(<Tooltip content="Add to favorites">{trigger}</Tooltip>);

		fireEvent.focus(getTrigger());

		// `anchored` collapses the duration to 0, and `runTransition`'s own
		// falsy-duration fast path then skips `element.animate()` entirely —
		// the bubble is simply there, in the frame it mounted.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(bubble()).not.toBeNull();
	});

	it("merges the className prop onto the trigger wrapper", () => {
		const { container } = render(
			<Tooltip content="Add to favorites" className="ml-2">
				{trigger}
			</Tooltip>
		);
		const wrapper = container.querySelector(".ft-tooltip-trigger");
		expect(wrapper?.className).toContain("ml-2");
	});

	it("binds the trigger wrapper element via ref", () => {
		const ref = createRef<HTMLSpanElement>();
		const { container } = render(
			<Tooltip content="Add to favorites" ref={ref}>
				{trigger}
			</Tooltip>
		);
		expect(ref.current).toBe(container.querySelector(".ft-tooltip-trigger"));
	});
});
