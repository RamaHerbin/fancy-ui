import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Combobox from "./Combobox.svelte";
import ValueHarness from "./ComboboxHarness.test.svelte";
import FieldHarness from "./ComboboxFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import type { ComboboxOption } from "./types.js";

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

describe("Combobox", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll(".ft-combobox-panel").forEach((el) => el.remove());
	});

	it("renders closed, with aria-expanded false and no aria-controls", () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);

		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(panel()).toBeNull();
	});

	it("opens the panel on focus", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);

		await fireEvent.focus(el);
		expect(el.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		expect(el.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.focus(el);
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);
	});

	it("shows the whole option list on focus, before any typing", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		await fireEvent.focus(input(container));
		expect(options()).toHaveLength(3);
	});

	it("filters the list as the user types, case-insensitively", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "sve" } });

		const rows = options();
		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain("Svelte 5");
		expect(rows[1].textContent).toContain("SvelteKit");
	});

	it("highlights the real matched range, not a naive case-sensitive indexOf of the raw query", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "sve" } });

		const rows = options();
		// Label is "Svelte 5"; the typed query is lowercase "sve" — a naive
		// `label.indexOf(query)` (case-sensitive, unnormalized) would find
		// nothing at all, since "S" !== "s". The real match is "Sve".
		const strong = rows[0].querySelector("strong");
		expect(strong?.textContent).toBe("Sve");
		expect(rows[0].textContent).toBe("Svelte 5");
	});

	it("falls back to a plain, unhighlighted label when a custom filter matches without a literal substring", async () => {
		const acronymOptions: ComboboxOption[] = [{ value: "js", label: "JavaScript" }];
		const { container } = render(Combobox, {
			props: {
				options: acronymOptions,
				// Matches on some acronym logic unrelated to a literal substring —
				// "js" never appears literally, contiguously, inside "JavaScript".
				filter: () => true,
			},
		});
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "js" } });

		const rows = options();
		expect(rows).toHaveLength(1);
		expect(rows[0].querySelector("strong")).toBeNull();
		expect(rows[0].textContent).toBe("JavaScript");
	});

	it("shows the empty message when nothing matches", async () => {
		const { container } = render(Combobox, {
			props: { options: OPTIONS, emptyMessage: "Nothing found" },
		});
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "zzz" } });

		expect(options()).toHaveLength(0);
		expect(panel()?.textContent).toContain("Nothing found");
	});

	it("defaults the empty message to 'No results'", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "zzz" } });
		expect(panel()?.textContent).toContain("No results");
	});

	it("moves the active option with the arrow keys while focus stays on the input", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		// A real `.focus()`, not `fireEvent.focus`, so `document.activeElement`
		// actually tracks it — the assertions below need the real thing.
		el.focus();
		await tick();
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(options()[0].id));

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[1].id);
		expect(document.activeElement).toBe(el);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[2].id);
		expect(document.activeElement).toBe(el);
	});

	it("skips disabled options as a block during arrow navigation", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS_WITH_DISABLED } });
		const el = input(container);
		await fireEvent.focus(el);
		// Focus activates the first option, "Svelte 5" (index 0).
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(options()[0].id));

		// The next option, "SvelteKit", is disabled — this must skip straight to "React".
		await fireEvent.keyDown(el, { key: "ArrowDown" });
		const activeId = el.getAttribute("aria-activedescendant");
		expect(document.getElementById(activeId!)?.textContent).toContain("React");
	});

	it("does not activate a disabled option that happens to be first, on open with nothing selected", async () => {
		// `openPanel` falls back to index 0 when there is no selected value to
		// seed the active row from — this proves that fallback no longer
		// activates the row directly, relying on `listbox.setActive` itself to
		// refuse a disabled index rather than on the call site checking first.
		const { container } = render(Combobox, { props: { options: OPTIONS_FIRST_DISABLED } });
		const el = input(container);
		el.focus();
		await tick();

		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
	});

	it("a click on a disabled option does not select it", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, {
			props: { options: OPTIONS_WITH_DISABLED, onValueChange },
		});
		const el = input(container);
		await fireEvent.focus(el);

		const disabledRow = options()[1];
		expect(disabledRow.getAttribute("aria-disabled")).toBe("true");
		await fireEvent.click(disabledRow);

		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	it("commits the active option on Enter, closes the panel and fires onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, { props: { options: OPTIONS, onValueChange } });
		const el = input(container);
		await fireEvent.focus(el);
		// Typing auto-activates the first match — "Svelte 5".
		await fireEvent.input(el, { target: { value: "sve" } });

		await fireEvent.keyDown(el, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
		expect(el.value).toBe("Svelte 5");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("commits on a row click the same way", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, { props: { options: OPTIONS, onValueChange } });
		const el = input(container);
		await fireEvent.focus(el);

		await fireEvent.click(options()[1]); // "SvelteKit"
		expect(onValueChange).toHaveBeenCalledWith("sveltekit");
		expect(el.value).toBe("SvelteKit");
	});

	it("reverts to the last valid value's label on blur when the typed text matches nothing", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, value: "svelte-5" } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "not a real option" } });
		expect(el.value).toBe("not a real option");

		await fireEvent.blur(el);
		expect(el.value).toBe("Svelte 5");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("clears on blur when there was no previously selected value", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "not a real option" } });

		await fireEvent.blur(el);
		expect(el.value).toBe("");
	});

	it("closes on Escape and resolves the same way blur does", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, value: "svelte-5" } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "garbage" } });

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("Svelte 5");
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		expect(panel()).not.toBeNull();

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("announces a result count in a live region, not the option contents", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		const region = liveRegion(container);
		expect(region.textContent).toBe("");

		await fireEvent.focus(el);
		await fireEvent.input(el, { target: { value: "sve" } });
		expect(region.textContent).toBe("2 results");
		expect(region.textContent).not.toContain("SvelteKit");

		await fireEvent.input(el, { target: { value: "sveltekit" } });
		expect(region.textContent).toBe("1 result");
	});

	it("shows the selected option's label on mount, from a plain (non-bound) value", () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, value: "sveltekit" } });
		expect(input(container).value).toBe("SvelteKit");
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: bind:, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness, { props: { options: OPTIONS } });
		const el = input(container);

		await fireEvent.focus(el);
		await fireEvent.click(options()[0]);
		expect(getByTestId("bound-value").textContent).toBe("svelte-5");
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, { props: { options: OPTIONS, onValueChange } });
		const el = input(container);

		await fireEvent.focus(el);
		await fireEvent.click(options()[0]);
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
		expect(el.value).toBe("Svelte 5");
	});

	it("works with a plain non-bound value plus onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, {
			props: { options: OPTIONS, value: "react", onValueChange },
		});
		const el = input(container);
		expect(el.value).toBe("React");

		await fireEvent.focus(el);
		await fireEvent.click(options()[0]);
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness, { props: { options: OPTIONS } });
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("submits the underlying value, not the visible label, via a hidden input carrying name", () => {
		const { container } = render(Combobox, {
			props: { options: OPTIONS, value: "svelte-5", name: "framework" },
		});
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("framework");
		expect(hidden.value).toBe("svelte-5");
		expect(input(container).hasAttribute("name")).toBe(false);
	});

	it("renders no hidden input when name is omitted", () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		expect(container.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, label: "Framework" } });
		expect(input(container).getAttribute("aria-label")).toBe("Framework");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, class: "mt-4" } });
		const cls = input(container).className;
		expect(cls).toContain("ft-combobox");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Combobox, {
			props: { options: OPTIONS, id: "solo", invalid: true, required: true, disabled: false },
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
		const { container } = render(FieldHarness, { props: { options: OPTIONS, context } });
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
			props: { options: OPTIONS, context, disabled: true },
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
			props: { options: OPTIONS, context, required: true },
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
			props: { options: OPTIONS, context, invalid: true },
		});
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	describe("live region clears on close", () => {
		// `{open ? resultsMessage : ""}` reads correct, but that is exactly the
		// kind of thing worth pinning directly — a stale count left announced
		// after the panel closes is a real live-region bug class, not a
		// hypothetical one.
		it("clears on blur", async () => {
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "sve" } });
			expect(region.textContent).toBe("2 results");

			await fireEvent.blur(el);
			expect(region.textContent).toBe("");
		});

		it("clears on Escape", async () => {
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "sve" } });
			expect(region.textContent).toBe("2 results");

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(region.textContent).toBe(""));
		});

		it("clears on an outside click", async () => {
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "sve" } });
			expect(region.textContent).toBe("2 results");

			await fireEvent.pointerDown(outside);
			await waitFor(() => expect(region.textContent).toBe(""));
			outside.remove();
		});
	});

	// Not a test of what the guard prevents (jsdom has no focus-follows-
	// mousedown default action for it to suppress — see the comment on the
	// guard in ComboboxPanel.svelte) — a test of whether the guard itself is
	// actually wired: a real `mousedown` dispatched at a row must come back
	// with `defaultPrevented: true`. A version of `onclick={...ctx.selectOption}`
	// that dropped `onmousedown={(event) => event.preventDefault()}` would
	// still pass every other test in this file (nothing else here can tell
	// the two apart under jsdom) and only fail here.
	//
	// A "blur the input, then click a still-referenced row" version was tried
	// first, to match the literal wording of what this test is meant to
	// stand in for — it does not hold in this codebase: `open` and the
	// panel's presence in the DOM are the same reactive gate
	// (`{#if open}<ComboboxPanel />{/if}`), so `blur` already unmounts the
	// row (confirmed: `row.isConnected` is `false` immediately after) before
	// a second, separate `click` dispatch could ever reach it. There is no
	// state reachable through this component's own API where `open` is
	// false and a row is still clickable, so there was nothing left for that
	// version to actually exercise.
	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		await fireEvent.focus(input(container));

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		options()[0].dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});
});
