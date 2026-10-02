import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import Combobox from "./Combobox.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";
import { dismissable } from "../../internals/dismissable.js";
import { sound } from "../../sound/sound.js";
import type { ComboboxOption } from "./types.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Four
 * shapes changed and nothing else did:
 *
 * - `tick()` becomes `nextTick()`.
 * - The source's two `*.test.svelte` harnesses collapse: the FormField cases
 *   publish the context through `global.provide`, and the bindable `value`
 *   round-trip passes an `onUpdate:value` listener instead of `bind:value`.
 * - The bindable `ref` is exposed on the instance, so the ref case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 * - This package's jsdom has no `PointerEvent`; the dismiss layer listens for
 *   a plain `pointerdown`, and `MouseEvent` carries every field it reads.
 *
 * One case is port-added and marked at its site: the panel freezes its rows
 * for the length of the exit, which the source gets for free from a scheduler
 * that skips effects inside a closing branch.
 *
 * No `inert` shim, deliberately: jsdom implements no `inert` IDL property, so
 * a prototype getter/setter reflecting it would mean the exit case passes
 * against the shim rather than against what the component writes. The presence
 * clock writes the ATTRIBUTE, so `hasAttribute` observes production behaviour.
 */

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

function input(container: Element): HTMLInputElement {
	return container.querySelector("input[role='combobox']") as HTMLInputElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-combobox-panel");
}

function options(): HTMLElement[] {
	return Array.from(document.querySelectorAll(".ft-combobox-panel [role='option']"));
}

/** `options()[index]`, narrowed once — the panel always renders the row a case
 * asks for, and every call site would otherwise repeat the same assertion. */
function optionAt(index: number): HTMLElement {
	return options()[index] as HTMLElement;
}

function liveRegion(container: Element): HTMLElement {
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
 * tick of its own. The exit window is two microtasks under the animation stub,
 * so anything awaited between the dismiss and the assertion has already
 * drained it and the test would pass for the wrong reason. */
function pressEscape(): void {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

/** This package's jsdom version does not implement `PointerEvent`, and the
 * dismiss layer listens for a plain `pointerdown`. `MouseEvent` carries every
 * field the layer reads. */
function pointerDownOn(target: HTMLElement): void {
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
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
		await fireEvent.update(el, "sve");

		expect(options()).toHaveLength(2);
		expect(optionAt(0).textContent).toContain("Svelte 5");
		expect(optionAt(1).textContent).toContain("SvelteKit");
	});

	it("highlights the real matched range, not a naive case-sensitive indexOf of the raw query", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.update(el, "sve");

		// Label is "Svelte 5"; the typed query is lowercase "sve" — a naive
		// `label.indexOf(query)` (case-sensitive, unnormalized) would find
		// nothing at all, since "S" !== "s". The real match is "Sve".
		const strong = optionAt(0).querySelector("strong");
		expect(strong?.textContent).toBe("Sve");
		expect(optionAt(0).textContent).toBe("Svelte 5");
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
		await fireEvent.update(el, "js");

		expect(options()).toHaveLength(1);
		expect(optionAt(0).querySelector("strong")).toBeNull();
		expect(optionAt(0).textContent).toBe("JavaScript");
	});

	it("shows the empty message when nothing matches", async () => {
		const { container } = render(Combobox, {
			props: { options: OPTIONS, emptyMessage: "Nothing found" },
		});
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.update(el, "zzz");

		expect(options()).toHaveLength(0);
		expect(panel()?.textContent).toContain("Nothing found");
	});

	it("defaults the empty message to 'No results'", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.update(el, "zzz");
		expect(panel()?.textContent).toContain("No results");
	});

	it("moves the active option with the arrow keys while focus stays on the input", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		// A real `.focus()`, not `fireEvent.focus`, so `document.activeElement`
		// actually tracks it — the assertions below need the real thing.
		el.focus();
		await nextTick();
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(optionAt(0).id));

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(optionAt(1).id);
		expect(document.activeElement).toBe(el);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(optionAt(2).id);
		expect(document.activeElement).toBe(el);
	});

	it("skips disabled options as a block during arrow navigation", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS_WITH_DISABLED } });
		const el = input(container);
		await fireEvent.focus(el);
		// Focus activates the first option, "Svelte 5" (index 0).
		await waitFor(() => expect(el.getAttribute("aria-activedescendant")).toBe(optionAt(0).id));

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
		await nextTick();

		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
	});

	it("a click on a disabled option does not select it", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, {
			props: { options: OPTIONS_WITH_DISABLED, onValueChange },
		});
		const el = input(container);
		await fireEvent.focus(el);

		const disabledRow = optionAt(1);
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
		await fireEvent.update(el, "sve");

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

		await fireEvent.click(optionAt(1)); // "SvelteKit"
		expect(onValueChange).toHaveBeenCalledWith("sveltekit");
		expect(el.value).toBe("SvelteKit");
	});

	it("reverts to the last valid value's label on blur when the typed text matches nothing", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, value: "svelte-5" } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.update(el, "not a real option");
		expect(el.value).toBe("not a real option");

		await fireEvent.blur(el);
		expect(el.value).toBe("Svelte 5");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("clears on blur when there was no previously selected value", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.update(el, "not a real option");

		await fireEvent.blur(el);
		expect(el.value).toBe("");
	});

	it("closes on Escape and resolves the same way blur does", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, value: "svelte-5" } });
		const el = input(container);
		await fireEvent.focus(el);
		await fireEvent.update(el, "garbage");

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

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("announces a result count in a live region, not the option contents", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		const el = input(container);
		const region = liveRegion(container);
		expect(region.textContent).toBe("");

		await fireEvent.focus(el);
		await fireEvent.update(el, "sve");
		expect(region.textContent).toBe("2 results");
		expect(region.textContent).not.toContain("SvelteKit");

		await fireEvent.update(el, "sveltekit");
		expect(region.textContent).toBe("1 result");
	});

	it("shows the selected option's label on mount, from a plain (non-bound) value", () => {
		const { container } = render(Combobox, { props: { options: OPTIONS, value: "sveltekit" } });
		expect(input(container).value).toBe("SvelteKit");
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: two-way, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through v-model:value", async () => {
		let value = "";
		const { container } = render(Combobox, {
			props: { options: OPTIONS, value, "onUpdate:value": (v: string) => (value = v) },
		});
		const el = input(container);

		await fireEvent.focus(el);
		await fireEvent.click(optionAt(0));
		expect(value).toBe("svelte-5");
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Combobox, { props: { options: OPTIONS, onValueChange } });
		const el = input(container);

		await fireEvent.focus(el);
		await fireEvent.click(optionAt(0));
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
		await fireEvent.click(optionAt(0));
		expect(onValueChange).toHaveBeenCalledWith("svelte-5");
	});

	it("exposes the input element as ref", () => {
		const wrapper = mount(Combobox, { props: { options: OPTIONS }, attachTo: document.body });

		expect(wrapper.vm.ref).toBe(document.querySelector("input[role='combobox']"));
		wrapper.unmount();
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

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Combobox, {
			props: { options: OPTIONS, id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = input(container);
		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	// The source's `*.test.svelte` harness collapses into `global.provide`: the
	// component is proven against the frozen `useField()`/`FieldContext`
	// surface, without depending on the actual FormField component.
	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const field: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(Combobox, {
			props: { options: OPTIONS },
			global: { provide: { [FIELD_KEY]: field } },
		});
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
	// below pin the polarity that actually tells `??` and `||` apart: own
	// prop `true`, context `false`, expecting the context's `false` to win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const field: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Combobox, {
			props: { options: OPTIONS, disabled: true },
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(input(container).disabled).toBe(false);
	});

	it("lets the context's required=false win over the component's own required=true prop", () => {
		const field: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Combobox, {
			props: { options: OPTIONS, required: true },
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(input(container).required).toBe(false);
	});

	it("lets the context's invalid=false win over the component's own invalid=true prop", () => {
		const field: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Combobox, {
			props: { options: OPTIONS, invalid: true },
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	describe("live region clears on close", () => {
		// `{{ open ? resultsMessage : "" }}` reads correct, but that is exactly
		// the kind of thing worth pinning directly — a stale count left
		// announced after the panel closes is a real live-region bug class, not
		// a hypothetical one.
		it("clears on blur", async () => {
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.focus(el);
			await fireEvent.update(el, "sve");
			expect(region.textContent).toBe("2 results");

			await fireEvent.blur(el);
			expect(region.textContent).toBe("");
		});

		it("clears on Escape", async () => {
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.focus(el);
			await fireEvent.update(el, "sve");
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
			await fireEvent.update(el, "sve");
			expect(region.textContent).toBe("2 results");

			pointerDownOn(outside);
			await waitFor(() => expect(region.textContent).toBe(""));
			outside.remove();
		});
	});

	// Not a test of what the guard prevents (jsdom has no focus-follows-
	// mousedown default action for it to suppress — see the comment on the
	// guard in ComboboxPanel.vue) — a test of whether the guard itself is
	// actually wired: a real `mousedown` dispatched at a row must come back
	// with `defaultPrevented: true`. A version of the row that kept its click
	// handler but dropped the mousedown guard would still pass every other
	// test in this file and only fail here.
	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		const { container } = render(Combobox, { props: { options: OPTIONS } });
		await fireEvent.focus(input(container));

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		optionAt(0).dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	// The panel uses the shared `anchored` transition, whose growth origin
	// follows the side the panel was ACTUALLY placed on. jsdom makes that
	// deterministic: every rect measures 0×0, so the requested `bottom` never
	// overflows the 768px-tall default viewport and never flips.
	describe("entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Combobox, { props: { options: OPTIONS } });

			await fireEvent.focus(input(container));
			await nextTick();

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
			const { container } = render(Combobox, { props: { options: OPTIONS } });

			await fireEvent.focus(input(container));
			await nextTick();

			// A zero duration makes the sampler skip `element.animate()`
			// outright instead of running a zero-length animation, and the
			// panel's visibility never depended on the entrance in the first
			// place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
		});
	});

	// The panel leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the animation stub. These pin what must be
	// true inside it. `open`, `value` and `onValueChange` all still settle
	// synchronously, which is why every assertion on them above stayed
	// unwrapped.
	describe("exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			const el = input(container);
			await fireEvent.focus(el);
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await nextTick();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary binding here, carrying the surface vocabulary's TWO
			// values: the presence-mounted subtree stays reactive for the whole
			// exit, so nothing has to be written imperatively.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Written by the presence clock, as an attribute, for the whole
			// exit — which is what stops a row taking a click on its way out.
			expect(closing!.hasAttribute("inert")).toBe(true);
			// The input has already been told the panel is gone.
			expect(el.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// Port-added, with no source counterpart: the source's scheduler skips
		// effects inside the closing branch, so its rows freeze for free. Here
		// the leaving subtree stays reactive, and `close()` resolves the query
		// back to the selection's own label in the very turn it flips `open` —
		// which is exactly the query that filters nothing out. Without the
		// panel's snapshot, a panel closed while showing "No results" would
		// repopulate with every option halfway through its own fade.
		it("keeps the rows it was showing on screen for the length of the exit", async () => {
			const { container } = render(Combobox, { props: { options: OPTIONS, value: "svelte-5" } });
			const el = input(container);
			await fireEvent.focus(el);
			await fireEvent.update(el, "garbage");
			expect(options()).toHaveLength(0);
			expect(panel()!.textContent).toContain("No results");

			pressEscape();
			await nextTick();

			expect(panel()!.getAttribute("data-state")).toBe("closing");
			expect(options()).toHaveLength(0);
			expect(panel()!.textContent).toContain("No results");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: () => ctx.open` gate. A layer on its way out must not
		// swallow the key: the dismiss stack scans past it and hands Escape to
		// whatever is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the combobox, so the panel sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(Combobox, { props: { options: OPTIONS } });
			await fireEvent.focus(input(container));

			pressEscape(); // the panel is the top LIVE layer and takes this one
			await nextTick();
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the panel is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathAction?.destroy?.();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes the sampler call
		// `onFinish()` synchronously and never touch `element.animate()`, so a
		// visitor who asked for less motion gets exactly the synchronous close
		// this panel had before the exit existed.
		it("closes synchronously and never animates under prefers-reduced-motion", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			await fireEvent.focus(input(container));
			expect(panel()).not.toBeNull();

			pressEscape();
			await nextTick();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays select exactly once on a row click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Combobox, { props: { options: OPTIONS, sound: true } });
			await fireEvent.focus(input(container));

			await fireEvent.click(optionAt(1)); // SvelteKit

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays select exactly once on Enter, and typing/focus/blur stay silent", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Combobox, { props: { options: OPTIONS, sound: true } });
			const el = input(container);

			await fireEvent.focus(el); // open — silent
			await fireEvent.update(el, "sve"); // typing — silent
			expect(play).not.toHaveBeenCalled();

			await fireEvent.keyDown(el, { key: "ArrowDown" }); // navigate — silent
			await fireEvent.keyDown(el, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);

			play.mockClear();
			await fireEvent.blur(el); // resolveAndClose — silent

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Combobox, { props: { options: OPTIONS } });
			await fireEvent.focus(input(container));

			await fireEvent.click(optionAt(1));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even via a synthetic dispatch", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Combobox, {
				props: { options: OPTIONS, disabled: true, sound: true },
			});
			const el = input(container);

			el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// Guardrail: selecting an already-disabled row never plays, even while
		// the panel is open and the row is present in the DOM to dispatch a
		// click at.
		it("never plays for a disabled row, even via a synthetic dispatch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Combobox, {
				props: { options: OPTIONS_WITH_DISABLED, sound: true },
			});
			await fireEvent.focus(input(container));
			const disabledRow = optionAt(1); // SvelteKit, disabled

			disabledRow.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when re-picking the option already selected — the changed-only guard", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Combobox, {
				props: { options: OPTIONS, value: "sveltekit", sound: true },
			});
			await fireEvent.focus(input(container));

			await fireEvent.click(optionAt(1)); // SvelteKit — already the value

			expect(play).not.toHaveBeenCalled();
		});

		it("still calls onValueChange on the very same click that the changed-only guard silences", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onValueChange = vi.fn();
			const { container } = render(Combobox, {
				props: { options: OPTIONS, value: "sveltekit", sound: true, onValueChange },
			});
			await fireEvent.focus(input(container));

			await fireEvent.click(optionAt(1)); // SvelteKit — already the value

			expect(play).not.toHaveBeenCalled();
			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenCalledWith("sveltekit");
		});
	});
});
