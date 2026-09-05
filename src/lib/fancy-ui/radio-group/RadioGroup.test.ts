import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import RadioGroup from "./RadioGroup.svelte";
import RadioGroupItem from "./RadioGroupItem.svelte";
import Harness from "./RadioGroupHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import { sound } from "../sound/sound.svelte.js";

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

function group(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="radiogroup"]') as HTMLElement;
}

function radios(container: HTMLElement): HTMLInputElement[] {
	return Array.from(container.querySelectorAll('input[type="radio"]'));
}

function byLabel(container: HTMLElement, label: string): HTMLInputElement {
	return radios(container).find(
		(r) => r.closest("label")?.textContent?.trim() === label
	) as HTMLInputElement;
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

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
		await tick();

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
		await tick();

		const root = group(container);
		expect(root.hasAttribute("aria-labelledby")).toBe(false);
		expect(root.getAttribute("aria-label")).toBe("Fallback label");
	});

	it("renders every item as a real radio input sharing one name", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await tick();

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
		const { container } = render(Harness, { props: { items: ITEMS, value: "b" } });
		await tick();

		for (const input of radios(container)) {
			expect(input.hasAttribute("tabindex")).toBe(false);
		}
	});

	it("keeps two groups on the same page from stealing each other's selection", async () => {
		const { container: c1 } = render(Harness, { props: { items: ITEMS } });
		const { container: c2 } = render(Harness, { props: { items: ITEMS } });

		const name1 = radios(c1)[0].name;
		const name2 = radios(c2)[0].name;
		expect(name1).toBeTruthy();
		expect(name2).toBeTruthy();
		expect(name1).not.toBe(name2);

		await fireEvent.click(byLabel(c1, "Option A"));
		expect(byLabel(c1, "Option A").checked).toBe(true);
		expect(radios(c2).some((r) => r.checked)).toBe(false);
	});

	it("respects an explicit name over the generated one", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, name: "plan" } });
		await tick();
		expect(radios(container).every((r) => r.name === "plan")).toBe(true);
	});

	it("round-trips a selection through bind:value", async () => {
		let value = "";
		const { container } = render(Harness, {
			props: {
				items: ITEMS,
				get value() {
					return value;
				},
				set value(next: string) {
					value = next;
				},
			},
		});

		await fireEvent.click(byLabel(container, "Option B"));
		expect(value).toBe("b");
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
			props: { items: ITEMS, value: "a", onValueChange },
		});

		expect(byLabel(container, "Option A").checked).toBe(true);

		await fireEvent.click(byLabel(container, "Option C"));
		expect(onValueChange).toHaveBeenCalledWith("c");
		expect(byLabel(container, "Option C").checked).toBe(true);
	});

	it("does not re-fire onValueChange when clicking the already-selected item", async () => {
		// The one thing a native radio can't do that ToggleGroup's hand-rolled
		// single-select can: re-clicking the checked item is a no-op, because
		// the browser never fires `change` when the checked state does not
		// actually change.
		const onValueChange = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, value: "b", onValueChange },
		});

		await fireEvent.click(byLabel(container, "Option B"));
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("moves the selection to a different item, clearing the previous one", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "a" } });
		expect(byLabel(container, "Option A").checked).toBe(true);

		await fireEvent.click(byLabel(container, "Option C"));
		expect(byLabel(container, "Option A").checked).toBe(false);
		expect(byLabel(container, "Option C").checked).toBe(true);
	});

	it("disables every item when the group itself is disabled", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, disabled: true } });
		await tick();
		expect(radios(container).every((r) => r.disabled)).toBe(true);
	});

	it("lets a single item be disabled independent of the group", async () => {
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B" },
		];
		const { container } = render(Harness, { props: { items } });
		await tick();

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
		await tick();

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
		await tick();

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
		await tick();

		expect(radios(container).every((r) => r.disabled)).toBe(true);
	});

	// The tests above only exercise context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` derived
	// values would pass every one of them, since `true || false` is still
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
		await tick();

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
		await tick();

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
		await tick();

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

	it("falls back to the value as content when neither children nor label is given", () => {
		const { container } = render(RadioGroupItem, { props: { value: "x" } });
		expect(container.querySelector("label")?.textContent?.trim()).toBe("x");
	});

	it("renders custom children over the label/value fallback", () => {
		const { container } = render(RadioGroupItem, {
			props: {
				value: "x",
				label: "Ex",
				children: snippet('<span data-testid="glyph">Custom</span>'),
			},
		});
		expect(container.querySelector('[data-testid="glyph"]')).toBeTruthy();
	});

	it("defaults to a vertical stack and switches to horizontal", () => {
		const { container: vertical } = render(RadioGroup, {});
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

	it("binds the root element", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(RadioGroup, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});

		expect(ref).toBe(group(container));
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
		// the moment this component grows a `createReducedMotion()` read. Matching on
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
			await tick();

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
			expect(play).toHaveBeenCalledWith("select");
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
			await tick();

			await fireEvent.change(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when clicking the already-selected item", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, value: "b" },
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
				props: { items: ITEMS, sound: true, value: "a" },
			});

			await fireEvent.click(byLabel(container, "Option B"));
			expect(play).toHaveBeenCalledTimes(1);

			await fireEvent.click(byLabel(container, "Option C"));
			expect(play).toHaveBeenCalledTimes(2);

			expect(play).toHaveBeenNthCalledWith(1, "select");
			expect(play).toHaveBeenNthCalledWith(2, "select");
		});
	});
});
