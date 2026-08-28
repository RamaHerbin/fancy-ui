import { render, cleanup, fireEvent, createEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

// Only `canVibrate` is stubbed — forced `true` so a touch press reaches
// `vibrate()` even though jsdom has no native Vibration API to satisfy the
// real check. `vibrate` itself is left as the REAL implementation: the
// contract's own test spec ("haptic calls stubbed `navigator.vibrate` with
// `10` / `[15,60,15]`, not for mouse, no throw when absent") wants pattern
// *resolution* and the actual `navigator.vibrate` call exercised, not just a
// pattern name captured by a fake `vibrate`.
vi.mock("../_internals/motion/haptics.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/motion/haptics.js")>();
	return { ...actual, canVibrate: () => true };
});

import Pressable from "./Pressable.svelte";

function buttonSnippet(label = "Press me") {
	return createRawSnippet(() => ({ render: () => `<button>${label}</button>` }));
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
		render(Pressable, { props: { children: buttonSnippet() } });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		await fireEvent.pointerUp(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears data-pressed on pointercancel", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		await fireEvent.pointerCancel(wrapper(), { pointerId: 1 });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears data-pressed on pointerleave (press-and-drag-off)", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		await fireEvent.pointerLeave(wrapper(), { pointerId: 1 });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears data-pressed on focusout", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		await fireEvent.focusOut(wrapper());
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("ignores a non-primary mouse button", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 2, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("touch and pen contacts are not filtered by the mouse-button check", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
	});
});

describe("Pressable — keyboard lifecycle", () => {
	it("sets data-pressed on Space/Enter keydown when the target is inside the wrapper, clears on keyup", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		const btn = innerButton();

		await fireEvent.keyDown(btn, { key: "Enter" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
		await fireEvent.keyUp(btn, { key: "Enter" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		await fireEvent.keyDown(btn, { key: " " });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
		await fireEvent.keyUp(btn, { key: " " });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("a keydown outside the wrapper never reaches it (bubbling never delivers it, the guard is a second line of defense)", async () => {
		const { container } = render(Pressable, { props: { children: buttonSnippet() } });
		const sibling = document.createElement("button");
		container.appendChild(sibling);

		await fireEvent.keyDown(sibling, { key: "Enter" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("ignores a repeated keydown and does not re-fire on the trailing repeat", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		const btn = innerButton();

		// A held key's very first keydown is never itself `repeat: true` — a
		// repeat-only keydown (simulating a key that was already held when
		// this element gained focus) must not arm the pressed state at all.
		await fireEvent.keyDown(btn, { key: "Enter", repeat: true });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		await fireEvent.keyDown(btn, { key: "Enter" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		// Subsequent OS auto-repeat while still held must not throw the state
		// off — it stays pressed, the transition never restarts.
		await fireEvent.keyDown(btn, { key: "Enter", repeat: true });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");
	});

	it("ignores keys other than Space/Enter", async () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.keyDown(innerButton(), { key: "Tab" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});
});

describe("Pressable — disabled", () => {
	it("suppresses pointer and keyboard presses, and sets data-disabled", async () => {
		render(Pressable, { props: { children: buttonSnippet(), disabled: true } });
		expect(wrapper()).toHaveAttribute("data-disabled", "true");

		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		await fireEvent.keyDown(innerButton(), { key: "Enter" });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("clears a live press when disabled flips true mid-press, and a later re-enable stays unpressed", async () => {
		const { rerender } = render(Pressable, {
			props: { children: buttonSnippet(), disabled: false },
		});

		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(wrapper()).toHaveAttribute("data-pressed", "true");

		// The press handler disables the wrapper (a "Save" submitting) and no
		// pointerup/focusout follows — Firefox delivers no pointerup to a
		// control disabled under the pointer, and a click that never focused
		// the button delivers no focusout either. The state itself must be
		// released, not merely hidden by the CSS `:not([data-disabled])`
		// guard.
		await rerender({ disabled: true });
		expect(wrapper()).not.toHaveAttribute("data-pressed");

		// The async work resolved and the wrapper is interactive again: no
		// stale press resurfaces, because there is no stale press left.
		await rerender({ disabled: false });
		expect(wrapper()).not.toHaveAttribute("data-pressed");
	});

	it("omits data-disabled entirely when not disabled", () => {
		render(Pressable, { props: { children: buttonSnippet() } });
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
		render(Pressable, { props: { children: buttonSnippet(), haptic: "medium" } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(vibrateSpy).toHaveBeenCalledTimes(1);
		expect(vibrateSpy).toHaveBeenCalledWith(25);
	});

	it("resolves a multi-beat pattern name to its array form", async () => {
		const vibrateSpy = stubVibrate();
		render(Pressable, { props: { children: buttonSnippet(), haptic: "success" } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(vibrateSpy).toHaveBeenCalledWith([15, 60, 15]);
	});

	it("does not vibrate for a mouse press", async () => {
		const vibrateSpy = stubVibrate();
		render(Pressable, { props: { children: buttonSnippet(), haptic: "medium" } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(vibrateSpy).not.toHaveBeenCalled();
	});

	it("does not vibrate for a pen press", async () => {
		const vibrateSpy = stubVibrate();
		render(Pressable, { props: { children: buttonSnippet(), haptic: "medium" } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "pen" });
		expect(vibrateSpy).not.toHaveBeenCalled();
	});

	it("never vibrates when haptic is false (the default)", async () => {
		const vibrateSpy = stubVibrate();
		render(Pressable, { props: { children: buttonSnippet() } });
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
		expect(vibrateSpy).not.toHaveBeenCalled();
	});

	it("does not throw on a touch pointerdown when navigator.vibrate is absent (jsdom's default)", async () => {
		render(Pressable, { props: { children: buttonSnippet(), haptic: "light" } });
		// jsdom has no `navigator.vibrate` unless a test stubs one (see
		// `stubVibrate` above, undone by this block's own `afterEach`) — an
		// unhandled throw inside the pointerdown handler would reject this
		// `await` and fail the test, so reaching the assertion below is itself
		// proof the real `vibrate()` swallowed the missing API rather than
		// propagating it.
		await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "touch" });
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
			render(Pressable, { props: { children: buttonSnippet() } });
			await fireEvent.pointerDown(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
			expect(wrapper()).toHaveAttribute("data-pressed", "true");
			await fireEvent.pointerUp(wrapper(), { pointerId: 1, button: 0, pointerType: "mouse" });
			expect(wrapper()).not.toHaveAttribute("data-pressed");
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe("Pressable — wiring", () => {
	it("binds ref to the wrapper element", () => {
		let ref: HTMLDivElement | null = null;
		render(Pressable, {
			props: {
				children: buttonSnippet(),
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(wrapper());
	});

	it("merges a caller class and spreads restProps onto the wrapper", () => {
		render(Pressable, {
			props: { children: buttonSnippet(), class: "extra-class", "data-testid": "press-me" },
		});
		expect(wrapper()).toHaveClass("ft-pressable", "extra-class");
		expect(wrapper()).toHaveAttribute("data-testid", "press-me");
	});

	it("writes --ft-pressable-scale from the scale prop when it differs from the default", () => {
		render(Pressable, { props: { children: buttonSnippet(), scale: 0.9 } });
		expect(wrapper().style.getPropertyValue("--ft-pressable-scale")).toBe("0.9");
	});

	it("omits --ft-pressable-scale at the default, so a stylesheet rule can still set it", () => {
		render(Pressable, { props: { children: buttonSnippet() } });
		expect(wrapper().style.getPropertyValue("--ft-pressable-scale")).toBe("");
	});

	it("keeps a caller-supplied style alongside the scale var", () => {
		render(Pressable, {
			props: { children: buttonSnippet(), scale: 0.9, style: "width: 100%" },
		});
		const style = wrapper().style;
		expect(style.getPropertyValue("width")).toBe("100%");
		expect(style.getPropertyValue("--ft-pressable-scale")).toBe("0.9");
	});

	it("does not preventDefault on the interactive child's own click", async () => {
		let clicked = 0;
		render(Pressable, { props: { children: buttonSnippet() } });
		innerButton().addEventListener("click", () => clicked++);
		const event = createEvent.click(innerButton());
		innerButton().dispatchEvent(event);
		expect(clicked).toBe(1);
		expect(event.defaultPrevented).toBe(false);
	});
});

describe("Pressable — cleanup on unmount", () => {
	it("stops responding to pointer events once unmounted, without throwing", async () => {
		const { unmount } = render(Pressable, { props: { children: buttonSnippet() } });
		const node = wrapper();
		await fireEvent.pointerDown(node, { pointerId: 1, button: 0, pointerType: "mouse" });
		expect(node).toHaveAttribute("data-pressed", "true");

		expect(() => unmount()).not.toThrow();

		// Svelte's own template bindings are torn down with the component —
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
