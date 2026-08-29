import { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Combobox } from "./Combobox.js";
import type { ComboboxOption } from "./types.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";
import { attachDismissable } from "../../internals/dismissable.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";

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

const OPTIONS: ComboboxOption[] = [
	{ value: "svelte-5", label: "Svelte 5" },
	{ value: "sveltekit", label: "SvelteKit" },
	{ value: "react", label: "React" },
];

const OPTIONS_WITH_DISABLED: ComboboxOption[] = [
	{ value: "svelte-5", label: "Svelte 5" },
	{ value: "sveltekit", label: "SvelteKit", disabled: true },
	{ value: "react", label: "React" },
];

const OPTIONS_FIRST_DISABLED: ComboboxOption[] = [
	{ value: "svelte-5", label: "Svelte 5", disabled: true },
	{ value: "sveltekit", label: "SvelteKit" },
	{ value: "react", label: "React" },
];

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input[role='combobox']") as HTMLInputElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-combobox-panel");
}

function options(): HTMLElement[] {
	return Array.from(document.querySelectorAll(".ft-combobox-panel [role='option']"));
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
 * microtasks, and the exit window is exactly two microtasks under the
 * animation stub. Anything awaited between the dismiss and the assertion has
 * already drained it and the test would pass for the wrong reason.
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
	// The jsdom version this package pins does not implement `PointerEvent`.
	// A `MouseEvent` of the same type carries everything the handler reads.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Drains an entrance or exit leg to completion. The animation stub finishes on
 * a MICROTASK and the transition runtime chains a dummy into the real
 * animation, so a settled leg is two turns away; an async `act` crosses a
 * macrotask boundary and flushes the React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

/**
 * Test-only rig standing in for the source's `bind:value` + `bind:ref`
 * harness: the caller owns the value and writes it back from
 * `onValueChange`, and echoing it into the DOM is what proves the value
 * travels back out to the consumer rather than merely changing what the input
 * draws. The same goes for the input element itself.
 */
function ValueHarness({ options: opts }: { options: ComboboxOption[] }) {
	const [value, setValue] = useState("");
	const [el, elRef] = useElementRef<HTMLInputElement>();

	useEffect(() => {
		el?.setAttribute("data-bound-ref", "yes");
	}, [el]);

	return (
		<>
			<Combobox
				options={opts}
				value={value}
				onValueChange={setValue}
				ref={elRef}
				label="Framework"
			/>
			<span data-testid="bound-value">{value}</span>
		</>
	);
}

/**
 * Test-only rig proving Combobox consumes the shared field context rather
 * than throwing or ignoring it. Its own props are deliberately configurable
 * rather than hardcoded — a test needs both polarities to actually
 * distinguish `??` from `||`: context `true` beating own `false` (the default
 * values below), and context `false` beating own `true` (passed explicitly).
 * `true || false` and `true ?? false` agree, so only the second polarity can
 * catch a `??` → `||` regression.
 */
function FieldHarness({
	options: opts,
	context,
	id = "own-id",
	disabled = false,
	required = false,
	invalid = false,
}: {
	options: ComboboxOption[];
	context: FieldContext;
	id?: string;
	disabled?: boolean;
	required?: boolean;
	invalid?: boolean;
}) {
	return (
		<FieldProvider value={context}>
			<Combobox options={opts} id={id} invalid={invalid} required={required} disabled={disabled} />
		</FieldProvider>
	);
}

describe("Combobox", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		document.body.querySelectorAll(".ft-combobox-panel").forEach((el) => el.remove());
	});

	it("renders closed, with aria-expanded false and no aria-controls", () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);

		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(panel()).toBeNull();
	});

	it("opens the panel on focus", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);

		fireEvent.focus(el);
		expect(el.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		expect(el.hasAttribute("aria-controls")).toBe(false);

		fireEvent.focus(el);
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);
		await settleLegs();
	});

	it("shows the whole option list on focus, before any typing", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		fireEvent.focus(input(container));
		expect(options()).toHaveLength(3);
		await settleLegs();
	});

	it("filters the list as the user types, case-insensitively", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "sve" } });

		const rows = options();
		expect(rows).toHaveLength(2);
		expect(rows[0]!.textContent).toContain("Svelte 5");
		expect(rows[1]!.textContent).toContain("SvelteKit");
		await settleLegs();
	});

	it("highlights the real matched range, not a naive case-sensitive indexOf of the raw query", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "sve" } });

		const rows = options();
		// Label is "Svelte 5"; the typed query is lowercase "sve" — a naive
		// `label.indexOf(query)` (case-sensitive, unnormalized) would find
		// nothing at all, since "S" !== "s". The real match is "Sve".
		const strong = rows[0]!.querySelector("strong");
		expect(strong?.textContent).toBe("Sve");
		expect(rows[0]!.textContent).toBe("Svelte 5");
		await settleLegs();
	});

	it("falls back to a plain, unhighlighted label when a custom filter matches without a literal substring", async () => {
		const acronymOptions: ComboboxOption[] = [{ value: "js", label: "JavaScript" }];
		const { container } = render(
			<Combobox
				options={acronymOptions}
				// Matches on some acronym logic unrelated to a literal substring —
				// "js" never appears literally, contiguously, inside "JavaScript".
				filter={() => true}
			/>
		);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "js" } });

		const rows = options();
		expect(rows).toHaveLength(1);
		expect(rows[0]!.querySelector("strong")).toBeNull();
		expect(rows[0]!.textContent).toBe("JavaScript");
		await settleLegs();
	});

	it("shows the empty message when nothing matches", async () => {
		const { container } = render(<Combobox options={OPTIONS} emptyMessage="Nothing found" />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "zzz" } });

		expect(options()).toHaveLength(0);
		expect(panel()?.textContent).toContain("Nothing found");
		await settleLegs();
	});

	it("defaults the empty message to 'No results'", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "zzz" } });
		expect(panel()?.textContent).toContain("No results");
		await settleLegs();
	});

	it("moves the active option with the arrow keys while focus stays on the input", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		// A real `.focus()`, not `fireEvent.focus`, so `document.activeElement`
		// actually tracks it — the assertions below need the real thing.
		act(() => {
			el.focus();
		});
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(options()[0]!.id));

		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[1]!.id);
		expect(document.activeElement).toBe(el);

		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[2]!.id);
		expect(document.activeElement).toBe(el);
		await settleLegs();
	});

	it("skips disabled options as a block during arrow navigation", async () => {
		const { container } = render(<Combobox options={OPTIONS_WITH_DISABLED} />);
		const el = input(container);
		fireEvent.focus(el);
		// Focus activates the first option, "Svelte 5" (index 0).
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(options()[0]!.id));

		// The next option, "SvelteKit", is disabled — this must skip straight to "React".
		fireEvent.keyDown(el, { key: "ArrowDown" });
		const activeId = el.getAttribute("aria-activedescendant");
		expect(document.getElementById(activeId!)?.textContent).toContain("React");
		await settleLegs();
	});

	it("does not activate a disabled option that happens to be first, on open with nothing selected", async () => {
		// `openPanel` falls back to index 0 when there is no selected value to
		// seed the active row from — this proves that fallback no longer
		// activates the row directly, relying on `listbox.setActive` itself to
		// refuse a disabled index rather than on the call site checking first.
		const { container } = render(<Combobox options={OPTIONS_FIRST_DISABLED} />);
		const el = input(container);
		act(() => {
			el.focus();
		});

		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		await settleLegs();
	});

	it("a click on a disabled option does not select it", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Combobox options={OPTIONS_WITH_DISABLED} onValueChange={onValueChange} />
		);
		const el = input(container);
		fireEvent.focus(el);

		const disabledRow = options()[1]!;
		expect(disabledRow.getAttribute("aria-disabled")).toBe("true");
		fireEvent.click(disabledRow);

		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("commits the active option on Enter, closes the panel and fires onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Combobox options={OPTIONS} onValueChange={onValueChange} />);
		const el = input(container);
		fireEvent.focus(el);
		// Typing auto-activates the first match — "Svelte 5".
		fireEvent.change(el, { target: { value: "sve" } });

		fireEvent.keyDown(el, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
		expect(el.value).toBe("Svelte 5");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("commits on a row click the same way", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Combobox options={OPTIONS} onValueChange={onValueChange} />);
		const el = input(container);
		fireEvent.focus(el);

		fireEvent.click(options()[1]!); // "SvelteKit"
		expect(onValueChange).toHaveBeenCalledWith("sveltekit");
		expect(el.value).toBe("SvelteKit");
		await settleLegs();
	});

	it("reverts to the last valid value's label on blur when the typed text matches nothing", async () => {
		const { container } = render(<Combobox options={OPTIONS} value="svelte-5" />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "not a real option" } });
		expect(el.value).toBe("not a real option");

		fireEvent.blur(el);
		expect(el.value).toBe("Svelte 5");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("clears on blur when there was no previously selected value", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "not a real option" } });

		fireEvent.blur(el);
		expect(el.value).toBe("");
		await settleLegs();
	});

	it("closes on Escape and resolves the same way blur does", async () => {
		const { container } = render(<Combobox options={OPTIONS} value="svelte-5" />);
		const el = input(container);
		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "garbage" } });

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("Svelte 5");
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		fireEvent.focus(el);
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("announces a result count in a live region, not the option contents", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		const el = input(container);
		const region = liveRegion(container);
		expect(region.textContent).toBe("");

		fireEvent.focus(el);
		fireEvent.change(el, { target: { value: "sve" } });
		expect(region.textContent).toBe("2 results");
		expect(region.textContent).not.toContain("SvelteKit");

		fireEvent.change(el, { target: { value: "sveltekit" } });
		expect(region.textContent).toBe("1 result");
		await settleLegs();
	});

	it("shows the selected option's label on mount, from a plain (non-bound) value", () => {
		const { container } = render(<Combobox options={OPTIONS} value="sveltekit" />);
		expect(input(container).value).toBe("SvelteKit");
	});

	// The three ways this codebase expects a value prop plus its change
	// callback to work: fully controlled, the callback alone, and a plain
	// never-updated value plus that same callback.
	it("round-trips through a controlled value + onValueChange pair", async () => {
		const { container, getByTestId } = render(<ValueHarness options={OPTIONS} />);
		const el = input(container);

		fireEvent.focus(el);
		fireEvent.click(options()[0]!);
		expect(getByTestId("bound-value").textContent).toBe("svelte-5");
		await settleLegs();
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Combobox options={OPTIONS} onValueChange={onValueChange} />);
		const el = input(container);

		fireEvent.focus(el);
		fireEvent.click(options()[0]!);
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
		expect(el.value).toBe("Svelte 5");
		await settleLegs();
	});

	it("works with a plain never-updated value plus onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Combobox options={OPTIONS} value="react" onValueChange={onValueChange} />
		);
		const el = input(container);
		expect(el.value).toBe("React");

		fireEvent.focus(el);
		fireEvent.click(options()[0]!);
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
		await settleLegs();
	});

	it("round-trips the input element through the forwarded ref", () => {
		const { container } = render(<ValueHarness options={OPTIONS} />);
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("submits the underlying value, not the visible label, via a hidden input carrying name", () => {
		const { container } = render(
			<Combobox options={OPTIONS} value="svelte-5" name="framework" />
		);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("framework");
		expect(hidden.value).toBe("svelte-5");
		expect(input(container).hasAttribute("name")).toBe(false);
	});

	it("renders no hidden input when name is omitted", () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		expect(container.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(<Combobox options={OPTIONS} label="Framework" />);
		expect(input(container).getAttribute("aria-label")).toBe("Framework");
	});

	it("merges the className prop with the base classes", () => {
		const { container } = render(<Combobox options={OPTIONS} className="mt-4" />);
		const cls = input(container).className;
		expect(cls).toContain("ft-combobox");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(
			<Combobox options={OPTIONS} id="solo" invalid required disabled={false} />
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
		const { container } = render(<FieldHarness options={OPTIONS} context={context} />);
		const el = input(container);

		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The test above only exercises context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` values
	// would pass it too, since `true || false` is still `true`. The three
	// below pin the polarity that actually tells `??` and `||` apart: own prop
	// `true`, context `false`, expecting the context's `false` to win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const context: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(<FieldHarness options={OPTIONS} context={context} disabled />);
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
		const { container } = render(<FieldHarness options={OPTIONS} context={context} required />);
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
		const { container } = render(<FieldHarness options={OPTIONS} context={context} invalid />);
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	describe("live region clears on close", () => {
		// `{open ? resultsMessage : ""}` reads correct, but that is exactly the
		// kind of thing worth pinning directly — a stale count left announced
		// after the panel closes is a real live-region bug class, not a
		// hypothetical one.
		it("clears on blur", async () => {
			const { container } = render(<Combobox options={OPTIONS} />);
			const el = input(container);
			const region = liveRegion(container);

			fireEvent.focus(el);
			fireEvent.change(el, { target: { value: "sve" } });
			expect(region.textContent).toBe("2 results");

			fireEvent.blur(el);
			expect(region.textContent).toBe("");
			await settleLegs();
		});

		it("clears on Escape", async () => {
			const { container } = render(<Combobox options={OPTIONS} />);
			const el = input(container);
			const region = liveRegion(container);

			fireEvent.focus(el);
			fireEvent.change(el, { target: { value: "sve" } });
			expect(region.textContent).toBe("2 results");

			pressEscape();
			await waitFor(() => expect(region.textContent).toBe(""));
		});

		it("clears on an outside click", async () => {
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(<Combobox options={OPTIONS} />);
			const el = input(container);
			const region = liveRegion(container);

			fireEvent.focus(el);
			fireEvent.change(el, { target: { value: "sve" } });
			expect(region.textContent).toBe("2 results");

			pointerDownOn(outside);
			await waitFor(() => expect(region.textContent).toBe(""));
			outside.remove();
		});
	});

	// Not a test of what the guard prevents (jsdom has no focus-follows-
	// mousedown default action for it to suppress — see the comment on the
	// guard in ComboboxPanel.tsx) — a test of whether the guard itself is
	// actually wired: a real `mousedown` dispatched at a row must come back
	// with `defaultPrevented: true`. A version of `onClick={...ctx.selectOption}`
	// that dropped `onMouseDown={(event) => event.preventDefault()}` would
	// still pass every other test in this file (nothing else here can tell the
	// two apart under jsdom) and only fail here.
	//
	// A "blur the input, then click a still-referenced row" version does not
	// hold in this codebase: `open` and the panel's presence in the DOM are the
	// same gate, so `blur` already starts unmounting the row before a second,
	// separate `click` dispatch could ever reach it.
	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		const { container } = render(<Combobox options={OPTIONS} />);
		fireEvent.focus(input(container));

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		act(() => {
			options()[0]!.dispatchEvent(event);
		});
		expect(event.defaultPrevented).toBe(true);
		await settleLegs();
	});

	// The panel uses the shared `anchored` transition, whose growth origin
	// follows the side the panel was ACTUALLY placed on. jsdom makes that
	// deterministic: every rect measures 0×0, so the requested `bottom` never
	// overflows the 768px-tall default viewport and never flips.
	describe("entrance", () => {
		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Combobox options={OPTIONS} />);

			fireEvent.focus(input(container));

			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("start");
			expect(el.style.getPropertyValue("transform-origin")).toBe("left top");
			// Pins the positive case too: without it the reduced-motion test
			// below would pass for the wrong reason — an entrance that never
			// runs at all under any preference.
			expect(animate).toHaveBeenCalled();
			await settleLegs();
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Combobox options={OPTIONS} />);

			fireEvent.focus(input(container));

			// A zero duration makes the runtime skip `element.animate()` outright
			// instead of running a zero-length animation, and the panel's
			// visibility never depended on the entrance in the first place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
			await settleLegs();
		});
	});

	// The panel leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the animation stub. These pin what must be
	// true inside it. `open`, `value` and `onValueChange` all still settle
	// synchronously, which is why every assertion on them above stayed
	// unwrapped.
	describe("exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<Combobox options={OPTIONS} />);
			const el = input(container);
			fireEvent.focus(el);
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary React attribute here, carrying `surfaceState`'s two
			// values — the source writes it imperatively from `onoutrostart`
			// only because its scheduler skips inert branches.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this on every registered node for the whole
			// exit — which is what stops a row taking a click on its way out.
			expect(closing!.inert).toBe(true);
			// The input has already been told the panel is gone.
			expect(el.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// PORT ADDITION, not in the source suite. Svelte destroys the `{#if
		// open}` branch that owns the panel and marks it inert first, so its
		// rows are frozen for the length of the outro; React re-renders an
		// exiting subtree normally, and the panel keeps its own snapshot to
		// match. Without it the empty panel below would repopulate with all
		// three options halfway through its own fade, because `close()`
		// resolves the query back to the selected option's label in the very
		// turn it flips `open` — and a query equal to the selection's label is
		// exactly the case that filters nothing out.
		it("keeps the rows it was showing on screen for the length of the exit", async () => {
			const { container } = render(<Combobox options={OPTIONS} value="svelte-5" />);
			const el = input(container);
			fireEvent.focus(el);
			fireEvent.change(el, { target: { value: "garbage" } });
			expect(options()).toHaveLength(0);
			expect(panel()!.textContent).toContain("No results");

			pressEscape();

			expect(panel()!.getAttribute("data-state")).toBe("closing");
			expect(options()).toHaveLength(0);
			expect(panel()!.textContent).toContain("No results");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: ctx.open` gate. A layer on its way out must not swallow
		// the key: the dismiss stack scans past it and hands Escape to whatever
		// is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the combobox, so the panel sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathHandle = attachDismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(<Combobox options={OPTIONS} />);
			fireEvent.focus(input(container));

			pressEscape(); // the panel is the top LIVE layer and takes this one
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the panel is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathHandle.destroy();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes the runtime call
		// its finish callback synchronously and never touch
		// `element.animate()`, so a visitor who asked for less motion gets
		// exactly the synchronous close this panel had before the exit existed.
		it("closes synchronously and never animates under prefers-reduced-motion", () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Combobox options={OPTIONS} />);
			fireEvent.focus(input(container));
			expect(panel()).not.toBeNull();

			pressEscape();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});
});
