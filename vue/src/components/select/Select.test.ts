import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import Select from "./Select.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";
import { dismissable } from "../../internals/dismissable.js";
import { sound } from "../../sound/sound.js";
import type { SelectOption } from "./types.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Five
 * shapes changed and nothing else did:
 *
 * - `tick()` becomes `nextTick()`.
 * - The source's `*.test.svelte` harness collapses: the FormField cases publish
 *   the context through `global.provide` instead of a wrapper component.
 * - The bindable `value` is `v-model:value`, so the round-trip case passes an
 *   `onUpdate:value` listener instead of a getter/setter pair.
 * - The bindable `ref` is exposed on the instance, so the ref case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 * - This framework's `fireEvent` does not return `dispatchEvent`'s boolean, so
 *   the Tab case dispatches the event itself and reads `defaultPrevented`.
 *
 * One fixture also changed, marked at its call site: this package's jsdom has no
 * `PointerEvent`.
 *
 * No `inert` shim, deliberately (the internals suite makes the same call). jsdom
 * implements no `inert` IDL property, so a prototype getter/setter reflecting the
 * property to the attribute would mean the exit case passes against the shim
 * rather than against what the component writes. The presence clock writes the
 * ATTRIBUTE through `toggleAttribute`, so `hasAttribute` observes production
 * behaviour directly.
 */

const OPTIONS: SelectOption[] = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

function trigger(container: Element): HTMLButtonElement {
	return container.querySelector('[role="combobox"]') as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector('[role="listbox"]');
}

function optionRows(): HTMLElement[] {
	return Array.from(document.querySelectorAll('[role="option"]'));
}

function optionByLabel(label: string): HTMLElement {
	return optionRows().find((el) => el.textContent?.trim().startsWith(label)) as HTMLElement;
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
 * tick of its own. The exit window is two microtasks under the animation stub, so
 * anything awaited between the dismiss and the assertion has already drained it
 * and the test would pass for the wrong reason. */
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

describe("Select", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll('[role="listbox"]').forEach((el) => el.remove());
	});

	it("renders closed by default, role=combobox with aria-expanded false and aria-haspopup listbox", () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.getAttribute("aria-haspopup")).toBe("listbox");
		expect(panel()).toBeNull();
	});

	it("shows the placeholder when nothing is selected, and the selected option's label otherwise", async () => {
		const { container, rerender } = render(Select, {
			props: { options: OPTIONS, placeholder: "Choose a framework" },
		});
		expect(trigger(container).textContent).toContain("Choose a framework");

		await rerender({ options: OPTIONS, value: "react" });
		expect(trigger(container).textContent).toContain("React");
	});

	// The last wave shipped `aria-controls` pointing at nothing for the
	// entire closed lifetime, in two components, with tests that only read
	// the attribute after opening. This one reads it before, during and
	// after.
	it("aria-controls is absent while closed and points at the panel's real id once open, then absent again on close", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		await fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
	});

	it("opens on trigger click, and closes on a second click without reopening", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();

		await fireEvent.click(btn);
		// `aria-expanded` is synchronous — `open` still flips in the same tick.
		// The panel's REMOVAL is not: it plays a 150 ms exit first.
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel()).toBeNull());
	});

	// WAI-ARIA APG's select-only combobox pattern names the listbox, not just
	// the trigger — otherwise a screen reader announces it as an unnamed
	// "listbox" the instant it expands.
	it("gives the portalled listbox the same accessible name as the trigger's label prop", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, label: "Plan" } });
		await fireEvent.click(trigger(container));

		expect(panel()?.getAttribute("aria-label")).toBe("Plan");
	});

	it("renders every option as role=option with the right label, inside role=listbox", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		await fireEvent.click(trigger(container));

		expect(panel()?.getAttribute("role")).toBe("listbox");
		const rows = optionRows();
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.textContent?.trim())).toEqual(
			expect.arrayContaining([expect.stringContaining("Svelte 5")])
		);
	});

	it("marks the selected option aria-selected=true and no other", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, value: "react" } });
		await fireEvent.click(trigger(container));

		expect(optionByLabel("React").getAttribute("aria-selected")).toBe("true");
		expect(optionByLabel("Svelte 5").getAttribute("aria-selected")).toBe("false");
		expect(optionByLabel("Vue").getAttribute("aria-selected")).toBe("false");
	});

	it("clicking an option selects it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, onValueChange },
		});
		await fireEvent.click(trigger(container));

		await fireEvent.click(optionByLabel("React"));

		expect(onValueChange).toHaveBeenCalledWith("react");
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel()).toBeNull());
	});

	// A real mousedown on any element carrying a `tabindex` attribute — `-1`
	// included — moves DOM focus to it as the browser's own default action,
	// regardless of whether application code calls `.focus()`. Without a
	// guard, clicking a row would focus the row first, the click would then
	// commit and unmount the panel, and focus would fall through to
	// `document.body` instead of staying on the trigger.
	//
	// What this test can and cannot prove in this environment: jsdom does NOT
	// implement that native mousedown-to-focus step at all, so a
	// `document.activeElement` assertion around a click would pass identically
	// whether the guard exists or not. What IS directly verifiable, and what
	// this test actually asserts: the row's own `mousedown` handler runs and
	// calls `preventDefault()` on a real, cancelable mousedown event.
	it("cancels a row's mousedown default action, so a real click cannot steal focus off the trigger", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		await fireEvent.click(trigger(container));

		const row = optionByLabel("React");
		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		row.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it("clicking a disabled option does nothing", async () => {
		const options: SelectOption[] = [
			...OPTIONS,
			{ value: "svelte-kit", label: "SvelteKit", disabled: true },
		];
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options, onValueChange } });
		await fireEvent.click(trigger(container));

		await fireEvent.click(optionByLabel("SvelteKit"));

		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	it("closes the open panel and rejects row commits once the control becomes disabled", async () => {
		const onValueChange = vi.fn();
		const { container, rerender } = render(Select, {
			props: { options: OPTIONS, onValueChange },
		});
		await fireEvent.click(trigger(container));
		const row = optionByLabel("React");

		await rerender({ options: OPTIONS, onValueChange, disabled: true });
		await nextTick();

		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
		// A click landing on a row still in the DOM (the exit fade) must not commit.
		row.click();
		expect(onValueChange).not.toHaveBeenCalled();
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("closes on an outside click without changing the value", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });

		await fireEvent.click(trigger(container));
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		outside.remove();
	});

	it("Escape closes without changing the value, even after arrowing to a different option", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, value: "svelte", onValueChange },
		});
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("React").id);

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("ArrowDown opens the panel and activates the first enabled option when nothing is selected", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		await nextTick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
	});

	it("ArrowUp opens the panel and activates the last enabled option when nothing is selected", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowUp" });
		await nextTick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
	});

	it("Enter opens the panel and activates the already-selected option, not the first", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, value: "vue" } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "Enter" });
		await nextTick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
	});

	it("skips a disabled option when navigating with ArrowDown", async () => {
		const options: SelectOption[] = [
			{ value: "a", label: "Aaa" },
			{ value: "b", label: "Bbb", disabled: true },
			{ value: "c", label: "Ccc" },
		];
		const { container } = render(Select, { props: { options } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens on Aaa
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // skips Bbb, lands on Ccc
		await nextTick();

		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Ccc").id);
	});

	it("Enter commits the active option and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, activates Svelte 5
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to React
		await fireEvent.keyDown(btn, { key: "Enter" });

		expect(onValueChange).toHaveBeenCalledWith("react");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Home/End jump to the first/last option while open", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, value: "svelte" } });
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "End" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);

		await fireEvent.keyDown(btn, { key: "Home" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
	});

	// If `options` shrinks while the panel is open, a previously-valid active
	// index can end up pointing past the end of the new, shorter array —
	// nothing else re-checks this between explicit move/typeahead/setActive
	// calls. Without the fix, `aria-activedescendant` would keep citing an
	// option id with no row left in the DOM to match it.
	it("clamps the active option when the option list shrinks while open, instead of citing a removed row", async () => {
		const { container, rerender } = render(Select, {
			props: { options: OPTIONS, value: "svelte" },
		});
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "End" }); // activates Vue, the last of three
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);

		await rerender({ options: OPTIONS.slice(0, 2), value: "svelte" }); // Vue's row is gone
		await nextTick();

		expect(btn.hasAttribute("aria-activedescendant")).toBe(false);
	});

	// Documented, chosen behaviour: Tab commits like Enter, but is never
	// prevented — the browser still moves focus on to the next control. This
	// framework's `fireEvent` discards `dispatchEvent`'s return value, so the
	// event is dispatched directly and read back.
	it("Tab commits the active option, closes the panel, and does not preventDefault", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // Svelte 5
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // React
		const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
		btn.dispatchEvent(event);
		await nextTick();

		expect(onValueChange).toHaveBeenCalledWith("react");
		expect(event.defaultPrevented).toBe(false);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("typing while closed selects by typeahead without opening the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "v" });

		expect(onValueChange).toHaveBeenCalledWith("vue");
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel()).toBeNull();
	});

	it("hovering an option highlights it without selecting it", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.pointerEnter(optionByLabel("Vue"));

		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("does not open, commit or move on any key when disabled, even via a synthetic dispatch", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, disabled: true, onValueChange },
		});
		const btn = trigger(container);

		await fireEvent.click(btn);
		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		await fireEvent.keyDown(btn, { key: "a" });

		expect(panel()).toBeNull();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: two-way, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through v-model:value", async () => {
		let value = "";
		const { container } = render(Select, {
			props: { options: OPTIONS, value, "onUpdate:value": (v: string) => (value = v) },
		});
		await fireEvent.click(trigger(container));
		await fireEvent.click(optionByLabel("Vue"));
		expect(value).toBe("vue");
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		await fireEvent.click(trigger(container));
		await fireEvent.click(optionByLabel("Vue"));
		expect(onValueChange).toHaveBeenCalledWith("vue");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, value: "svelte", onValueChange },
		});
		expect(trigger(container).textContent).toContain("Svelte 5");

		await fireEvent.click(trigger(container));
		await fireEvent.click(optionByLabel("Vue"));
		expect(onValueChange).toHaveBeenCalledWith("vue");
	});

	it("merges the class prop onto the trigger", () => {
		const { container } = render(Select, { props: { options: OPTIONS, class: "w-[240px]" } });
		expect(trigger(container).className).toContain("w-[240px]");
		expect(trigger(container).className).toContain("ft-select-trigger");
	});

	it("exposes the trigger element as ref", () => {
		const wrapper = mount(Select, { props: { options: OPTIONS }, attachTo: document.body });

		expect(wrapper.vm.ref).toBe(document.querySelector('[role="combobox"]'));
		wrapper.unmount();
	});

	describe("form participation", () => {
		it("renders no hidden input when name is omitted", () => {
			const { container } = render(Select, { props: { options: OPTIONS } });
			expect(container.querySelector('input[type="hidden"]')).toBeNull();
		});

		it("carries the value through a hidden input when name is set, readable via FormData", async () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, name: "framework", value: "react" },
			});
			const hiddenInput = () => container.querySelector('input[type="hidden"]') as HTMLInputElement;
			expect(hiddenInput()).not.toBeNull();

			const form = document.createElement("form");
			form.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form).get("framework")).toBe("react");

			await fireEvent.click(trigger(container));
			await fireEvent.click(optionByLabel("Vue"));
			await nextTick();

			const form2 = document.createElement("form");
			form2.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form2).get("framework")).toBe("vue");
		});

		it("excludes the hidden input's value from FormData while disabled", () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, name: "framework", value: "react", disabled: true },
			});
			const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hiddenInput.cloneNode(true));
			expect(new FormData(form).get("framework")).toBeNull();
		});
	});

	// The source's `*.test.svelte` harness collapses into `global.provide`: the
	// component is proven against the frozen `useField()`/`FieldContext`
	// surface, without depending on the actual FormField component.
	describe("FormField integration", () => {
		it("inside a FormField, picks up controlId, describedBy, invalid and required from context", async () => {
			const field: FieldContext = {
				controlId: "field-1",
				describedBy: "field-1-error",
				invalid: true,
				required: true,
				disabled: false,
			};
			const { container } = render(Select, {
				props: { options: OPTIONS },
				global: { provide: { [FIELD_KEY]: field } },
			});
			await nextTick();

			const btn = trigger(container);
			expect(btn.id).toBe("field-1");
			expect(btn.getAttribute("aria-describedby")).toBe("field-1-error");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
			expect(btn.getAttribute("aria-required")).toBe("true");
		});

		it("lets the FormField's disabled win over the control's own disabled=false prop", async () => {
			const field: FieldContext = {
				controlId: "field-2",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(Select, {
				props: { options: OPTIONS, disabled: false },
				global: { provide: { [FIELD_KEY]: field } },
			});
			await nextTick();
			expect(trigger(container).disabled).toBe(true);
		});

		// The polarity `??` gets right and `||` gets wrong: context `false`
		// must win over the control's own prop `true`, not the other way
		// around — `true || false` would still read `true` and pass the test
		// above just as well.
		it("lets the FormField's disabled=false win over the control's own disabled=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-3",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(Select, {
				props: { options: OPTIONS, disabled: true },
				global: { provide: { [FIELD_KEY]: field } },
			});
			await nextTick();
			expect(trigger(container).disabled).toBe(false);
		});

		it("lets the FormField's required=false win over the control's own required=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-4",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(Select, {
				props: { options: OPTIONS, required: true },
				global: { provide: { [FIELD_KEY]: field } },
			});
			await nextTick();
			expect(trigger(container).hasAttribute("aria-required")).toBe(false);
		});

		it("lets the FormField's invalid=false win over the control's own invalid=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-5",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(Select, {
				props: { options: OPTIONS, invalid: true },
				global: { provide: { [FIELD_KEY]: field } },
			});
			await nextTick();
			expect(trigger(container).hasAttribute("aria-invalid")).toBe(false);
		});

		it("works standalone with useField() undefined, falling back to its own props", () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, id: "solo", disabled: true, required: true, invalid: true },
			});
			const btn = trigger(container);
			expect(btn.id).toBe("solo");
			expect(btn.disabled).toBe(true);
			expect(btn.getAttribute("aria-required")).toBe("true");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
		});
	});

	// The spy sits on the CONTROLLER, not on the composable, so what is asserted
	// is the cue that actually reached the singleton; the second argument is the
	// options object the cue player forwards, which is `undefined` here.
	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when opened by a trigger click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });

			await fireEvent.click(trigger(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("Enter commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			const btn = trigger(container);

			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, activates Svelte 5
			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to React
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("re-committing the already-selected value plays close (a dismiss), never silence", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, {
				props: { options: OPTIONS, value: "svelte", sound: true },
			});
			const btn = trigger(container);

			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens on the selected option
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "Enter" }); // commits nothing new

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("a click commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			await fireEvent.click(trigger(container));
			play.mockClear();

			await fireEvent.click(optionByLabel("React"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("Tab commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			const btn = trigger(container);
			await fireEvent.click(btn); // opens
			play.mockClear();

			await fireEvent.keyDown(btn, { key: "Tab" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("Escape plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, {
				props: { options: OPTIONS, value: "svelte", sound: true },
			});
			const btn = trigger(container);
			await fireEvent.click(btn);
			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // highlight a different option
			play.mockClear();

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("an outside click plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			await fireEvent.click(trigger(container));
			play.mockClear();

			pointerDownOn(outside);
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			outside.remove();
		});

		it("closed typeahead commits and plays select once; repeating the same letter that keeps the same match stays silent", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			const btn = trigger(container);

			await fireEvent.keyDown(btn, { key: "v" });
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);

			// Same value re-committed: the same-value early return in setValue
			// stays silent, per contract.
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "v" });
			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS } });
			const btn = trigger(container);

			await fireEvent.click(btn);
			await fireEvent.click(optionByLabel("React"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even via a synthetic dispatch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, {
				props: { options: OPTIONS, disabled: true, sound: true },
			});
			const btn = trigger(container);

			await fireEvent.click(btn);
			await fireEvent.keyDown(btn, { key: "ArrowDown" });
			await fireEvent.keyDown(btn, { key: "a" });

			expect(play).not.toHaveBeenCalled();
		});
	});

	// The panel's entrance is the shared `anchored` transition, and its growth
	// origin follows the side the panel was ACTUALLY placed on rather than the
	// side it asked for. jsdom makes that deterministic: every rect measures
	// 0×0, so a requested `bottom` never overflows the 768px-tall default
	// viewport and never flips, while a requested `top` always overflows
	// (`anchor.top - height - offset` is `-4`) and always does.
	describe("entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Select, { props: { options: OPTIONS } });

			await fireEvent.click(trigger(container));
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

		it("follows a flipped placement rather than the requested side", async () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, side: "top", align: "end" },
			});

			await fireEvent.click(trigger(container));
			await nextTick();

			// Asked for `top`, placed on `bottom`: the panel now hangs below
			// the trigger, so it has to grow out of its own top edge. Reading
			// the requested side here would point the origin at the bottom
			// edge and the panel would appear to fall upward into place.
			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("end");
			expect(el.style.getPropertyValue("transform-origin")).toBe("right top");
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Select, { props: { options: OPTIONS } });

			await fireEvent.click(trigger(container));
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
	// true inside it. `open` itself still flips synchronously, which is why
	// every `aria-expanded` assertion above stayed unwrapped.
	describe("exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Select, { props: { options: OPTIONS } });
			const btn = trigger(container);
			await fireEvent.click(btn);
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
			// exit. Asserted so nobody drops the transition without noticing
			// that a leaving listbox would keep taking clicks on its rows.
			expect(closing!.hasAttribute("inert")).toBe(true);
			// The trigger has already been told the panel is gone.
			expect(btn.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: () => ctx.open` gate. A layer on its way out must not
		// swallow the key: the dismiss stack scans past it and hands Escape to
		// whatever is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the select, so the panel sits above it on the
			// shared layer stack — the shape of a select opened inside another
			// dismissable surface.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(Select, { props: { options: OPTIONS } });
			await fireEvent.click(trigger(container));

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
			const { container } = render(Select, { props: { options: OPTIONS } });
			await fireEvent.click(trigger(container));
			expect(panel()).not.toBeNull();

			pressEscape();
			await nextTick();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});
});
