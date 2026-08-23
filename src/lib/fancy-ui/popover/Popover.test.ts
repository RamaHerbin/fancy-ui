import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, flushSync, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Popover from "./Popover.svelte";

// Spies on the real `anchorPosition` action instead of replacing it, so
// positioning assertions check what Popover asked for while the action
// itself still runs for real (jsdom doesn't compute layout, but the action
// must not throw either).
vi.mock("../_internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/anchor-position.js")>();
	return { ...actual, anchorPosition: vi.fn(actual.anchorPosition) };
});

import { anchorPosition } from "../_internals/anchor-position.js";

function textSnippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
}

function panelSnippet() {
	return createRawSnippet(() => ({
		render: () =>
			`<div><input data-testid="panel-input" /><button data-testid="panel-button">Close</button></div>`,
	}));
}

function triggerButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-popover-trigger") as HTMLButtonElement;
}

function panel(container: HTMLElement): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-popover-content");
}

/** Dispatched raw and NOT awaited, unlike `fireEvent.keyDown`. The exit window
 * is 150 ms in a browser and a couple of microtasks under the WAAPI stub, so a
 * helper that awaits a tick of its own would drain it and every assertion about
 * what is true *during* the fade would silently test nothing. */
function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

/** Replaces `window.matchMedia` wholesale, the pattern `media-query.svelte.ts`
 * documents and `_internals/motion/anchored.test.ts` already uses — the
 * transition resolves it fresh on every call, so an override installed before
 * the panel opens is what the entrance reads. */
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
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		const btn = triggerButton(container);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel(container)).toBeNull();
	});

	it("opens on trigger click, and closes on a second click", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel(container)).not.toBeNull();

		await fireEvent.click(btn);
		// `aria-expanded` still flips synchronously — `open` is unchanged in
		// that respect — but the panel now outlives it by the length of the
		// fade, so its removal is the one half that has to be awaited.
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel(container)).toBeNull());
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);
		// Nothing in the DOM to point at yet — the panel doesn't mount until
		// open, so the attribute itself must not be there either.
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		const content = panel(container);
		expect(content?.id).toBe(controls);

		await fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: bind:, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through bind:open", async () => {
		let open = false;
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				get open() {
					return open;
				},
				set open(v: boolean) {
					open = v;
				},
			},
		});

		await fireEvent.click(triggerButton(container));
		expect(open).toBe(true);
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});

		await fireEvent.click(triggerButton(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel(container)).not.toBeNull();
	});

	it("works with a plain non-bound open plus onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				open: false,
				onOpenChange,
			},
		});

		await fireEvent.click(triggerButton(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel(container)).not.toBeNull();
	});

	it("passes side, align and offset through to the anchorPosition action", async () => {
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				side: "right",
				align: "start",
				offset: 20,
			},
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		expect(anchorPosition).toHaveBeenCalled();
		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "right", align: "start", offset: 20 });
		expect(opts.anchor()).toBe(triggerButton(container));
	});

	it("defaults to side bottom, align center, offset 8", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "bottom", align: "center", offset: 8 });
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});

		await fireEvent.click(triggerButton(container));
		expect(panel(container)).not.toBeNull();

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel(container)).toBeNull());
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		expect(panel(container)).not.toBeNull();

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel(container)).toBeNull());
		outside.remove();
	});

	it("does not close on Escape or outside click when dismissible is false", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				dismissible: false,
			},
		});

		await fireEvent.click(triggerButton(container));
		expect(panel(container)).not.toBeNull();

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(panel(container)).not.toBeNull();

		await fireEvent.pointerDown(outside);
		expect(panel(container)).not.toBeNull();
		outside.remove();
	});

	it("clicking the trigger again to close does not get treated as an outside click that fires twice", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});
		const btn = triggerButton(container);

		await fireEvent.click(btn);
		onOpenChange.mockClear();
		await fireEvent.click(btn);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("moves focus into the panel on open, to its first focusable descendant", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});
	});

	it("returns focus to the trigger on close", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);

		btn.focus();
		await fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});

		await fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("publishes the resolved placement as data-side/data-align, with the matching growth origin", async () => {
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				side: "right",
				align: "start",
			},
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		// jsdom reports every rect as zeroes, so `computePosition` never
		// overflows and never flips — this pins the un-flipped path
		// deterministically. `right` + `start` puts the origin on the panel's
		// left-top corner, the corner touching the trigger.
		const content = panel(container)!;
		expect(content.getAttribute("data-side")).toBe("right");
		expect(content.getAttribute("data-align")).toBe("start");
		expect(content.style.transformOrigin).toBe("left top");
	});

	it("follows a flip: the resolved side wins over the requested one, and the origin moves with it", async () => {
		pinRectsToViewportBottom();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), side: "bottom" },
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		// The panel seeds `resolvedSide` from the REQUESTED side, so this is
		// the only assertion in the file that fails if `onPlacement` is
		// deleted: the request was `bottom`, the panel could not fit there,
		// and everything the caller can see must report where it actually
		// landed. `top` grows out of the panel's own bottom edge — the edge
		// touching the trigger below it — the mirror image of the default.
		const content = panel(container)!;
		expect(content.getAttribute("data-side")).toBe("top");
		expect(content.style.transformOrigin).toBe("center bottom");
	});

	it("defaults to a bottom-centre placement, growing from the panel's top edge", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		const content = panel(container)!;
		expect(content.getAttribute("data-side")).toBe("bottom");
		expect(content.style.transformOrigin).toBe("center top");
	});

	it("rises from the shared scale floor even though the panel is a separate child component", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		// The positive control for the reduced-motion test below, and the
		// proof of the one thing about this call site that is not obvious: the
		// `in:` lives on `PopoverContent`'s root element, but the `{#if open}`
		// that mounts it lives in `Popover`. A statically-known child compiles
		// to a plain call inside its parent's branch, so the intro is a real
		// (non-first-mount) one and does play. Svelte samples the transition's
		// `css(t, u)` into these keyframes, so they are the direct evidence of
		// what animates: opacity and scale, nothing else.
		expect(animateSpy).toHaveBeenCalled();
		const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
		expect(keyframes.at(0)).toMatchObject({ opacity: "0", transform: "scale(0.92)" });
		expect(keyframes.at(-1)).toMatchObject({ opacity: "1", transform: "scale(1)" });
	});

	it("plays no entrance at all when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		// `anchored` collapses the duration to 0, and Svelte's own
		// falsy-duration fast path then skips `element.animate()` entirely —
		// the panel is simply there, in the frame it mounted. Its visibility
		// never depended on the animation; `{#if open}` alone decides that.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel(container)).not.toBeNull();
	});

	// The exit's own regression guards. Between the dismiss and the unmount
	// there is now a window — 150 ms in a browser, a couple of microtasks
	// under the WAAPI stub — and these pin what must be true inside it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();
		expect(panel(container)!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await tick();

		const closing = panel(container);
		expect(closing).toBeTruthy();
		// Written imperatively from `onoutrostart`. A reactive `data-state`
		// would never reach the DOM: Svelte marks the branch inert before it
		// plays the outro and the scheduler skips inert effects.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Svelte sets this itself on any element carrying a `transition:`, for
		// the whole exit. Asserted here so nobody drops the transition without
		// noticing that a fading panel would go clickable again on its way out.
		expect(closing!.inert).toBe(true);

		await waitFor(() => expect(panel(container)).toBeNull());
	});

	it("leaves on the exit rung: the departure curve, half the entrance's scale delta", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();
		animateSpy.mockClear();

		pressEscape();
		await waitFor(() => expect(panel(container)).toBeNull());

		// Svelte samples the transition's `css(t, u)` into these keyframes, so
		// they are the direct evidence of what the exit animates: from resting
		// to the `0.96` floor, which is HALF the entrance's delta off `0.92` —
		// leaving is a smaller gesture than arriving. `duration` is the shared
		// `DURATIONS.fast`, the same 150 ms the entrance takes, which is the
		// whole of this rung's timing: an anchored surface passes no timing
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
	// fade ends. Svelte sets `inert` on the panel the instant the exit starts,
	// which drops focus to `<body>` for that whole window unless the trap's
	// eager-return handle has already moved it.
	it("returns focus to the trigger at the dismiss instant, while the panel is still fading", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);

		btn.focus();
		await fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});

		pressEscape();
		await tick();

		expect(panel(container)).not.toBeNull(); // still on screen, fading
		expect(document.activeElement).toBe(btn);
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});

		await fireEvent.click(triggerButton(container));
		await tick();
		onOpenChange.mockClear();

		pressEscape();
		await tick();
		expect(panel(container)).not.toBeNull(); // still fading

		pressEscape();
		pressEscape();
		await tick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// A reopen inside the exit window reverses the outro instead of
	// remounting, so `use:focusTrap` is never re-created: its initial focus
	// move does not re-run and its "focus already returned" latch is still
	// set. Left alone that gives back an interactive panel with focus on the
	// trigger BEHIND it — untrapped, since the Tab handler is bound to the
	// panel — and permanently spends the eager return, so no later close of
	// this instance returns focus at all.
	it("re-arms the focus trap when the popover is reopened during its exit", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);

		btn.focus();
		await fireEvent.click(btn);
		await tick();
		expect(panel(container)).not.toBeNull();

		pressEscape();
		await tick();
		expect(panel(container)).not.toBeNull();
		expect(document.activeElement).toBe(btn);

		// Reopened SYNCHRONOUSLY on purpose. Under the WAAPI stub the exit
		// window is two microtasks, and any awaited helper (`fireEvent`,
		// `tick`) drains them — the branch is then destroyed and re-created,
		// which mounts a brand-new `focusTrap` and quietly tests nothing.
		// `flushSync` resumes the same branch, which is the reversal this pins.
		btn.click();
		flushSync();

		const reopened = panel(container);
		expect(reopened).toBeTruthy();
		expect(reopened!.getAttribute("data-state")).toBe("open");
		expect(reopened!.contains(document.activeElement)).toBe(true);

		// And the next genuine dismiss still returns focus, rather than
		// stranding it on a node about to be removed.
		pressEscape();
		await tick();
		expect(document.activeElement).toBe(btn);
	});

	// `anchored` collapses the duration to 0 under reduced motion, and
	// Svelte's own falsy-duration fast path then calls `on_finish()`
	// synchronously and never touches `element.animate()` — so a visitor who
	// asked for less motion gets exactly the synchronous close this component
	// had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubMatchMedia(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();
		expect(panel(container)).not.toBeNull();

		pressEscape();
		await tick();

		expect(panel(container)).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("merges the class prop onto the panel", async () => {
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				class: "w-[220px]",
			},
		});

		await fireEvent.click(triggerButton(container));
		const content = panel(container);
		expect(content?.className).toContain("w-[220px]");
		expect(content?.className).toContain("ft-popover-content");
	});

	it("binds the panel element via ref", async () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});

		await fireEvent.click(triggerButton(container));
		await tick();
		expect(ref).toBe(panel(container));
	});
});
