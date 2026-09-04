import { render, cleanup, fireEvent, createEvent } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

// Only `canVibrate` is stubbed — forced `true` so a touch press reaches
// `vibrate()` even though jsdom has no native Vibration API to satisfy the
// real check. `vibrate` itself is left as the REAL implementation: the
// contract's own test spec ("haptic calls stubbed `navigator.vibrate` with
// `10` / `[15,60,15]`, not for mouse, no throw when absent") wants pattern
// *resolution* and the actual `navigator.vibrate` call exercised, not just a
// pattern name captured by a fake `vibrate`.
vi.mock("../../internals/motion/haptics.js", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../internals/motion/haptics.js")>();
	return { ...actual, canVibrate: () => true };
});

import { Pressable } from "./Pressable.js";

/**
 * `PointerEvent`, which the jsdom this package runs on does not implement.
 *
 * Without it `fireEvent.pointerDown` falls back to a plain `Event` and drops
 * the entire init object on the floor — `pointerType` and `button` arrive as
 * `undefined`, so the mouse-button filter and the touch-only haptic branch
 * would both be exercised for the wrong reason. Extending `MouseEvent` is what
 * makes `button` real. Test-only and file-local, installed only where the host
 * lacks the constructor — a newer jsdom, and a browser, keep their own.
 * (Same rig as the dock suite's.)
 */
class PointerEventPolyfill extends MouseEvent {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly isPrimary: boolean;

	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
		this.pointerType = init.pointerType ?? "";
		this.isPrimary = init.isPrimary ?? false;
	}
}

if (typeof window.PointerEvent === "undefined") {
	Object.defineProperty(window, "PointerEvent", {
		writable: true,
		configurable: true,
		value: PointerEventPolyfill,
	});
}

function buttonChild(label = "Press me") {
	return <button>{label}</button>;
}

function wrapper(): HTMLElement {
	return document.querySelector(".ft-pressable") as HTMLElement;
}

function innerButton(): HTMLButtonElement {
	return wrapper().querySelector("button") as HTMLButtonElement;
}

afterEach(() => {
	cleanup();
});

describe("Pressable — pointer lifecycle", () => {
	it("sets data-pressed on pointerdown and clears it on pointerup", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		fireEvent.pointerUp(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears data-pressed on pointercancel", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		fireEvent.pointerCancel(wrapper(), { pointerId: 1 });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears data-pressed on pointerleave (press-and-drag-off)", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		fireEvent.pointerLeave(wrapper(), { pointerId: 1 });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears data-pressed on focusout", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		fireEvent.focusOut(wrapper());
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("ignores a non-primary mouse button", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 2, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("touch and pen contacts are not filtered by the mouse-button check", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
	});
});

describe("Pressable — keyboard lifecycle", () => {
	it("sets data-pressed on Space/Enter keydown when the target is inside the wrapper, clears on keyup", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		const btn = innerButton();

		fireEvent.keyDown(btn, { key: "Enter" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
		fireEvent.keyUp(btn, { key: "Enter" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		fireEvent.keyDown(btn, { key: " " });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
		fireEvent.keyUp(btn, { key: " " });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("a keydown outside the wrapper never reaches it (bubbling never delivers it, the guard is a second line of defense)", async () => {
		const { container } = render(<Pressable>{buttonChild()}</Pressable>);
		const sibling = document.createElement("button");
		container.appendChild(sibling);

		fireEvent.keyDown(sibling, { key: "Enter" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("ignores a repeated keydown and does not re-fire on the trailing repeat", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		const btn = innerButton();

		// A held key's very first keydown is never itself `repeat: true` — a
		// repeat-only keydown (simulating a key that was already held when
		// this element gained focus) must not arm the pressed state at all.
		fireEvent.keyDown(btn, { key: "Enter", repeat: true });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		fireEvent.keyDown(btn, { key: "Enter" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		// Subsequent OS auto-repeat while still held must not throw the state
		// off — it stays pressed, the transition never restarts.
		fireEvent.keyDown(btn, { key: "Enter", repeat: true });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
	});

	it("ignores keys other than Space/Enter", async () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.keyDown(innerButton(), { key: "Tab" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});
});

describe("Pressable — disabled", () => {
	it("suppresses pointer and keyboard presses, and sets data-disabled", async () => {
		render(<Pressable disabled>{buttonChild()}</Pressable>);
		expect(wrapper()).toHaveAttribute("data-disabled", "true");

		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		fireEvent.keyDown(innerButton(), { key: "Enter" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears a live press when disabled flips true mid-press, and a later re-enable stays unpressed", async () => {
		const { rerender } = render(<Pressable disabled={false}>{buttonChild()}</Pressable>);

		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		// The press handler disables the wrapper (a "Save" submitting) and no
		// pointerup/focusout follows — Firefox delivers no pointerup to a
		// control disabled under the pointer, and a click that never focused
		// the button delivers no focusout either. The state itself must be
		// released, not merely hidden by the CSS `:not([data-disabled])`
		// guard.
		rerender(<Pressable disabled={true}>{buttonChild()}</Pressable>);
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		// The async work resolved and the wrapper is interactive again: no
		// stale press resurfaces, because there is no stale press left.
		rerender(<Pressable disabled={false}>{buttonChild()}</Pressable>);
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("omits data-disabled entirely when not disabled", () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		expect(wrapper()).not.toHaveAttribute("data-disabled");
	});
});

describe("Pressable — haptics", () => {
	// `navigator.vibrate` doesn't exist in jsdom by default; each test that
	// wants to observe a call defines it, and cleanup removes it again so a
	// later test's "absent" case sees the real, unpatched environment.
	function stubVibrate() {
		const spy = vi.fn(() => true);
		Object.defineProperty(navigator, "vibrate", { value: spy, configurable: true });
		return spy;
	}

	afterEach(() => {
		// @ts-expect-error test-only teardown of a property this file added
		delete navigator.vibrate;
	});

	it("vibrates on a touch pointerdown when haptic is set, resolved to the pattern's numeric value", async () => {
		const vibrateSpy = stubVibrate();
		render(<Pressable haptic="medium">{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(vibrateSpy).toHaveBeenCalledTimes(1);
		expect(vibrateSpy).toHaveBeenCalledWith(25);
	});

	it("resolves a multi-beat pattern name to its array form", async () => {
		const vibrateSpy = stubVibrate();
		render(<Pressable haptic="success">{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(vibrateSpy).toHaveBeenCalledWith([15, 60, 15]);
	});

	it("does not vibrate for a mouse press", async () => {
		const vibrateSpy = stubVibrate();
		render(<Pressable haptic="medium">{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(vibrateSpy).not.toHaveBeenCalled();
	});

	it("does not vibrate for a pen press", async () => {
		const vibrateSpy = stubVibrate();
		render(<Pressable haptic="medium">{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "pen" });
		expect(vibrateSpy).not.toHaveBeenCalled();
	});

	it("never vibrates when haptic is false (the default)", async () => {
		const vibrateSpy = stubVibrate();
		render(<Pressable>{buttonChild()}</Pressable>);
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(vibrateSpy).not.toHaveBeenCalled();
	});

	it("does not throw on a touch pointerdown when navigator.vibrate is absent (jsdom's default)", async () => {
		render(<Pressable haptic="light">{buttonChild()}</Pressable>);
		// jsdom has no `navigator.vibrate` unless a test stubs one (see
		// `stubVibrate` above, undone by this block's own `afterEach`) — an
		// unhandled throw inside the pointerdown handler would fail this test
		// before the assertion below, so reaching it is itself proof the real
		// `vibrate()` swallowed the missing API rather than propagating it.
		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
	});
});

describe("Pressable — reduced motion", () => {
	it("still tracks data-pressed with prefers-reduced-motion: reduce — only the CSS transition is gated, not the state", async () => {
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query.includes("prefers-reduced-motion"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}));

		try {
			render(<Pressable>{buttonChild()}</Pressable>);
			fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
			expect(wrapper()).toHaveAttribute("data-pressed", "true");
			fireEvent.pointerUp(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
			expect(wrapper()).not.toHaveAttribute("data-pressed");
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe("Pressable — wiring", () => {
	it("binds ref to the wrapper element", () => {
		const ref = createRef<HTMLDivElement>();
		render(<Pressable ref={ref}>{buttonChild()}</Pressable>);
		expect(ref.current).toBe(wrapper());
	});

	it("keeps a callback ref attached across a whole press cycle", () => {
		// A callback ref whose identity is stable must be called ONCE with the
		// node and never re-run while the node stays mounted. An inline arrow
		// in the render body would change identity on every render, and
		// Pressable re-renders on each pointerdown/pointerup — React would
		// answer that with a `null` call followed by a fresh node call, so a
		// consumer measuring the node (or installing an observer on it) would
		// be torn down and re-armed twice per press.
		const setNode = vi.fn();
		render(<Pressable ref={setNode}>{buttonChild()}</Pressable>);
		expect(setNode).toHaveBeenCalledTimes(1);
		expect(setNode).toHaveBeenCalledWith(wrapper());

		fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
		fireEvent.pointerUp(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		expect(setNode).toHaveBeenCalledTimes(1);
		expect(setNode).not.toHaveBeenCalledWith(null);
	});

	it("keeps a callback ref attached across a disabled flip", () => {
		const setNode = vi.fn();
		const { rerender } = render(<Pressable ref={setNode}>{buttonChild()}</Pressable>);
		rerender(
			<Pressable ref={setNode} disabled>
				{buttonChild()}
			</Pressable>
		);
		expect(setNode).toHaveBeenCalledTimes(1);
		expect(setNode).not.toHaveBeenCalledWith(null);
	});

	it("detaches a callback ref with null on unmount", () => {
		const setNode = vi.fn();
		const { unmount } = render(<Pressable ref={setNode}>{buttonChild()}</Pressable>);
		unmount();
		expect(setNode).toHaveBeenLastCalledWith(null);
	});

	it("merges a caller class and spreads restProps onto the wrapper", () => {
		render(
			<Pressable className="extra-class" data-testid="press-me">
				{buttonChild()}
			</Pressable>
		);
		expect(wrapper()).toHaveClass("ft-pressable", "extra-class");
		expect(wrapper()).toHaveAttribute("data-testid", "press-me");
	});

	it("writes --ft-pressable-scale from the scale prop when it differs from the default", () => {
		render(<Pressable scale={0.9}>{buttonChild()}</Pressable>);
		expect(wrapper().style.getPropertyValue("--ft-pressable-scale")).toBe("0.9");
	});

	it("omits --ft-pressable-scale at the default, so a stylesheet rule can still set it", () => {
		render(<Pressable>{buttonChild()}</Pressable>);
		expect(wrapper().style.getPropertyValue("--ft-pressable-scale")).toBe("");
	});

	it("keeps a caller-supplied style alongside the scale var", () => {
		render(
			<Pressable scale={0.9} style={{ width: "100%" }}>
				{buttonChild()}
			</Pressable>
		);
		const style = wrapper().style;
		expect(style.getPropertyValue("width")).toBe("100%");
		expect(style.getPropertyValue("--ft-pressable-scale")).toBe("0.9");
	});

	it("does not preventDefault on the interactive child's own click", async () => {
		let clicked = 0;
		render(<Pressable>{buttonChild()}</Pressable>);
		innerButton().addEventListener("click", () => clicked++);
		const event = createEvent.click(innerButton());
		innerButton().dispatchEvent(event);
		expect(clicked).toBe(1);
		expect(event.defaultPrevented).toBe(false);
	});
});

describe("Pressable — cleanup on unmount", () => {
	it("stops responding to pointer events once unmounted, without throwing", async () => {
		const { unmount } = render(<Pressable>{buttonChild()}</Pressable>);
		const node = wrapper();
		fireEvent.pointerDown(node, { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(node).toHaveAttribute("data-pressed", "true");

		expect(() => unmount()).not.toThrow();

		// React's own template bindings are torn down with the component —
		// there is no manual `addEventListener`/observer/timer in Pressable
		// to leak, so this asserts the detached node is inert rather than
		// asserting a specific teardown call.
		expect(() =>
			node.dispatchEvent(
				new PointerEvent("pointerup", { pointerId: 1, bubbles: true, cancelable: true })
			)
		).not.toThrow();
	});
});
