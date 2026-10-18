import { render, cleanup, fireEvent } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, provide, ref, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import RadioGroup from "./RadioGroup.vue";
import RadioGroupItem from "./RadioGroupItem.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";
import { sound } from "../../sound/sound.js";

interface Item {
	value: string;
	label: string;
	disabled?: boolean;
}

const ITEMS: Item[] = [
	{ value: "a", label: "Option A" },
	{ value: "b", label: "Option B" },
	{ value: "c", label: "Option C" },
];

function group(container: Element): HTMLElement {
	return container.querySelector('[role="radiogroup"]') as HTMLElement;
}

function radios(container: Element): HTMLInputElement[] {
	return Array.from(container.querySelectorAll('input[type="radio"]'));
}

function byLabel(container: Element, label: string): HTMLInputElement {
	return radios(container).find(
		(r) => r.closest("label")?.textContent?.trim() === label
	) as HTMLInputElement;
}

/**
 * Test-only rig. Renders a real RadioGroup with real RadioGroupItem children —
 * a raw HTML string would carry neither the group's context nor the browser's
 * own native radio grouping. `v-model:value` is forwarded through this
 * component's own local ref so a test can round-trip a selection the same way
 * ToggleGroup's harness does; the bound value is mirrored into a
 * `data-testid` span because `@testing-library/vue`'s `render` gives no direct
 * handle onto component state.
 *
 * The optional `field` prop publishes a FieldContext under FIELD_KEY before
 * rendering the group — this is how RadioGroup's FormField integration is
 * proven without depending on the actual FormField component, which lives in
 * a different builder's folder and is not part of the frozen surface this
 * component consumes (only FIELD_KEY/FieldContext/useField are). Publishing
 * `undefined` explicitly is the same as publishing nothing — `useField()`
 * reads back `undefined` either way.
 */
const Harness = defineComponent({
	components: { RadioGroup, RadioGroupItem },
	props: {
		items: { type: Array as PropType<Item[]>, required: true },
		initialValue: { type: String, default: "" },
		onValueChange: { type: Function as PropType<(value: string) => void>, default: undefined },
		name: { type: String, default: undefined },
		disabled: { type: Boolean, default: false },
		required: { type: Boolean, default: false },
		invalid: { type: Boolean, default: false },
		orientation: {
			type: String as PropType<"horizontal" | "vertical">,
			default: "vertical",
		},
		label: { type: String, default: "Test group" },
		/** Omit to render with no FormField provider above it at all. */
		field: { type: Object as PropType<FieldContext | undefined>, default: undefined },
		sound: { type: Boolean, default: false },
	},
	setup(props) {
		// Must run synchronously during this component's own setup, never
		// inside a watcher or a lifecycle hook.
		provide(FIELD_KEY, props.field as FieldContext);
		const value = ref(props.initialValue);
		return { value };
	},
	template: `
		<RadioGroup
			v-model:value="value"
			:name="name"
			:onValueChange="onValueChange"
			:disabled="disabled"
			:required="required"
			:invalid="invalid"
			:orientation="orientation"
			:label="label"
			:sound="sound"
		>
			<RadioGroupItem
				v-for="item in items"
				:key="item.value"
				:value="item.value"
				:disabled="item.disabled"
				:label="item.label"
			/>
		</RadioGroup>
		<span data-testid="bound-value">{{ value }}</span>
	`,
});

function boundValue(container: Element): string {
	return container.querySelector('[data-testid="bound-value"]')?.textContent ?? "";
}

/**
 * Two independent groups inside ONE app. Vue's `useId()` counter is per app,
 * not per page, so two separate `render()` calls would both mint `v-0` — see
 * the package README's divergence note. One app is what the Svelte case is
 * actually about anyway: two groups on the same page.
 */
const TwoGroups = defineComponent({
	components: { Harness },
	props: { items: { type: Array as PropType<Item[]>, required: true } },
	template: `
		<div data-testid="one"><Harness :items="items" /></div>
		<div data-testid="two"><Harness :items="items" /></div>
	`,
});

/**
 * A parent that binds `value` AND listens to `update:value` owns the selection
 * (Vue's controlled `defineModel`), then vetoes every write unless `accept`
 * says otherwise, in which case it writes back through `onValueChange`.
 */
const VetoHarness = defineComponent({
	props: {
		accept: { type: Boolean, default: false },
		invalid: { type: Boolean, default: false },
		onChange: { type: Function, default: undefined },
	},
	setup(props) {
		const value = ref("a");
		return () => [
			h(
				RadioGroup,
				{
					value: value.value,
					"onUpdate:value": () => {},
					onValueChange: (next: string) => {
						props.onChange?.(next);
						if (props.accept) value.value = next;
					},
					invalid: props.invalid,
					label: "Owned group",
				},
				() => ITEMS.map((item) => h(RadioGroupItem, { key: item.value, ...item }))
			),
			h("span", { "data-testid": "owned-value" }, value.value),
		];
	},
});

describe("RadioGroup", () => {
	afterEach(cleanup);

	it("renders role=radiogroup with the given accessible name", () => {
		const { container } = render(Harness, { props: { items: ITEMS, label: "Pick one" } });
		const root = group(container);

		expect(root).toBeTruthy();
		expect(root.getAttribute("aria-label")).toBe("Pick one");
		// Standalone: no FormField, so nothing for aria-labelledby to point
		// at — it must be absent, not present-but-dangling.
		expect(root.hasAttribute("aria-labelledby")).toBe(false);
	});

	// `<label for>` cannot target this root at all — a div with
	// role="radiogroup" isn't one of the elements `for` can reach, ARIA role
	// or not — so labeling inside a FormField has to go through
	// aria-labelledby, pointed at the id of the label FormField actually
	// rendered. jsdom won't compute the resulting accessible name for us,
	// but it will tell us whether the attribute exists and points at the
	// right id, which is the part that was silently broken before `labelId`
	// existed on the frozen context.
	it("inside a FormField that rendered a label, points aria-labelledby at it and drops its own aria-label", async () => {
		const field: FieldContext = {
			controlId: "field-6",
			labelId: "field-6-label",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Harness, {
			props: { items: ITEMS, field, label: "Own label, should be dropped" },
		});
		await nextTick();

		const root = group(container);
		expect(root.getAttribute("aria-labelledby")).toBe("field-6-label");
		expect(root.hasAttribute("aria-label")).toBe(false);
	});

	it("inside a FormField that rendered no label of its own, falls back to the group's own label prop", async () => {
		const field: FieldContext = {
			controlId: "field-7",
			labelId: undefined,
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Harness, {
			props: { items: ITEMS, field, label: "Fallback label" },
		});
		await nextTick();

		const root = group(container);
		expect(root.hasAttribute("aria-labelledby")).toBe(false);
		expect(root.getAttribute("aria-label")).toBe("Fallback label");
	});

	it("renders every item as a real radio input sharing one name", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await nextTick();

		const inputs = radios(container);
		expect(inputs).toHaveLength(3);
		const names = new Set(inputs.map((r) => r.name));
		expect(names.size).toBe(1);
		expect([...names][0]).toBeTruthy();
	});

	// jsdom does not implement the HTML spec's sequential-focus-navigation
	// algorithm for same-`name` radio groups — a hand check before writing
	// this component confirmed `.tabIndex` reads 0 for every radio
	// regardless of checked state, in jsdom, always. So the emergent "first
	// item tabbable, then the checked one" behaviour cannot be asserted
	// directly in this environment. What CAN be asserted, and what that
	// native behaviour actually depends on in a real browser: every item
	// shares one real `name`, and none of them carries an authored
	// `tabindex` fighting the browser's own default.
	it("authors no explicit tabindex, leaving the browser's native roving tab stop in charge", async () => {
		const { container } = render(Harness, {
			props: { items: ITEMS, initialValue: "b" },
		});
		await nextTick();

		for (const input of radios(container)) {
			expect(input.hasAttribute("tabindex")).toBe(false);
		}
	});

	it("keeps two groups on the same page from stealing each other's selection", async () => {
		const { container } = render(TwoGroups, { props: { items: ITEMS } });
		const c1 = container.querySelector('[data-testid="one"]') as HTMLElement;
		const c2 = container.querySelector('[data-testid="two"]') as HTMLElement;

		const name1 = radios(c1)[0]!.name;
		const name2 = radios(c2)[0]!.name;
		expect(name1).toBeTruthy();
		expect(name2).toBeTruthy();
		expect(name1).not.toBe(name2);

		await fireEvent.click(byLabel(c1, "Option A"));
		expect(byLabel(c1, "Option A").checked).toBe(true);
		expect(radios(c2).some((r) => r.checked)).toBe(false);
	});

	it("respects an explicit name over the generated one", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, name: "plan" } });
		await nextTick();
		expect(radios(container).every((r) => r.name === "plan")).toBe(true);
	});

	it("round-trips a selection through v-model:value", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });

		await fireEvent.click(byLabel(container, "Option B"));
		expect(boundValue(container)).toBe("b");
	});

	it("fires onValueChange with the new value", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Harness, { props: { items: ITEMS, onValueChange } });

		await fireEvent.click(byLabel(container, "Option C"));
		expect(onValueChange).toHaveBeenCalledWith("c");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, initialValue: "a", onValueChange },
		});

		expect(byLabel(container, "Option A").checked).toBe(true);

		await fireEvent.click(byLabel(container, "Option C"));
		expect(onValueChange).toHaveBeenCalledWith("c");
		expect(byLabel(container, "Option C").checked).toBe(true);
	});

	it("puts the native radios back on the model when a parent that owns value declines the write", async () => {
		const onChange = vi.fn();
		const { container, getByTestId } = render(VetoHarness, {
			props: { onChange, invalid: true },
		});
		await nextTick();
		const a = byLabel(container, "Option A");
		const b = byLabel(container, "Option B");
		expect(a.checked).toBe(true);

		await fireEvent.click(b);
		await nextTick();

		expect(onChange).toHaveBeenCalledWith("b");
		expect(getByTestId("owned-value").textContent).toBe("a");
		// Native state agrees with the model the parent kept...
		expect(a.checked).toBe(true);
		expect(b.checked).toBe(false);
		// ...and so does the invalid tint, which keys off the model.
		expect(b.className).toContain("border-destructive");
		expect(a.className).not.toContain("border-destructive");

		// The same item stays pickable: the next press is a fresh request.
		await fireEvent.click(b);
		await nextTick();
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(b.checked).toBe(false);
	});

	it("keeps the native radios when a parent that owns value accepts the write through the callback", async () => {
		const { container, getByTestId } = render(VetoHarness, { props: { accept: true } });
		await nextTick();
		const a = byLabel(container, "Option A");
		const b = byLabel(container, "Option B");

		await fireEvent.click(b);
		await nextTick();

		expect(getByTestId("owned-value").textContent).toBe("b");
		expect(a.checked).toBe(false);
		expect(b.checked).toBe(true);
	});

	it("does not re-fire onValueChange when clicking the already-selected item", async () => {
		// The one thing a native radio can't do that ToggleGroup's hand-rolled
		// single-select can: re-clicking the checked item is a no-op, because
		// the browser never fires `change` when the checked state does not
		// actually change.
		const onValueChange = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, initialValue: "b", onValueChange },
		});

		await fireEvent.click(byLabel(container, "Option B"));
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("moves the selection to a different item, clearing the previous one", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, initialValue: "a" } });
		expect(byLabel(container, "Option A").checked).toBe(true);

		await fireEvent.click(byLabel(container, "Option C"));
		expect(byLabel(container, "Option A").checked).toBe(false);
		expect(byLabel(container, "Option C").checked).toBe(true);
	});

	it("disables every item when the group itself is disabled", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, disabled: true } });
		await nextTick();
		expect(radios(container).every((r) => r.disabled)).toBe(true);
	});

	it("lets a single item be disabled independent of the group", async () => {
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B" },
		];
		const { container } = render(Harness, { props: { items } });
		await nextTick();

		expect(byLabel(container, "A").disabled).toBe(true);
		expect(byLabel(container, "B").disabled).toBe(false);
	});

	it("blocks selection on a disabled item even via a synthetic change event", async () => {
		const onValueChange = vi.fn();
		const items: Item[] = [{ value: "a", label: "A", disabled: true }];
		const { container } = render(Harness, { props: { items, onValueChange } });

		await fireEvent.change(byLabel(container, "A"));
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("sets aria-invalid on the group when invalid", () => {
		const { container } = render(Harness, { props: { items: ITEMS, invalid: true } });
		expect(group(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("leaves aria-invalid unset by default", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		expect(group(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("marks the group aria-required and every native radio required when required", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, required: true } });
		await nextTick();

		expect(group(container).getAttribute("aria-required")).toBe("true");
		expect(radios(container).every((r) => r.required)).toBe(true);
	});

	it("inside a FormField, picks up controlId, describedBy, invalid and required from context", async () => {
		const field: FieldContext = {
			controlId: "field-1",
			describedBy: "field-1-error",
			invalid: true,
			required: true,
			disabled: false,
		};
		const { container } = render(Harness, { props: { items: ITEMS, field } });
		await nextTick();

		const root = group(container);
		expect(root.id).toBe("field-1");
		expect(root.getAttribute("aria-describedby")).toBe("field-1-error");
		expect(root.getAttribute("aria-invalid")).toBe("true");
		expect(root.getAttribute("aria-required")).toBe("true");
		expect(radios(container).every((r) => r.required)).toBe(true);
	});

	it("lets the FormField's disabled win over the group's own disabled prop", async () => {
		const field: FieldContext = {
			controlId: "field-2",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: true,
		};
		const { container } = render(Harness, {
			props: { items: ITEMS, field, disabled: false },
		});
		await nextTick();

		expect(radios(container).every((r) => r.disabled)).toBe(true);
	});

	// The tests above only exercise context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` computeds
	// would pass every one of them, since `true || false` is still
	// `true`. The three below pin the polarity that actually tells `??` and
	// `||` apart: own prop `true`, context `false`, expecting the context's
	// `false` to win.
	it("lets the FormField's disabled=false win over the group's own disabled=true prop", async () => {
		const field: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Harness, {
			props: { items: ITEMS, field, disabled: true },
		});
		await nextTick();

		expect(radios(container).every((r) => r.disabled)).toBe(false);
	});

	it("lets the FormField's required=false win over the group's own required=true prop", async () => {
		const field: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Harness, {
			props: { items: ITEMS, field, required: true },
		});
		await nextTick();

		expect(group(container).hasAttribute("aria-required")).toBe(false);
		expect(radios(container).every((r) => r.required)).toBe(false);
	});

	it("lets the FormField's invalid=false win over the group's own invalid=true prop", async () => {
		const field: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Harness, {
			props: { items: ITEMS, field, invalid: true },
		});
		await nextTick();

		expect(group(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("follows the group's disabled prop as it flips at runtime, not just on first render", async () => {
		const { container, rerender } = render(Harness, {
			props: { items: ITEMS, disabled: false },
		});
		expect(radios(container).every((r) => r.disabled)).toBe(false);

		await rerender({ items: ITEMS, disabled: true });
		expect(radios(container).every((r) => r.disabled)).toBe(true);

		await rerender({ items: ITEMS, disabled: false });
		expect(radios(container).every((r) => r.disabled)).toBe(false);
	});

	it("renders an item outside a group harmlessly, unchecked and without a shared name", async () => {
		const { container } = render(RadioGroupItem, { props: { value: "solo", label: "Solo" } });
		const input = container.querySelector('input[type="radio"]') as HTMLInputElement;

		expect(input.checked).toBe(false);
		expect(input.hasAttribute("name")).toBe(false);

		// There is no group to select into; this must not throw.
		await fireEvent.click(input);
		expect(input.checked).toBe(true); // the native input still checks itself locally
	});

	it("falls back to the value as content when neither slot content nor label is given", () => {
		const { container } = render(RadioGroupItem, { props: { value: "x" } });
		expect(container.querySelector("label")?.textContent?.trim()).toBe("x");
	});

	it("renders custom slot content over the label/value fallback", () => {
		const { container } = render(RadioGroupItem, {
			props: { value: "x", label: "Ex" },
			slots: { default: '<span data-testid="glyph">Custom</span>' },
		});
		expect(container.querySelector('[data-testid="glyph"]')).toBeTruthy();
	});

	it("defaults to a vertical stack and switches to horizontal", () => {
		const { container: vertical } = render(RadioGroup);
		expect(group(vertical).className).toContain("flex-col");

		const { container: horizontal } = render(RadioGroup, {
			props: { orientation: "horizontal" },
		});
		expect(group(horizontal).className).toContain("flex-row");
	});

	it("merges the class prop with the base classes on the root", () => {
		const { container } = render(RadioGroup, { props: { class: "mt-4" } });
		const root = group(container);

		expect(root.className).toContain("ft-radio-group");
		expect(root.className).toContain("mt-4");
	});

	it("exposes the root element", () => {
		const wrapper = mount(RadioGroup);
		expect(wrapper.vm.ref).toBe(wrapper.element);
	});

	// The dot now scales in from a `::after` that exists in both states rather
	// than being created by `:checked` — a pseudo-element that does not exist
	// yet has nothing to grow from. Its resting `scale(0)` / `scale(1)` pair is
	// declared outside `@media (prefers-reduced-motion: no-preference)` and only
	// the transition between them inside it, so under the preference the dot is
	// simply there the instant the item is selected. jsdom computes neither a
	// pseudo-element nor a media block; what it can pin is the selector the CSS
	// keys off — `:checked` on `.ft-radio-item-control` — and that the selection
	// contract is gated on nothing.
	it("reduced motion: selection still drives the :checked hook the dot is keyed off", async () => {
		// Discriminating stub: `(prefers-reduced-motion: reduce)` and
		// `(prefers-reduced-motion: no-preference)` are complementary, so a blanket
		// `matches: true` would answer yes to both and silently satisfy either branch
		// the moment this component grows a `useReducedMotion()` read. Matching on
		// the substring "reduce" does NOT discriminate — "prefers-reduced-motion"
		// contains it — hence the anchored `: reduce` test.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: /prefers-reduced-motion:\s*reduce\b/.test(query),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}));

		try {
			const onValueChange = vi.fn();
			const { container } = render(Harness, { props: { items: ITEMS, onValueChange } });
			const a = byLabel(container, "Option A");
			const b = byLabel(container, "Option B");

			expect(a.className).toContain("ft-radio-item-control");
			expect(a.checked).toBe(false);

			await fireEvent.click(b);
			await nextTick();

			expect(b.checked).toBe(true);
			expect(a.checked).toBe(false);
			expect(onValueChange).toHaveBeenCalledWith("b");
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays select exactly once when a new item is picked, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });

			await fireEvent.click(byLabel(container, "Option A"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS } });

			await fireEvent.click(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the group itself is disabled, even with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, disabled: true },
			});

			await fireEvent.change(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled through a surrounding FormField, even with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const field: FieldContext = {
				controlId: "field-sound-1",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, field },
			});
			await nextTick();

			await fireEvent.change(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when clicking the already-selected item", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, initialValue: "b" },
			});

			await fireEvent.click(byLabel(container, "Option B"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays exactly one select cue per change during arrow-key traversal", async () => {
			// jsdom does not implement the browser's native arrow-key roving
			// selection for radio groups, so the traversal is simulated the way
			// the browser's own default action would: each arrow step moves
			// focus to the next radio and fires a real selection change on it,
			// exactly like a real ArrowDown press does.
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, initialValue: "a" },
			});

			await fireEvent.click(byLabel(container, "Option B"));
			expect(play).toHaveBeenCalledTimes(1);

			await fireEvent.click(byLabel(container, "Option C"));
			expect(play).toHaveBeenCalledTimes(2);

			expect(play).toHaveBeenNthCalledWith(1, "select", undefined);
			expect(play).toHaveBeenNthCalledWith(2, "select", undefined);
		});
	});
});
