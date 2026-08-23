import { afterEach, describe, it, expect, vi } from "vitest";
import { focusTrap } from "./focus-trap";

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

describe("focusTrap", () => {
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
		focusTrap(trapNode);
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
		focusTrap(trapNode, { initialFocus: b });
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
		focusTrap(trapNode);
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
		focusTrap(trapNode);

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
		focusTrap(trapNode);
		trapNode.querySelector<HTMLElement>("#b")!.focus();

		const event = pressTab();

		// jsdom does not implement native Tab traversal; the action only
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
		focusTrap(trapNode);

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
		const trap = focusTrap(trapNode);
		expect(document.activeElement?.id).toBe("a");

		trap?.destroy?.();
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
		const trap = focusTrap(trapNode, { returnFocus: false });
		trapNode.querySelector<HTMLElement>("#a")!.focus();

		trap?.destroy?.();
		expect(document.activeElement?.id).toBe("a");

		outside.remove();
	});

	// The element `previouslyFocused` closed over is a raw reference, not a
	// live query — if it leaves the document while the trap is still active
	// (a toolbar re-render, a list row disappearing, a trigger inside a
	// reordering `{#each}`), `.focus()` on it is the same silent no-op any
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
		const trap = focusTrap(trapNode, { fallbackFocus: () => fallback });

		outside.remove(); // the element focus would otherwise return to

		trap?.destroy?.();
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
		const trap = focusTrap(trapNode, { fallbackFocus: () => danglingFallback });

		outside.remove();

		trap?.destroy?.();
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
		const trap = focusTrap(trapNode, {
			fallbackFocus: () => {
				fallbackCalled = true;
				return null;
			},
		});

		trap?.destroy?.();
		expect(document.activeElement?.id).toBe("outside");
		expect(fallbackCalled).toBe(false);

		outside.remove();
	});
});

describe("focusTrap — visibility and empty containers", () => {
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
		const action = focusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("real");
		action?.destroy?.();
	});

	it("falls back to focusing the container when there are no focusable descendants", () => {
		const trapNode = setup(`<div id="trap"><p>Loading…</p></div>`);
		const action = focusTrap(trapNode, {});
		expect(document.activeElement).toBe(trapNode);
		expect(trapNode.getAttribute("tabindex")).toBe("-1");
		action?.destroy?.();
	});
});

// `onActivate` is the answer to a close that ANIMATES. An action's
// `destroy()` is delayed by the exit transition, so a trap that only returns
// focus there would leave a keyboard user on `<body>` for the whole fade —
// Svelte sets `inert` on the panel the instant the exit starts, which drops
// focus out of it. The handle runs the same chain at the dismiss instant.
describe("focusTrap — the eager return handle", () => {
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

	it("hands the caller a function exactly once, synchronously, during action creation", () => {
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);
		const handles: unknown[] = [];

		const trap = focusTrap(trapNode, { onActivate: (r) => handles.push(r) });

		expect(handles).toHaveLength(1);
		expect(typeof handles[0]).toBe("function");
		trap?.destroy?.();
	});

	it("hands it over AFTER the initial focus move, so the handle restores what the trap displaced", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let activeAtHandover: Element | null = null;
		const trap = focusTrap(trapNode, {
			onActivate: () => (activeAtHandover = document.activeElement),
		});

		expect(activeAtHandover).toBe(trapNode.querySelector("#a"));
		trap?.destroy?.();
		outside.remove();
	});

	it("returns focus immediately when called, long before destroy()", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		const trap = focusTrap(trapNode, { onActivate: (r) => (returnNow = r) });
		expect(document.activeElement?.id).toBe("a");

		returnNow!();

		// The node is still mounted and destroy() has not run — this is the
		// window an animated exit lives in.
		expect(trapNode.isConnected).toBe(true);
		expect(document.activeElement).toBe(outside);

		trap?.destroy?.();
		outside.remove();
	});

	it("is idempotent: calling the handle twice moves focus exactly once", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		const trap = focusTrap(trapNode, { onActivate: (r) => (returnNow = r) });

		const focusSpy = vi.spyOn(outside, "focus");
		returnNow!();
		returnNow!();

		expect(focusSpy).toHaveBeenCalledTimes(1);
		trap?.destroy?.();
		outside.remove();
	});

	it("disarms destroy(): the handle then the unmount still moves focus exactly once", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		const trap = focusTrap(trapNode, { onActivate: (r) => (returnNow = r) });

		const focusSpy = vi.spyOn(outside, "focus");
		returnNow!();
		trap?.destroy?.();

		expect(focusSpy).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	// The owner-frozen answer to a caller that contradicts itself: asking for
	// the handle IS asking for the return, so the handle wins. `returnFocus`
	// governs the unmount path only.
	it("returnFocus: false does not disable the handle — it only disables the unmount path", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		const trap = focusTrap(trapNode, {
			returnFocus: false,
			onActivate: (r) => (returnNow = r),
		});
		expect(document.activeElement?.id).toBe("a");

		returnNow!();
		expect(document.activeElement).toBe(outside);

		trap?.destroy?.();
		outside.remove();
	});

	it("returnFocus: false with no handle still returns nothing on destroy, as before", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = focusTrap(trapNode, { returnFocus: false });
		trap?.destroy?.();

		expect(document.activeElement?.id).toBe("a");
		outside.remove();
	});

	it("runs the same three-step chain as destroy(), falling back when the original is gone", () => {
		const outside = withOutsideTrigger();
		const fallback = document.createElement("button");
		fallback.id = "fallback";
		document.body.appendChild(fallback);
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		const trap = focusTrap(trapNode, {
			fallbackFocus: () => fallback,
			onActivate: (r) => (returnNow = r),
		});

		outside.remove();
		returnNow!();

		expect(document.activeElement).toBe(fallback);
		trap?.destroy?.();
		fallback.remove();
	});

	it("omitting onActivate leaves the destroy-time return exactly as it was", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = focusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("a");

		trap?.destroy?.();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});

// A reopen DURING the exit is not a new mount: Svelte reverses the outro and
// resumes the same branch, so the action is never re-created and neither the
// initial focus move nor `onActivate` runs again. `rearm` — the second
// function handed to `onActivate` — is what puts focus back inside the panel
// and un-spends the eager return, so the NEXT dismiss still returns focus.
// Without it a reopened `aria-modal` panel sits open with focus on the
// trigger behind it, and every later close of that instance returns focus
// nowhere at all.
describe("focusTrap — re-arming after a reopen mid-exit", () => {
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

	it("hands over a re-arm function alongside the return handle, at the same moment", () => {
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);
		const args: unknown[][] = [];

		const trap = focusTrap(trapNode, { onActivate: (...rest) => args.push(rest) });

		expect(args).toHaveLength(1);
		expect(args[0]).toHaveLength(2);
		expect(typeof args[0][0]).toBe("function");
		expect(typeof args[0][1]).toBe("function");
		trap?.destroy?.();
	});

	it("puts focus back inside the trap after the eager return moved it out", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		let rearm: (() => void) | null = null;
		const trap = focusTrap(trapNode, {
			onActivate: (r, again) => {
				returnNow = r;
				rearm = again;
			},
		});

		// Dismiss: the eager return puts focus on the trigger while the panel
		// is still mounted and fading.
		returnNow!();
		expect(document.activeElement).toBe(outside);

		// Reopen mid-fade: the same action instance is still mounted.
		rearm!();

		expect(trapNode.contains(document.activeElement)).toBe(true);
		expect(document.activeElement?.id).toBe("a");
		trap?.destroy?.();
		outside.remove();
	});

	it("re-arms destroy(): the dismiss after a reopen still returns focus", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		let rearm: (() => void) | null = null;
		const trap = focusTrap(trapNode, {
			onActivate: (r, again) => {
				returnNow = r;
				rearm = again;
			},
		});

		returnNow!();
		rearm!();
		trap?.destroy?.();

		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("re-arms the handle itself: the next outrostart returns focus again", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		let returnNow: (() => void) | null = null;
		let rearm: (() => void) | null = null;
		const trap = focusTrap(trapNode, {
			onActivate: (r, again) => {
				returnNow = r;
				rearm = again;
			},
		});

		const focusSpy = vi.spyOn(outside, "focus");
		returnNow!(); // first dismiss
		rearm!(); // reopened mid-fade
		returnNow!(); // second, genuine dismiss

		expect(focusSpy).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(outside);

		// And it is still idempotent within that second activation.
		returnNow!();
		expect(focusSpy).toHaveBeenCalledTimes(2);

		trap?.destroy?.();
		outside.remove();
	});

	it("does not move focus when it is already inside the trap", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(
			`<div id="trap"><button id="a">A</button><button id="b">B</button></div>`
		);

		let rearm: (() => void) | null = null;
		const trap = focusTrap(trapNode, { onActivate: (_r, again) => (rearm = again) });

		// The very first `introstart` fires with focus already where
		// `focusInitial` just put it, and a user may since have tabbed on.
		const second = trapNode.querySelector<HTMLElement>("#b")!;
		second.focus();
		rearm!();

		expect(document.activeElement).toBe(second);
		trap?.destroy?.();
		outside.remove();
	});

	it("honours initialFocus when it re-arms, not just the first focusable", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(
			`<div id="trap"><button id="a">A</button><button id="b">B</button></div>`
		);
		const initial = trapNode.querySelector<HTMLElement>("#b")!;

		let returnNow: (() => void) | null = null;
		let rearm: (() => void) | null = null;
		const trap = focusTrap(trapNode, {
			initialFocus: initial,
			onActivate: (r, again) => {
				returnNow = r;
				rearm = again;
			},
		});
		expect(document.activeElement).toBe(initial);

		returnNow!();
		rearm!();

		expect(document.activeElement).toBe(initial);
		trap?.destroy?.();
		outside.remove();
	});

	it("leaves a trap that never took the handle untouched", () => {
		const outside = withOutsideTrigger();
		const trapNode = setup(`<div id="trap"><button id="a">A</button></div>`);

		const trap = focusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("a");

		trap?.destroy?.();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});
