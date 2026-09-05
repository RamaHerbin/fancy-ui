import { useState } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { RadioGroup } from "./RadioGroup.js";
import { RadioGroupItem } from "./RadioGroupItem.js";
import { FieldReactContext, type FieldContext } from "../../internals/field.js";
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

interface HarnessProps {
	items: Item[];
	value?: string;
	onValueChange?: (value: string) => void;
	name?: string;
	disabled?: boolean;
	required?: boolean;
	invalid?: boolean;
	orientation?: "horizontal" | "vertical";
	label?: string;
	/** Omit to render with no FormField provider above it at all. */
	field?: FieldContext;
	sound?: boolean;
}

/*
 * Test-only rig, the counterpart of the Svelte suite's
 * `RadioGroupHarness.test.svelte`. It renders a real RadioGroup with real
 * RadioGroupItem children — raw markup would carry neither the group's context
 * nor the browser's own native radio grouping. `bind:value` becomes the
 * controlled pair: this component owns the selection and hands it back down, so
 * a test can round-trip one, and the `value` prop below is the *initial*
 * selection, exactly as the Svelte harness's own `$bindable` default is.
 *
 * The optional `field` prop publishes a FieldContext above the group, exactly
 * like the Svelte harness's `setContext(FIELD_KEY, field)` — this is how
 * RadioGroup's FormField integration is proven without depending on the actual
 * FormField component. Publishing `undefined` explicitly reads the same as
 * publishing nothing, so the provider is unconditional here too.
 *
 * A Svelte harness needs its own file because a Svelte component always does;
 * React declares it inline.
 */
function Harness({
	items,
	value: initialValue = "",
	onValueChange,
	name,
	disabled = false,
	required = false,
	invalid = false,
	orientation = "vertical",
	label = "Test group",
	field,
	sound = false,
}: HarnessProps) {
	const [value, setValue] = useState(initialValue);

	return (
		<FieldReactContext.Provider value={field}>
			<RadioGroup
				name={name}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				disabled={disabled}
				required={required}
				invalid={invalid}
				orientation={orientation}
				label={label}
				sound={sound}
			>
				{items.map((item) => (
					<RadioGroupItem
						key={item.value}
						value={item.value}
						disabled={item.disabled}
						label={item.label}
					/>
				))}
			</RadioGroup>
		</FieldReactContext.Provider>
	);
}

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

describe("RadioGroup", () => {
	afterEach(cleanup);

	it("renders role=radiogroup with the given accessible name", () => {
		const { container } = render(<Harness items={ITEMS} label="Pick one" />);
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
	it("inside a FormField that rendered a label, points aria-labelledby at it and drops its own aria-label", () => {
		const field: FieldContext = {
			controlId: "field-6",
			labelId: "field-6-label",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(
			<Harness items={ITEMS} field={field} label="Own label, should be dropped" />
		);

		const root = group(container);
		expect(root.getAttribute("aria-labelledby")).toBe("field-6-label");
		expect(root.hasAttribute("aria-label")).toBe(false);
	});

	it("inside a FormField that rendered no label of its own, falls back to the group's own label prop", () => {
		const field: FieldContext = {
			controlId: "field-7",
			labelId: undefined,
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(<Harness items={ITEMS} field={field} label="Fallback label" />);

		const root = group(container);
		expect(root.hasAttribute("aria-labelledby")).toBe(false);
		expect(root.getAttribute("aria-label")).toBe("Fallback label");
	});

	it("renders every item as a real radio input sharing one name", () => {
		const { container } = render(<Harness items={ITEMS} />);

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
	it("authors no explicit tabindex, leaving the browser's native roving tab stop in charge", () => {
		const { container } = render(<Harness items={ITEMS} value="b" />);

		for (const input of radios(container)) {
			expect(input.hasAttribute("tabindex")).toBe(false);
		}
	});

	it("keeps two groups on the same page from stealing each other's selection", () => {
		const { container: c1 } = render(<Harness items={ITEMS} />);
		const { container: c2 } = render(<Harness items={ITEMS} />);

		const name1 = radios(c1)[0]?.name;
		const name2 = radios(c2)[0]?.name;
		expect(name1).toBeTruthy();
		expect(name2).toBeTruthy();
		expect(name1).not.toBe(name2);

		fireEvent.click(byLabel(c1, "Option A"));
		expect(byLabel(c1, "Option A").checked).toBe(true);
		expect(radios(c2).some((r) => r.checked)).toBe(false);
	});

	it("respects an explicit name over the generated one", () => {
		const { container } = render(<Harness items={ITEMS} name="plan" />);
		expect(radios(container).every((r) => r.name === "plan")).toBe(true);
	});

	it("round-trips a selection through the controlled value", () => {
		let value = "";
		const { container } = render(
			<Harness
				items={ITEMS}
				onValueChange={(next) => {
					value = next;
				}}
			/>
		);

		fireEvent.click(byLabel(container, "Option B"));
		expect(value).toBe("b");
	});

	it("fires onValueChange with the new value", () => {
		const onValueChange = vi.fn();
		const { container } = render(<Harness items={ITEMS} onValueChange={onValueChange} />);

		fireEvent.click(byLabel(container, "Option C"));
		expect(onValueChange).toHaveBeenCalledWith("c");
	});

	it("works with a plain non-bound value plus a callback", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Harness items={ITEMS} value="a" onValueChange={onValueChange} />
		);

		expect(byLabel(container, "Option A").checked).toBe(true);

		fireEvent.click(byLabel(container, "Option C"));
		expect(onValueChange).toHaveBeenCalledWith("c");
		expect(byLabel(container, "Option C").checked).toBe(true);
	});

	it("does not re-fire onValueChange when clicking the already-selected item", () => {
		// The one thing a native radio can't do that ToggleGroup's hand-rolled
		// single-select can: re-clicking the checked item is a no-op, because
		// the browser never fires `change` when the checked state does not
		// actually change.
		const onValueChange = vi.fn();
		const { container } = render(
			<Harness items={ITEMS} value="b" onValueChange={onValueChange} />
		);

		fireEvent.click(byLabel(container, "Option B"));
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("moves the selection to a different item, clearing the previous one", () => {
		const { container } = render(<Harness items={ITEMS} value="a" />);
		expect(byLabel(container, "Option A").checked).toBe(true);

		fireEvent.click(byLabel(container, "Option C"));
		expect(byLabel(container, "Option A").checked).toBe(false);
		expect(byLabel(container, "Option C").checked).toBe(true);
	});

	it("disables every item when the group itself is disabled", () => {
		const { container } = render(<Harness items={ITEMS} disabled />);
		expect(radios(container).every((r) => r.disabled)).toBe(true);
	});

	it("lets a single item be disabled independent of the group", () => {
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B" },
		];
		const { container } = render(<Harness items={items} />);

		expect(byLabel(container, "A").disabled).toBe(true);
		expect(byLabel(container, "B").disabled).toBe(false);
	});

	// The Svelte suite fires a synthetic `change` straight at the element to
	// walk past the native `disabled` gate. React synthesises a radio's
	// `onChange` from the `click` event, not from a dispatched `change`, so
	// the click below is the same probe on this side: it reaches the handler,
	// and only the handler's own repeated guard stops the selection.
	it("blocks selection on a disabled item even via a synthetic change event", () => {
		const onValueChange = vi.fn();
		const items: Item[] = [{ value: "a", label: "A", disabled: true }];
		const { container } = render(<Harness items={items} onValueChange={onValueChange} />);

		fireEvent.click(byLabel(container, "A"));
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("sets aria-invalid on the group when invalid", () => {
		const { container } = render(<Harness items={ITEMS} invalid />);
		expect(group(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("leaves aria-invalid unset by default", () => {
		const { container } = render(<Harness items={ITEMS} />);
		expect(group(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("marks the group aria-required and every native radio required when required", () => {
		const { container } = render(<Harness items={ITEMS} required />);

		expect(group(container).getAttribute("aria-required")).toBe("true");
		expect(radios(container).every((r) => r.required)).toBe(true);
	});

	it("inside a FormField, picks up controlId, describedBy, invalid and required from context", () => {
		const field: FieldContext = {
			controlId: "field-1",
			describedBy: "field-1-error",
			invalid: true,
			required: true,
			disabled: false,
		};
		const { container } = render(<Harness items={ITEMS} field={field} />);

		const root = group(container);
		expect(root.id).toBe("field-1");
		expect(root.getAttribute("aria-describedby")).toBe("field-1-error");
		expect(root.getAttribute("aria-invalid")).toBe("true");
		expect(root.getAttribute("aria-required")).toBe("true");
		expect(radios(container).every((r) => r.required)).toBe(true);
	});

	it("lets the FormField's disabled win over the group's own disabled prop", () => {
		const field: FieldContext = {
			controlId: "field-2",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: true,
		};
		const { container } = render(<Harness items={ITEMS} field={field} disabled={false} />);

		expect(radios(container).every((r) => r.disabled)).toBe(true);
	});

	// The tests above only exercise context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` values
	// would pass every one of them, since `true || false` is still `true`. The
	// three below pin the polarity that actually tells `??` and `||` apart:
	// own prop `true`, context `false`, expecting the context's `false` to win.
	it("lets the FormField's disabled=false win over the group's own disabled=true prop", () => {
		const field: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(<Harness items={ITEMS} field={field} disabled />);

		expect(radios(container).every((r) => r.disabled)).toBe(false);
	});

	it("lets the FormField's required=false win over the group's own required=true prop", () => {
		const field: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(<Harness items={ITEMS} field={field} required />);

		expect(group(container).hasAttribute("aria-required")).toBe(false);
		expect(radios(container).every((r) => r.required)).toBe(false);
	});

	it("lets the FormField's invalid=false win over the group's own invalid=true prop", () => {
		const field: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(<Harness items={ITEMS} field={field} invalid />);

		expect(group(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("follows the group's disabled prop as it flips at runtime, not just on first render", () => {
		const { container, rerender } = render(<Harness items={ITEMS} disabled={false} />);
		expect(radios(container).every((r) => r.disabled)).toBe(false);

		rerender(<Harness items={ITEMS} disabled />);
		expect(radios(container).every((r) => r.disabled)).toBe(true);

		rerender(<Harness items={ITEMS} disabled={false} />);
		expect(radios(container).every((r) => r.disabled)).toBe(false);
	});

	it("renders an item outside a group harmlessly, unchecked and without a shared name", () => {
		const { container } = render(<RadioGroupItem value="solo" label="Solo" />);
		const input = container.querySelector('input[type="radio"]') as HTMLInputElement;

		expect(input.checked).toBe(false);
		expect(input.hasAttribute("name")).toBe(false);

		// There is no group to select into; this must not throw.
		fireEvent.click(input);
		expect(input.checked).toBe(true); // the native input still checks itself locally
	});

	it("falls back to the value as content when neither children nor label is given", () => {
		const { container } = render(<RadioGroupItem value="x" />);
		expect(container.querySelector("label")?.textContent?.trim()).toBe("x");
	});

	it("renders custom children over the label/value fallback", () => {
		const { container } = render(
			<RadioGroupItem value="x" label="Ex">
				<span data-testid="glyph">Custom</span>
			</RadioGroupItem>
		);
		expect(container.querySelector('[data-testid="glyph"]')).toBeTruthy();
	});

	it("defaults to a vertical stack and switches to horizontal", () => {
		const { container: vertical } = render(<RadioGroup />);
		expect(group(vertical).className).toContain("flex-col");

		const { container: horizontal } = render(<RadioGroup orientation="horizontal" />);
		expect(group(horizontal).className).toContain("flex-row");
	});

	it("merges the class prop with the base classes on the root", () => {
		const { container } = render(<RadioGroup className="mt-4" />);
		const root = group(container);

		expect(root.className).toContain("ft-radio-group");
		expect(root.className).toContain("mt-4");
	});

	it("binds the root element", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(
			<RadioGroup
				ref={(node) => {
					ref = node;
				}}
			/>
		);

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
	it("reduced motion: selection still drives the :checked hook the dot is keyed off", () => {
		// Discriminating stub: `(prefers-reduced-motion: reduce)` and
		// `(prefers-reduced-motion: no-preference)` are complementary, so a blanket
		// `matches: true` would answer yes to both and silently satisfy either branch
		// the moment this component grows a reduced-motion read. Matching on
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
			const { container } = render(<Harness items={ITEMS} onValueChange={onValueChange} />);
			const a = byLabel(container, "Option A");
			const b = byLabel(container, "Option B");

			expect(a.className).toContain("ft-radio-item-control");
			expect(a.checked).toBe(false);

			fireEvent.click(b);

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

		it("plays select exactly once when a new item is picked, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound />);

			fireEvent.click(byLabel(container, "Option A"));

			expect(play).toHaveBeenCalledTimes(1);
			// `useSoundCue` forwards its optional `options` argument through to
			// `sound.play(cue, options)`, so the spy records two arguments where
			// the Svelte call site passed one. The cue is the assertion; the
			// trailing `undefined` is the hook's signature, not a behaviour change.
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} />);

			fireEvent.click(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the group itself is disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound disabled />);

			fireEvent.click(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled through a surrounding FormField, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const field: FieldContext = {
				controlId: "field-sound-1",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(<Harness items={ITEMS} sound field={field} />);

			fireEvent.click(byLabel(container, "Option A"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when clicking the already-selected item", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound value="b" />);

			fireEvent.click(byLabel(container, "Option B"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays exactly one select cue per change during arrow-key traversal", () => {
			// jsdom does not implement the browser's native arrow-key roving
			// selection for radio groups, so the traversal is simulated the way
			// the browser's own default action would: each arrow step moves
			// focus to the next radio and fires a real selection change on it,
			// exactly like a real ArrowDown press does.
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound value="a" />);

			fireEvent.click(byLabel(container, "Option B"));
			expect(play).toHaveBeenCalledTimes(1);

			fireEvent.click(byLabel(container, "Option C"));
			expect(play).toHaveBeenCalledTimes(2);

			expect(play).toHaveBeenNthCalledWith(1, "select", undefined);
			expect(play).toHaveBeenNthCalledWith(2, "select", undefined);
		});
	});
});
