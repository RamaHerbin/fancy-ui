import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

// Spies on the real anchor-position core instead of replacing it, so
// positioning assertions check what `Popover` asked for while the core itself
// still runs for real (jsdom doesn't compute layout, but it must not throw
// either).
vi.mock("../../internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/anchor-position.js")>();
	return { ...actual, attachAnchorPosition: vi.fn(actual.attachAnchorPosition) };
});

import { attachAnchorPosition } from "../../internals/anchor-position.js";
import { __dismissableLayerCount } from "../../internals/dismissable.js";
import { Popover } from "./Popover.js";

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

const PANEL = (
	<div>
		<input data-testid="panel-input" />
		<button data-testid="panel-button">Close</button>
	</div>
);

function triggerButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-popover-trigger") as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside the render container.
	return document.querySelector(".ft-popover-content");
}

/**
 * Dispatched inside a SYNCHRONOUS `act`: the listener is a native document
 * one, so the state update it schedules has to be flushed for the next
 * assertion to see it — but a synchronous `act` does not drain microtasks,
 * which is what keeps an exit leg in flight across the assertions that need it
 * there. The exit window is 150 ms in a browser and a couple of microtasks
 * under the animation stub, so anything that awaited would drain it and every
 * assertion about what is true *during* the fade would silently test nothing.
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
 * on a MICROTASK and `runTransition` chains a dummy into the real animation,
 * so a settled leg is two turns away; an async `act` crosses a macrotask
 * boundary and flushes the React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

/** Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses — `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before the panel opens is what the entrance reads. */
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
 * side differs from the requested one the panel seeds itself with.
 *
 * The rect is internally consistent (`top = bottom - height`) because the same
 * value is read twice: once as the anchor and once as the floating element.
 * `bottom` is read from `window.innerHeight` rather than hardcoded to jsdom's
 * 768 so the overflow stays true whatever viewport the runner defaults to. The
 * opposite side deliberately still fits (`top - height - offset > 0`), so the
 * flip lands somewhere real instead of picking the lesser of two overflows. */
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

describe("Popover", () => {
	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.querySelectorAll(".ft-popover-content").forEach((el) => el.remove());
		vi.mocked(attachAnchorPosition).mockClear();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("renders closed by default, with aria-expanded false", () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		const btn = triggerButton(container);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel()).toBeNull();
	});

	it("opens on trigger click, and closes on a second click", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);
		const btn = triggerButton(container);

		fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();

		fireEvent.click(btn);
		// `aria-expanded` still flips synchronously — `open` is unchanged in
		// that respect — but the panel now outlives it by the length of the
		// fade, so its removal is the one half that has to be awaited.
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);
		const btn = triggerButton(container);
		// Nothing in the DOM to point at yet — the panel doesn't mount until
		// open, so the attribute itself must not be there either.
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	// The three ways this codebase expects an open value plus its change
	// callback to work: a controlled caller writing the value back (the React
	// spelling of the source's `bind:open`), the callback alone, and a plain
	// non-controlled value plus that same callback.
	it("round-trips through a controlled open + onOpenChange pair", async () => {
		const seen: boolean[] = [];
		function Controlled() {
			const [open, setOpen] = useState(false);
			seen.push(open);
			return (
				<Popover open={open} onOpenChange={setOpen} trigger="Options">
					{PANEL}
				</Popover>
			);
		}
		const { container } = render(<Controlled />);

		fireEvent.click(triggerButton(container));
		expect(seen.at(-1)).toBe(true);
		await settleLegs();
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(
			<Popover onOpenChange={onOpenChange} trigger="Options">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("works with a plain non-controlled open plus onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(
			<Popover open={false} onOpenChange={onOpenChange} trigger="Options">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("passes side, align and offset through to the anchor-position core", async () => {
		const { container } = render(
			<Popover trigger="Options" side="right" align="start" offset={20}>
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));

		expect(attachAnchorPosition).toHaveBeenCalled();
		const [, opts] = vi.mocked(attachAnchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "right", align: "start", offset: 20 });
		expect(opts.anchor()).toBe(triggerButton(container));
		await settleLegs();
	});

	it("defaults to side bottom, align center, offset 8", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));

		const [, opts] = vi.mocked(attachAnchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "bottom", align: "center", offset: 8 });
		await settleLegs();
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(
			<Popover onOpenChange={onOpenChange} trigger="Options">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		expect(panel()).not.toBeNull();

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("does not close on Escape or outside click when dismissible is false", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(
			<Popover dismissible={false} trigger="Options">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		expect(panel()).not.toBeNull();

		pressEscape();
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		expect(panel()).not.toBeNull();
		outside.remove();
		await settleLegs();
	});

	it("clicking the trigger again to close does not get treated as an outside click that fires twice", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(
			<Popover onOpenChange={onOpenChange} trigger="Options">
				{PANEL}
			</Popover>
		);
		const btn = triggerButton(container);

		fireEvent.click(btn);
		onOpenChange.mockClear();
		fireEvent.click(btn);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("moves focus into the panel on open, to its first focusable descendant", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});
		await settleLegs();
	});

	it("returns focus to the trigger on close", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);
		const btn = triggerButton(container);

		btn.focus();
		fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});

		fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(btn));
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		const { container } = render(
			<Popover trigger="Options" side="right" align="start">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));

		// jsdom reports every rect as zeroes, so `computePosition` never
		// overflows and never flips — this pins the un-flipped path
		// deterministically. `right` + `start` puts the origin on the panel's
		// left-top corner, the corner touching the trigger.
		const content = panel()!;
		expect(content.getAttribute("data-side")).toBe("right");
		expect(content.getAttribute("data-align")).toBe("start");
		expect(content.style.transformOrigin).toBe("left top");
		await settleLegs();
	});

	it("follows a flip: the resolved side wins over the requested one, and the origin moves with it", async () => {
		pinRectsToViewportBottom();
		const { container } = render(
			<Popover trigger="Options" side="bottom">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));

		// The panel seeds its placement from the REQUESTED side, so this is the
		// only assertion in the file that fails if the placement report is
		// dropped: the request was `bottom`, the panel could not fit there, and
		// everything the caller can see must report where it actually landed.
		// `top` grows out of the panel's own bottom edge — the edge touching
		// the trigger below it — the mirror image of the default.
		const content = panel()!;
		expect(content.getAttribute("data-side")).toBe("top");
		expect(content.style.transformOrigin).toBe("center bottom");
		await settleLegs();
	});

	it("defaults to a bottom-centre placement, growing from the panel's top edge", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));

		const content = panel()!;
		expect(content.getAttribute("data-side")).toBe("bottom");
		expect(content.style.transformOrigin).toBe("center top");
		await settleLegs();
	});

	it("rises from the shared scale floor even though the panel is a separate child component", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		// `runTransition` always creates a leading dummy animation first and
		// only builds the sampled keyframes in its `onfinish`, so the real leg
		// is one microtask away — draining it is what makes `calls.at(-1)` the
		// entrance rather than the dummy.
		await settleLegs();

		// The positive control for the reduced-motion test below, and the proof
		// of the one thing about this call site that is not obvious: the
		// transition lives on `PopoverContent`'s root element while the state
		// that mounts it lives in `Popover`, one component up. The sampler
		// writes the transition's `css(t, u)` into these keyframes, so they are
		// the direct evidence of what animates: opacity and scale, nothing else.
		expect(animateSpy).toHaveBeenCalled();
		const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
		expect(keyframes.at(0)).toMatchObject({ opacity: "0", transform: "scale(0.92)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "1", transform: "scale(1)" });
	});

	it("plays no entrance at all when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));

		// `anchored` collapses the duration to 0, and `runTransition`'s own
		// falsy-duration fast path then skips `element.animate()` entirely —
		// the panel is simply there, in the frame it mounted. Its visibility
		// never depended on the animation; the presence clock alone decides it.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The exit's own regression guards. Between the dismiss and the unmount
	// there is a window — 150 ms in a browser, a couple of microtasks under the
	// animation stub — and these pin what must be true inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();

		const closing = panel();
		expect(closing).toBeTruthy();
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// `usePresence` sets this itself on every registered node for the whole
		// exit. Asserted here so nobody drops the transition without noticing
		// that a fading panel would go clickable again on its way out.
		expect(closing!.inert).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
	});

	it("leaves on the exit rung: the departure curve, half the entrance's scale delta", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		// The entrance is drained first so the exit is a full-depth departure
		// rather than a reversal of a leg still in flight, which would sample a
		// shorter duration off the position it had reached.
		await settleLegs();
		animateSpy.mockClear();

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());

		// The sampler writes the transition's `css(t, u)` into these keyframes,
		// so they are the direct evidence of what the exit animates: from
		// resting to the `0.96` floor, which is HALF the entrance's delta off
		// `0.92` — leaving is a smaller gesture than arriving. `duration` is the
		// shared `DURATIONS.fast`, the same 150 ms the entrance takes, which is
		// the whole of this rung's timing: an anchored surface passes no timing
		// params at all.
		const call = animateSpy.mock.calls.at(-1)!;
		const keyframes = call[0] as Keyframe[];
		const options = call[1] as KeyframeAnimationOptions;
		expect(options.duration).toBe(150);
		expect(keyframes.at(0)).toMatchObject({ opacity: "1", transform: "scale(1)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "0", transform: "scale(0.96)" });
	});

	// The a11y contract, and deliberately NOT wrapped in `waitFor`: focus has
	// to be back on the trigger in the same tick as the dismiss, not when the
	// fade ends. The panel is marked `inert` the instant the exit starts, which
	// drops focus to `<body>` for that whole window unless the trap's
	// eager-return handle has already moved it.
	it("returns focus to the trigger at the dismiss instant, while the panel is still fading", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);
		const btn = triggerButton(container);

		btn.focus();
		fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});

		pressEscape();

		expect(panel()).not.toBeNull(); // still on screen, fading
		expect(document.activeElement).toBe(btn);
		await settleLegs();
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(
			<Popover onOpenChange={onOpenChange} trigger="Options">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		onOpenChange.mockClear();

		pressEscape();
		expect(panel()).not.toBeNull(); // still fading

		pressEscape();
		pressEscape();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	// A reopen inside the exit window reverses the exit instead of remounting,
	// so the focus trap is never re-created: its initial focus move does not
	// re-run and its "focus already returned" latch is still set. Left alone
	// that gives back an interactive panel with focus on the trigger BEHIND it
	// — untrapped, since the Tab handler is bound to the panel — and
	// permanently spends the eager return, so no later close of this instance
	// returns focus at all.
	it("re-arms the focus trap when the popover is reopened during its exit", async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);
		const btn = triggerButton(container);

		btn.focus();
		fireEvent.click(btn);
		expect(panel()).not.toBeNull();

		pressEscape();
		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(btn);

		// Reopened SYNCHRONOUSLY on purpose. Under the animation stub the exit
		// window is two microtasks, and any awaited helper drains them — the
		// subtree is then unmounted and re-created, which mounts a brand-new
		// focus trap and quietly tests nothing. A synchronous `act` flushes
		// React's work without touching the microtask queue, so the SAME node
		// resumes, which is the reversal this pins.
		act(() => {
			btn.click();
		});

		const reopened = panel();
		expect(reopened).toBeTruthy();
		expect(reopened!.getAttribute("data-state")).toBe("open");
		expect(reopened!.contains(document.activeElement)).toBe(true);

		// And the next genuine dismiss still returns focus, rather than
		// stranding it on a node about to be removed.
		pressEscape();
		expect(document.activeElement).toBe(btn);
		await settleLegs();
	});

	// `anchored` collapses the duration to 0, and `runTransition`'s own
	// falsy-duration fast path then calls its finish callback synchronously and
	// never touches `element.animate()` — so a visitor who asked for less
	// motion gets exactly the synchronous close this component had before the
	// exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		expect(panel()).not.toBeNull();

		pressEscape();

		expect(panel()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("merges the class prop onto the panel", async () => {
		const { container } = render(
			<Popover trigger="Options" className="w-[220px]">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		const content = panel();
		expect(content?.className).toContain("w-[220px]");
		expect(content?.className).toContain("ft-popover-content");
		await settleLegs();
	});

	it("exposes the panel element through the forwarded ref", async () => {
		const ref = { current: null as HTMLDivElement | null };
		const { container } = render(
			<Popover ref={ref} trigger="Options">
				{PANEL}
			</Popover>
		);

		fireEvent.click(triggerButton(container));
		expect(ref.current).toBe(panel());
		await settleLegs();
	});

	// ── React-layer additions (internals contract §9.4) ──────────────────

	// Convention C-5: an anchored surface renders `surfaceState`'s TWO values.
	// `presence.state` genuinely passes through "opening" on every entrance,
	// so rendering the wrong one is a live hazard rather than a hypothetical.
	it('never renders data-state="opening" on the panel', async () => {
		const { container } = render(<Popover trigger="Options">{PANEL}</Popover>);

		fireEvent.click(triggerButton(container));
		expect(panel()!.getAttribute("data-state")).toBe("open");
		await settleLegs();
	});

	// The dismiss stack's leak counter, driven through a StrictMode
	// double-invoke: push → splice → push must leave a stack of one at the
	// same depth, and the unmount must drain it.
	it("drains the dismiss stack under StrictMode", async () => {
		const { container, unmount } = render(
			<StrictMode>
				<Popover trigger="Options">{PANEL}</Popover>
			</StrictMode>
		);

		fireEvent.click(triggerButton(container));
		expect(__dismissableLayerCount()).toBe(1);

		unmount();
		expect(__dismissableLayerCount()).toBe(0);
		await settleLegs();
	});
});
