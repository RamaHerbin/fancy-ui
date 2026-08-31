import { useEffect, useRef, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Autocomplete } from "./Autocomplete.js";
import { attachDismissable } from "../../internals/dismissable.js";
import { FieldProvider, type FieldContext } from "../../internals/field.js";

// The source suite's two `.test.svelte` harnesses collapse into the two
// components below — a `.test.svelte` file exists only because a Svelte
// component needs its own file.

const CITIES = ["Paris", "Parma", "Prague", "London"];

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando reflecting to no attribute — a test reading `.inert` back would
 * pass even if the real browser behaviour (an `inert` ATTRIBUTE) was never
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
 * The React spelling of the source's `bind:value` + `bind:ref` rig: the caller
 * owns the value and writes it back from `onValueChange`, and echoes it into
 * the DOM, which is the only way to prove `value` travels back out to the
 * consumer rather than merely changing what the input draws. Same for `ref`.
 */
function ValueHarness({
	suggestions,
	onValueChange,
	onSelect,
}: {
	suggestions: string[];
	onValueChange?: (value: string) => void;
	onSelect?: (suggestion: string) => void;
}) {
	const [value, setValue] = useState("");
	const el = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<Autocomplete
				ref={el}
				suggestions={suggestions}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				onSelect={onSelect}
				label="City"
			/>
			<span data-testid="bound-value">{value}</span>
		</>
	);
}

/**
 * Proves Autocomplete consumes the shared field context rather than throwing
 * or ignoring it. Publishes a hand-built `FieldContext` instead of rendering a
 * real FormField — this wave's components are built against the frozen
 * FieldContext surface, not against each other.
 *
 * Autocomplete's own props are deliberately configurable rather than
 * hardcoded: a test needs both polarities to actually distinguish `??` from
 * `||` — context `true` beating own `false` (the defaults below), and context
 * `false` beating own `true` (passed explicitly).
 */
function FieldHarness({
	suggestions,
	context,
	id = "own-id",
	disabled = false,
	required = false,
	invalid = false,
}: {
	suggestions: string[];
	context: FieldContext;
	id?: string;
	disabled?: boolean;
	required?: boolean;
	invalid?: boolean;
}) {
	return (
		<FieldProvider value={context}>
			<Autocomplete
				suggestions={suggestions}
				id={id}
				invalid={invalid}
				required={required}
				disabled={disabled}
			/>
		</FieldProvider>
	);
}

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input[role='combobox']") as HTMLInputElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-autocomplete-panel");
}

function options(): HTMLElement[] {
	return Array.from(document.querySelectorAll(".ft-autocomplete-panel [role='option']"));
}

function liveRegion(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="status"]') as HTMLElement;
}

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before a render is visible to the very next read. */
function stubReducedMotion(matches = true): void {
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
 * Dispatches Escape inside a SYNCHRONOUS `act`: the listener is a native
 * document one, so the state update it schedules has to be flushed for the
 * next assertion to see it — but a synchronous `act` does not drain
 * microtasks, which is what keeps an exit leg in flight across the assertions
 * that need it there.
 */
function pressEscape(): void {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

function pointerDownOn(target: HTMLElement): void {
	const init = { bubbles: true, cancelable: true };
	// The jsdom version this package pins does not implement `PointerEvent`. A
	// `MouseEvent` of the same type carries everything the handler reads.
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
 * on a MICROTASK and `runTransition` chains a dummy into the real animation, so
 * a settled leg is two turns away; an async `act` crosses a macrotask boundary
 * and flushes the React updates the finish schedules. A leg left in flight when
 * the test body returns updates React state outside `act`, which prints a
 * warning per panel.
 */
const settleLegs = () => act(async () => {});

describe("Autocomplete", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		document.body.querySelectorAll(".ft-autocomplete-panel").forEach((el) => el.remove());
	});

	it("renders closed, with aria-expanded false and no aria-controls", () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(panel()).toBeNull();
	});

	it("opens and lists matches as the user types, case-insensitively", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		const rows = options();
		expect(rows).toHaveLength(2);
		expect(rows[0]!.textContent).toContain("Paris");
		expect(rows[1]!.textContent).toContain("Parma");
		await settleLegs();
	});

	it("highlights the real matched range, not a naive case-sensitive indexOf of the raw query", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		const strong = options()[0]!.querySelector("strong");
		// Suggestion is "Paris"; typed query is lowercase "par" — a naive
		// case-sensitive `indexOf` would miss it entirely ("P" !== "p").
		expect(strong?.textContent).toBe("Par");
		expect(options()[0]!.textContent).toContain("Paris");
		await settleLegs();
	});

	it("shows no panel at all when nothing matches", () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "zzz" } });
		expect(panel()).toBeNull();
		expect(el.getAttribute("aria-expanded")).toBe("false");
	});

	it("suppresses suggestions below minLength", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} minLength={3} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "pa" } });
		expect(panel()).toBeNull();

		fireEvent.input(el, { target: { value: "par" } });
		expect(panel()).not.toBeNull();
		expect(options().length).toBeGreaterThan(0);
		await settleLegs();
	});

	it("defaults minLength to 1", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "p" } });
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("caps the number of suggestions at maxSuggestions", async () => {
		const many = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
		const { container } = render(<Autocomplete suggestions={many} maxSuggestions={5} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "item" } });
		expect(options()).toHaveLength(5);
		await settleLegs();
	});

	it("defaults maxSuggestions to 8", async () => {
		const many = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
		const { container } = render(<Autocomplete suggestions={many} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "item" } });
		expect(options()).toHaveLength(8);
		await settleLegs();
	});

	it("arrowing highlights rows in the list without writing into the field", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);
		el.focus();

		fireEvent.input(el, { target: { value: "par" } });
		expect(el.value).toBe("par");
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[0]!.id);
		// The visible text is untouched by navigation — only the list's own
		// active row changed, not the field.
		expect(el.value).toBe("par");
		expect(document.activeElement).toBe(el);

		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[1]!.id);
		expect(el.value).toBe("par");
		expect(document.activeElement).toBe(el);
		await settleLegs();
	});

	it("Escape restores what the user typed — there is nothing to revert since arrowing never touched it", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		fireEvent.keyDown(el, { key: "ArrowDown" });
		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.value).toBe("par");

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("par");
	});

	it("commits the active suggestion on Enter, closes the panel, and fires onSelect and onValueChange", async () => {
		const onValueChange = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(
			<Autocomplete suggestions={CITIES} onValueChange={onValueChange} onSelect={onSelect} />
		);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		onValueChange.mockClear(); // drop the plain-typing call
		fireEvent.keyDown(el, { key: "ArrowDown" }); // activates "Paris"

		fireEvent.keyDown(el, { key: "Enter" });
		expect(el.value).toBe("Paris");
		expect(onSelect).toHaveBeenCalledWith("Paris");
		expect(onValueChange).toHaveBeenCalledWith("Paris");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Enter with nothing highlighted does not alter the value or fire onSelect", async () => {
		const onSelect = vi.fn();
		const { container } = render(<Autocomplete suggestions={CITIES} onSelect={onSelect} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		fireEvent.keyDown(el, { key: "Enter" });
		expect(onSelect).not.toHaveBeenCalled();
		expect(el.value).toBe("par");
		await settleLegs();
	});

	it("commits on a row click, calling onSelect but not before the click", async () => {
		const onSelect = vi.fn();
		const { container } = render(<Autocomplete suggestions={CITIES} onSelect={onSelect} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		expect(onSelect).not.toHaveBeenCalled();

		fireEvent.click(options()[1]!); // "Parma"
		expect(onSelect).toHaveBeenCalledWith("Parma");
		expect(el.value).toBe("Parma");
		await settleLegs();
	});

	it("onValueChange fires on plain typing, independent of onSelect", async () => {
		const onValueChange = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(
			<Autocomplete suggestions={CITIES} onValueChange={onValueChange} onSelect={onSelect} />
		);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).toHaveBeenCalledWith("par");
		expect(onSelect).not.toHaveBeenCalled();
		await settleLegs();
	});

	it("closes the panel on blur without altering the typed value", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "something unmatched-ish par" } });
		fireEvent.blur(el);
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("something unmatched-ish par");
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);
		fireEvent.input(el, { target: { value: "par" } });
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("announces a suggestion count in a live region, not the suggestion text", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);
		const region = liveRegion(container);
		expect(region.textContent).toBe("");

		fireEvent.input(el, { target: { value: "par" } });
		expect(region.textContent).toBe("2 suggestions");
		expect(region.textContent).not.toContain("Paris");

		fireEvent.input(el, { target: { value: "paris" } });
		expect(region.textContent).toBe("1 suggestion");
		await settleLegs();
	});

	// The three ways this codebase expects a value prop plus its change
	// callback to work: the consumer owning the value, the callback alone, and
	// a plain never-updated value plus that same callback.
	it("round-trips a consumer-owned value", async () => {
		const { container, getByTestId } = render(<ValueHarness suggestions={CITIES} />);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		fireEvent.click(options()[0]!);
		expect(getByTestId("bound-value").textContent).toBe("Paris");
		await settleLegs();
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Autocomplete suggestions={CITIES} onValueChange={onValueChange} />
		);
		const el = input(container);

		fireEvent.input(el, { target: { value: "par" } });
		fireEvent.click(options()[0]!);
		expect(onValueChange).toHaveBeenCalledWith("Paris");
		expect(el.value).toBe("Paris");
		await settleLegs();
	});

	it("works with a plain non-updated value plus onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Autocomplete suggestions={CITIES} value="start" onValueChange={onValueChange} />
		);
		const el = input(container);
		expect(el.value).toBe("start");

		fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).toHaveBeenCalledWith("par");
		expect(el.value).toBe("par");
		await settleLegs();
	});

	it("round-trips the input element through the forwarded ref", () => {
		const { container } = render(<ValueHarness suggestions={CITIES} />);
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("carries name and value directly on the visible input, unlike Combobox", () => {
		const { container } = render(
			<Autocomplete suggestions={CITIES} value="Paris" name="city" />
		);
		const el = input(container);
		expect(el.name).toBe("city");
		expect(el.value).toBe("Paris");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(<Autocomplete suggestions={CITIES} label="City" />);
		expect(input(container).getAttribute("aria-label")).toBe("City");
	});

	it("merges the className prop with the base classes", () => {
		const { container } = render(<Autocomplete suggestions={CITIES} className="mt-4" />);
		const cls = input(container).className;
		expect(cls).toContain("ft-autocomplete");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(
			<Autocomplete suggestions={CITIES} id="solo" invalid required disabled={false} />
		);
		const el = input(container);
		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(<FieldHarness suggestions={CITIES} context={context} />);
		const el = input(container);

		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The test above only exercises context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` values would
	// pass it too, since `true || false` is still `true`. The three below pin
	// the polarity that actually tells `??` and `||` apart: own prop `true`,
	// context `false`, expecting the context's `false` to win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const context: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(
			<FieldHarness suggestions={CITIES} context={context} disabled />
		);
		expect(input(container).disabled).toBe(false);
	});

	it("lets the context's required=false win over the component's own required=true prop", () => {
		const context: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(
			<FieldHarness suggestions={CITIES} context={context} required />
		);
		expect(input(container).required).toBe(false);
	});

	it("lets the context's invalid=false win over the component's own invalid=true prop", () => {
		const context: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(<FieldHarness suggestions={CITIES} context={context} invalid />);
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("blocks input while disabled", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Autocomplete suggestions={CITIES} disabled onValueChange={onValueChange} />
		);
		const el = input(container);
		expect(el.disabled).toBe(true);

		fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	describe("live region clears on close", () => {
		// `{open ? resultsMessage : ""}` reads correct, but that is exactly the
		// kind of thing worth pinning directly — a stale count left announced
		// after the panel closes is a real live-region bug class, not a
		// hypothetical one.
		it("clears on blur", async () => {
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			const el = input(container);
			const region = liveRegion(container);

			fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			fireEvent.blur(el);
			expect(region.textContent).toBe("");
			await settleLegs();
		});

		it("clears on Escape", async () => {
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			const el = input(container);
			const region = liveRegion(container);

			fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			pressEscape();
			await waitFor(() => expect(region.textContent).toBe(""));
		});

		it("clears on an outside click", async () => {
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			const el = input(container);
			const region = liveRegion(container);

			fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			pointerDownOn(outside);
			await waitFor(() => expect(region.textContent).toBe(""));
			outside.remove();
		});
	});

	// Not a test of what the guard prevents (jsdom has no focus-follows-
	// mousedown default action for it to suppress — see the comment on the
	// guard in AutocompletePanel.tsx) — a test of whether the guard itself is
	// actually wired: a real `mousedown` dispatched at a row must come back
	// with `defaultPrevented: true`.
	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		const { container } = render(<Autocomplete suggestions={CITIES} />);
		const el = input(container);
		fireEvent.input(el, { target: { value: "par" } });

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		act(() => {
			options()[0]!.dispatchEvent(event);
		});
		expect(event.defaultPrevented).toBe(true);
		await settleLegs();
	});

	// This panel had no entrance until the core motion pass; it now uses the
	// shared `anchored` transition, whose growth origin follows the side the
	// panel was ACTUALLY placed on. jsdom makes that deterministic: every rect
	// measures 0×0, so the requested `bottom` never overflows the 768px-tall
	// default viewport and never flips.
	describe("entrance", () => {
		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Autocomplete suggestions={CITIES} />);

			fireEvent.input(input(container), { target: { value: "par" } });

			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("start");
			expect(el.style.getPropertyValue("transform-origin")).toBe("left top");
			// Pins the positive case too: without it the reduced-motion test
			// below would pass for the wrong reason — an entrance that never runs
			// at all under any preference.
			expect(animate).toHaveBeenCalled();
			await settleLegs();
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Autocomplete suggestions={CITIES} />);

			fireEvent.input(input(container), { target: { value: "par" } });

			// A zero duration makes the sampler skip `element.animate()` outright
			// instead of running a zero-length animation, and the panel's
			// visibility never depended on the entrance in the first place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
			await settleLegs();
		});
	});

	// The list leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the animation stub. These pin what must be
	// true inside it. `open`, `value` and `onValueChange` all still settle
	// synchronously, which is why every assertion on them above stayed
	// unwrapped.
	describe("exit", () => {
		it("keeps the list mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			const el = input(container);
			fireEvent.input(el, { target: { value: "par" } });
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary React attribute here (divergence D-2), carrying
			// `surfaceState`'s two values.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this on the registered node for the whole exit —
			// which is what stops a row taking a click on its way out.
			expect(closing!.inert).toBe(true);
			// The input has already been told the list is gone.
			expect(el.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// This component closes and reopens on keystrokes, not only on an
		// explicit dismiss: a query that stops matching closes the list, and the
		// very next character that matches again lands inside the exit window.
		// One bidirectional transition reverses the exit in place; a split
		// in/out pair would leave the old node fading while a second one faded
		// in over it.
		it("reverses in place when a keystroke re-matches during the exit, rather than mounting a second list", async () => {
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			const el = input(container);
			fireEvent.input(el, { target: { value: "par" } });
			expect(panel()).not.toBeNull();

			// Never awaited, on purpose: `fireEvent` flushes React's work inside a
			// SYNCHRONOUS `act`, but awaiting anything between the two keystrokes
			// would drain the microtask the animation stub finishes on, unmount
			// the branch, and make the reopen mount a fresh panel — quietly
			// testing nothing.
			fireEvent.input(el, { target: { value: "parx" } }); // matches nothing — the list starts leaving
			expect(panel()!.getAttribute("data-state")).toBe("closing");

			fireEvent.input(el, { target: { value: "par" } }); // matches again, mid-exit
			expect(document.querySelectorAll(".ft-autocomplete-panel")).toHaveLength(1);
			expect(panel()!.getAttribute("data-state")).toBe("open");
			// `toBeFalsy`, not `toBe(false)`: the reversed intro restores the
			// element's ORIGINAL `inert` value, which was never set. Either way
			// the rows take clicks again.
			expect(panel()!.inert).toBeFalsy();
			await settleLegs();
		});

		// PORT ADDITION, not in the source suite. Svelte destroys the `{#if
		// open}` branch that owns the panel and marks it inert first, so its
		// rows are frozen for the length of the outro; React re-renders an
		// exiting subtree normally, and the panel keeps its own snapshot to
		// match. Without it the most common close of all — a query that stopped
		// matching — would empty the list to a bare box halfway through its
		// fade.
		it("keeps the rows it was showing on screen for the length of the exit", async () => {
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			const el = input(container);
			fireEvent.input(el, { target: { value: "par" } });
			expect(options()).toHaveLength(2);

			fireEvent.input(el, { target: { value: "parx" } }); // matches nothing
			expect(panel()!.getAttribute("data-state")).toBe("closing");
			expect(options()).toHaveLength(2);
			expect(options()[0]!.textContent).toContain("Paris");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: ctx.open` gate. A layer on its way out must not swallow
		// the key: the dismiss stack scans past it and hands Escape to whatever
		// is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the autocomplete, so the list sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathHandle = attachDismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(<Autocomplete suggestions={CITIES} />);
			fireEvent.input(input(container), { target: { value: "par" } });

			pressEscape(); // the list is the top LIVE layer and takes this one
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the list is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathHandle.destroy();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes the sampler call
		// `onFinish()` synchronously and never touch `element.animate()`, so a
		// visitor who asked for less motion gets exactly the synchronous close
		// this list had before the exit existed.
		it("closes synchronously and never animates under prefers-reduced-motion", () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Autocomplete suggestions={CITIES} />);
			fireEvent.input(input(container), { target: { value: "par" } });
			expect(panel()).not.toBeNull();

			pressEscape();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});
});
