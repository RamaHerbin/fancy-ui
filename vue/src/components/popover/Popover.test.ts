import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import Popover from "./Popover.vue";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Five
 * shapes changed and nothing else did:
 *
 * - The source's `trigger`/`children` snippet props are slots here, so
 *   `createRawSnippet(...)` becomes a template string in `slots`.
 * - `tick()` becomes `nextTick()`. The source's synchronous `flushSync()` has
 *   no counterpart in this framework, so the one case that depends on it stops
 *   the transition clock instead of racing it — see `freezeRunningLegs()`.
 * - The bindable `open` is `v-model:open`, so the round-trip case passes an
 *   `onUpdate:open` listener instead of a getter/setter pair.
 * - The bindable `ref` is exposed on the instance, so that case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 * - `inert` is asserted as the ATTRIBUTE: this package's jsdom implements no
 *   `inert` IDL property, and the presence clock writes the attribute through
 *   `toggleAttribute`, so `hasAttribute` observes production behaviour
 *   directly rather than a shim's.
 *
 * The positioning spy targets the anchoring CORE rather than the source's
 * action, which is the same substitution the module itself makes: the
 * composable hands the core one options object, so what the source asserted
 * about the action's options is asserted about the core's.
 */

// Spies on the real positioning core instead of replacing it, so positioning
// assertions check what Popover asked for while the core itself still runs for
// real (jsdom doesn't compute layout, but the core must not throw either).
vi.mock("../../internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/anchor-position.js")>();
	return { ...actual, anchorPosition: vi.fn(actual.anchorPosition) };
});

import { anchorPosition } from "../../internals/anchor-position.js";

const TRIGGER_SLOT = "<span>Options</span>";
const PANEL_SLOT =
	'<div><input data-testid="panel-input" /><button data-testid="panel-button">Close</button></div>';

const SLOTS = { trigger: TRIGGER_SLOT, default: PANEL_SLOT };

function triggerButton(): HTMLButtonElement {
	return document.body.querySelector<HTMLButtonElement>(".ft-popover-trigger")!;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside the render container.
	return document.querySelector(".ft-popover-content");
}

/** Dispatched raw and NOT awaited, unlike `fireEvent.keyDown`. The exit window
 * is 150 ms in a browser and a couple of microtasks under the animation stub, so
 * a helper that awaited a tick of its own would drain it and every assertion
 * about what is true *during* the fade would silently test nothing. */
function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function pointerDownOn(target: HTMLElement) {
	// This package's jsdom version does not implement PointerEvent (the source
	// suite's jsdom does); the dismiss layer only reads `event.target`, so a
	// same-typed MouseEvent is an equivalent stand-in — the same substitution
	// the internals suite makes.
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

/** Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses — the transition resolves it fresh on every call, so an override
 * installed before the panel opens is what the entrance reads. */
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

/**
 * Holds every RUNNING transition leg open for as long as the test wants, which
 * is what replaces the source suite's synchronous `flushSync()`.
 *
 * Under the shared animation stub a leg finishes on a microtask, so the whole
 * exit window is one microtask wide and NO awaited helper lands inside it: the
 * subtree settles, unmounts and re-creates, and a case that means to pin a
 * reversal silently pins a fresh mount instead — the exact failure the source
 * comment warns about. So the clock is stopped rather than raced: the sampler
 * always creates a leading dummy at `duration: 0` and only then, from its
 * `onfinish`, the real leg at `duration > 0`, so forwarding the zero-duration
 * call and answering the other with an animation that never finishes leaves the
 * leg genuinely in flight across any number of awaits.
 */
function freezeRunningLegs() {
	const stub = Element.prototype.animate;
	vi.spyOn(Element.prototype, "animate").mockImplementation(function (
		this: Element,
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		options?: number | KeyframeAnimationOptions
	) {
		const duration = typeof options === "number" ? options : (options?.duration ?? 0);
		if (duration === 0) return stub.call(this, keyframes, options);
		return {
			playState: "running",
			currentTime: 0,
			startTime: 0,
			effect: null,
			onfinish: null,
			oncancel: null,
			cancel() {},
			finish() {},
			play() {},
			pause() {},
			reverse() {},
			updatePlaybackRate() {},
			commitStyles() {},
			persist() {},
			addEventListener() {},
			removeEventListener() {},
		} as unknown as Animation;
	});
}

/**
 * Drains a leg to completion. The animation stub finishes each animation on a
 * microtask and the sampler chains a leading dummy into the real animation, so
 * a settled leg is two turns away; crossing a macrotask boundary drains the
 * whole chain, and the trailing `nextTick()` flushes the render the finish
 * scheduled.
 */
const settleLegs = async () => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

/** Pins every element's rect flush against the bottom edge of the viewport,
 * which is the one condition the positioning core needs to flip a
 * `side: "bottom"` request to `"top"`. jsdom reports all-zero rects otherwise,
 * so without this stub nothing in the suite ever exercises a flip — and a flip
 * is the only case where the resolved side differs from the requested one the
 * panel seeds itself with.
 *
 * The rect is internally consistent (`top = bottom - height`) because the same
 * value is read twice: once as the anchor and once as the floating element.
 * `bottom` is read from `window.innerHeight` rather than hardcoded so the
 * overflow stays true whatever viewport the runner defaults to. The opposite
 * side deliberately still fits, so the flip lands somewhere real instead of
 * picking the lesser of two overflows. `vi.restoreAllMocks()` removes it. */
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
		document.body.querySelectorAll(".ft-popover-content").forEach((el) => el.remove());
		vi.mocked(anchorPosition).mockClear();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("renders closed by default, with aria-expanded false", () => {
		render(Popover, { slots: SLOTS });

		const btn = triggerButton();
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel()).toBeNull();
	});

	it("opens on trigger click, and closes on a second click", async () => {
		render(Popover, { slots: SLOTS });
		const btn = triggerButton();

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();

		await fireEvent.click(btn);
		// `aria-expanded` still flips synchronously — `open` is unchanged in
		// that respect — but the panel now outlives it by the length of the
		// fade, so its removal is the one half that has to be awaited.
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		render(Popover, { slots: SLOTS });
		const btn = triggerButton();
		// Nothing in the DOM to point at yet — the panel doesn't mount until
		// open, so the attribute itself must not be there either.
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		await fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: the two-way binding, the callback alone, and a plain
	// non-bound value plus that same callback.
	it("round-trips through v-model:open", async () => {
		let open = false;
		render(Popover, {
			props: { open, "onUpdate:open": (value: boolean) => (open = value) },
			slots: SLOTS,
		});

		await fireEvent.click(triggerButton());
		expect(open).toBe(true);
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		render(Popover, { props: { onOpenChange }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).not.toBeNull();
	});

	it("works with a plain non-bound open plus onOpenChange", async () => {
		const onOpenChange = vi.fn();
		render(Popover, { props: { open: false, onOpenChange }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).not.toBeNull();
	});

	it("passes side, align and offset through to the positioning core", async () => {
		render(Popover, {
			props: { side: "right", align: "start", offset: 20 },
			slots: SLOTS,
		});

		await fireEvent.click(triggerButton());
		await nextTick();

		expect(anchorPosition).toHaveBeenCalled();
		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "right", align: "start", offset: 20 });
		expect(opts.anchor()).toBe(triggerButton());
	});

	it("defaults to side bottom, align center, offset 8", async () => {
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();

		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "bottom", align: "center", offset: 8 });
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		render(Popover, { props: { onOpenChange }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		expect(panel()).not.toBeNull();

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("does not close on Escape or outside click when dismissible is false", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		render(Popover, { props: { dismissible: false }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		expect(panel()).not.toBeNull();

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await nextTick();
		expect(panel()).not.toBeNull();
		outside.remove();
	});

	it("clicking the trigger again to close does not get treated as an outside click that fires twice", async () => {
		const onOpenChange = vi.fn();
		render(Popover, { props: { onOpenChange }, slots: SLOTS });
		const btn = triggerButton();

		await fireEvent.click(btn);
		onOpenChange.mockClear();
		await fireEvent.click(btn);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("moves focus into the panel on open, to its first focusable descendant", async () => {
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});
	});

	it("returns focus to the trigger on close", async () => {
		render(Popover, { slots: SLOTS });
		const btn = triggerButton();

		btn.focus();
		await fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});

		await fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		render(Popover, { props: { side: "right", align: "start" }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();

		// jsdom reports every rect as zeroes, so the core never overflows and
		// never flips — this pins the un-flipped path deterministically.
		// `right` + `start` puts the origin on the panel's left-top corner, the
		// corner touching the trigger.
		const content = panel()!;
		expect(content.getAttribute("data-side")).toBe("right");
		expect(content.getAttribute("data-align")).toBe("start");
		expect(content.style.transformOrigin).toBe("left top");
	});

	it("follows a flip: the resolved side wins over the requested one, and the origin moves with it", async () => {
		pinRectsToViewportBottom();
		render(Popover, { props: { side: "bottom" }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();

		// The panel seeds its placement from the REQUESTED side, so this is the
		// only assertion in the file that fails if the placement report is
		// dropped: the request was `bottom`, the panel could not fit there, and
		// everything the caller can see must report where it actually landed.
		// `top` grows out of the panel's own bottom edge — the edge touching the
		// trigger below it — the mirror image of the default.
		const content = panel()!;
		expect(content.getAttribute("data-side")).toBe("top");
		expect(content.style.transformOrigin).toBe("center bottom");
	});

	it("defaults to a bottom-centre placement, growing from the panel's top edge", async () => {
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();

		const content = panel()!;
		expect(content.getAttribute("data-side")).toBe("bottom");
		expect(content.style.transformOrigin).toBe("center top");
	});

	it("rises from the shared scale floor even though the panel is a separate child component", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await settleLegs();

		// The sampler samples the transition's `css(t, u)` into these keyframes,
		// so they are the direct evidence of what animates: opacity and scale,
		// nothing else.
		expect(animateSpy).toHaveBeenCalled();
		const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
		expect(keyframes.at(0)).toMatchObject({ opacity: "0", transform: "scale(0.92)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "1", transform: "scale(1)" });
	});

	it("plays no entrance at all when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();

		// The transition collapses the duration to 0, and the sampler's own
		// falsy-duration fast path then skips `element.animate()` entirely — the
		// panel is simply there, in the frame it mounted. Its visibility never
		// depended on the animation; the mount gate alone decides that.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The exit's own regression guards. Between the dismiss and the unmount
	// there is now a window — 150 ms in a browser, a couple of microtasks under
	// the animation stub — and these pin what must be true inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await nextTick();

		const closing = panel();
		expect(closing).toBeTruthy();
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Written by the presence clock, as an attribute, for the whole exit.
		// Asserted here so nobody drops the transition without noticing that a
		// fading panel would go clickable again on its way out.
		expect(closing!.hasAttribute("inert")).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
	});

	it("leaves on the exit rung: the departure curve, half the entrance's scale delta", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await settleLegs();
		animateSpy.mockClear();

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());

		// The sampler samples the transition's `css(t, u)` into these keyframes,
		// so they are the direct evidence of what the exit animates: from
		// resting to the `0.96` floor, which is HALF the entrance's delta off
		// `0.92` — leaving is a smaller gesture than arriving. `duration` is the
		// shared fast token, the same 150 ms the entrance takes, which is the
		// whole of this rung's timing: an anchored surface passes no timing
		// params at all.
		const call = animateSpy.mock.calls.at(-1)!;
		const keyframes = call[0] as Keyframe[];
		const options = call[1] as KeyframeAnimationOptions;
		expect(options.duration).toBe(150);
		expect(keyframes.at(0)).toMatchObject({ opacity: "1", transform: "scale(1)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "0", transform: "scale(0.96)" });
	});

	// The a11y contract, and deliberately NOT wrapped in `waitFor`: focus has to
	// be back on the trigger in the same tick as the dismiss, not when the fade
	// ends. The panel is marked `inert` the instant the exit starts, which drops
	// focus to `<body>` for that whole window unless the trap's eager-return
	// handle has already moved it.
	it("returns focus to the trigger at the dismiss instant, while the panel is still fading", async () => {
		render(Popover, { slots: SLOTS });
		const btn = triggerButton();

		btn.focus();
		await fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});
		freezeRunningLegs();

		pressEscape();
		await nextTick();

		expect(panel()).not.toBeNull(); // still on screen, fading
		expect(document.activeElement).toBe(btn);
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Popover, { props: { onOpenChange }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		await settleLegs();
		onOpenChange.mockClear();
		freezeRunningLegs();

		pressEscape();
		await nextTick();
		expect(panel()).not.toBeNull(); // still fading

		pressEscape();
		pressEscape();
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// A reopen inside the exit window reverses the exit instead of remounting,
	// so the focus trap is never re-created: its initial focus move does not
	// re-run and its "focus already returned" latch is still set. Left alone
	// that gives back an interactive panel with focus on the trigger BEHIND it
	// — untrapped, since the Tab handler is bound to the panel — and
	// permanently spends the eager return, so no later close of this instance
	// returns focus at all.
	it("re-arms the focus trap when the popover is reopened during its exit", async () => {
		render(Popover, { slots: SLOTS });
		const btn = triggerButton();

		btn.focus();
		await fireEvent.click(btn);
		await settleLegs();
		const first = panel();
		expect(first).toBeTruthy();

		// From here the exit is held open for the rest of the case. Without
		// this the window is one microtask wide, every await steps over it, and
		// the reopen below would mount a BRAND-NEW panel carrying a brand-new
		// focus trap that arms itself — the shape of a case that passes while
		// pinning nothing at all. This is what replaces the source's
		// `flushSync()`.
		freezeRunningLegs();

		pressEscape();
		await nextTick();
		expect(panel()).toBe(first);
		expect(first!.getAttribute("data-state")).toBe("closing");
		expect(document.activeElement).toBe(btn);

		btn.click();
		await nextTick();

		// The SAME node resumes. That identity assertion is the whole case: it
		// is what says the trap survived rather than being replaced, so the
		// focus assertion below is about the re-arm and not about a fresh
		// trap's own initial focus move.
		const reopened = panel();
		expect(reopened).toBe(first);
		expect(reopened!.getAttribute("data-state")).toBe("open");
		expect(reopened!.hasAttribute("inert")).toBe(false);
		expect(reopened!.contains(document.activeElement)).toBe(true);

		// And the next genuine dismiss still returns focus, rather than
		// stranding it on a node about to be removed.
		pressEscape();
		await nextTick();
		expect(document.activeElement).toBe(btn);
	});

	// The transition collapses the duration to 0 under reduced motion, and the
	// sampler's own falsy-duration fast path then calls the finish callback
	// synchronously and never touches `element.animate()` — so a visitor who
	// asked for less motion gets exactly the synchronous close this component
	// had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Popover, { slots: SLOTS });

		await fireEvent.click(triggerButton());
		await nextTick();
		expect(panel()).not.toBeNull();

		pressEscape();
		await nextTick();

		expect(panel()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("merges the class prop onto the panel", async () => {
		render(Popover, { props: { class: "w-[220px]" }, slots: SLOTS });

		await fireEvent.click(triggerButton());
		const content = panel();
		expect(content?.className).toContain("w-[220px]");
		expect(content?.className).toContain("ft-popover-content");
	});

	it("exposes the panel element as ref", async () => {
		const wrapper = mount(Popover, { slots: SLOTS, attachTo: document.body });

		await fireEvent.click(triggerButton());
		await nextTick();

		expect(wrapper.vm.ref).toBe(panel());

		// `cleanup()` only unmounts what `render` created, and this wrapper is
		// attached to `document.body`: left mounted it would leave a second,
		// sound-less trigger in the document for every later case to find first.
		wrapper.unmount();
	});

	// The source suite's `describe("sound")` cases, transposed one for one. The
	// spy sits on the CONTROLLER, not on the composable, so what is asserted is
	// the cue that actually reached the singleton; the second argument is the
	// options object the cue player forwards, which is `undefined` here.
	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when the trigger opens the panel", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Popover, { props: { sound: true }, slots: SLOTS });

			await fireEvent.click(triggerButton());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays close exactly once when a second trigger click dismisses", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Popover, { props: { sound: true }, slots: SLOTS });
			const btn = triggerButton();
			await fireEvent.click(btn);
			play.mockClear();

			await fireEvent.click(btn);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on Escape, and close exactly once on an outside click", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			render(Popover, { props: { sound: true }, slots: SLOTS });

			await fireEvent.click(triggerButton());
			play.mockClear();
			await fireEvent.keyDown(document, { key: "Escape" });
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);

			await settleLegs();
			play.mockClear();
			await fireEvent.click(triggerButton());
			play.mockClear();
			pointerDownOn(outside);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			outside.remove();
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Popover, { slots: SLOTS });
			const btn = triggerButton();

			await fireEvent.click(btn);
			await fireEvent.click(btn);

			expect(play).not.toHaveBeenCalled();
		});

		// The `if (open.value === next) return` guard inside setOpen — a second
		// Escape landing during the exit must not double the close cue.
		it("swallows a second Escape during the exit — close plays exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Popover, { props: { sound: true }, slots: SLOTS });

			await fireEvent.click(triggerButton());
			await settleLegs();
			play.mockClear();
			freezeRunningLegs();

			pressEscape();
			await nextTick();
			expect(panel()).not.toBeNull(); // still fading

			pressEscape();
			pressEscape();
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});
	});
});
