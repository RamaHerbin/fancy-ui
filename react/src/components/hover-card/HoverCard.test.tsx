import { useState } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { __dismissableLayerCount } from "../../internals/dismissable.js";
import { HoverCard } from "./HoverCard.js";

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

/**
 * `pointerenter` / `pointerleave` are DERIVED events in React: the enter/leave
 * plugin synthesises them from `pointerover` / `pointerout`, so dispatching a
 * raw `pointerenter` — which is what the source suite does — would reach no
 * handler at all. The pair below is the same user gesture expressed in the
 * events React actually listens for.
 */
function pointerEnter(el: Element) {
	fireEvent.pointerOver(el);
}

function pointerLeave(el: Element) {
	fireEvent.pointerOut(el);
}

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there. The
 * exit window is 150 ms in a browser and a couple of microtasks under the
 * animation stub, so anything that awaited would drain it and every assertion
 * about what is true *during* the fade would silently test nothing. This is
 * the React stand-in for the source's `flushSync()`.
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

function triggerWrapper(): HTMLElement {
	return document.querySelector(".ft-hover-card-trigger") as HTMLElement;
}

function panel(): HTMLElement | null {
	return document.body.querySelector(".ft-hover-card-panel");
}

/**
 * Drains an entrance or exit leg to completion WITHOUT advancing a single
 * millisecond of timer time — the stand-in for the source's
 * `waitFor(() => expect(panel()).toBeNull())` in tests whose whole point is
 * that no delay elapsed. The animation stub finishes on a MICROTASK and
 * `runTransition` chains a dummy into the real animation, so a settled leg is
 * two turns away.
 *
 * Every test that would otherwise leave a leg in flight ends with this, and
 * not merely for tidiness: a leg that settles after the test body has
 * returned updates React state outside `act`, which prints a warning per
 * panel.
 */
async function settle() {
	await act(async () => {});
	await act(async () => {});
}

/** Advances fake timers inside `act`, so the state updates their callbacks
 *  schedule are flushed before the next assertion. */
async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

/** Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses — `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before the card opens is what the entrance reads. */
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

const trigger = () => (
	<button type="button">@handle</button>
);
const content = <p>Rama Herbin — 1.2k followers</p>;

/**
 * The source's `HoverCardHarness.test.svelte`, collapsed into a component
 * declared here — a `.test.svelte` file exists only because Svelte components
 * need their own file. Binding the value and echoing it into the DOM is the
 * only way to prove `open` travels back out to the consumer rather than
 * merely changing what HoverCard draws.
 */
function Harness() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<HoverCard open={open} onOpenChange={setOpen} trigger={trigger} openDelay={300} closeDelay={150}>
				<p>Card content</p>
			</HoverCard>
			<span data-testid="bound-open">{String(open)}</span>
		</>
	);
}

/**
 * The source's `HoverCardAriaHarness.test.svelte`. The point being proven is
 * that the id HoverCard hands the render prop reaches a DOM attribute on the
 * caller's own element, through real parameter passing that re-runs when
 * `open` flips.
 */
function AriaHarness() {
	return (
		<HoverCard
			openDelay={300}
			closeDelay={150}
			trigger={(describedBy) => (
				<button type="button" data-testid="trigger-button" aria-describedby={describedBy}>
					@handle
				</button>
			)}
		>
			<p>Card content</p>
		</HoverCard>
	);
}

describe("HoverCard", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
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
		render(<HoverCard trigger={trigger}>{content}</HoverCard>);
		expect(document.querySelector("button")?.textContent).toBe("@handle");
		expect(panel()).toBeNull();
	});

	it("opens after openDelay on pointerenter, not a moment before", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard onOpenChange={onOpenChange} openDelay={300} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerEnter(triggerWrapper());
		await advance(299);
		expect(panel()).toBeNull();

		await advance(1);
		expect(panel()).not.toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(true);
		await settle();
	});

	it("cancels the open if the pointer leaves the trigger before openDelay elapses", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard onOpenChange={onOpenChange} openDelay={300} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerEnter(triggerWrapper());
		await advance(150);
		pointerLeave(triggerWrapper());
		await advance(1000);

		expect(panel()).toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes after closeDelay once the pointer leaves the trigger", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} closeDelay={150} trigger={trigger}>
				{content}
			</HoverCard>
		);
		expect(panel()).not.toBeNull();

		pointerLeave(triggerWrapper());
		await advance(149);
		expect(panel()).not.toBeNull();

		await advance(1);
		// `onOpenChange` still fires the moment the delay is up — `open` flips
		// synchronously. The removal is the half that now trails it by the
		// length of the exit.
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settle();
		expect(panel()).toBeNull();
	});

	it("stays open when the pointer travels from the trigger to the card before closeDelay elapses", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} closeDelay={150} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerLeave(triggerWrapper());
		await advance(100);
		// The pointer lands on the card before the pending close fires.
		pointerEnter(panel()!);
		await advance(1000);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes after closeDelay once the pointer leaves the card behind it", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} closeDelay={150} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerLeave(triggerWrapper());
		await advance(100);
		pointerEnter(panel()!);
		pointerLeave(panel()!);
		await advance(149);
		expect(panel()).not.toBeNull();

		await advance(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settle();
		expect(panel()).toBeNull();
	});

	it("opens immediately on focus, without waiting for openDelay", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard onOpenChange={onOpenChange} openDelay={300} trigger={trigger}>
				{content}
			</HoverCard>
		);
		const button = document.querySelector("button") as HTMLButtonElement;

		act(() => {
			button.focus();
		});
		await advance(0);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(true);
		await settle();
	});

	it("closes immediately on blur, without waiting for closeDelay", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} closeDelay={150} trigger={trigger}>
				{content}
			</HoverCard>
		);
		const button = document.querySelector("button") as HTMLButtonElement;
		act(() => {
			button.focus();
		});
		await advance(0);
		onOpenChange.mockClear();

		act(() => {
			button.blur();
		});
		await advance(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settle();
		expect(panel()).toBeNull();
	});

	// The README says nothing inside the card should be interactive, but this
	// is the safety net for a caller who does it anyway: focus leaving the
	// trigger for something genuinely inside the card must not unmount the
	// card out from under that focus move — only a mouse click on the same
	// element would otherwise "work", which is exactly the asymmetry this
	// guards against.
	it("does not close when focus moves from the trigger into the panel", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} trigger={trigger}>
				<a href="#" data-testid="card-link">
					Link
				</a>
			</HoverCard>
		);
		const wrapper = triggerWrapper();
		const link = document.body.querySelector('[data-testid="card-link"]') as HTMLElement;
		expect(link).not.toBeNull();

		act(() => {
			wrapper.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: link }));
		});
		await advance(0);

		expect(panel()).not.toBeNull();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("still closes when focus moves somewhere outside the panel", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} trigger={trigger}>
				{content}
			</HoverCard>
		);
		const wrapper = triggerWrapper();
		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);

		act(() => {
			wrapper.dispatchEvent(
				new FocusEvent("focusout", { bubbles: true, relatedTarget: elsewhere })
			);
		});
		await advance(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settle();
		expect(panel()).toBeNull();
		elsewhere.remove();
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pressEscape();
		await advance(0);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settle();
		expect(panel()).toBeNull();
	});

	it("hands the trigger render prop the panel's id, undefined while closed", async () => {
		render(<AriaHarness />);
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;
		expect(button.getAttribute("aria-describedby")).toBeNull();

		pointerEnter(triggerWrapper());
		await advance(300);

		const describedBy = button.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		expect(panel()!.id).toBe(describedBy);
		await settle();
	});

	it("clears the trigger render prop's descriptionId back to undefined once closed", async () => {
		render(<AriaHarness />);
		const button = document.querySelector('[data-testid="trigger-button"]') as HTMLButtonElement;

		pointerEnter(triggerWrapper());
		await advance(300);
		expect(button.getAttribute("aria-describedby")).toBeTruthy();

		pointerLeave(triggerWrapper());
		await advance(150);
		expect(button.getAttribute("aria-describedby")).toBeNull();
		await settle();
	});

	it("works uncontrolled, with neither open nor onOpenChange passed in", async () => {
		render(<HoverCard trigger={trigger}>{content}</HoverCard>);

		pointerEnter(triggerWrapper());
		await advance(300);

		expect(panel()).not.toBeNull();
		await settle();
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		render(
			<HoverCard open side="right" align="start" trigger={trigger}>
				{content}
			</HoverCard>
		);
		await advance(0);

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
		render(
			<HoverCard openDelay={300} side="bottom" trigger={trigger}>
				{content}
			</HoverCard>
		);

		// Opened through the real pointer path rather than `open: true`, so the
		// card mounts into an already-running tree: the anchor-position layout
		// effect reports the flip, and the render behind `data-side` /
		// `transform-origin` has to correct the seeded value before anything
		// is painted. That ordering is the only reason the seed is safe.
		pointerEnter(triggerWrapper());
		await advance(300);

		// The card seeds its placement from the REQUESTED side, so this is the
		// only assertion in the file that fails if the placement report is
		// dropped: the request was `bottom`, the card could not fit there, and
		// it now grows out of its own bottom edge — the edge touching the
		// trigger below it — instead of the top edge the request implied.
		const el = panel()!;
		expect(el.getAttribute("data-side")).toBe("top");
		expect(el.style.transformOrigin).toBe("center bottom");
		await settle();
	});

	it("rises from the shared scale floor, with no travel of its own", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(
			<HoverCard openDelay={300} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerEnter(triggerWrapper());
		await advance(300);
		// `runTransition` always creates a leading dummy animation first and
		// only builds the sampled keyframes in its `onfinish`, so the real leg
		// is one microtask away — draining it is what makes `calls.at(-1)` the
		// entrance rather than the dummy.
		await settle();

		// The sampler writes the transition's `css(t, u)` into WAAPI keyframes,
		// so these are the direct evidence of what the entrance animates. The
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
		render(
			<HoverCard openDelay={300} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerEnter(triggerWrapper());
		await advance(300);

		// `anchored` collapses the duration to 0, and `runTransition`'s own
		// falsy-duration fast path then skips `element.animate()` entirely —
		// the card is simply there, in the frame it mounted. Its visibility
		// never depended on the animation; the presence clock alone decides it.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The exit's own regression guards. Between the dismiss and the unmount
	// there is now a window — 150 ms in a browser, a couple of microtasks
	// under the animation stub — and these pin what must be true inside it.
	//
	// A synchronous `act` rather than an awaited helper throughout: every
	// `await` crosses a microtask boundary, which under the animation stub is
	// enough for the whole exit to finish. Flushing synchronously is the only
	// way to land inside the window at all.
	it("keeps the card mounted, inert and marked closing for the length of the exit", async () => {
		render(
			<HoverCard open trigger={trigger}>
				{content}
			</HoverCard>
		);
		await advance(0);
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();

		const closing = panel();
		expect(closing).toBeTruthy();
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// `usePresence` sets this itself on the registered node for the whole
		// exit — which is what stops the pointer interacting with a card it
		// has already left.
		expect(closing!.inert).toBe(true);

		await settle();
		expect(panel()).toBeNull();
	});

	it("leaves on the exit rung: the departure curve, half the entrance's scale delta", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(
			<HoverCard openDelay={300} trigger={trigger}>
				{content}
			</HoverCard>
		);

		pointerEnter(triggerWrapper());
		await advance(300);
		// The entrance is drained first so the exit is a full-depth departure
		// rather than a reversal of a leg still in flight, which would sample
		// a shorter duration off the position it had reached.
		await settle();
		animateSpy.mockClear();

		pressEscape();
		await settle();
		expect(panel()).toBeNull();

		// The sampler writes the transition's `css(t, u)` into these keyframes,
		// so they are the direct evidence of what the exit animates: from
		// resting to the `0.96` floor, which is HALF the entrance's delta off
		// `0.92`. `duration` is the shared `DURATIONS.fast`, the same 150 ms
		// the entrance takes — an anchored surface passes no timing params at
		// all.
		const call = animateSpy.mock.calls.at(-1)!;
		const keyframes = call[0] as Keyframe[];
		const options = call[1] as KeyframeAnimationOptions;
		expect(options.duration).toBe(150);
		expect(keyframes.at(0)).toMatchObject({ opacity: "1", transform: "scale(1)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "0", transform: "scale(0.96)" });
	});

	// The race a hover surface creates that a click surface does not: pointers
	// change their mind. One bidirectional transition reverses the outro on
	// the SAME node rather than mounting a second card behind the first,
	// which is the failure a split in/out pair would produce here.
	it("reverses a card the pointer comes back to mid-exit, rather than mounting a second one", async () => {
		render(
			<HoverCard open openDelay={0} closeDelay={0} trigger={trigger}>
				{content}
			</HoverCard>
		);
		await advance(0);
		const first = panel();
		expect(first).toBeTruthy();

		pressEscape();
		expect(panel()!.getAttribute("data-state")).toBe("closing");

		// Back on the trigger before the fade is over. `advanceTimersByTime`
		// is the SYNCHRONOUS form on purpose — its async sibling awaits
		// between timers, and that await would end the exit window before the
		// reopen ever lands.
		pointerEnter(triggerWrapper());
		act(() => {
			vi.advanceTimersByTime(0);
		});

		expect(document.body.querySelectorAll(".ft-hover-card-panel")).toHaveLength(1);
		expect(panel()).toBe(first);
		expect(panel()!.getAttribute("data-state")).toBe("open");
		await settle();
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(
			<HoverCard open onOpenChange={onOpenChange} trigger={trigger}>
				{content}
			</HoverCard>
		);
		await advance(0);

		pressEscape();
		expect(panel()).not.toBeNull(); // still fading

		pressEscape();
		pressEscape();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settle();
	});

	// `anchored` collapses the duration to 0 under reduced motion, and
	// `runTransition`'s own falsy-duration fast path then settles the leg
	// synchronously and never touches `element.animate()` — so a visitor who
	// asked for less motion gets exactly the synchronous close this component
	// had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(
			<HoverCard open trigger={trigger}>
				{content}
			</HoverCard>
		);
		await advance(0);
		expect(panel()).not.toBeNull();

		pressEscape();

		expect(panel()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips open through a controlled open + onOpenChange pair", async () => {
		const { getByTestId } = render(<Harness />);
		expect(getByTestId("bound-open").textContent).toBe("false");

		pointerEnter(triggerWrapper());
		await advance(300);

		expect(getByTestId("bound-open").textContent).toBe("true");
		await settle();
	});
});
