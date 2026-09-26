import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import Dialog from "./Dialog.vue";
import { dismissable } from "../../internals/dismissable.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Four
 * shapes changed and nothing else did:
 *
 * - The source's snippet props are slots here, so `createRawSnippet(...)`
 *   becomes a template string in `slots`.
 * - `tick()` becomes `nextTick()`. The source's synchronous `flushSync()` has
 *   no counterpart in this framework, so the one case that depends on it stops
 *   the transition clock instead of racing it — see `freezeRunningLegs()`.
 * - The bindable `open` is `v-model:open`, so the two "round-trips" cases pass
 *   an `onUpdate:open` listener instead of a getter/setter pair.
 * - The bindable `ref` is exposed on the instance, so the last case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 *
 * Two fixtures also changed, each marked at its call site: this package's jsdom
 * has no `PointerEvent`, and the fallback-focus case focuses its trigger before
 * opening so that the chain's final step is the one actually exercised.
 *
 * Two cases are ADDED, both marked, and both pin a law the source file explains
 * at length but leaves unguarded: that the scroll lock is still held while the
 * panel is on screen fading, and that an ordinary re-render does not reorder the
 * shared dismiss stack. The second is port-specific — the source's action cannot
 * reorder, a composable's watcher can — and it is the regression this port
 * actually shipped once.
 *
 * No `inert` shim, deliberately (the internals suite makes the same call).
 * jsdom implements no `inert` IDL property, so a prototype getter/setter
 * reflecting the property to the attribute would mean the exit case passes
 * against the shim rather than against what the component writes. The presence
 * clock writes the ATTRIBUTE through `toggleAttribute`, so `hasAttribute`
 * observes production behaviour directly.
 */

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
 * Holds every RUNNING transition leg open for as long as the test wants, which
 * is what replaces the source suite's synchronous `flushSync()`.
 *
 * Under the shared animation stub a leg finishes on a microtask, so the whole
 * exit window is one microtask wide and NO awaited helper lands inside it: the
 * subtree settles, unmounts and re-creates, and a case that means to pin a
 * reversal silently pins a fresh mount instead — the exact failure the source
 * comment warns about, which `flushSync()` is there to avoid and which this
 * framework has no counterpart for.
 *
 * So the clock is stopped rather than raced. The sampler always creates a
 * leading dummy at `duration: 0` and only then, from its `onfinish`, the real
 * leg at `duration > 0`; forwarding the zero-duration call to the stub and
 * answering the other with an animation that never finishes leaves the leg
 * genuinely in flight across any number of awaits. Install it AFTER the surface
 * has settled open, so the exit starts from a finished entrance exactly as it
 * would on screen.
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
 * Drains a leg to completion. The `animate` stub finishes each animation on a
 * microtask and the sampler chains a leading dummy into the real animation, so
 * a settled leg is two turns away; crossing a macrotask boundary drains the
 * whole chain, and the trailing `nextTick()` flushes the render the finish
 * scheduled.
 */
const settleLegs = async () => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

function panel(): HTMLElement | null {
	return document.body.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-dialog-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return panel()?.querySelector('button[aria-label="Close"]') ?? null;
}

function triggerNode(): HTMLButtonElement {
	return document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
}

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

const TRIGGER_SLOT = '<button type="button" data-testid="open-trigger">Invite</button>';

describe("Dialog", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders nothing when closed", () => {
		render(Dialog, { props: { title: "Invite" } });
		expect(panel()).toBeNull();
	});

	it("renders role=dialog with aria-modal when open", async () => {
		render(Dialog, { props: { open: true, title: "Invite" } });
		await nextTick();

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("points aria-labelledby and aria-describedby at ids that exist", async () => {
		render(Dialog, {
			props: { open: true, title: "Invite a member", description: "Send an email invite." },
		});
		await nextTick();

		const el = panel()!;
		const labelledby = el.getAttribute("aria-labelledby")!;
		const describedby = el.getAttribute("aria-describedby")!;
		expect(document.getElementById(labelledby)?.textContent?.trim()).toBe("Invite a member");
		expect(document.getElementById(describedby)?.textContent?.trim()).toBe(
			"Send an email invite."
		);
	});

	it("omits aria-labelledby and aria-describedby entirely when title/description are not given", async () => {
		render(Dialog, { props: { open: true } });
		await nextTick();

		const el = panel()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
		expect(el.hasAttribute("aria-describedby")).toBe(false);
	});

	it("gives the close button a real accessible name, not just the glyph", async () => {
		render(Dialog, { props: { open: true, title: "Invite" } });
		await nextTick();

		const btn = closeButton()!;
		expect(btn.getAttribute("aria-label")).toBe("Close");
	});

	it("closes and fires onOpenChange(false) when the close button is activated", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		await fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("closes on Escape by default", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not close on Escape when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, title: "Invite", dismissible: false, onOpenChange },
		});
		await nextTick();

		pressEscape();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes on an outside click by default", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		pointerDownOn(scrim()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not close on an outside click when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, title: "Invite", dismissible: false, onOpenChange },
		});
		await nextTick();

		pointerDownOn(scrim()!);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("the close button still works when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: true, title: "Invite", dismissible: false, onOpenChange },
		});
		await nextTick();

		await fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("moves focus inside the panel on open", async () => {
		render(Dialog, {
			props: { open: true, title: "Invite" },
			slots: { default: '<input data-testid="email" />' },
		});
		await nextTick();

		expect(panel()!.contains(document.activeElement)).toBe(true);
	});

	it("honours an explicit initialFocus over the default first-focusable", async () => {
		const input = document.createElement("input");
		input.setAttribute("data-testid", "seed");
		document.body.appendChild(input);

		render(Dialog, {
			props: { open: true, title: "Invite", initialFocus: input },
			slots: { default: '<input data-testid="email" />' },
		});
		await nextTick();

		expect(document.activeElement).toBe(input);
	});

	it("opens on trigger activation and returns focus to the trigger on close", async () => {
		const onOpenChange = vi.fn();
		// `open` starts false and is never written back by this harness — the
		// dialog's own model copy is what actually flips (and re-renders this
		// same instance) when the trigger is clicked, exactly as it would for a
		// caller who only passed `onOpenChange` and never `v-model:open`.
		render(Dialog, {
			props: { open: false, onOpenChange, title: "Invite" },
			slots: { trigger: TRIGGER_SLOT },
		});

		const trigger = triggerNode();
		trigger.focus();
		await fireEvent.click(trigger);
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();

		pressEscape();
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(trigger);
	});

	// `focus-trap.ts`'s `previouslyFocused` is a raw reference captured once
	// at mount — if the trigger (and the wrapper Dialog rendered it in)
	// leaves the document while the dialog stays open, `.focus()` on it
	// would silently do nothing. `fallbackFocus` exists to catch that; here
	// the trigger is also `fallbackFocus`'s own target, so removing it
	// exercises the chain's final step, not just its second one.
	it("falls back to document.body when the trigger has been removed from the DOM while the dialog was open", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: false, onOpenChange, title: "Invite" },
			slots: { trigger: TRIGGER_SLOT },
		});

		const trigger = triggerNode();
		// Focused explicitly, unlike the source case: `fireEvent.click` does not
		// move focus, so without this the trap captures `document.body` as the
		// element to return to, step 1 of the chain succeeds on a node that is
		// still connected, and the fallback the case exists for is never
		// reached. With the trigger captured, removing it below fails step 1
		// AND step 2 — the trigger is `fallbackFocus`'s own target — which is
		// the chain's final step the source comment names.
		trigger.focus();
		await fireEvent.click(trigger);
		await nextTick();
		expect(panel()).toBeTruthy();

		// Simulates a re-render elsewhere on the page removing the row this
		// trigger lived in — e.g. a reordering list — while the dialog it
		// opened is still open.
		trigger.parentElement!.remove();

		await fireEvent.click(closeButton()!);
		await nextTick();

		expect(document.activeElement).toBe(document.body);
	});

	it("excludes the trigger from outside-click dismissal, so clicking it again while open does not close it", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { open: false, onOpenChange, title: "Invite" },
			slots: { trigger: TRIGGER_SLOT },
		});

		const trigger = triggerNode();
		await fireEvent.click(trigger);
		await nextTick();
		expect(panel()).toBeTruthy();

		onOpenChange.mockClear();
		pointerDownOn(trigger);
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
	});

	it("only the top-most stacked layer reacts to Escape — a nested overlay takes the first press, the dialog the second", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		// Stand-in for a Popover opened from inside this dialog: another node
		// using the same shared dismiss-layer stack, mounted after the dialog's
		// own panel.
		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedHandle = dismissable(nested, { onDismiss: onNestedDismiss });

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();

		nestedHandle?.destroy?.();
		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// ADDED beyond the transposition, and port-specific: the source registers
	// its dismiss layer once per element mount, so a re-render can only ever
	// reach the layer's `update()`, which mutates in place and cannot reorder
	// the shared stack. Here the layer is owned by a watcher over the panel
	// element, and a shallow watch source makes that watcher run on every dirty
	// pass whether or not its values changed — so any callback spelled as a
	// fresh closure per render silently destroys the layer and pushes a new one,
	// putting this dialog back on TOP and stealing Escape from the overlay
	// opened above it. That shipped once; this is what catches it coming back.
	it("keeps its place in the dismiss stack across an unrelated re-render", async () => {
		const onOpenChange = vi.fn();
		const { rerender } = render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedHandle = dismissable(nested, { onDismiss: onNestedDismiss });

		// Nothing about the dialog's dismissal behaviour changes here.
		await rerender({ open: true, title: "Invite a member", onOpenChange });
		await nextTick();

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();

		nestedHandle?.destroy?.();
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(Dialog, { props: { open: true, title: "Invite" } });
		await nextTick();
		// Stays synchronous: the lock is acquired at mount, so it is in place by
		// the time the panel is on screen. Wrapping this would silently delete
		// that requirement.
		expect(document.body.style.position).toBe("fixed");

		await rerender({ open: false });
		// ADDED beyond the transposition, and the reason is that the source file
		// explains this law in its longest comment block and then never asserts
		// it: with only the `waitFor` below, releasing at the dismiss instant
		// instead of at the end of the exit passes. Asserted while the panel is
		// demonstrably still on screen.
		await nextTick();
		expect(panel()).toBeTruthy();
		expect(document.body.style.position).toBe("fixed");

		// The release is deliberately NOT synchronous: it is delayed by the exit
		// transition, which is what keeps the page locked until the backdrop has
		// actually finished fading.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	// The close protocol's own regression guards. Between the dismiss and the
	// unmount there is a window — 200 ms in a browser, a couple of microtasks
	// under the animation stub — and these three pin what must be true inside
	// it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(Dialog, { props: { open: true, title: "Invite" } });
		await nextTick();
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();
		await nextTick();

		const closing = panel();
		expect(closing).toBeTruthy();
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// Written by the presence clock, as an attribute, for the whole exit.
		// The assertion is here so nobody removes the transition without
		// noticing that a closing modal would go interactive again.
		expect(closing!.hasAttribute("inert")).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		pressEscape();
		await nextTick();
		expect(panel()).toBeTruthy(); // still fading

		pressEscape();
		pressEscape();
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// A reopen inside the exit window reverses the exit instead of remounting,
	// so the focus trap is never re-created: its initial focus move does not
	// re-run and its "focus already returned" latch is still set. Left alone
	// that leaves an `aria-modal` panel open with focus on the trigger BEHIND
	// it — untrapped, since the Tab handler is bound to the panel — and
	// permanently spends the eager return, so no later close of this instance
	// returns focus at all. The trap's re-arm handle, called from
	// `onEnterStart`, is what undoes both.
	it("re-arms the focus trap when the dialog is reopened during its exit", async () => {
		render(Dialog, {
			props: { open: false, title: "Invite" },
			slots: { trigger: TRIGGER_SLOT },
		});

		const trigger = triggerNode();
		trigger.focus();
		await fireEvent.click(trigger);
		await settleLegs();
		const first = panel();
		expect(first).toBeTruthy();

		// From here the exit is held open for the rest of the case. Without
		// this the window is one microtask wide, every await steps over it, and
		// the reopen below would mount a BRAND-NEW panel carrying a brand-new
		// focus trap that arms itself — which is the shape of a case that
		// passes while pinning nothing at all.
		freezeRunningLegs();

		// Dismiss: focus comes back to the trigger immediately, while the panel
		// is still on screen fading.
		pressEscape();
		await nextTick();
		expect(panel()).toBe(first);
		expect(first!.getAttribute("data-state")).toBe("closing");
		expect(document.activeElement).toBe(trigger);

		// Reopen mid-fade — reachable precisely BECAUSE the eager return just
		// put focus on the trigger: Enter or Space on it, which the scrim does
		// not block the way it blocks a pointer.
		trigger.click();
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
		expect(document.activeElement).toBe(trigger);
	});

	// A layer that is on its way out must not swallow the key: the dismiss
	// stack scans past it and hands Escape to whatever is underneath.
	it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
		// Registered BEFORE the dialog, so the dialog sits above it on the
		// shared layer stack — the shape of a dialog opened from inside another
		// dismissable surface.
		const beneath = document.createElement("div");
		document.body.appendChild(beneath);
		const onBeneath = vi.fn();
		const beneathHandle = dismissable(beneath, { onDismiss: onBeneath });

		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		pressEscape(); // the dialog is the top LIVE layer and takes this one
		await nextTick();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onBeneath).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();

		pressEscape(); // the dialog is inactive now, so this falls through
		expect(onBeneath).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);

		beneathHandle?.destroy?.();
	});

	// The fast path: `duration: 0` makes the sampler call its finish callback
	// synchronously and never touch `element.animate()`, so a visitor who asked
	// for less motion gets exactly the synchronous close this component had
	// before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(Dialog, { props: { open: true, title: "Invite" } });
		await nextTick();
		expect(panel()).toBeTruthy();

		pressEscape();
		await nextTick();

		expect(panel()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips through v-model:open", async () => {
		let open = true;
		render(Dialog, {
			props: { title: "Invite", open, "onUpdate:open": (value: boolean) => (open = value) },
		});
		await nextTick();
		expect(panel()).toBeTruthy();

		await fireEvent.click(closeButton()!);
		expect(open).toBe(false);
	});

	it("works with onOpenChange alone, no v-model:open", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, { props: { open: true, title: "Invite", onOpenChange } });
		await nextTick();

		await fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	// Distinct from the two cases above: no `open` prop at all, so this pins
	// the model's `false` default itself — the two tests above both pass
	// `open: true` explicitly and would not notice if the default silently
	// changed to `true`.
	it("works fully uncontrolled, with no open prop given, relying on the false default", async () => {
		const onOpenChange = vi.fn();
		render(Dialog, {
			props: { title: "Invite", onOpenChange },
			slots: { trigger: TRIGGER_SLOT },
		});
		expect(panel()).toBeNull();

		const trigger = triggerNode();
		await fireEvent.click(trigger);
		await nextTick();

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();
	});

	it("merges the class prop onto the panel", async () => {
		render(Dialog, { props: { open: true, title: "Invite", class: "mt-4" } });
		await nextTick();
		expect(panel()!.className).toContain("mt-4");
	});

	it("exposes the panel element as ref", async () => {
		const wrapper = mount(Dialog, {
			props: { open: true, title: "Invite" },
			attachTo: document.body,
		});
		await nextTick();

		expect(wrapper.vm.ref).toBe(panel());
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

		it("plays open exactly once when the trigger opens the dialog", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, {
				props: { sound: true, title: "Invite" },
				slots: { trigger: TRIGGER_SLOT },
			});

			await fireEvent.click(triggerNode());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays close exactly once when the close button dismisses", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
			await nextTick();

			await fireEvent.click(closeButton()!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on Escape and close exactly once on an outside click", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
			await nextTick();

			pressEscape();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);

			// The source re-opens the same instance with a `rerender`; here the
			// model has already fallen to `false` and the prop it is seeded
			// from has not changed, so re-passing `open: true` is not a change
			// and the second half needs a fresh mount rather than a re-render
			// of the closed one. The sibling package's suite makes the same
			// substitution.
			await settleLegs();
			cleanup();
			play.mockClear();

			render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
			await nextTick();
			pointerDownOn(scrim()!);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { open: true, title: "Invite" } });
			await nextTick();

			await fireEvent.click(closeButton()!);
			pressEscape();

			expect(play).not.toHaveBeenCalled();
		});

		it("swallows a second Escape during the exit — close plays exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(Dialog, { props: { sound: true, open: true, title: "Invite" } });
			await nextTick();

			pressEscape();
			await nextTick();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("a dialog driven purely by v-model:open opens silently — no trigger and no gesture ever reaches setOpen's open branch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			let open = false;
			const { rerender } = render(Dialog, {
				props: {
					sound: true,
					title: "Invite",
					open,
					"onUpdate:open": (value: boolean) => (open = value),
				},
			});

			open = true;
			await rerender({ open: true });
			await nextTick();
			expect(panel()).toBeTruthy();

			expect(play).not.toHaveBeenCalled();
		});
	});
});
