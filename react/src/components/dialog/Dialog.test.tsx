import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { Dialog } from "./Dialog.js";
import { __dismissableLayerCount, attachDismissable } from "../../internals/dismissable.js";
import { FakeAnimation } from "../../test-setup.js";

// Shape 4 (component) from the internals contract §9.3: `render()` plus the
// real internals, because what this file exists to pin is the CHOREOGRAPHY
// between them — presence, focus trap, scroll lock, dismissable stack and
// portal — not any one of their surfaces. The source suite's assertions are
// transposed one for one; the harness snippets it needed become plain JSX,
// and the React layer's own additions (StrictMode leak counters, the two
// `data-state` vocabularies, the entrance leg) sit at the end, clearly
// marked.

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando that reflects to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE, which
 * is what `:not([inert])` selectors and assistive tech key on) was never
 * touched. Same shim the presence suite installs, guarded so it is a no-op
 * the moment jsdom ships the real property.
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

function panel(): HTMLElement | null {
	return document.body.querySelector('[role="dialog"]');
}

function scrim(): HTMLElement | null {
	return document.body.querySelector(".ft-dialog-scrim");
}

function closeButton(): HTMLButtonElement | null {
	return panel()?.querySelector('button[aria-label="Close"]') ?? null;
}

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there.
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
 *
 * Every test that leaves a leg in flight ends with this, and not merely for
 * tidiness: a leg that settles after the test body has returned updates React
 * state outside `act`, which prints a warning per dialog. Draining it inside
 * the test is also what makes this file's `afterEach` layer-count assertion
 * mean something.
 */
const settleLegs = () => act(async () => {});

function trigger(): HTMLButtonElement {
	return document.body.querySelector<HTMLButtonElement>('[data-testid="open-trigger"]')!;
}

const TRIGGER = (
	<button type="button" data-testid="open-trigger">
		Invite
	</button>
);

describe("Dialog", () => {
	beforeEach(() => {
		// The scroll lock restores the page offset with `window.scrollTo`, which
		// jsdom does not implement — unmocked it floods the run with
		// "Not implemented" console noise on every release. Re-installed per
		// test because `vi.restoreAllMocks()` below tears it down again.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders nothing when closed", () => {
		render(<Dialog title="Invite" />);
		expect(panel()).toBeNull();
	});

	it("renders role=dialog with aria-modal when open", () => {
		render(<Dialog open title="Invite" />);

		const el = panel();
		expect(el).toBeTruthy();
		expect(el?.getAttribute("aria-modal")).toBe("true");
	});

	it("points aria-labelledby and aria-describedby at ids that exist", () => {
		render(<Dialog open title="Invite a member" description="Send an email invite." />);

		const el = panel()!;
		const labelledby = el.getAttribute("aria-labelledby")!;
		const describedby = el.getAttribute("aria-describedby")!;
		expect(document.getElementById(labelledby)?.textContent).toBe("Invite a member");
		expect(document.getElementById(describedby)?.textContent).toBe("Send an email invite.");
	});

	it("omits aria-labelledby and aria-describedby entirely when title/description are not given", () => {
		render(<Dialog open />);

		const el = panel()!;
		expect(el.hasAttribute("aria-labelledby")).toBe(false);
		expect(el.hasAttribute("aria-describedby")).toBe(false);
	});

	it("gives the close button a real accessible name, not just the glyph", () => {
		render(<Dialog open title="Invite" />);

		const btn = closeButton()!;
		expect(btn.getAttribute("aria-label")).toBe("Close");
	});

	it("closes and fires onOpenChange(false) when the close button is activated", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("closes on Escape by default", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("does not close on Escape when dismissible is false", () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" dismissible={false} onOpenChange={onOpenChange} />);

		pressEscape();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("closes on an outside click by default", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		pointerDownOn(scrim()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("does not close on an outside click when dismissible is false", () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" dismissible={false} onOpenChange={onOpenChange} />);

		pointerDownOn(scrim()!);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("the close button still works when dismissible is false", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" dismissible={false} onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("moves focus inside the panel on open", () => {
		render(
			<Dialog open title="Invite">
				<input data-testid="email" />
			</Dialog>
		);

		expect(panel()!.contains(document.activeElement)).toBe(true);
	});

	it("honours an explicit initialFocus over the default first-focusable", () => {
		const input = document.createElement("input");
		input.setAttribute("data-testid", "seed");
		document.body.appendChild(input);

		render(
			<Dialog open title="Invite" initialFocus={input}>
				<input data-testid="email" />
			</Dialog>
		);

		expect(document.activeElement).toBe(input);
	});

	it("opens on trigger activation and returns focus to the trigger on close", async () => {
		const onOpenChange = vi.fn();
		// `open` starts false and is never written back by this harness — the
		// dialog's own internal copy is what actually flips (and re-renders
		// this same instance) when the trigger is clicked, exactly as it would
		// for a caller who only passed `onOpenChange`.
		render(<Dialog open={false} onOpenChange={onOpenChange} title="Invite" trigger={TRIGGER} />);

		trigger().focus();
		fireEvent.click(trigger());

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();

		pressEscape();

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.activeElement).toBe(trigger());
		await settleLegs();
	});

	// `focus-trap.ts`'s `previouslyFocused` is a raw reference captured once
	// at mount — if the trigger (and the wrapper Dialog rendered it in)
	// leaves the document while the dialog stays open, `.focus()` on it
	// would silently do nothing. `fallbackFocus` exists to catch that; here
	// the trigger is also `fallbackFocus`'s own target, so removing it
	// exercises the chain's final step, not just its second one.
	it("falls back to document.body when the trigger has been removed from the DOM while the dialog was open", async () => {
		const onOpenChange = vi.fn();
		// Simulates a re-render elsewhere on the page removing the row this
		// trigger lived in — a reordering list, say — while the dialog it
		// opened is still open. Driven through React rather than a raw
		// `.remove()` on a node React owns: tearing a node out from under the
		// reconciler makes the eventual unmount throw, and the branch under
		// test is the same either way — the wrapper `fallbackFocus` points at
		// is gone, so it cannot be focused.
		const { rerender } = render(
			<Dialog open={false} onOpenChange={onOpenChange} title="Invite" trigger={TRIGGER} />
		);

		fireEvent.click(trigger());
		expect(panel()).toBeTruthy();

		rerender(<Dialog open onOpenChange={onOpenChange} title="Invite" />);

		fireEvent.click(closeButton()!);
		// Settled, exactly as on the source side, where the awaited click plus
		// an awaited tick drain the stub's two microtasks. Worth being precise
		// about WHY `<body>` is the answer, because two mechanisms point the
		// same way here: the eager return runs the chain, whose first step
		// targets whatever had focus when the trap armed — `document.body`,
		// since nothing focused the trigger — and that step is a no-op under
		// jsdom, which will not focus a body carrying no `tabindex`. What
		// actually settles `activeElement` is the panel leaving the document
		// at the end of the exit. Either way the assertion pins the thing that
		// matters: focus is not stranded on a removed node.
		await settleLegs();

		expect(document.activeElement).toBe(document.body);
	});

	it("excludes the trigger from outside-click dismissal, so clicking it again while open does not close it", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open={false} onOpenChange={onOpenChange} title="Invite" trigger={TRIGGER} />);

		fireEvent.click(trigger());
		expect(panel()).toBeTruthy();

		onOpenChange.mockClear();
		pointerDownOn(trigger());
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();
		await settleLegs();
	});

	it("only the top-most stacked layer reacts to Escape — a nested overlay takes the first press, the dialog the second", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		// Stand-in for a Popover opened from inside this dialog: another node
		// using the same shared dismissable layer stack, mounted after the
		// dialog's own panel.
		const nested = document.createElement("div");
		document.body.appendChild(nested);
		const onNestedDismiss = vi.fn();
		const nestedHandle = attachDismissable(nested, { onDismiss: onNestedDismiss });

		pressEscape();
		expect(onNestedDismiss).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();

		nestedHandle.destroy();
		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	it("locks the page scroll while open and releases it on close", async () => {
		const { rerender } = render(<Dialog open title="Invite" />);
		// Stays synchronous: the lock is acquired in a layout effect the
		// moment the surface mounts, so it is in place by the time the panel
		// is on screen. Wrapping this would silently delete that requirement.
		expect(document.body.style.position).toBe("fixed");

		rerender(<Dialog open={false} title="Invite" />);
		// The release is deliberately NOT synchronous: it is scoped to the
		// surface's MOUNT, which `usePresence` holds for the length of the
		// exit, which is what keeps the page locked until the backdrop has
		// actually finished fading.
		await waitFor(() => expect(document.body.style.position).toBe(""));
	});

	// The close protocol's own regression guards. Between the dismiss and the
	// unmount there is a window — 200 ms in a browser, a couple of microtasks
	// under the animation stub — and these three pin what must be true inside
	// it.
	it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
		render(<Dialog open title="Invite" />);
		expect(panel()!.getAttribute("data-state")).toBe("open");

		pressEscape();

		const closing = panel();
		expect(closing).toBeTruthy();
		// An ordinary React attribute here (divergence D-2), carrying
		// `surfaceState`'s two values.
		expect(closing!.getAttribute("data-state")).toBe("closing");
		// `usePresence` sets this on every registered node for the whole exit.
		// The assertion is here so nobody removes the transition without
		// noticing that a closing modal would go interactive again.
		expect(closing!.inert).toBe(true);

		await waitFor(() => expect(panel()).toBeNull());
		expect(scrim()).toBeNull();
	});

	it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		pressEscape();
		expect(panel()).toBeTruthy(); // still fading

		pressEscape();
		pressEscape();

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
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
		render(<Dialog open={false} title="Invite" trigger={TRIGGER} />);

		trigger().focus();
		fireEvent.click(trigger());
		expect(panel()).toBeTruthy();

		// Dismiss: focus comes back to the trigger immediately, while the
		// panel is still on screen fading.
		pressEscape();
		expect(panel()).toBeTruthy();
		expect(document.activeElement).toBe(trigger());

		// Reopen mid-fade — reachable precisely BECAUSE the eager return just
		// put focus on the trigger: Enter or Space on it, which the scrim does
		// not block the way it blocks a pointer.
		//
		// Dispatched inside a SYNCHRONOUS `act` on purpose. In a browser the
		// exit window is 200 ms; under the animation stub it is two
		// microtasks, and any awaited helper drains them — the subtree is then
		// unmounted and re-created, which mounts a brand-new focus trap and
		// quietly tests nothing. A synchronous `act` flushes React's work
		// without touching the microtask queue, so the SAME node resumes,
		// which is the reversal this pins.
		act(() => {
			trigger().click();
		});

		const reopened = panel();
		expect(reopened).toBeTruthy();
		expect(reopened!.getAttribute("data-state")).toBe("open");
		expect(reopened!.contains(document.activeElement)).toBe(true);

		// And the next genuine dismiss still returns focus, rather than
		// stranding it on a node about to be removed.
		pressEscape();
		expect(document.activeElement).toBe(trigger());
		await settleLegs();
	});

	// A layer that is on its way out must not swallow the key: the dismiss
	// stack scans past it and hands Escape to whatever is underneath.
	it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
		// Registered BEFORE the dialog, so the dialog sits above it on the
		// shared layer stack — the shape of a dialog opened from inside
		// another dismissable surface.
		const beneath = document.createElement("div");
		document.body.appendChild(beneath);
		const onBeneath = vi.fn();
		const beneathHandle = attachDismissable(beneath, { onDismiss: onBeneath });

		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		pressEscape(); // the dialog is the top LIVE layer and takes this one
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onBeneath).not.toHaveBeenCalled();
		expect(panel()).toBeTruthy();

		pressEscape(); // the dialog is inactive now, so this falls through
		expect(onBeneath).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledTimes(1);

		beneathHandle.destroy();
		await settleLegs();
	});

	// The fast path: `duration: 0` makes `runTransition` call its finish
	// callback synchronously and never touch `element.animate()`, so a visitor
	// who asked for less motion gets exactly the synchronous close this
	// component had before the exit existed.
	it("closes synchronously and never animates when the user asked for reduced motion", () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		render(<Dialog open title="Invite" />);
		expect(panel()).toBeTruthy();

		pressEscape();

		expect(panel()).toBeNull();
		expect(scrim()).toBeNull();
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("round-trips through a controlled open + onOpenChange pair", async () => {
		// The React spelling of the source's `bind:open`: the caller owns the
		// value and writes it back from `onOpenChange`.
		const seen: boolean[] = [];
		function Controlled() {
			const [open, setOpen] = useState(true);
			seen.push(open);
			return <Dialog open={open} onOpenChange={setOpen} title="Invite" />;
		}
		render(<Controlled />);
		expect(panel()).toBeTruthy();

		fireEvent.click(closeButton()!);
		expect(seen.at(-1)).toBe(false);
		await settleLegs();
	});

	it("works with onOpenChange alone, no controlled value", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog open title="Invite" onOpenChange={onOpenChange} />);

		fireEvent.click(closeButton()!);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await settleLegs();
	});

	// Distinct from the two cases above: no `open` prop at all, so this pins
	// the `false` default itself — the two tests above both pass `open`
	// explicitly and would not notice if the default silently changed to true.
	it("works fully uncontrolled, with no open prop given, relying on the false default", async () => {
		const onOpenChange = vi.fn();
		render(<Dialog title="Invite" onOpenChange={onOpenChange} trigger={TRIGGER} />);
		expect(panel()).toBeNull();

		fireEvent.click(trigger());

		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel()).toBeTruthy();
		await settleLegs();
	});

	it("merges the class prop onto the panel", () => {
		render(<Dialog open title="Invite" className="mt-4" />);
		expect(panel()!.className).toContain("mt-4");
	});

	it("exposes the panel element through the forwarded ref", () => {
		const ref = { current: null as HTMLDivElement | null };
		render(<Dialog ref={ref} open title="Invite" />);
		expect(ref.current).toBe(panel());
	});

	// ── React-layer additions (internals contract §9.4) ──────────────────

	// Convention C-5: an anchored surface renders `surfaceState`'s TWO values.
	// `presence.state` genuinely passes through "opening" on every entrance,
	// so rendering the wrong one is a live hazard rather than a hypothetical.
	it('never renders data-state="opening" on the panel', async () => {
		render(<Dialog open={false} title="Invite" trigger={TRIGGER} />);

		fireEvent.click(trigger());
		expect(panel()!.getAttribute("data-state")).toBe("open");
		await settleLegs();
	});

	// The guard on the portal-mounting order. The registered nodes have to
	// exist by the time `usePresence`'s layout effect looks for legs to start;
	// a `Portal` that mounts in the same commit as the surface resolves its
	// container one render too late, the group settles with nothing attached,
	// and the entrance is silently skipped.
	it("plays an entrance leg when it opens from closed", async () => {
		render(<Dialog open={false} title="Invite" trigger={TRIGGER} />);
		expect(FakeAnimation.instances.length).toBe(0);

		fireEvent.click(trigger());

		const targets = FakeAnimation.instances.map((animation) => animation.target);
		expect(targets).toContain(panel());
		expect(targets).toContain(scrim());

		await settleLegs();
	});

	// The two leak counters the contract names for this pairing, driven
	// through a StrictMode double-invoke.
	it("holds the scroll lock and drains the dismiss stack under StrictMode", async () => {
		const { unmount } = render(
			<StrictMode>
				<Dialog open title="Invite" />
			</StrictMode>
		);

		// acquire → release → acquire leaves the refcount at 1, before paint.
		expect(document.body.style.position).toBe("fixed");
		// push → splice → push leaves a stack of one at the same depth.
		expect(__dismissableLayerCount()).toBe(1);

		unmount();
		await waitFor(() => expect(document.body.style.position).toBe(""));
		expect(__dismissableLayerCount()).toBe(0);
	});
});
