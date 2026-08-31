import { render } from "@testing-library/react";
import { StrictMode, useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { attachFocusTrap, useFocusTrap } from "./focus-trap.js";
import type { FocusTrapHandle } from "./focus-trap.js";
import { useElementRef } from "./dom/use-element-ref.js";

function pressTab(options: { shiftKey?: boolean } = {}) {
	const event = new KeyboardEvent("keydown", {
		key: "Tab",
		shiftKey: options.shiftKey ?? false,
		bubbles: true,
		cancelable: true,
	});
	document.activeElement?.dispatchEvent(event);
	return event;
}

describe("attachFocusTrap", () => {
	let container: HTMLElement;

	afterEach(() => {
		container?.remove();
		document.body.innerHTML = "";
	});

	function setup(innerHtml: string) {
		container = document.createElement("div");
		container.innerHTML = innerHtml;
		document.body.appendChild(container);
		const trapNode = container.querySelector<HTMLElement>("#trap")!;
		return trapNode;
	}

	it("focuses the first focusable element by default", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
			</div>
		`);
		attachFocusTrap(trapNode);
		expect(document.activeElement?.id).toBe("a");
	});

	it("focuses the given initialFocus element", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
			</div>
		`);
		const b = trapNode.querySelector<HTMLElement>("#b")!;
		attachFocusTrap(trapNode, { initialFocus: b });
		expect(document.activeElement?.id).toBe("b");
	});

	// The one option this port widens: a React caller usually holds a ref, and
	// the core resolves it at every use rather than at attach time.
	it("resolves a ref passed as initialFocus", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
			</div>
		`);
		const b = trapNode.querySelector<HTMLElement>("#b")!;
		attachFocusTrap(trapNode, { initialFocus: { current: b } });
		expect(document.activeElement?.id).toBe("b");
	});

	it("cycles forward from the last focusable element back to the first on Tab", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<button id="c">C</button>
			</div>
		`);
		attachFocusTrap(trapNode);
		trapNode.querySelector<HTMLElement>("#c")!.focus();

		const event = pressTab();

		expect(document.activeElement?.id).toBe("a");
		expect(event.defaultPrevented).toBe(true);
	});

	it("cycles backward from the first focusable element to the last on Shift+Tab", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<button id="c">C</button>
			</div>
		`);
		attachFocusTrap(trapNode);

		const event = pressTab({ shiftKey: true });

		expect(document.activeElement?.id).toBe("c");
		expect(event.defaultPrevented).toBe(true);
	});

	it("does not interfere with Tab between elements in the middle", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<button id="c">C</button>
			</div>
		`);
		attachFocusTrap(trapNode);
		trapNode.querySelector<HTMLElement>("#b")!.focus();

		const event = pressTab();

		// jsdom does not implement native Tab traversal; the trap only
		// intervenes at the boundaries, leaving mid-cycle Tabs untouched.
		expect(event.defaultPrevented).toBe(false);
	});

	it("ignores tabindex=-1 elements when cycling", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<div id="ghost" tabindex="-1"></div>
			</div>
		`);
		attachFocusTrap(trapNode);

		// Shift+Tab from the first focusable should skip the tabindex=-1
		// ghost element and land on the last real focusable ("b").
		pressTab({ shiftKey: true });

		expect(document.activeElement?.id).toBe("b");
	});

	it("restores focus to the previously active element on destroy by default", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode);
		expect(document.activeElement?.id).toBe("a");

		trap.destroy();
		expect(document.activeElement?.id).toBe("outside");

		outside.remove();
	});

	it("does not restore focus on destroy when returnFocus is false", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, { returnFocus: false });
		trapNode.querySelector<HTMLElement>("#a")!.focus();

		trap.destroy();
		expect(document.activeElement?.id).toBe("a");

		outside.remove();
	});

	// The element `previouslyFocused` closed over is a raw reference, not a
	// live query — if it leaves the document while the trap is still active
	// (a toolbar re-render, a list row disappearing, a trigger inside a
	// reordering list), `.focus()` on it is the same silent no-op any
	// detached node produces. These three pin the fallback chain that exists
	// specifically to catch that.
	it("falls back to fallbackFocus() when the previously-focused element has left the document", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const fallback = document.createElement("button");
		fallback.id = "fallback";
		document.body.appendChild(fallback);

		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, { fallbackFocus: () => fallback });

		outside.remove(); // the element focus would otherwise return to

		trap.destroy();
		expect(document.activeElement?.id).toBe("fallback");

		fallback.remove();
	});

	it("falls back to document.body when neither the previously-focused element nor fallbackFocus() is connected", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const danglingFallback = document.createElement("button"); // never appended
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, { fallbackFocus: () => danglingFallback });

		outside.remove();

		trap.destroy();
		expect(document.activeElement).toBe(document.body);
	});

	it("never calls fallbackFocus() while the previously-focused element is still connected", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		let fallbackCalled = false;
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, {
			fallbackFocus: () => {
				fallbackCalled = true;
				return null;
			},
		});

		trap.destroy();
		expect(document.activeElement?.id).toBe("outside");
		expect(fallbackCalled).toBe(false);

		outside.remove();
	});
});

describe("attachFocusTrap — visibility and empty containers", () => {
	let container: HTMLElement;

	afterEach(() => {
		container?.remove();
		document.body.innerHTML = "";
	});

	function setup(innerHtml: string) {
		container = document.createElement("div");
		container.innerHTML = innerHtml;
		document.body.appendChild(container);
		return container.querySelector<HTMLElement>("#trap")!;
	}

	it("skips hidden elements when picking the initial focus", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="ghost" style="display: none">Ghost</button>
				<button id="real">Real</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("real");
		trap.destroy();
	});

	it("falls back to focusing the container when there are no focusable descendants", () => {
		const trapNode = setup(`<div id="trap"><p>Loading…</p></div>`);
		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement).toBe(trapNode);
		expect(trapNode.getAttribute("tabindex")).toBe("-1");
		trap.destroy();
	});

	/*
	 * `display` does not inherit, so a control inside a `display: none`
	 * wrapper computes its own `display` as `inline-block` and looks visible
	 * in isolation — while the whole subtree is absent from the layout tree
	 * and `.focus()` on it does nothing at all. A trap that believed it
	 * focusable "focused" a control that never took focus, leaving focus
	 * wherever it already was: outside the modal.
	 */
	it("skips a control hidden by a display:none ANCESTOR when picking the initial focus", () => {
		const trapNode = setup(`
			<div id="trap">
				<div id="collapsed" style="display: none">
					<button id="ghost">Ghost</button>
				</div>
				<button id="real">Real</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("real");
		trap.destroy();
	});

	it("contains focus on the container when every control sits under a hidden ancestor", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const trapNode = setup(`
			<div id="trap">
				<div style="display: none">
					<button id="ghost">Ghost</button>
					<button id="ghost2">Ghost 2</button>
				</div>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, {});

		// Not left on the trigger behind the modal, which is what happened
		// while the ghosts counted as focusable.
		expect(document.activeElement).toBe(trapNode);
		expect(trapNode.getAttribute("tabindex")).toBe("-1");

		trap.destroy();
		outside.remove();
	});

	it("keeps Tab inside the trap, ignoring controls under a hidden ancestor", () => {
		// The ghost sits FIRST in DOM order on purpose: it is the element the
		// forward wrap lands on while it still counts as focusable.
		const trapNode = setup(`
			<div id="trap">
				<div style="display: none"><button id="ghost">Ghost</button></div>
				<button id="first">First</button>
				<button id="last">Last</button>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("first");

		trapNode.querySelector<HTMLElement>("#last")!.focus();
		pressTab();
		// Wraps to the first REAL control; a ghost at the head of the cycle
		// swallows the wrap and strands focus on the invisible row.
		expect(document.activeElement?.id).toBe("first");

		pressTab({ shiftKey: true });
		expect(document.activeElement?.id).toBe("last");

		trap.destroy();
	});

	// The other half of the rule: `visibility` DOES inherit, so a descendant
	// that opts back in with `visibility: visible` is genuinely on screen and
	// focusable. Walking ancestors for that property too would wrongly filter
	// it out.
	it("keeps a control that re-declares visibility:visible under a hidden ancestor", () => {
		const trapNode = setup(`
			<div id="trap">
				<div style="visibility: hidden">
					<button id="revealed" style="visibility: visible">Revealed</button>
				</div>
			</div>
		`);
		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("revealed");
		trap.destroy();
	});
});

// `returnFocusNow` is the answer to a close that ANIMATES. `destroy()` is
// delayed by the exit transition, so a trap that only returned focus there
// would leave a keyboard user on `<body>` for the whole fade — the panel is
// marked `inert` the instant the exit starts, which drops focus out of it. The
// handle runs the same chain at the dismiss instant.
describe("attachFocusTrap — the eager return handle", () => {
	let container: HTMLElement;

	afterEach(() => {
		container?.remove();
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	function setup(innerHtml: string) {
		container = document.createElement("div");
		container.innerHTML = innerHtml;
		document.body.appendChild(container);
		return container.querySelector<HTMLElement>("#trap")!;
	}

	function withOutsideTrigger() {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();
		return outside;
	}

	// The Svelte side hands the eager return over through `onActivate` because
	// an action has no return channel; here it is a property of the handle the
	// core returns. Same function, same moment.
	it("exposes the eager return as a function on the handle it returns", () => {
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		expect(typeof trap.returnFocusNow).toBe("function");
		trap.destroy();
	});

	it("returns it AFTER the initial focus move, so the handle restores what the trap displaced", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);
		const activeAtHandover = document.activeElement;

		expect(activeAtHandover).toBe(trapNode.querySelector("#a"));

		trap.returnFocusNow();
		expect(document.activeElement).toBe(outside);

		trap.destroy();
		outside.remove();
	});

	it("returns focus immediately when called, long before destroy()", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);
		expect(document.activeElement?.id).toBe("a");

		trap.returnFocusNow();

		// The node is still mounted and destroy() has not run — this is the
		// window an animated exit lives in.
		expect(trapNode.isConnected).toBe(true);
		expect(document.activeElement).toBe(outside);

		trap.destroy();
		outside.remove();
	});

	it("is idempotent: calling the handle twice moves focus exactly once", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		const focusSpy = vi.spyOn(outside, "focus");
		trap.returnFocusNow();
		trap.returnFocusNow();

		expect(focusSpy).toHaveBeenCalledTimes(1);
		trap.destroy();
		outside.remove();
	});

	it("disarms destroy(): the handle then the unmount still moves focus exactly once", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		const focusSpy = vi.spyOn(outside, "focus");
		trap.returnFocusNow();
		trap.destroy();

		expect(focusSpy).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	// The owner-frozen answer to a caller that contradicts itself: asking for
	// the eager return IS asking for the return, so the handle wins.
	// `returnFocus` governs the unmount path only.
	it("returnFocus: false does not disable the handle — it only disables the unmount path", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode, { returnFocus: false });
		expect(document.activeElement?.id).toBe("a");

		trap.returnFocusNow();
		expect(document.activeElement).toBe(outside);

		trap.destroy();
		outside.remove();
	});

	it("returnFocus: false with the handle never called still returns nothing on destroy, as before", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode, { returnFocus: false });
		trap.destroy();

		expect(document.activeElement?.id).toBe("a");
		outside.remove();
	});

	it("runs the same three-step chain as destroy(), falling back when the original is gone", () => {
		const outside = withOutsideTrigger();
		const fallback = document.createElement("button");
		fallback.id = "fallback";
		document.body.appendChild(fallback);
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode, { fallbackFocus: () => fallback });

		outside.remove();
		trap.returnFocusNow();

		expect(document.activeElement).toBe(fallback);
		trap.destroy();
		fallback.remove();
	});

	it("never calling the handle leaves the destroy-time return exactly as it was", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("a");

		trap.destroy();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});

// A reopen DURING the exit is not a new mount: the surface stays mounted for
// the whole exit, so the trap is never re-created and neither the initial focus
// move nor the capture of the displaced element runs again. `rearm` — the
// second function on the handle — is what puts focus back inside the panel and
// un-spends the eager return, so the NEXT dismiss still returns focus. Without
// it a reopened `aria-modal` panel sits open with focus on the trigger behind
// it, and every later close of that instance returns focus nowhere at all.
describe("attachFocusTrap — re-arming after a reopen mid-exit", () => {
	let container: HTMLElement;

	afterEach(() => {
		container?.remove();
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	function setup(innerHtml: string) {
		container = document.createElement("div");
		container.innerHTML = innerHtml;
		document.body.appendChild(container);
		return container.querySelector<HTMLElement>("#trap")!;
	}

	function withOutsideTrigger() {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();
		return outside;
	}

	it("carries a re-arm function alongside the return handle, at the same moment", () => {
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		expect(typeof trap.returnFocusNow).toBe("function");
		expect(typeof trap.rearm).toBe("function");
		trap.destroy();
	});

	it("puts focus back inside the trap after the eager return moved it out", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		// Dismiss: the eager return puts focus on the trigger while the panel
		// is still mounted and fading.
		trap.returnFocusNow();
		expect(document.activeElement).toBe(outside);

		// Reopen mid-fade: the same trap instance is still attached.
		trap.rearm();

		expect(trapNode.contains(document.activeElement)).toBe(true);
		expect(document.activeElement?.id).toBe("a");
		trap.destroy();
		outside.remove();
	});

	it("re-arms destroy(): the dismiss after a reopen still returns focus", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		trap.returnFocusNow();
		trap.rearm();
		trap.destroy();

		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("re-arms the handle itself: the next dismiss returns focus again", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		const focusSpy = vi.spyOn(outside, "focus");
		trap.returnFocusNow(); // first dismiss
		trap.rearm(); // reopened mid-fade
		trap.returnFocusNow(); // second, genuine dismiss

		expect(focusSpy).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(outside);

		// And it is still idempotent within that second activation.
		trap.returnFocusNow();
		expect(focusSpy).toHaveBeenCalledTimes(2);

		trap.destroy();
		outside.remove();
	});

	it("does not move focus when it is already inside the trap", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(
			`<div id="trap"><button id="a">A</button><button id="b">B</button></div>`
		);

		const trap = attachFocusTrap(trapNode);

		// The very first enter fires with focus already where `focusInitial`
		// just put it, and a user may since have tabbed on.
		const second = trapNode.querySelector<HTMLElement>("#b")!;
		second.focus();
		trap.rearm();

		expect(document.activeElement).toBe(second);
		trap.destroy();
		outside.remove();
	});

	it("honours initialFocus when it re-arms, not just the first focusable", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(
			`<div id="trap"><button id="a">A</button><button id="b">B</button></div>`
		);
		const initial = trapNode.querySelector<HTMLElement>("#b")!;

		const trap = attachFocusTrap(trapNode, { initialFocus: initial });
		expect(document.activeElement).toBe(initial);

		trap.returnFocusNow();
		trap.rearm();

		expect(document.activeElement).toBe(initial);
		trap.destroy();
		outside.remove();
	});

	// `update()` used to store `returnFocus` and `fallbackFocus` but drop
	// `initialFocus`, so `rearm()` kept honouring whatever target the trap
	// mounted with. A dialog that retargets between form steps would then
	// reopen onto the previous step's field — or onto nothing, if that field
	// had been removed with its step.
	it("re-arms onto the CURRENT initialFocus, not the one it mounted with", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(
			`<div id="trap"><button id="a">A</button><button id="b">B</button></div>`
		);
		const a = trapNode.querySelector<HTMLElement>("#a")!;
		const b = trapNode.querySelector<HTMLElement>("#b")!;

		const trap = attachFocusTrap(trapNode, { initialFocus: a });
		expect(document.activeElement).toBe(a);

		// The caller retargets while the surface is still mounted.
		trap.update({ initialFocus: b });

		trap.returnFocusNow();
		trap.rearm();

		expect(document.activeElement).toBe(b);
		trap.destroy();
		outside.remove();
	});

	// `previouslyFocused` was captured once at activation, so a surface
	// reopened from a DIFFERENT control returned focus to the first opener on
	// its next dismissal — or fell through to the fallback, if that opener was
	// gone.
	it("returns focus to the control that reopened it, not the original opener", () => {
		const first = withOutsideTrigger();
		const second = document.createElement("button");
		second.id = "second";
		document.body.appendChild(second);
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		trap.returnFocusNow();
		expect(document.activeElement).toBe(first);

		// A different control reopens the surface mid-exit.
		second.focus();
		trap.rearm();
		expect(trapNode.contains(document.activeElement)).toBe(true);

		trap.destroy();
		expect(document.activeElement).toBe(second);

		first.remove();
		second.remove();
	});

	// The exiting panel is marked `inert`, which drops focus to <body>.
	// Adopting that as the new return target would trade a real opener for
	// one that clears focus, so the recapture skips it.
	it("does not adopt document.body as the return target when re-arming", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode);

		trap.returnFocusNow();
		document.body.focus();
		trap.rearm();
		trap.destroy();

		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("leaves a trap whose handle is never called untouched", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = attachFocusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("a");

		trap.destroy();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});

// ---------------------------------------------------------------------------
// The React binding. Everything above pins the shared core; these pin what the
// hook adds on top of it — handle identity, effect phase, and the StrictMode
// double cycle.
// ---------------------------------------------------------------------------

describe("useFocusTrap", () => {
	let trigger: HTMLButtonElement | null = null;

	afterEach(() => {
		trigger?.remove();
		trigger = null;
	});

	function withOutsideTrigger() {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();
		trigger = outside;
		return outside;
	}

	function Panel({
		initialFocus,
		returnFocus,
		fallbackFocus,
		onHandle,
		children,
	}: {
		initialFocus?: { readonly current: HTMLElement | null } | HTMLElement | null;
		returnFocus?: boolean;
		fallbackFocus?: () => HTMLElement | null | undefined;
		onHandle?: (handle: FocusTrapHandle) => void;
		children?: ReactNode;
	}) {
		const [panel, panelRef] = useElementRef<HTMLDivElement>();
		const handle = useFocusTrap(panel, { initialFocus, returnFocus, fallbackFocus });
		onHandle?.(handle);
		return (
			<div id="trap" ref={panelRef}>
				{children}
			</div>
		);
	}

	it("arms on mount and focuses the first focusable descendant", () => {
		withOutsideTrigger();

		render(
			<Panel>
				<button id="a">A</button>
				<button id="b">B</button>
			</Panel>
		);

		expect(document.activeElement?.id).toBe("a");
	});

	it("traps Tab at the boundary, exactly as the core does", () => {
		withOutsideTrigger();

		render(
			<Panel>
				<button id="a">A</button>
				<button id="b">B</button>
			</Panel>
		);
		document.getElementById("b")!.focus();

		const event = pressTab();

		expect(document.activeElement?.id).toBe("a");
		expect(event.defaultPrevented).toBe(true);
	});

	// The node arrives through `useElementRef`, so the trap arms in the commit
	// that publishes it. A sibling rendered AFTER the trap in the same commit
	// has its LAYOUT effect run after the trap's, and it must already see focus
	// inside the panel. A passive-effect trap would leave that recorder looking
	// at the trigger and only move focus after the layout phase — one painted
	// frame with focus still outside.
	it("lands focus in a layout effect, before the frame is painted", () => {
		withOutsideTrigger();

		const atLayout: (Element | null)[] = [];
		const atPassive: (Element | null)[] = [];

		function Trap({ node }: { node: HTMLElement | null }) {
			useFocusTrap(node);
			return null;
		}

		function Recorder() {
			useLayoutEffect(() => {
				atLayout.push(document.activeElement);
			});
			useEffect(() => {
				atPassive.push(document.activeElement);
			});
			return null;
		}

		// The node lives in the common parent, so publishing it re-renders the
		// recorder too — which is what puts its layout effect in the same commit
		// as the one that arms the trap.
		function Rig() {
			const [panel, panelRef] = useElementRef<HTMLDivElement>();
			return (
				<>
					<Trap node={panel} />
					<div id="trap" ref={panelRef}>
						<button id="a">A</button>
					</div>
					<Recorder />
				</>
			);
		}

		render(<Rig />);

		expect(atLayout.at(-1)).toBe(document.getElementById("a"));
		expect(atPassive.at(-1)).toBe(document.getElementById("a"));
	});

	it("returns an identity-stable handle across re-renders", () => {
		withOutsideTrigger();

		const handles: FocusTrapHandle[] = [];
		const { rerender } = render(
			<Panel onHandle={(h) => handles.push(h)}>
				<button id="a">A</button>
			</Panel>
		);
		rerender(
			<Panel onHandle={(h) => handles.push(h)}>
				<button id="a">A</button>
			</Panel>
		);

		expect(handles.length).toBeGreaterThan(1);
		expect(new Set(handles).size).toBe(1);
	});

	it("returns focus to the trigger on unmount", () => {
		const outside = withOutsideTrigger();

		const { unmount } = render(
			<Panel>
				<button id="a">A</button>
			</Panel>
		);
		expect(document.activeElement?.id).toBe("a");

		unmount();

		expect(document.activeElement).toBe(outside);
	});

	it("does not return focus on unmount when returnFocus is false", () => {
		const outside = withOutsideTrigger();

		const { unmount } = render(
			<Panel returnFocus={false}>
				<button id="a">A</button>
			</Panel>
		);
		expect(document.activeElement).toBe(document.getElementById("a"));

		unmount();

		// The panel is gone, so focus cannot stay on `#a` — but the trap did
		// not put it back on the trigger, which is what `returnFocus: false`
		// buys.
		expect(document.activeElement).not.toBe(outside);
	});

	it("runs the eager return through the handle while the panel is still mounted", () => {
		const outside = withOutsideTrigger();

		let handle: FocusTrapHandle | null = null;
		render(
			<Panel
				onHandle={(h) => {
					handle = h;
				}}
			>
				<button id="a">A</button>
			</Panel>
		);

		const trap = handle as unknown as FocusTrapHandle;
		trap.returnFocusNow();

		expect(document.activeElement).toBe(outside);
		expect(document.getElementById("trap")).not.toBeNull();
	});

	it("re-arms through the handle after an eager return", () => {
		const outside = withOutsideTrigger();

		let handle: FocusTrapHandle | null = null;
		render(
			<Panel
				onHandle={(h) => {
					handle = h;
				}}
			>
				<button id="a">A</button>
			</Panel>
		);

		const trap = handle as unknown as FocusTrapHandle;
		trap.returnFocusNow();
		expect(document.activeElement).toBe(outside);

		trap.rearm();
		expect(document.activeElement?.id).toBe("a");
	});

	it("resolves a ref passed as initialFocus", () => {
		withOutsideTrigger();

		function RefPanel() {
			const [panel, panelRef] = useElementRef<HTMLDivElement>();
			const second = useRef<HTMLButtonElement>(null);
			useFocusTrap(panel, { initialFocus: second });
			return (
				<div ref={panelRef}>
					<button id="a">A</button>
					<button id="b" ref={second}>
						B
					</button>
				</div>
			);
		}

		render(<RefPanel />);

		expect(document.activeElement?.id).toBe("b");
	});

	// A retargeted `initialFocus` flows through the core's `update()`, not
	// through a re-attach: focus must NOT jump on the re-render, and the next
	// re-arm must honour the new target.
	it("retargets initialFocus without re-running the initial focus move", () => {
		withOutsideTrigger();

		let handle: FocusTrapHandle | null = null;

		function RetargetPanel({ target }: { target: "a" | "b" }) {
			const [panel, panelRef] = useElementRef<HTMLDivElement>();
			const a = useRef<HTMLButtonElement>(null);
			const b = useRef<HTMLButtonElement>(null);
			handle = useFocusTrap(panel, { initialFocus: target === "a" ? a : b });
			return (
				<div ref={panelRef}>
					<button id="a" ref={a}>
						A
					</button>
					<button id="b" ref={b}>
						B
					</button>
				</div>
			);
		}

		const { rerender } = render(<RetargetPanel target="a" />);
		expect(document.activeElement?.id).toBe("a");

		rerender(<RetargetPanel target="b" />);
		// Still on "a": an option change updates the trap, it does not re-arm it.
		expect(document.activeElement?.id).toBe("a");

		const trap = handle as unknown as FocusTrapHandle;
		trap.returnFocusNow();
		trap.rearm();

		expect(document.activeElement?.id).toBe("b");
	});

	it("does nothing while the node is still null", () => {
		const outside = withOutsideTrigger();

		let handle: FocusTrapHandle | null = null;
		function NullPanel() {
			handle = useFocusTrap(null);
			return <div id="trap" />;
		}

		render(<NullPanel />);

		expect(document.activeElement).toBe(outside);
		const trap = handle as unknown as FocusTrapHandle;
		expect(() => {
			trap.returnFocusNow();
			trap.rearm();
		}).not.toThrow();
		expect(document.activeElement).toBe(outside);
	});

	// `previouslyFocused` is captured INSIDE the effect, never in a
	// render-phase ref, so the double cycle is mount (focus panel) → cleanup
	// (return focus to the trigger) → mount (recapture the trigger, focus
	// panel). Self-healing, at the cost of one extra focus round-trip in dev.
	it("survives the StrictMode double cycle and still returns focus to the trigger", () => {
		const outside = withOutsideTrigger();

		const { unmount } = render(
			<StrictMode>
				<Panel>
					<button id="a">A</button>
				</Panel>
			</StrictMode>
		);

		expect(document.activeElement?.id).toBe("a");

		unmount();

		expect(document.activeElement).toBe(outside);
	});
});
