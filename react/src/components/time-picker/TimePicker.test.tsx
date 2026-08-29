import { StrictMode, useEffect, useRef, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { TimePicker } from "./TimePicker.js";
import {
	filterByBounds,
	formatSlotLabel,
	fromMinutes,
	generateSlots,
	nearestIndex,
	toMinutes,
} from "./time-utils.js";
import { FieldProvider, type FieldContext } from "../../internals/field.js";
import { __dismissableLayerCount, attachDismissable } from "../../internals/dismissable.js";

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando that reflects to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE, which is
 * what `:not([inert])` selectors and assistive tech key on) was never touched.
 * Guarded so it is a no-op the moment jsdom ships the real property.
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

describe("toMinutes / fromMinutes", () => {
	it("parses HH:mm into minutes since midnight", () => {
		expect(toMinutes("00:00")).toBe(0);
		expect(toMinutes("14:30")).toBe(870);
		expect(toMinutes("23:59")).toBe(1439);
	});

	it("returns null for malformed input", () => {
		expect(toMinutes("")).toBeNull();
		expect(toMinutes("14:5")).toBeNull(); // not zero-padded — not the contract's shape
		expect(toMinutes("24:00")).toBeNull();
		expect(toMinutes("12:60")).toBeNull();
		expect(toMinutes("not-a-time")).toBeNull();
	});

	it("round-trips through fromMinutes with zero-padding", () => {
		expect(fromMinutes(0)).toBe("00:00");
		expect(fromMinutes(870)).toBe("14:30");
		expect(fromMinutes(5)).toBe("00:05");
	});
});

describe("generateSlots", () => {
	it("generates 48 slots for the default 30-minute step", () => {
		const slots = generateSlots(30);
		expect(slots).toHaveLength(48);
		expect(slots[0]).toBe("00:00");
		expect(slots[1]).toBe("00:30");
		expect(slots.at(-1)).toBe("23:30");
	});

	it("generates 24 slots for a 60-minute step", () => {
		const slots = generateSlots(60);
		expect(slots).toHaveLength(24);
		expect(slots.at(-1)).toBe("23:00");
	});

	// The documented, defined behaviour for a step that doesn't divide the
	// hour (or the day) evenly: the grid is still anchored at 00:00 and just
	// stops once the next slot would reach or pass midnight, leaving a
	// shorter final gap rather than inserting a partial slot.
	it("handles a step that does not divide 60 or 1440 evenly, without a partial trailing slot", () => {
		const slots = generateSlots(45);
		expect(slots[0]).toBe("00:00");
		expect(slots[1]).toBe("00:45");
		expect(slots[2]).toBe("01:30");
		// 1440 / 45 = 32 exactly, so this particular step happens to land
		// exactly on 23:15 as its last slot with nothing partial left over.
		expect(slots.at(-1)).toBe("23:15");
		for (const slot of slots) {
			expect(toMinutes(slot)).not.toBeNull();
		}
	});

	it("never produces a slot at or past midnight", () => {
		const slots = generateSlots(30);
		for (const slot of slots) {
			expect(toMinutes(slot)!).toBeLessThan(24 * 60);
		}
	});
});

describe("filterByBounds", () => {
	const all = generateSlots(60); // 00:00, 01:00, ..., 23:00

	it("keeps everything with no bounds", () => {
		expect(filterByBounds(all)).toEqual(all);
	});

	it("keeps only slots at or after min", () => {
		const result = filterByBounds(all, "09:00");
		expect(result[0]).toBe("09:00");
		expect(result).not.toContain("08:00");
	});

	it("keeps only slots at or before max", () => {
		const result = filterByBounds(all, undefined, "17:00");
		expect(result.at(-1)).toBe("17:00");
		expect(result).not.toContain("18:00");
	});

	// The defined behaviour for a bound that does not land on a generated
	// boundary: the straddling slot is simply excluded, not replaced by a
	// synthetic slot exactly at the bound.
	it("excludes the straddling slot when a bound does not land on a generated boundary", () => {
		const slots = generateSlots(30); // ..., 09:00, 09:30, 10:00, ...
		const result = filterByBounds(slots, "09:15");
		expect(result).not.toContain("09:00");
		expect(result[0]).toBe("09:30");
		expect(result).not.toContain("09:15");
	});

	it("can produce an empty list when min is after max", () => {
		expect(filterByBounds(all, "18:00", "09:00")).toEqual([]);
	});
});

describe("nearestIndex", () => {
	const slots = generateSlots(30); // 00:00, 00:30, ..., 23:30

	it("finds the exact match", () => {
		expect(nearestIndex(slots, "14:30")).toBe(slots.indexOf("14:30"));
	});

	it("finds the nearest slot at or after an off-grid value", () => {
		expect(slots[nearestIndex(slots, "14:05")]).toBe("14:30");
	});

	it("falls back to the last slot when the value is later than every slot", () => {
		expect(nearestIndex(slots, "23:45")).toBe(slots.length - 1);
	});

	it("returns 0 for null/undefined — nothing to be nearest to", () => {
		expect(nearestIndex(slots, null)).toBe(0);
		expect(nearestIndex(slots, undefined)).toBe(0);
	});

	it("returns -1 when there are no slots at all", () => {
		expect(nearestIndex([], "10:00")).toBe(-1);
	});
});

describe("formatSlotLabel", () => {
	it("formats 24-hour by default shape when hour12 is false", () => {
		const label = formatSlotLabel("14:30", false, "en-US");
		expect(label).toContain("14");
		expect(label).toContain("30");
		expect(label.toLowerCase()).not.toContain("pm");
	});

	it("formats a 12-hour label with AM/PM when hour12 is true, without changing the underlying value contract", () => {
		const label = formatSlotLabel("14:30", true, "en-US");
		expect(label.toLowerCase()).toContain("pm");
		expect(label).toContain("2");
		expect(label).not.toContain("14");
	});

	it("formats midnight and noon sensibly under 12-hour display", () => {
		expect(formatSlotLabel("00:00", true, "en-US").toLowerCase()).toContain("am");
		expect(formatSlotLabel("12:00", true, "en-US").toLowerCase()).toContain("pm");
	});
});

// The source suite's two `.test.svelte` harnesses collapse into the two
// components below — a `.test.svelte` file exists only because a Svelte
// component needs its own file.

/**
 * The React spelling of the source's `bind:value` + `bind:ref` rig: the caller
 * owns the value and writes it back from `onValueChange`, and echoes it into
 * the DOM, which is the only way to prove `value` and `ref` travel back out to
 * the consumer rather than merely changing what the trigger draws.
 */
function ValueHarness({ onValueChange }: { onValueChange?: (value: string | null) => void }) {
	const [value, setValue] = useState<string | null>(null);
	const el = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<TimePicker
				ref={el}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				locale="en-US"
			/>
			<span data-testid="bound-value">{value ?? "none"}</span>
		</>
	);
}

/**
 * Publishes an optional `FieldContext` before rendering a real TimePicker, so
 * its FormField integration is proven against the frozen `useField()`/
 * `FieldContext` surface without depending on the actual FormField component
 * (a different builder's folder, not part of what this component consumes).
 *
 * TimePicker's own props deliberately disagree with the context, so a test can
 * prove the context wins rather than merely matching by coincidence.
 */
function FieldHarness({
	disabled = false,
	required = false,
	invalid = false,
	field,
}: {
	disabled?: boolean;
	required?: boolean;
	invalid?: boolean;
	/** Omit to render with no FormField provider above it at all. */
	field?: FieldContext;
}) {
	const picker = (
		<TimePicker
			id="own-id"
			disabled={disabled}
			required={required}
			invalid={invalid}
			label="Slot"
			locale="en-US"
		/>
	);
	return field ? <FieldProvider value={field}>{picker}</FieldProvider> : picker;
}

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

/**
 * The row at `index`. Indexed access is `undefined`-typed under this package's
 * `noUncheckedIndexedAccess`, and every call site below has already pinned the
 * row count it depends on.
 */
function optionRow(index: number): HTMLElement {
	return optionRows()[index] as HTMLElement;
}

/**
 * Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before the panel opens is the one its transition sees.
 */
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
 * microtasks, which is what keeps an exit leg in flight across the assertions
 * that need it there.
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
	// The jsdom version this package pins does not implement `PointerEvent`. A
	// `MouseEvent` of the same type carries everything the handler reads.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Drains an exit (or entrance) leg to completion. The animation stub finishes
 * on a MICROTASK and `runTransition` chains a dummy into the real animation, so
 * a settled leg is two turns away; an async `act` crosses a macrotask boundary
 * and flushes the React updates the finish schedules. A leg left in flight when
 * the test body returns updates React state outside `act`, which prints a
 * warning per panel.
 */
const settleLegs = () => act(async () => {});

describe("TimePicker", () => {
	afterEach(async () => {
		// Any leg still in flight settles INSIDE `act`, so a late presence
		// update can never land outside one.
		await settleLegs();
		cleanup();
		// Every dismiss layer this file pushed has to be gone once the tree is
		// unmounted — a leaked layer would silently swallow the next test's
		// Escape.
		expect(__dismissableLayerCount()).toBe(0);
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		document.body.querySelectorAll('[role="listbox"]').forEach((el) => el.remove());
	});

	it("renders closed by default, role=combobox with aria-expanded false and aria-haspopup listbox", () => {
		const { container } = render(<TimePicker locale="en-US" />);
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.getAttribute("aria-haspopup")).toBe("listbox");
		expect(panel()).toBeNull();
	});

	it("shows the placeholder when nothing is selected", () => {
		const { container } = render(<TimePicker locale="en-US" placeholder="Select a time" />);
		expect(trigger(container).textContent).toContain("Select a time");
	});

	it("shows the value in 24-hour form by default", () => {
		const { container } = render(<TimePicker value="14:30" locale="en-US" />);
		expect(trigger(container).textContent).toContain("14");
		expect(trigger(container).textContent).toContain("30");
	});

	it("shows a 12-hour label when hour12 is set, without changing the underlying value", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<TimePicker value="14:30" hour12 locale="en-US" onValueChange={onValueChange} />
		);
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
		const { container } = render(
			<TimePicker locale="en-US" hour12 onValueChange={onValueChange} />
		);
		fireEvent.click(trigger(container));

		// Index 28 at the default 30-minute step is 14:00 (28 * 30 = 840 min).
		const row = optionRow(28);
		expect(row.textContent?.toLowerCase()).toContain("pm");
		fireEvent.click(row);

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("14:00");

		// The trigger keeps displaying 12-hour form, but the committed value
		// underneath stayed 24-hour.
		expect(trigger(container).textContent?.toLowerCase()).toContain("pm");
		await settleLegs();
	});

	it("aria-controls is absent while closed and points at the panel's real id once open, then absent again on close", async () => {
		const { container } = render(<TimePicker locale="en-US" />);
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

	it("generates 48 slots for the default 30-minute step", async () => {
		const { container } = render(<TimePicker locale="en-US" />);
		fireEvent.click(trigger(container));
		expect(optionRows()).toHaveLength(48);
		await settleLegs();
	});

	it("respects a custom step", async () => {
		const { container } = render(<TimePicker locale="en-US" step={60} />);
		fireEvent.click(trigger(container));
		expect(optionRows()).toHaveLength(24);
		await settleLegs();
	});

	it("respects min/max bounds on the generated slots", async () => {
		const { container } = render(
			<TimePicker locale="en-US" step={60} min="09:00" max="17:00" />
		);
		fireEvent.click(trigger(container));
		expect(optionRows()).toHaveLength(9); // 09:00 .. 17:00 inclusive
		await settleLegs();
	});

	// min/max excluding every generated slot is reachable (not guarded
	// against — it's outside this component's own prop surface to validate
	// one against the other) and must not open an empty, unexplained panel.
	it("shows a message instead of an empty panel when min/max exclude every slot", async () => {
		const { container } = render(<TimePicker locale="en-US" min="18:00" max="09:00" />);
		fireEvent.click(trigger(container));

		await waitFor(() => expect(panel()).not.toBeNull());
		expect(optionRows()).toHaveLength(0);
		expect(panel()?.textContent).toContain("No times available.");
		await settleLegs();
	});

	it("marks the selected slot aria-selected=true and no other", async () => {
		const { container } = render(<TimePicker locale="en-US" value="14:30" />);
		fireEvent.click(trigger(container));

		const rows = optionRows();
		const selected = rows.filter((r) => r.getAttribute("aria-selected") === "true");
		expect(selected).toHaveLength(1);
		expect(selected[0]!.id).toBe(
			document.querySelector('[role="combobox"]')?.getAttribute("aria-activedescendant")
		);
		await settleLegs();
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
			const { container } = render(<TimePicker locale="en-US" value="14:30" />);

			fireEvent.click(trigger(container));
			await settleLegs();

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
			const { container } = render(<TimePicker locale="en-US" value="14:30" />);
			const btn = trigger(container);
			fireEvent.click(btn);
			await settleLegs();
			scrollSpy.mockClear();

			fireEvent.keyDown(btn, { key: "ArrowDown" });

			expect(scrollSpy).toHaveBeenCalled();
			await settleLegs();
		} finally {
			HTMLElement.prototype.scrollIntoView = original;
		}
	});

	it("clicking a slot commits it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<TimePicker locale="en-US" onValueChange={onValueChange} />);
		fireEvent.click(trigger(container));

		// Index 28 at the default 30-minute step is 14:00 (28 * 30 = 840 min).
		fireEvent.click(optionRow(28));
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("14:00");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("ArrowDown opens the panel and activates the slot nearest to the current value", async () => {
		const { container } = render(<TimePicker locale="en-US" value="14:05" />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowDown" });

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		const activeId = btn.getAttribute("aria-activedescendant");
		const active = document.getElementById(activeId!);
		expect(active?.textContent).toContain("14");
		expect(active?.textContent).toContain("30");
		await settleLegs();
	});

	it("ArrowDown then ArrowDown moves to the next slot", async () => {
		const { container } = render(<TimePicker locale="en-US" value="14:00" />);
		const btn = trigger(container);

		fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, active on 14:00
		const firstActive = btn.getAttribute("aria-activedescendant");
		fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to 14:30
		const secondActive = btn.getAttribute("aria-activedescendant");

		expect(secondActive).not.toBe(firstActive);
		await settleLegs();
	});

	it("Home/End jump to the first/last slot while open", async () => {
		const { container } = render(<TimePicker locale="en-US" value="14:00" />);
		const btn = trigger(container);
		fireEvent.click(btn);

		fireEvent.keyDown(btn, { key: "End" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionRows().at(-1)?.id);

		fireEvent.keyDown(btn, { key: "Home" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionRow(0).id);
		await settleLegs();
	});

	it("Enter commits the active slot and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<TimePicker locale="en-US" value="14:00" onValueChange={onValueChange} />
		);
		const btn = trigger(container);
		fireEvent.click(btn); // opens, active on 14:00
		fireEvent.keyDown(btn, { key: "ArrowDown" }); // 14:30

		fireEvent.keyDown(btn, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledWith("14:30");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Escape closes without committing, even after arrowing to a different slot", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<TimePicker locale="en-US" value="14:00" onValueChange={onValueChange} />
		);
		const btn = trigger(container);
		fireEvent.click(btn);
		fireEvent.keyDown(btn, { key: "ArrowDown" });

		pressEscape();
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
		const { container } = render(<TimePicker locale="en-US" onValueChange={onValueChange} />);

		fireEvent.click(trigger(container));
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		outside.remove();
	});

	it("does not open, commit or move on any key when disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<TimePicker locale="en-US" disabled onValueChange={onValueChange} />
		);
		const btn = trigger(container);

		fireEvent.click(btn);
		fireEvent.keyDown(btn, { key: "ArrowDown" });

		expect(panel()).toBeNull();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips a consumer-owned value", async () => {
		const { container, getByTestId } = render(<ValueHarness />);
		expect(getByTestId("bound-value").textContent).toBe("none");

		fireEvent.click(trigger(container));
		fireEvent.click(optionRow(0));

		expect(getByTestId("bound-value").textContent).toBe("00:00");
		await settleLegs();
	});

	it("round-trips the trigger element through the forwarded ref", () => {
		const { container } = render(<ValueHarness />);
		expect(trigger(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<TimePicker locale="en-US" value="09:00" onValueChange={onValueChange} />
		);
		fireEvent.click(trigger(container));
		fireEvent.click(optionRow(0));
		expect(onValueChange).toHaveBeenCalledWith("00:00");
		await settleLegs();
	});

	it("merges the className prop onto the trigger", () => {
		const { container } = render(<TimePicker locale="en-US" className="w-[160px]" />);
		expect(trigger(container).className).toContain("w-[160px]");
		expect(trigger(container).className).toContain("ft-time-picker-trigger");
	});

	it("resolves the accessible name from the label prop", () => {
		const { container } = render(<TimePicker locale="en-US" label="Start time" />);
		expect(trigger(container).getAttribute("aria-label")).toBe("Start time");
	});

	it("publishes the resolved placement and grows from the panel corner nearest the trigger", async () => {
		// The positive counterpart to the reduced-motion test below: under the
		// default stub (`matches: false`, i.e. no-preference) the entrance really
		// does run, which is what makes that test's `not.toHaveBeenCalled()`
		// discriminating instead of vacuously true. Without this line, dropping
		// the entrance altogether would leave both tests green.
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(<TimePicker locale="en-US" />);
		fireEvent.click(trigger(container));
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
		await settleLegs();
	});

	it("runs no animation at all under reduced motion, and still shows the panel", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(<TimePicker locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());

		// A zero duration makes `runTransition` skip `element.animate()` outright
		// instead of running a zero-length animation, and the panel's visibility
		// never depended on the entrance in the first place.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	// The panel leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the WAAPI stub. These pin what must be true
	// inside it. `open`, `value` and `onValueChange` all still settle
	// synchronously, which is why every assertion on them stayed unwrapped.
	describe("exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<TimePicker locale="en-US" />);
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
			// exit — which is what stops a row taking a click on its way out.
			expect(closing!.inert).toBe(true);
			// The trigger has already been told the panel is gone.
			expect(btn.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: ctx.open` gate. A layer on its way out must not swallow
		// the key: the dismiss stack scans past it and hands Escape to whatever
		// is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the picker, so the panel sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathLayer = attachDismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(<TimePicker locale="en-US" />);
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

		// The reduced-motion fast path: a zero duration makes `runTransition`
		// call the finish callback synchronously and never touch
		// `element.animate()`, so a visitor who asked for less motion gets
		// exactly the synchronous close this panel had before the exit existed.
		it("closes synchronously and never animates under reduced motion", () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<TimePicker locale="en-US" />);
			fireEvent.click(trigger(container));
			expect(panel()).not.toBeNull();

			pressEscape();

			expect(panel()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	describe("form participation", () => {
		it("renders no hidden input when name is omitted", () => {
			const { container } = render(<TimePicker locale="en-US" />);
			expect(container.querySelector('input[type="hidden"]')).toBeNull();
		});

		it("carries the HH:mm value through a hidden input when name is set, readable via FormData", async () => {
			const { container } = render(<TimePicker locale="en-US" name="slot" value="14:30" />);
			const hiddenInput = () =>
				container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form).get("slot")).toBe("14:30");

			fireEvent.click(trigger(container));
			fireEvent.click(optionRow(0));
			await settleLegs();

			const form2 = document.createElement("form");
			form2.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form2).get("slot")).toBe("00:00");
		});

		it("excludes the hidden input's value from FormData while disabled", () => {
			const { container } = render(
				<TimePicker locale="en-US" name="slot" value="14:30" disabled />
			);
			const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hidden.cloneNode(true));
			expect(new FormData(form).get("slot")).toBeNull();
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
			const { container } = render(<FieldHarness field={field} />);

			const btn = trigger(container);
			expect(btn.id).toBe("field-1");
			expect(btn.getAttribute("aria-describedby")).toBe("field-1-error");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
			expect(btn.getAttribute("aria-required")).toBe("true");
		});

		// The polarity `??` gets right and `||` gets wrong: context `false`
		// must win over the control's own prop `true`.
		it("lets the FormField's disabled=false win over the control's own disabled=true prop", () => {
			const field: FieldContext = {
				controlId: "field-2",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(<FieldHarness field={field} disabled />);
			expect(trigger(container).disabled).toBe(false);
		});

		it("lets the FormField's disabled=true win over the control's own disabled=false prop, blocking open", () => {
			const field: FieldContext = {
				controlId: "field-3",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(<FieldHarness field={field} disabled={false} />);
			const btn = trigger(container);
			expect(btn.disabled).toBe(true);

			fireEvent.click(btn);
			expect(panel()).toBeNull();
		});

		it("works standalone with useField() undefined, falling back to its own props", () => {
			const { container } = render(
				<TimePicker locale="en-US" id="solo" disabled required invalid />
			);
			const btn = trigger(container);
			expect(btn.id).toBe("solo");
			expect(btn.disabled).toBe(true);
			expect(btn.getAttribute("aria-required")).toBe("true");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
		});
	});

	// One addition this port needs and the source did not, pinning a
	// React-specific hazard rather than new behaviour: the double invoke must
	// leave exactly one panel, one dismiss layer (asserted back to zero by this
	// file's `afterEach`) and one set of window listeners behind.
	describe("React layer", () => {
		it("mounts, opens and closes once under StrictMode", async () => {
			const { container } = render(
				<StrictMode>
					<TimePicker locale="en-US" />
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
