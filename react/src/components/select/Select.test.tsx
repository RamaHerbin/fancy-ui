import { createRef, StrictMode, useState } from "react";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Select } from "./Select.js";
import type { SelectProps } from "./Select.js";
import type { SelectOption } from "./types.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";
import { __dismissableLayerCount, attachDismissable } from "../../internals/dismissable.js";
import { sound } from "../../sound/sound.js";

// Shape 4 (component) from the internals contract §9.3: `render()` plus the
// real internals, because what this file pins is the CHOREOGRAPHY between them
// — listbox, field, anchoring, presence, dismissable, portal and the sound
// controller. The source suite's assertions are transposed one for one; its
// `SelectHarness.test.svelte` rig becomes the inline `<Harness>` below, and
// the React layer's own additions sit at the very end, clearly marked.

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

const OPTIONS: SelectOption[] = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

function trigger(container: HTMLElement): HTMLButtonElement {
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

/**
 * Dispatches Escape inside a SYNCHRONOUS `act`: the dismiss listener is a
 * native document one, so the state update it schedules has to be flushed for
 * the next assertion to see it — but a synchronous `act` does not drain
 * microtasks, and the exit window is two microtasks under the WAAPI stub.
 * Anything awaited between the dismiss and the assertion has already drained
 * it and the test would pass for the wrong reason.
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
	// A `MouseEvent` of the same type carries everything the handler reads
	// (`type` and `target`), so the assertions are unaffected.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Highlights a row the way a pointer would. React synthesises
 * `onPointerEnter` from the native `pointerover`/`pointerout` pair rather than
 * listening for `pointerenter` itself, so dispatching a native `pointerenter`
 * would reach no handler at all — the React counterpart of the source's
 * `fireEvent.pointerEnter`.
 */
function hoverRow(row: HTMLElement): void {
	fireEvent.pointerOver(row);
}

/**
 * Drains a transition leg to completion. The animation stub finishes on a
 * MICROTASK and `runTransition` chains a dummy into the real animation, so a
 * settled leg is two turns away; an async `act` crosses a macrotask boundary
 * and flushes the React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

/**
 * The React replacement for `SelectHarness.test.svelte`: publishes an optional
 * `FieldContext` above a real `Select`, so the FormField integration is proven
 * against the frozen `useField()`/`FieldContext` surface without depending on
 * the actual FormField component. A `.test.svelte` file existed only because a
 * Svelte component needs its own file; React declares it inline.
 */
function Harness({
	field,
	label = "Framework",
	...props
}: SelectProps & { field?: FieldContext }): ReactNode {
	const select = <Select label={label} {...props} />;
	// Rendering no provider at all is the same as publishing `undefined`:
	// `useField()` reads back `undefined` either way.
	return field ? <FieldProvider value={field}>{select}</FieldProvider> : select;
}

describe("Select", () => {
	afterEach(async () => {
		// Any leg still in flight settles INSIDE `act`, so a late presence
		// update can never land outside one.
		await settleLegs();
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders closed by default, role=combobox with aria-expanded false and aria-haspopup listbox", () => {
		const { container } = render(<Select options={OPTIONS} />);
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.getAttribute("aria-haspopup")).toBe("listbox");
		expect(panel()).toBeNull();
	});

	it("shows the placeholder when nothing is selected, and the selected option's label otherwise", () => {
		const { container, rerender } = render(
			<Select options={OPTIONS} placeholder="Choose a framework" />
		);
		expect(trigger(container).textContent).toContain("Choose a framework");

		rerender(<Select options={OPTIONS} value="react" />);
		expect(trigger(container).textContent).toContain("React");
	});

	// A previous wave shipped `aria-controls` pointing at nothing for the
	// entire closed lifetime, in two components, with tests that only read the
	// attribute after opening. This one reads it before, during and after.
	it("aria-controls is absent while closed and points at the panel's real id once open, then absent again on close", async () => {
		const { container } = render(<Select options={OPTIONS} />);
		const btn = trigger(container);
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
		await settleLegs();
	});

	it("opens on trigger click, and closes on a second click without reopening", async () => {
		const { container } = render(<Select options={OPTIONS} />);
		const btn = trigger(container);

		fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();

		fireEvent.click(btn);
		// `aria-expanded` is synchronous — `open` still flips in the same tick.
		// The panel's REMOVAL is not: it plays an exit first.
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel()).toBeNull());
	});

	// WAI-ARIA APG's select-only combobox pattern names the listbox, not just
	// the trigger — otherwise a screen reader announces it as an unnamed
	// "listbox" the instant it expands.
	it("gives the portalled listbox the same accessible name as the trigger's label prop", async () => {
		const { container } = render(<Select options={OPTIONS} label="Plan" />);
		fireEvent.click(trigger(container));

		expect(panel()?.getAttribute("aria-label")).toBe("Plan");
		await settleLegs();
	});

	it("renders every option as role=option with the right label, inside role=listbox", async () => {
		const { container } = render(<Select options={OPTIONS} />);
		fireEvent.click(trigger(container));

		expect(panel()?.getAttribute("role")).toBe("listbox");
		const rows = optionRows();
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.textContent?.trim())).toEqual(
			expect.arrayContaining([expect.stringContaining("Svelte 5")])
		);
		await settleLegs();
	});

	it("marks the selected option aria-selected=true and no other", async () => {
		const { container } = render(<Select options={OPTIONS} value="react" />);
		fireEvent.click(trigger(container));

		expect(optionByLabel("React").getAttribute("aria-selected")).toBe("true");
		expect(optionByLabel("Svelte 5").getAttribute("aria-selected")).toBe("false");
		expect(optionByLabel("Vue").getAttribute("aria-selected")).toBe("false");
		await settleLegs();
	});

	it("clicking an option selects it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
		fireEvent.click(trigger(container));

		fireEvent.click(optionByLabel("React"));

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
	// whether the guard exists or not — exactly the kind of assertion that
	// looks like proof and isn't. What IS directly verifiable, and what this
	// asserts, is that the row's own `mousedown` handler runs and calls
	// `preventDefault()` on a real, cancelable mousedown event.
	it("cancels a row's mousedown default action, so a real click cannot steal focus off the trigger", async () => {
		const { container } = render(<Select options={OPTIONS} />);
		fireEvent.click(trigger(container));

		const row = optionByLabel("React");
		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		row.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		await settleLegs();
	});

	it("clicking a disabled option does nothing", async () => {
		const options: SelectOption[] = [
			...OPTIONS,
			{ value: "svelte-kit", label: "SvelteKit", disabled: true },
		];
		const onValueChange = vi.fn();
		const { container } = render(<Select options={options} onValueChange={onValueChange} />);
		fireEvent.click(trigger(container));

		fireEvent.click(optionByLabel("SvelteKit"));

		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("closes on an outside click without changing the value", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);

		fireEvent.click(trigger(container));
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		outside.remove();
	});

	it("Escape closes without changing the value, even after arrowing to a different option", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Select options={OPTIONS} value="svelte" onValueChange={onValueChange} />
		);
		const btn = trigger(container);
		fireEvent.click(btn);

		fireEvent.keyDown(btn, { key: "ArrowDown" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("React").id);

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("ArrowDown opens the panel and activates the first enabled option when nothing is selected", async () => {
		const { container } = render(<Select options={OPTIONS} />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowDown" });

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
		await settleLegs();
	});

	it("ArrowUp opens the panel and activates the last enabled option when nothing is selected", async () => {
		const { container } = render(<Select options={OPTIONS} />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowUp" });

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
		await settleLegs();
	});

	it("Enter opens the panel and activates the already-selected option, not the first", async () => {
		const { container } = render(<Select options={OPTIONS} value="vue" />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "Enter" });

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
		await settleLegs();
	});

	it("skips a disabled option when navigating with ArrowDown", async () => {
		const options: SelectOption[] = [
			{ value: "a", label: "Aaa" },
			{ value: "b", label: "Bbb", disabled: true },
			{ value: "c", label: "Ccc" },
		];
		const { container } = render(<Select options={options} />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens on Aaa
		fireEvent.keyDown(btn, { key: "ArrowDown" }); // skips Bbb, lands on Ccc

		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Ccc").id);
		await settleLegs();
	});

	it("Enter commits the active option and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, activates Svelte 5
		fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to React
		fireEvent.keyDown(btn, { key: "Enter" });

		expect(onValueChange).toHaveBeenCalledWith("react");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Home/End jump to the first/last option while open", async () => {
		const { container } = render(<Select options={OPTIONS} value="svelte" />);
		const btn = trigger(container);
		fireEvent.click(btn);

		fireEvent.keyDown(btn, { key: "End" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);

		fireEvent.keyDown(btn, { key: "Home" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
		await settleLegs();
	});

	// If `options` shrinks while the panel is open, a previously-valid active
	// index can end up pointing past the end of the new, shorter array —
	// nothing else re-checks this between explicit move/typeahead/setActive
	// calls. Without the fix, `aria-activedescendant` would keep citing an
	// option id with no row left in the DOM to match it.
	it("clamps the active option when the option list shrinks while open, instead of citing a removed row", async () => {
		const { container, rerender } = render(<Select options={OPTIONS} value="svelte" />);
		const btn = trigger(container);
		fireEvent.click(btn);

		fireEvent.keyDown(btn, { key: "End" }); // activates Vue, the last of three
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);

		rerender(<Select options={OPTIONS.slice(0, 2)} value="svelte" />); // Vue's row is gone

		expect(btn.hasAttribute("aria-activedescendant")).toBe(false);
		await settleLegs();
	});

	// Documented, chosen behaviour: Tab commits like Enter, but is never
	// prevented — the browser still moves focus on to the next control.
	it("Tab commits the active option, closes the panel, and does not preventDefault", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowDown" }); // Svelte 5
		fireEvent.keyDown(btn, { key: "ArrowDown" }); // React
		const notPrevented = fireEvent.keyDown(btn, { key: "Tab", cancelable: true });

		expect(onValueChange).toHaveBeenCalledWith("react");
		expect(notPrevented).toBe(true); // fireEvent returns false when preventDefault was called
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("typing while closed selects by typeahead without opening the panel", () => {
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "v" });

		expect(onValueChange).toHaveBeenCalledWith("vue");
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel()).toBeNull();
	});

	it("hovering an option highlights it without selecting it", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
		const btn = trigger(container);
		fireEvent.click(btn);

		hoverRow(optionByLabel("Vue"));

		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
		expect(onValueChange).not.toHaveBeenCalled();
		await settleLegs();
	});

	it("does not open, commit or move on any key when disabled, even via a synthetic dispatch", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Select options={OPTIONS} disabled onValueChange={onValueChange} />
		);
		const btn = trigger(container);

		fireEvent.click(btn);
		fireEvent.keyDown(btn, { key: "ArrowDown" });
		fireEvent.keyDown(btn, { key: "a" });

		expect(panel()).toBeNull();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// The three ways this codebase expects a two-way value prop plus its change
	// callback to work: a caller owning the value, the callback alone, and a
	// plain non-owned value plus that same callback.
	it("round-trips through a controlled value + onValueChange pair", async () => {
		let latest = "";
		function Controlled() {
			const [value, setValue] = useState("");
			latest = value;
			return <Select options={OPTIONS} value={value} onValueChange={setValue} />;
		}
		const { container } = render(<Controlled />);
		fireEvent.click(trigger(container));
		fireEvent.click(optionByLabel("Vue"));

		expect(latest).toBe("vue");
		await settleLegs();
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
		fireEvent.click(trigger(container));
		fireEvent.click(optionByLabel("Vue"));
		expect(onValueChange).toHaveBeenCalledWith("vue");
		await settleLegs();
	});

	it("works with a plain non-owned value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Select options={OPTIONS} value="svelte" onValueChange={onValueChange} />
		);
		expect(trigger(container).textContent).toContain("Svelte 5");

		fireEvent.click(trigger(container));
		fireEvent.click(optionByLabel("Vue"));
		expect(onValueChange).toHaveBeenCalledWith("vue");
		await settleLegs();
	});

	it("merges the className prop onto the trigger", () => {
		const { container } = render(<Select options={OPTIONS} className="w-[240px]" />);
		expect(trigger(container).className).toContain("w-[240px]");
		expect(trigger(container).className).toContain("ft-select-trigger");
	});

	it("exposes the trigger element through a forwarded ref", () => {
		const ref = createRef<HTMLButtonElement>();
		const { container } = render(<Select options={OPTIONS} ref={ref} />);
		expect(ref.current).toBe(trigger(container));
	});

	describe("form participation", () => {
		it("renders no hidden input when name is omitted", () => {
			const { container } = render(<Select options={OPTIONS} />);
			expect(container.querySelector('input[type="hidden"]')).toBeNull();
		});

		it("carries the value through a hidden input when name is set, readable via FormData", async () => {
			const { container } = render(<Select options={OPTIONS} name="framework" value="react" />);
			const hiddenInput = () => container.querySelector('input[type="hidden"]') as HTMLInputElement;
			expect(hiddenInput()).not.toBeNull();

			const form = document.createElement("form");
			form.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form).get("framework")).toBe("react");

			fireEvent.click(trigger(container));
			fireEvent.click(optionByLabel("Vue"));

			const form2 = document.createElement("form");
			form2.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form2).get("framework")).toBe("vue");
			await settleLegs();
		});

		it("excludes the hidden input's value from FormData while disabled", () => {
			const { container } = render(
				<Select options={OPTIONS} name="framework" value="react" disabled />
			);
			const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hiddenInput.cloneNode(true));
			expect(new FormData(form).get("framework")).toBeNull();
		});
	});

	describe("FormField integration", () => {
		it("inside a FormField, picks up controlId, describedBy, invalid and required from context", () => {
			const field: FieldContext = {
				controlId: "field-1",
				describedBy: "field-1-error",
				invalid: true,
				required: true,
				disabled: false,
			};
			const { container } = render(<Harness options={OPTIONS} field={field} />);

			const btn = trigger(container);
			expect(btn.id).toBe("field-1");
			expect(btn.getAttribute("aria-describedby")).toBe("field-1-error");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
			expect(btn.getAttribute("aria-required")).toBe("true");
		});

		it("lets the FormField's disabled win over the control's own disabled=false prop", () => {
			const field: FieldContext = {
				controlId: "field-2",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(<Harness options={OPTIONS} field={field} disabled={false} />);
			expect(trigger(container).disabled).toBe(true);
		});

		// The polarity `??` gets right and `||` gets wrong: context `false` must
		// win over the control's own prop `true`, not the other way around —
		// `true || false` would still read `true` and pass the test above just
		// as well.
		it("lets the FormField's disabled=false win over the control's own disabled=true prop", () => {
			const field: FieldContext = {
				controlId: "field-3",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(<Harness options={OPTIONS} field={field} disabled />);
			expect(trigger(container).disabled).toBe(false);
		});

		it("lets the FormField's required=false win over the control's own required=true prop", () => {
			const field: FieldContext = {
				controlId: "field-4",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(<Harness options={OPTIONS} field={field} required />);
			expect(trigger(container).hasAttribute("aria-required")).toBe(false);
		});

		it("lets the FormField's invalid=false win over the control's own invalid=true prop", () => {
			const field: FieldContext = {
				controlId: "field-5",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(<Harness options={OPTIONS} field={field} invalid />);
			expect(trigger(container).hasAttribute("aria-invalid")).toBe(false);
		});

		it("works standalone with useField() undefined, falling back to its own props", () => {
			const { container } = render(
				<Select options={OPTIONS} id="solo" disabled required invalid />
			);
			const btn = trigger(container);
			expect(btn.id).toBe("solo");
			expect(btn.disabled).toBe(true);
			expect(btn.getAttribute("aria-required")).toBe("true");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
		});
	});

	// `useSoundCue` forwards its optional second argument, so every recorded
	// call carries an explicit `undefined` where the source's
	// `soundFx.play("open")` passed one argument. The cue itself — the only
	// thing these assertions are about — is unchanged.
	describe("sound", () => {
		it("plays open exactly once when opened by a trigger click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} sound />);

			fireEvent.click(trigger(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
			await settleLegs();
		});

		it("Enter commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} sound />);
			const btn = trigger(container);

			fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, activates Svelte 5
			fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to React
			play.mockClear();
			fireEvent.keyDown(btn, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
			await settleLegs();
		});

		it("re-committing the already-selected value plays close (a dismiss), never silence", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} value="svelte" sound />);
			const btn = trigger(container);

			fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens on the selected option
			play.mockClear();
			fireEvent.keyDown(btn, { key: "Enter" }); // commits nothing new

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			await settleLegs();
		});

		it("a click commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} sound />);
			fireEvent.click(trigger(container));
			play.mockClear();

			fireEvent.click(optionByLabel("React"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
			await settleLegs();
		});

		it("Tab commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} sound />);
			const btn = trigger(container);
			fireEvent.click(btn); // opens
			play.mockClear();

			fireEvent.keyDown(btn, { key: "Tab", cancelable: true });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
			await settleLegs();
		});

		it("Escape plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} value="svelte" sound />);
			const btn = trigger(container);
			fireEvent.click(btn);
			fireEvent.keyDown(btn, { key: "ArrowDown" }); // highlight a different option
			play.mockClear();

			pressEscape();
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("an outside click plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(<Select options={OPTIONS} sound />);
			fireEvent.click(trigger(container));
			play.mockClear();

			pointerDownOn(outside);
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			outside.remove();
		});

		it("closed typeahead commits and plays select once; repeating the same letter that keeps the same match stays silent", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} sound />);
			const btn = trigger(container);

			fireEvent.keyDown(btn, { key: "v" });
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);

			// Same value re-committed: the same-value early return in setValue
			// stays silent, per contract.
			play.mockClear();
			fireEvent.keyDown(btn, { key: "v" });
			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} />);
			const btn = trigger(container);

			fireEvent.click(btn);
			fireEvent.click(optionByLabel("React"));

			expect(play).not.toHaveBeenCalled();
			await settleLegs();
		});

		it("plays nothing while disabled, even via a synthetic dispatch", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Select options={OPTIONS} disabled sound />);
			const btn = trigger(container);

			fireEvent.click(btn);
			fireEvent.keyDown(btn, { key: "ArrowDown" });
			fireEvent.keyDown(btn, { key: "a" });

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
		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Select options={OPTIONS} />);

			fireEvent.click(trigger(container));

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

		it("follows a flipped placement rather than the requested side", async () => {
			const { container } = render(<Select options={OPTIONS} side="top" align="end" />);

			fireEvent.click(trigger(container));

			// Asked for `top`, placed on `bottom`: the panel now hangs below
			// the trigger, so it has to grow out of its own top edge. Reading
			// the requested side here would point the origin at the bottom edge
			// and the panel would appear to fall upward into place.
			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("end");
			expect(el.style.getPropertyValue("transform-origin")).toBe("right top");
			await settleLegs();
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Select options={OPTIONS} />);

			fireEvent.click(trigger(container));

			// A zero duration makes `runTransition` skip `element.animate()`
			// outright instead of running a zero-length animation, and the
			// panel's visibility never depended on the entrance in the first
			// place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
			await settleLegs();
		});
	});

	// The panel leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the WAAPI stub. These pin what must be true
	// inside it. `open` itself still flips synchronously, which is why every
	// `aria-expanded` assertion above stayed unwrapped.
	describe("exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<Select options={OPTIONS} />);
			const btn = trigger(container);
			fireEvent.click(btn);
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary attribute here (divergence D-2), where the source has
			// to write it imperatively from a transition event: its scheduler
			// skips effects inside a closing branch, React re-renders the
			// exiting surface normally.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this on every registered node for the whole
			// exit. Asserted so nobody drops the transition without noticing
			// that a leaving listbox would keep taking clicks on its rows.
			expect(closing!.inert).toBe(true);
			// The trigger has already been told the panel is gone.
			expect(btn.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: ctx.open` gate. A layer on its way out must not swallow
		// the key: the dismiss stack scans past it and hands Escape to whatever
		// is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the select, so the panel sits above it on the
			// shared layer stack — the shape of a select opened inside another
			// dismissable surface.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathLayer = attachDismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(<Select options={OPTIONS} />);
			fireEvent.click(trigger(container));

			pressEscape(); // the panel is the top LIVE layer and takes this one
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the panel is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathLayer.destroy();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// Svelte marks the `{#if open}` branch INERT before it plays the outro
		// and its scheduler skips inert effects, so the rows a closing panel
		// shows are frozen at whatever they were the instant the close began.
		// Clicking a row is the most common way a select closes, and it commits
		// the value in the same turn — so an unfrozen panel would move the ✓ and
		// the `bg-accent` highlight onto the clicked row and off the old one for
		// the whole length of the fade.
		it("freezes the rows for the exit: the previously selected row keeps aria-selected and the highlight", async () => {
			const { container } = render(<Select options={OPTIONS} value="svelte" />);
			fireEvent.click(trigger(container));
			const previous = optionByLabel("Svelte 5");
			expect(previous.getAttribute("aria-selected")).toBe("true");

			fireEvent.click(optionByLabel("React"));

			// Still on screen, still fading, still showing what it showed.
			expect(panel()).toBeTruthy();
			expect(previous.getAttribute("aria-selected")).toBe("true");
			expect(previous.className).toContain("bg-accent");
			expect(previous.textContent).toContain("✓");
			expect(optionByLabel("React").getAttribute("aria-selected")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());

			// And the commit itself was never in doubt: reopening shows the new
			// selection.
			fireEvent.click(trigger(container));
			expect(optionByLabel("React").getAttribute("aria-selected")).toBe("true");
			await settleLegs();
		});

		// The reduced-motion fast path: a zero duration makes `runTransition`
		// call the finish callback synchronously and never touch
		// `element.animate()`, so a visitor who asked for less motion gets
		// exactly the synchronous close this panel had before the exit existed.
		it("closes synchronously and never animates under prefers-reduced-motion", () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Select options={OPTIONS} />);
			fireEvent.click(trigger(container));
			expect(panel()).not.toBeNull();

			pressEscape();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});

	// Two additions this port needs and the source did not, both pinning
	// React-specific hazards rather than new behaviour.
	describe("React layer", () => {
		// The source reads its `open` rune inside `onActiveChange` and sees the
		// value `openPanel` assigned one statement earlier. A React render
		// value there would still be the pre-handler `false`, and every
		// keyboard open would take the closed-state typeahead branch and
		// silently COMMIT the option it was only supposed to highlight. This is
		// what the `openRef` beside `open` exists for.
		it("opening with a key highlights the option without committing it", async () => {
			const onValueChange = vi.fn();
			const { container } = render(<Select options={OPTIONS} onValueChange={onValueChange} />);
			const btn = trigger(container);

			fireEvent.keyDown(btn, { key: "ArrowDown" });

			expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
			expect(onValueChange).not.toHaveBeenCalled();
			// The trigger still shows nothing selected, not the highlighted row.
			expect(btn.textContent).not.toContain("Svelte 5");
			await settleLegs();
		});

		// The double invoke must leave exactly one panel, one dismiss layer
		// (asserted back to zero by this file's `afterEach`) and one set of
		// window listeners behind.
		it("mounts, opens and closes once under StrictMode", async () => {
			const { container } = render(
				<StrictMode>
					<Select options={OPTIONS} />
				</StrictMode>
			);
			const btn = trigger(container);

			fireEvent.click(btn);
			expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(1);

			pressEscape();
			await waitFor(() => expect(panel()).toBeNull());
		});
	});
});
