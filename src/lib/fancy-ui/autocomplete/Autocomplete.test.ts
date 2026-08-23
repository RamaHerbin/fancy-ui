import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { flushSync, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Autocomplete from "./Autocomplete.svelte";
import ValueHarness from "./AutocompleteHarness.test.svelte";
import FieldHarness from "./AutocompleteFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import { dismissable } from "../_internals/dismissable.js";

const CITIES = ["Paris", "Parma", "Prague", "London"];

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

/** Dispatches Escape SYNCHRONOUSLY, unlike `fireEvent.keyDown`, which awaits a
 * tick of its own. The exit window is two microtasks under the WAAPI stub, so
 * anything awaited between the dismiss and the assertion has already drained
 * it and the test would pass for the wrong reason. */
function pressEscape(): void {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

describe("Autocomplete", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll(".ft-autocomplete-panel").forEach((el) => el.remove());
	});

	it("renders closed, with aria-expanded false and no aria-controls", () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(panel()).toBeNull();
	});

	it("opens and lists matches as the user types, case-insensitively", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		const rows = options();
		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain("Paris");
		expect(rows[1].textContent).toContain("Parma");
	});

	it("highlights the real matched range, not a naive case-sensitive indexOf of the raw query", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		const strong = options()[0].querySelector("strong");
		// Suggestion is "Paris"; typed query is lowercase "par" — a naive
		// case-sensitive `indexOf` would miss it entirely ("P" !== "p").
		expect(strong?.textContent).toBe("Par");
		expect(options()[0].textContent).toContain("Paris");
	});

	it("shows no panel at all when nothing matches", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "zzz" } });
		expect(panel()).toBeNull();
		expect(el.getAttribute("aria-expanded")).toBe("false");
	});

	it("suppresses suggestions below minLength", async () => {
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, minLength: 3 },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "pa" } });
		expect(panel()).toBeNull();

		await fireEvent.input(el, { target: { value: "par" } });
		expect(panel()).not.toBeNull();
		expect(options().length).toBeGreaterThan(0);
	});

	it("defaults minLength to 1", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "p" } });
		expect(panel()).not.toBeNull();
	});

	it("caps the number of suggestions at maxSuggestions", async () => {
		const many = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
		const { container } = render(Autocomplete, {
			props: { suggestions: many, maxSuggestions: 5 },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "item" } });
		expect(options()).toHaveLength(5);
	});

	it("defaults maxSuggestions to 8", async () => {
		const many = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
		const { container } = render(Autocomplete, { props: { suggestions: many } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "item" } });
		expect(options()).toHaveLength(8);
	});

	it("arrowing highlights rows in the list without writing into the field", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		el.focus();
		await tick();

		await fireEvent.input(el, { target: { value: "par" } });
		expect(el.value).toBe("par");
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[0].id);
		// The visible text is untouched by navigation — only the list's own
		// active row changed, not the field.
		expect(el.value).toBe("par");
		expect(document.activeElement).toBe(el);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[1].id);
		expect(el.value).toBe("par");
		expect(document.activeElement).toBe(el);
	});

	it("Escape restores what the user typed — there is nothing to revert since arrowing never touched it", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		await fireEvent.keyDown(el, { key: "ArrowDown" });
		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.value).toBe("par");

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("par");
	});

	it("commits the active suggestion on Enter, closes the panel, and fires onSelect and onValueChange", async () => {
		const onValueChange = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, onValueChange, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		onValueChange.mockClear(); // drop the plain-typing call
		await fireEvent.keyDown(el, { key: "ArrowDown" }); // activates "Paris"

		await fireEvent.keyDown(el, { key: "Enter" });
		expect(el.value).toBe("Paris");
		expect(onSelect).toHaveBeenCalledWith("Paris");
		expect(onValueChange).toHaveBeenCalledWith("Paris");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Enter with nothing highlighted does not alter the value or fire onSelect", async () => {
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		await fireEvent.keyDown(el, { key: "Enter" });
		expect(onSelect).not.toHaveBeenCalled();
		expect(el.value).toBe("par");
	});

	it("commits on a row click, calling onSelect but not before the click", async () => {
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, onSelect } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onSelect).not.toHaveBeenCalled();

		await fireEvent.click(options()[1]); // "Parma"
		expect(onSelect).toHaveBeenCalledWith("Parma");
		expect(el.value).toBe("Parma");
	});

	it("onValueChange fires on plain typing, independent of onSelect", async () => {
		const onValueChange = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, onValueChange, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).toHaveBeenCalledWith("par");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("closes the panel on blur without altering the typed value", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "something unmatched-ish par" } });
		await fireEvent.blur(el);
		expect(panel()).toBeNull();
		expect(el.value).toBe("something unmatched-ish par");
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		await fireEvent.input(el, { target: { value: "par" } });
		expect(panel()).not.toBeNull();

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("announces a suggestion count in a live region, not the suggestion text", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		const region = liveRegion(container);
		expect(region.textContent).toBe("");

		await fireEvent.input(el, { target: { value: "par" } });
		expect(region.textContent).toBe("2 suggestions");
		expect(region.textContent).not.toContain("Paris");

		await fireEvent.input(el, { target: { value: "paris" } });
		expect(region.textContent).toBe("1 suggestion");
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: bind:, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness, {
			props: { suggestions: CITIES },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		await fireEvent.click(options()[0]);
		expect(getByTestId("bound-value").textContent).toBe("Paris");
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		await fireEvent.click(options()[0]);
		expect(onValueChange).toHaveBeenCalledWith("Paris");
		expect(el.value).toBe("Paris");
	});

	it("works with a plain non-bound value plus onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, value: "start", onValueChange },
		});
		const el = input(container);
		expect(el.value).toBe("start");

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).toHaveBeenCalledWith("par");
		expect(el.value).toBe("par");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness, { props: { suggestions: CITIES } });
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("carries name and value directly on the visible input, unlike Combobox", () => {
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, value: "Paris", name: "city" },
		});
		const el = input(container);
		expect(el.name).toBe("city");
		expect(el.value).toBe("Paris");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, label: "City" } });
		expect(input(container).getAttribute("aria-label")).toBe("City");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, class: "mt-4" } });
		const cls = input(container).className;
		expect(cls).toContain("ft-autocomplete");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, id: "solo", invalid: true, required: true, disabled: false },
		});
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
		const { container } = render(FieldHarness, { props: { suggestions: CITIES, context } });
		const el = input(container);

		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The test above only exercises context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` derived
	// values would pass it too, since `true || false` is still `true`. The
	// three below pin the polarity that actually tells `??` and `||` apart:
	// own prop `true`, context `false`, expecting the context's `false` to
	// win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const context: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, {
			props: { suggestions: CITIES, context, disabled: true },
		});
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
		const { container } = render(FieldHarness, {
			props: { suggestions: CITIES, context, required: true },
		});
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
		const { container } = render(FieldHarness, {
			props: { suggestions: CITIES, context, invalid: true },
		});
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("blocks input while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, disabled: true, onValueChange },
		});
		const el = input(container);
		expect(el.disabled).toBe(true);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	describe("live region clears on close", () => {
		// `{open ? resultsMessage : ""}` reads correct, but that is exactly the
		// kind of thing worth pinning directly — a stale count left announced
		// after the panel closes is a real live-region bug class, not a
		// hypothetical one.
		it("clears on blur", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			await fireEvent.blur(el);
			expect(region.textContent).toBe("");
		});

		it("clears on Escape", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(region.textContent).toBe(""));
		});

		it("clears on an outside click", async () => {
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			await fireEvent.pointerDown(outside);
			await waitFor(() => expect(region.textContent).toBe(""));
			outside.remove();
		});
	});

	// Not a test of what the guard prevents (jsdom has no focus-follows-
	// mousedown default action for it to suppress — see the comment on the
	// guard in AutocompletePanel.svelte) — a test of whether the guard itself
	// is actually wired: a real `mousedown` dispatched at a row must come
	// back with `defaultPrevented: true`.
	//
	// A "blur the input, then click a still-referenced row" version was
	// tried first, to match Combobox's identical request literally — it does
	// not hold here for the same structural reason it did not hold there:
	// `open` and the panel's presence in the DOM are the same reactive gate
	// (`{#if open}<AutocompletePanel />{/if}`), so blur already unmounts the
	// row before a second, separate `click` dispatch could reach it. See
	// `combobox/Combobox.test.ts`'s identical note for the full trace
	// (confirmed there via `row.isConnected === false` immediately after
	// blur; the same holds here, this component's panel is gated the same
	// way).
	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		await fireEvent.input(el, { target: { value: "par" } });

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		options()[0].dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	// This panel had no entrance until the core motion pass; it now uses the
	// shared `anchored` transition, whose growth origin follows the side the
	// panel was ACTUALLY placed on. jsdom makes that deterministic: every
	// rect measures 0×0, so the requested `bottom` never overflows the
	// 768px-tall default viewport and never flips.
	describe("entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });

			await fireEvent.input(input(container), { target: { value: "par" } });
			await tick();

			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("start");
			expect(el.style.getPropertyValue("transform-origin")).toBe("left top");
			// Pins the positive case too: without it the reduced-motion test
			// below would pass for the wrong reason — an entrance that never
			// runs at all under any preference.
			expect(animate).toHaveBeenCalled();
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });

			await fireEvent.input(input(container), { target: { value: "par" } });
			await tick();

			// A zero duration makes Svelte skip `element.animate()` outright
			// instead of running a zero-length animation, and the panel's
			// visibility never depended on the entrance in the first place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
		});
	});

	// The list now leaves on the same shared transition it arrives on, so
	// between the dismiss and the unmount there is a window — 150 ms in a
	// browser, a couple of microtasks under the WAAPI stub. These pin what
	// must be true inside it. `open`, `value` and `onValueChange` all still
	// settle synchronously, which is why every assertion on them above stayed
	// unwrapped.
	describe("exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the list mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			await fireEvent.input(el, { target: { value: "par" } });
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await tick();

			const closing = panel();
			expect(closing).toBeTruthy();
			// Written imperatively from `onoutrostart`. A reactive
			// `data-state={…}` would never reach the DOM: Svelte marks the
			// branch inert before it plays the outro and the scheduler skips
			// inert effects.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Svelte sets this itself on any element carrying a `transition:`,
			// for the whole exit — which is what stops a row taking a click on
			// its way out.
			expect(closing!.inert).toBe(true);
			// The input has already been told the list is gone.
			expect(el.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// This component closes and reopens on keystrokes, not only on an
		// explicit dismiss: a query that stops matching closes the list, and
		// the very next character that matches again lands inside the exit
		// window. One bidirectional `transition:` reverses the outro in place;
		// a split `in:`/`out:` pair would leave the old node fading while a
		// second one faded in over it.
		it("reverses in place when a keystroke re-matches during the exit, rather than mounting a second list", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			await fireEvent.input(el, { target: { value: "par" } });
			expect(panel()).not.toBeNull();

			// Dispatched and flushed SYNCHRONOUSLY on purpose: `fireEvent`
			// awaits a tick of its own, which drains the stubbed animation and
			// destroys the branch, so the reopen would mount a fresh panel and
			// quietly test nothing.
			function typeSync(value: string) {
				el.value = value;
				el.dispatchEvent(new Event("input", { bubbles: true }));
				flushSync();
			}

			typeSync("parx"); // matches nothing — the list starts leaving
			expect(panel()!.getAttribute("data-state")).toBe("closing");

			typeSync("par"); // matches again, mid-exit
			expect(document.querySelectorAll(".ft-autocomplete-panel")).toHaveLength(1);
			expect(panel()!.getAttribute("data-state")).toBe("open");
			// `toBeFalsy`, not `toBe(false)`: the reversed intro restores the
			// element's ORIGINAL `inert` value, which was never set, so it
			// comes back as `undefined` rather than `false`. Either way the
			// rows take clicks again.
			expect(panel()!.inert).toBeFalsy();
		});

		// The `active: () => ctx.open` gate. A layer on its way out must not
		// swallow the key: the dismiss stack scans past it and hands Escape to
		// whatever is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the autocomplete, so the list sits above it on
			// the shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			await fireEvent.input(input(container), { target: { value: "par" } });

			pressEscape(); // the list is the top LIVE layer and takes this one
			await tick();
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the list is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathAction?.destroy?.();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes Svelte call
		// `on_finish()` synchronously and never touch `element.animate()`, so
		// a visitor who asked for less motion gets exactly the synchronous
		// close this list had before the exit existed.
		it("closes synchronously and never animates under prefers-reduced-motion", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			await fireEvent.input(input(container), { target: { value: "par" } });
			expect(panel()).not.toBeNull();

			pressEscape();
			await tick();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});
});
