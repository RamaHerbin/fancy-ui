import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import TimePicker from "./TimePicker.svelte";
import ValueHarness from "./TimePickerHarness.test.svelte";
import FieldHarness from "./TimePickerFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import { dismissable } from "../_internals/dismissable.js";
import { sound } from "../sound/sound.svelte.js";

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

/** Replaces `window.matchMedia` wholesale. The panel's entrance reads the
 * preference fresh at the instant the transition starts, so an override
 * installed before the panel opens is the one it sees. */
function stubReducedMotion(matches: boolean): void {
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

describe("TimePicker", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll('[role="listbox"]').forEach((el) => el.remove());
		vi.unstubAllGlobals();
		// A spy on `Element.prototype.animate` has to be fresh in every test:
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(spy).not.toHaveBeenCalled()` would see an earlier test's calls.
		vi.restoreAllMocks();
	});

	it("renders closed by default, role=combobox with aria-expanded false and aria-haspopup listbox", () => {
		const { container } = render(TimePicker, { props: { locale: "en-US" } });
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.getAttribute("aria-haspopup")).toBe("listbox");
		expect(panel()).toBeNull();
	});

	it("shows the placeholder when nothing is selected", () => {
		const { container } = render(TimePicker, {
			props: { locale: "en-US", placeholder: "Select a time" },
		});
		expect(trigger(container).textContent).toContain("Select a time");
	});

	it("shows the value in 24-hour form by default", () => {
		const { container } = render(TimePicker, { props: { value: "14:30", locale: "en-US" } });
		expect(trigger(container).textContent).toContain("14");
		expect(trigger(container).textContent).toContain("30");
	});

	it("shows a 12-hour label when hour12 is set, without changing the underlying value", () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, {
			props: { value: "14:30", hour12: true, locale: "en-US", onValueChange },
		});
		expect(trigger(container).textContent?.toLowerCase()).toContain("pm");
		// The value prop itself is untouched — still 24-hour "HH:mm".
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// `formatSlotLabel` (hour12-aware) is display-only and is never on the
	// commit path — this proves it end to end through a real pick, rather
	// than only arguing it from reading the code: clicking the row labelled
	// "2:00 PM" must still commit the 24-hour "14:00", not "2:00 PM" or any
	// other 12-hour shape.
	it("commits the 24-hour value even while hour12 display is on", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, {
			props: { locale: "en-US", hour12: true, onValueChange },
		});
		await fireEvent.click(trigger(container));

		// Index 28 at the default 30-minute step is 14:00 (28 * 30 = 840 min).
		const row = optionRows()[28];
		expect(row.textContent?.toLowerCase()).toContain("pm");
		await fireEvent.click(row);

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("14:00");

		// The trigger keeps displaying 12-hour form, but the committed value
		// underneath stayed 24-hour.
		expect(trigger(container).textContent?.toLowerCase()).toContain("pm");
	});

	it("aria-controls is absent while closed and points at the panel's real id once open, then absent again on close", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US" } });
		const btn = trigger(container);
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		await fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
	});

	it("generates 48 slots for the default 30-minute step", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US" } });
		await fireEvent.click(trigger(container));
		expect(optionRows()).toHaveLength(48);
	});

	it("respects a custom step", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", step: 60 } });
		await fireEvent.click(trigger(container));
		expect(optionRows()).toHaveLength(24);
	});

	it("respects min/max bounds on the generated slots", async () => {
		const { container } = render(TimePicker, {
			props: { locale: "en-US", step: 60, min: "09:00", max: "17:00" },
		});
		await fireEvent.click(trigger(container));
		expect(optionRows()).toHaveLength(9); // 09:00 .. 17:00 inclusive
	});

	// min/max excluding every generated slot is reachable (not guarded
	// against — it's outside this component's own prop surface to validate
	// one against the other) and must not open an empty, unexplained panel.
	it("shows a message instead of an empty panel when min/max exclude every slot", async () => {
		const { container } = render(TimePicker, {
			props: { locale: "en-US", min: "18:00", max: "09:00" },
		});
		await fireEvent.click(trigger(container));

		await waitFor(() => expect(panel()).not.toBeNull());
		expect(optionRows()).toHaveLength(0);
		expect(panel()?.textContent).toContain("No times available.");
	});

	it("marks the selected slot aria-selected=true and no other", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", value: "14:30" } });
		await fireEvent.click(trigger(container));

		const rows = optionRows();
		const selected = rows.filter((r) => r.getAttribute("aria-selected") === "true");
		expect(selected).toHaveLength(1);
		expect(selected[0].id).toBe(
			document.querySelector('[role="combobox"]')?.getAttribute("aria-activedescendant")
		);
	});

	// jsdom does not implement `Element.prototype.scrollIntoView` at all (the
	// production code calls it through `?.()` specifically so this is a safe
	// no-op there) — so the test installs its own stub rather than
	// `vi.spyOn`, which requires the property to already exist.
	it("scrolls the selected slot into view as soon as the panel opens, not only on the next navigation", async () => {
		const original = HTMLElement.prototype.scrollIntoView;
		const scrollSpy = vi.fn();
		HTMLElement.prototype.scrollIntoView = scrollSpy;
		try {
			const { container } = render(TimePicker, { props: { locale: "en-US", value: "14:30" } });

			await fireEvent.click(trigger(container));
			await tick();
			await tick();

			expect(scrollSpy).toHaveBeenCalled();
		} finally {
			HTMLElement.prototype.scrollIntoView = original;
		}
	});

	it("scrolls the newly active slot into view on arrow navigation", async () => {
		const original = HTMLElement.prototype.scrollIntoView;
		const scrollSpy = vi.fn();
		HTMLElement.prototype.scrollIntoView = scrollSpy;
		try {
			const { container } = render(TimePicker, { props: { locale: "en-US", value: "14:30" } });
			const btn = trigger(container);
			await fireEvent.click(btn);
			await tick();
			scrollSpy.mockClear();

			await fireEvent.keyDown(btn, { key: "ArrowDown" });

			expect(scrollSpy).toHaveBeenCalled();
		} finally {
			HTMLElement.prototype.scrollIntoView = original;
		}
	});

	it("clicking a slot commits it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, { props: { locale: "en-US", onValueChange } });
		await fireEvent.click(trigger(container));

		// Index 28 at the default 30-minute step is 14:00 (28 * 30 = 840 min).
		await fireEvent.click(optionRows()[28]);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("14:00");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("ArrowDown opens the panel and activates the slot nearest to the current value", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", value: "14:05" } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		await tick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		const activeId = btn.getAttribute("aria-activedescendant");
		const active = document.getElementById(activeId!);
		expect(active?.textContent).toContain("14");
		expect(active?.textContent).toContain("30");
	});

	it("ArrowDown then ArrowDown moves to the next slot", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", value: "14:00" } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, active on 14:00
		const firstActive = btn.getAttribute("aria-activedescendant");
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to 14:30
		const secondActive = btn.getAttribute("aria-activedescendant");

		expect(secondActive).not.toBe(firstActive);
	});

	it("Home/End jump to the first/last slot while open", async () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", value: "14:00" } });
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "End" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionRows().at(-1)?.id);

		await fireEvent.keyDown(btn, { key: "Home" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionRows()[0].id);
	});

	it("Enter commits the active slot and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, {
			props: { locale: "en-US", value: "14:00", onValueChange },
		});
		const btn = trigger(container);
		await fireEvent.click(btn); // opens, active on 14:00
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // 14:30

		await fireEvent.keyDown(btn, { key: "Enter" });
		// The commit is synchronous; the panel's REMOVAL is not — it plays a
		// 150 ms exit first.
		expect(onValueChange).toHaveBeenCalledWith("14:30");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Escape closes without committing, even after arrowing to a different slot", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, {
			props: { locale: "en-US", value: "14:00", onValueChange },
		});
		const btn = trigger(container);
		await fireEvent.click(btn);
		await fireEvent.keyDown(btn, { key: "ArrowDown" });

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		// Focus was never moved into the panel to begin with, so nothing needs
		// to be returned — it just never left.
		expect(document.activeElement).toBe(btn);
	});

	it("closes on an outside click without changing the value", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, { props: { locale: "en-US", onValueChange } });

		await fireEvent.click(trigger(container));
		expect(panel()).not.toBeNull();

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		outside.remove();
	});

	it("does not open, commit or move on any key when disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, {
			props: { locale: "en-US", disabled: true, onValueChange },
		});
		const btn = trigger(container);

		await fireEvent.click(btn);
		await fireEvent.keyDown(btn, { key: "ArrowDown" });

		expect(panel()).toBeNull();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		expect(getByTestId("bound-value").textContent).toBe("none");

		await fireEvent.click(trigger(container));
		await fireEvent.click(optionRows()[0]);

		expect(getByTestId("bound-value").textContent).toBe("00:00");
	});

	it("round-trips the trigger element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(trigger(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TimePicker, {
			props: { locale: "en-US", value: "09:00", onValueChange },
		});
		await fireEvent.click(trigger(container));
		await fireEvent.click(optionRows()[0]);
		expect(onValueChange).toHaveBeenCalledWith("00:00");
	});

	it("merges the class prop onto the trigger", () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", class: "w-[160px]" } });
		expect(trigger(container).className).toContain("w-[160px]");
		expect(trigger(container).className).toContain("ft-time-picker-trigger");
	});

	it("resolves the accessible name from the label prop", () => {
		const { container } = render(TimePicker, { props: { locale: "en-US", label: "Start time" } });
		expect(trigger(container).getAttribute("aria-label")).toBe("Start time");
	});

	it("publishes the resolved placement and grows from the panel corner nearest the trigger", async () => {
		// The positive counterpart to the reduced-motion test below: under the
		// default stub (`matches: false`, i.e. no-preference) the entrance really
		// does run, which is what makes that test's `not.toHaveBeenCalled()`
		// discriminating instead of vacuously true. Without this line, dropping
		// the `in:` directive altogether would leave both tests green.
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(TimePicker, { props: { locale: "en-US" } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());

		expect(animateSpy).toHaveBeenCalled();

		// jsdom measures every rect as 0x0, so `computePosition` never sees an
		// overflow and never flips: the resolved side is the requested one. That
		// is the un-flipped case, and the one that can be asserted
		// deterministically here. `bottom` + `align: "start"` puts the growth
		// origin on the panel's top-left corner — the corner nearest the trigger.
		expect(panel()!.getAttribute("data-side")).toBe("bottom");
		expect(panel()!.getAttribute("data-align")).toBe("start");
		expect(panel()!.style.transformOrigin).toBe("left top");
	});

	it("runs no animation at all under reduced motion, and still shows the panel", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(TimePicker, { props: { locale: "en-US" } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());
		await tick();

		// A zero duration makes Svelte skip `element.animate()` entirely rather
		// than run a zero-length animation, so the panel is simply there.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The panel now leaves on the same shared transition it arrives on, so
	// between the dismiss and the unmount there is a window — 150 ms in a
	// browser, a couple of microtasks under the WAAPI stub. These pin what
	// must be true inside it. `open`, `value` and `onValueChange` all still
	// settle synchronously, which is why every assertion on them stayed
	// unwrapped.
	describe("exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(TimePicker, { props: { locale: "en-US" } });
			const btn = trigger(container);
			await fireEvent.click(btn);
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
			// The trigger has already been told the panel is gone.
			expect(btn.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: () => ctx.open` gate. A layer on its way out must not
		// swallow the key: the dismiss stack scans past it and hands Escape to
		// whatever is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the picker, so the panel sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(TimePicker, { props: { locale: "en-US" } });
			await fireEvent.click(trigger(container));

			pressEscape(); // the panel is the top LIVE layer and takes this one
			await tick();
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the panel is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathAction?.destroy?.();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes Svelte call
		// `on_finish()` synchronously and never touch `element.animate()`, so
		// a visitor who asked for less motion gets exactly the synchronous
		// close this panel had before the exit existed.
		it("closes synchronously and never animates under reduced motion", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(TimePicker, { props: { locale: "en-US" } });
			await fireEvent.click(trigger(container));
			expect(panel()).not.toBeNull();

			pressEscape();
			await tick();

			expect(panel()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	describe("form participation", () => {
		it("renders no hidden input when name is omitted", () => {
			const { container } = render(TimePicker, { props: { locale: "en-US" } });
			expect(container.querySelector('input[type="hidden"]')).toBeNull();
		});

		it("carries the HH:mm value through a hidden input when name is set, readable via FormData", async () => {
			const { container } = render(TimePicker, {
				props: { locale: "en-US", name: "slot", value: "14:30" },
			});
			const hiddenInput = () => container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form).get("slot")).toBe("14:30");

			await fireEvent.click(trigger(container));
			await fireEvent.click(optionRows()[0]);
			await tick();

			const form2 = document.createElement("form");
			form2.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form2).get("slot")).toBe("00:00");
		});

		it("excludes the hidden input's value from FormData while disabled", () => {
			const { container } = render(TimePicker, {
				props: { locale: "en-US", name: "slot", value: "14:30", disabled: true },
			});
			const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hidden.cloneNode(true));
			expect(new FormData(form).get("slot")).toBeNull();
		});
	});

	describe("FormField integration", () => {
		it("inside a FormField, picks up controlId, describedBy, invalid and required from context", async () => {
			const field: FieldContext = {
				controlId: "field-1",
				describedBy: "field-1-error",
				invalid: true,
				required: true,
				disabled: false,
			};
			const { container } = render(FieldHarness, { props: { field } });
			await tick();

			const btn = trigger(container);
			expect(btn.id).toBe("field-1");
			expect(btn.getAttribute("aria-describedby")).toBe("field-1-error");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
			expect(btn.getAttribute("aria-required")).toBe("true");
		});

		// The polarity `??` gets right and `||` gets wrong: context `false`
		// must win over the control's own prop `true`.
		it("lets the FormField's disabled=false win over the control's own disabled=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-2",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(FieldHarness, { props: { field, disabled: true } });
			await tick();
			expect(trigger(container).disabled).toBe(false);
		});

		it("lets the FormField's disabled=true win over the control's own disabled=false prop, blocking open", async () => {
			const field: FieldContext = {
				controlId: "field-3",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(FieldHarness, { props: { field, disabled: false } });
			await tick();
			const btn = trigger(container);
			expect(btn.disabled).toBe(true);

			await fireEvent.click(btn);
			expect(panel()).toBeNull();
		});

		it("works standalone with getField() undefined, falling back to its own props", () => {
			const { container } = render(TimePicker, {
				props: {
					locale: "en-US",
					id: "solo",
					disabled: true,
					required: true,
					invalid: true,
				},
			});
			const btn = trigger(container);
			expect(btn.id).toBe("solo");
			expect(btn.disabled).toBe(true);
			expect(btn.getAttribute("aria-required")).toBe("true");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
		});
	});

	describe("sound", () => {
		it("plays open exactly once when opened by a trigger click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, { props: { locale: "en-US", sound: true } });

			await fireEvent.click(trigger(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("picking a new slot by row click plays select exactly once and never close, for the same click", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, {
				props: { locale: "en-US", value: "09:00", sound: true },
			});
			await fireEvent.click(trigger(container));
			play.mockClear();

			await fireEvent.click(optionRows()[0]); // 00:00, differs from 09:00

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("re-picking the already-selected slot plays close (a dismiss), never a second select — the highest-risk guard: ctx.commit must thread the outcome into closePanel", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, {
				props: { locale: "en-US", value: "00:00", sound: true },
			});
			await fireEvent.click(trigger(container));
			play.mockClear();

			await fireEvent.click(optionRows()[0]); // 00:00 again — no change

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("Enter commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, {
				props: { locale: "en-US", value: "09:00", sound: true },
			});
			const btn = trigger(container);
			await fireEvent.click(btn); // opens, activates nearest to 09:00
			await fireEvent.keyDown(btn, { key: "Home" }); // moves to 00:00
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("Escape plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, { props: { locale: "en-US", sound: true } });
			await fireEvent.click(trigger(container));
			play.mockClear();

			pressEscape();
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("an outside click plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(TimePicker, { props: { locale: "en-US", sound: true } });
			await fireEvent.click(trigger(container));
			play.mockClear();

			await fireEvent.pointerDown(outside);
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
			outside.remove();
		});

		it("toggling the trigger shut with nothing committed plays close, not select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, { props: { locale: "en-US", sound: true } });
			const btn = trigger(container);
			await fireEvent.click(btn); // open
			play.mockClear();

			await fireEvent.click(btn); // toggled shut

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		// Listbox move/moveToEdge and row pointerenter only ever set the active
		// index — they never reach `setValue`, so they stay silent even while
		// the panel is open and a row is highlighted.
		it("arrow navigation and row hover never play", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, { props: { locale: "en-US", sound: true } });
			const btn = trigger(container);
			await fireEvent.click(btn); // open — plays "open"
			play.mockClear();

			await fireEvent.keyDown(btn, { key: "ArrowDown" });
			await fireEvent.keyDown(btn, { key: "End" });
			await fireEvent.pointerEnter(optionRows()[0]);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, { props: { locale: "en-US", value: "09:00" } });
			await fireEvent.click(trigger(container));

			await fireEvent.click(optionRows()[0]);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even via a synthetic dispatch", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TimePicker, {
				props: { locale: "en-US", disabled: true, sound: true },
			});

			trigger(container).dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
