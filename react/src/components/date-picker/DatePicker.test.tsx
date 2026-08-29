import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { DatePicker } from "./DatePicker.js";
import { attachDismissable } from "../../internals/dismissable.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";
import { formatISODate } from "../../internals/calendar-core.js";
import {
	addDays,
	dayOnly,
	findEnabledDay,
	findEnabledInRow,
	formatDayAccessibleName,
	formatMonthYear,
	formatTriggerDate,
	getWeekdayNames,
	isAfterDay,
	isBeforeDay,
	isDayInRange,
	MAX_DAY_SEARCH,
	weekStartOf,
} from "./date-utils.js";

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

// ---------------------------------------------------------------------------
// date-utils — transposed from the source's date-utils.test.ts, verbatim.
// ---------------------------------------------------------------------------

describe("dayOnly", () => {
	it("truncates the time-of-day away, keeping the calendar day", () => {
		const result = dayOnly(new Date(2026, 6, 24, 23, 59, 59));
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(6);
		expect(result.getDate()).toBe(24);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
	});
});

describe("addDays", () => {
	it("adds days within a month", () => {
		const result = addDays(new Date(2026, 6, 24), 3);
		expect(result.getMonth()).toBe(6);
		expect(result.getDate()).toBe(27);
	});

	it("crosses a month boundary", () => {
		const result = addDays(new Date(2026, 6, 30), 3);
		expect(result.getMonth()).toBe(7); // August
		expect(result.getDate()).toBe(2);
	});

	// The timezone-boundary case the brief calls out: crossing a year edge
	// through local Date components only, never a UTC/ISO round trip that
	// could shift the day.
	it("crosses a year boundary without drifting a day either way", () => {
		const result = addDays(new Date(2025, 11, 31), 1);
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(1);
	});

	it("supports negative deltas", () => {
		const result = addDays(new Date(2026, 0, 1), -1);
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(11);
		expect(result.getDate()).toBe(31);
	});
});

describe("isBeforeDay / isAfterDay / isDayInRange", () => {
	it("compares by calendar day, ignoring time-of-day", () => {
		const morning = new Date(2026, 6, 24, 1, 0);
		const night = new Date(2026, 6, 24, 23, 0);
		expect(isBeforeDay(morning, night)).toBe(false);
		expect(isAfterDay(morning, night)).toBe(false);
	});

	it("isDayInRange is true with no bounds at all", () => {
		expect(isDayInRange(new Date(2026, 6, 24))).toBe(true);
	});

	it("isDayInRange respects min and max independently", () => {
		const min = new Date(2026, 6, 10);
		const max = new Date(2026, 6, 20);
		expect(isDayInRange(new Date(2026, 6, 9), min)).toBe(false);
		expect(isDayInRange(new Date(2026, 6, 10), min)).toBe(true);
		expect(isDayInRange(new Date(2026, 6, 21), undefined, max)).toBe(false);
		expect(isDayInRange(new Date(2026, 6, 20), undefined, max)).toBe(true);
	});
});

describe("findEnabledDay", () => {
	it("returns the starting day unchanged when it is already enabled", () => {
		const start = new Date(2026, 6, 24);
		const result = findEnabledDay(start, 1, () => false);
		expect(result?.getTime()).toBe(start.getTime());
	});

	it("skips a run of consecutive disabled days as a block, not one step at a time into a dead end", () => {
		// 24, 25, 26 disabled; the very next call should land on 27 in one shot,
		// not require the caller to retry three times.
		const disabled = new Set([24, 25, 26]);
		const result = findEnabledDay(new Date(2026, 6, 24), 1, (d) => disabled.has(d.getDate()));
		expect(result?.getDate()).toBe(27);
	});

	it("searches backwards when direction is -1", () => {
		const disabled = new Set([24, 23]);
		const result = findEnabledDay(new Date(2026, 6, 24), -1, (d) => disabled.has(d.getDate()));
		expect(result?.getDate()).toBe(22);
	});

	// The classic infinite loop this pattern is prone to: if literally
	// everything is disabled, the search must terminate, not hang.
	it("terminates and returns null when every day is disabled", () => {
		const result = findEnabledDay(new Date(2026, 6, 24), 1, () => true);
		expect(result).toBeNull();
	});

	it("gives up within MAX_DAY_SEARCH steps, not sooner and not later than documented", () => {
		// Enabled only far outside the search bound — proves the cap is real
		// and not just "give up after a handful of tries".
		const start = new Date(2026, 0, 1);
		const enabledOn = addDays(start, MAX_DAY_SEARCH + 10);
		const result = findEnabledDay(start, 1, (d) => d.getTime() !== enabledOn.getTime());
		expect(result).toBeNull();
	});
});

describe("weekStartOf", () => {
	it("finds the Monday of the week when weekStartsOn is 1", () => {
		// 2026-07-24 is a Friday.
		const result = weekStartOf(new Date(2026, 6, 24), 1);
		expect(result.getDay()).toBe(1);
		expect(result.getDate()).toBe(20);
	});

	it("finds the Sunday of the week when weekStartsOn is 0", () => {
		const result = weekStartOf(new Date(2026, 6, 24), 0);
		expect(result.getDay()).toBe(0);
		expect(result.getDate()).toBe(19);
	});
});

describe("findEnabledInRow", () => {
	it("returns the start edge itself when it is enabled", () => {
		const result = findEnabledInRow(new Date(2026, 6, 24), 1, "start", () => false);
		expect(result?.getDate()).toBe(20); // Monday of that week
	});

	it("scans inward from the start edge, skipping disabled days", () => {
		const disabled = new Set([20, 21]);
		const result = findEnabledInRow(new Date(2026, 6, 24), 1, "start", (d) =>
			disabled.has(d.getDate())
		);
		expect(result?.getDate()).toBe(22);
	});

	it("scans inward from the end edge", () => {
		const disabled = new Set([26]);
		const result = findEnabledInRow(new Date(2026, 6, 24), 1, "end", (d) =>
			disabled.has(d.getDate())
		);
		expect(result?.getDate()).toBe(25);
	});

	it("returns null, not a day from the next week, when the whole row is disabled", () => {
		const result = findEnabledInRow(new Date(2026, 6, 24), 1, "start", () => true);
		expect(result).toBeNull();
	});
});

describe("getWeekdayNames", () => {
	it("orders names starting from Monday when weekStartsOn is 1", () => {
		const names = getWeekdayNames(1, "en-US");
		expect(names).toHaveLength(7);
		expect(names[0]).toBe("Mon");
		expect(names[6]).toBe("Sun");
	});

	it("orders names starting from Sunday when weekStartsOn is 0", () => {
		const names = getWeekdayNames(0, "en-US");
		expect(names[0]).toBe("Sun");
		expect(names[6]).toBe("Sat");
	});

	// Proves the names come from Intl and genuinely follow `locale`, not a
	// hardcoded English table: a different locale's Monday must not read the
	// same as English's, and must not silently equal the English table at
	// any position.
	it("respects locale instead of a hardcoded English table", () => {
		const english = getWeekdayNames(1, "en-US");
		const other = getWeekdayNames(1, "ja-JP");
		expect(other[0]).not.toBe(english[0]);
		expect(other).not.toEqual(english);
	});
});

describe("formatMonthYear", () => {
	it("formats month and year for the given locale", () => {
		expect(formatMonthYear(new Date(2026, 6, 24), "en-US")).toBe("July 2026");
	});

	it("does not fall back to English under a different locale", () => {
		const english = formatMonthYear(new Date(2026, 6, 24), "en-US");
		const other = formatMonthYear(new Date(2026, 6, 24), "ja-JP");
		expect(other).not.toBe(english);
	});
});

describe("formatDayAccessibleName", () => {
	it("includes the full date, not just the bare day number", () => {
		const label = formatDayAccessibleName(new Date(2026, 6, 24), "en-US");
		expect(label).toContain("24");
		expect(label).toContain("July");
		expect(label).toContain("2026");
		expect(label.length).toBeGreaterThan(2);
	});
});

describe("formatTriggerDate", () => {
	it("formats a real date", () => {
		expect(formatTriggerDate(new Date(2026, 6, 24), "en-US")).toBe("Jul 24, 2026");
	});

	it("returns undefined for null or undefined", () => {
		expect(formatTriggerDate(null)).toBeUndefined();
		expect(formatTriggerDate(undefined)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// DatePicker — transposed from the source's DatePicker.test.ts.
// ---------------------------------------------------------------------------

/**
 * The source's DatePickerHarness.test.svelte, as a plain component declared in
 * the test file — a `.test.svelte` file existed only because Svelte components
 * need their own file. `bind:value` becomes the controlled pair; `bind:ref`
 * becomes a callback ref stamping the same `data-bound-ref` marker.
 */
function ValueHarness({ onValueChange }: { onValueChange?: (value: Date | null) => void }) {
	const [value, setValue] = useState<Date | null>(null);
	return (
		<>
			<DatePicker
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				ref={(node) => {
					node?.setAttribute("data-bound-ref", "yes");
				}}
			/>
			<span data-testid="bound-value">{value ? formatISODate(value) : "none"}</span>
		</>
	);
}

/**
 * The source's DatePickerFieldHarness.test.svelte. Publishes a hand-built
 * FieldContext rather than rendering a real FormField — this wave's components
 * are built against the frozen FieldContext surface, not against each other.
 * Deliberately passes own props that disagree with the context, so a test can
 * prove the context wins rather than merely matching by coincidence.
 */
function FieldHarness({ context }: { context: FieldContext }) {
	return (
		<FieldProvider value={context}>
			<DatePicker id="own-id" invalid={false} required={false} disabled={false} label="Deadline" />
		</FieldProvider>
	);
}

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-date-picker-trigger") as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-date-picker-panel");
}

function cellFor(iso: string): HTMLElement | null {
	return document.querySelector(`[data-ft-date="${iso}"]`);
}

function focusedCell(): HTMLElement | null {
	return document.querySelector('[data-ft-date][tabindex="0"]');
}

function announcement(): string {
	return document.querySelector('[role="status"]')?.textContent ?? "";
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

/** Dispatched inside a SYNCHRONOUS `act`, which flushes React's work without
 * draining the microtask queue. The exit window is two microtasks under the
 * animation stub, so anything awaited between the dismiss and the assertion
 * has already drained it and the test would pass for the wrong reason. */
function pressEscape(): void {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

/** Drains a leg to completion — the animation stub finishes on a microtask, so
 * an async `act` flushes the React updates the finish schedules. Every test
 * that leaves a leg in flight ends with this, so a leg never settles outside
 * `act` after the test body has returned. */
const settleLegs = () => act(async () => {});

describe("DatePicker", () => {
	afterEach(() => {
		cleanup();
		document.querySelectorAll(".ft-date-picker-panel").forEach((el) => el.remove());
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		// A spy on `Element.prototype.animate` has to be fresh in every test:
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(spy).not.toHaveBeenCalled()` would see an earlier test's calls.
		vi.restoreAllMocks();
	});

	it("renders closed by default, with a placeholder and aria-expanded false", () => {
		const { container } = render(<DatePicker placeholder="Pick a date" />);
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.textContent).toContain("Pick a date");
		expect(panel()).toBeNull();
	});

	it("formats a selected value into the trigger instead of the placeholder", () => {
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" placeholder="Pick a date" />
		);
		expect(trigger(container).textContent).toContain("Jul 24, 2026");
		expect(trigger(container).textContent).not.toContain("Pick a date");
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(<DatePicker />);
		const btn = trigger(container);
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		await waitFor(() => expect(panel()?.id).toBe(controls));
		await settleLegs();

		fireEvent.click(btn);
		await waitFor(() => expect(btn.hasAttribute("aria-controls")).toBe(false));
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("marks the grid, weekday headers and day cells with the expected roles", async () => {
		const { container } = render(<DatePicker locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());

		const grid = panel()!.querySelector("table");
		expect(grid?.getAttribute("role")).toBe("grid");
		expect(panel()!.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
		expect(panel()!.querySelectorAll('[role="gridcell"]').length).toBe(42); // 6 weeks x 7 days
		await settleLegs();
	});

	it("every day cell carries a full accessible name, not just the bare number", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(cellFor("2026-07-24")).not.toBeNull());

		const label = cellFor("2026-07-24")!.getAttribute("aria-label");
		expect(label).toContain("24");
		expect(label).toContain("July");
		expect(label).toContain("2026");
		await settleLegs();
	});

	it("seeds the roving tabindex on the selected day, and moves DOM focus there, when opened", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));

		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));
		expect(cellFor("2026-07-24")?.getAttribute("tabindex")).toBe("0");
		await settleLegs();
	});

	it("ArrowRight moves the roving focus one day forward", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-25")));
		await settleLegs();
	});

	it("ArrowLeft crossing a month boundary switches the displayed month rather than dead-ending", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 1)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-01")));

		fireEvent.keyDown(focusedCell()!, { key: "ArrowLeft" });
		await waitFor(() => expect(announcement()).toContain("June"));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-06-30")));
		await settleLegs();
	});

	it("ArrowDown moves one week forward", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "ArrowDown" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-31")));
		await settleLegs();
	});

	it("Home moves to the Monday of the focused week (weekStartsOn defaults to 1)", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "Home" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-20")));
		await settleLegs();
	});

	it("End moves to the Sunday of the focused week", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "End" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-26")));
		await settleLegs();
	});

	it("weekStartsOn=0 makes Home land on Sunday instead", async () => {
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" weekStartsOn={0} />
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "Home" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-19")));
		await settleLegs();
	});

	it("PageDown moves one month forward, clamping the day if the target month is shorter", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 0, 31)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-01-31")));

		fireEvent.keyDown(focusedCell()!, { key: "PageDown" });
		await waitFor(() => expect(announcement()).toContain("February"));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-02-28")));
		await settleLegs();
	});

	it("PageUp moves one month back", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "PageUp" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-06-24")));
		await settleLegs();
	});

	// Regression: when min/max clamping pulls the paged-to month back into
	// range, and the clamped day is itself disabled, the search for the next
	// enabled day must look toward the interior — not continue in the
	// original page direction, which is guaranteed to be out of range (and
	// therefore disabled) the whole way, silently leaving the keypress a
	// no-op.
	it("PageUp clamped to min searches forward into range, not backward out of it", async () => {
		const min = new Date(2026, 6, 15); // July 15
		const max = new Date(2026, 6, 31);
		// The first few in-range days are also individually disabled, so the
		// clamped landing spot (July 15, the min itself) isn't enabled either
		// — the fallback search has to actually do something.
		const isDateDisabled = (d: Date) => d.getMonth() === 6 && d.getDate() >= 15 && d.getDate() <= 17;
		const { container } = render(
			<DatePicker
				value={new Date(2026, 6, 20)}
				locale="en-US"
				min={min}
				max={max}
				isDateDisabled={isDateDisabled}
			/>
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-20")));

		// addMonths(July 20, -1) = June 20, which is before `min` and gets
		// clamped up to July 15 — itself disabled, so the old (buggy) code
		// searched backward from there, straight out of range, and gave up
		// with focus unchanged at July 20. The fix searches forward instead
		// and lands on July 18, the first enabled day after the disabled run.
		fireEvent.keyDown(focusedCell()!, { key: "PageUp" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-18")));
		await settleLegs();
	});

	it("PageDown clamped to max searches backward into range, not forward out of it", async () => {
		const min = new Date(2026, 6, 1);
		const max = new Date(2026, 6, 20);
		// The last few in-range days are also individually disabled, so the
		// clamped landing spot (July 20, the max itself) isn't enabled either.
		const isDateDisabled = (d: Date) => d.getMonth() === 6 && d.getDate() >= 18 && d.getDate() <= 20;
		const { container } = render(
			<DatePicker
				value={new Date(2026, 6, 10)}
				locale="en-US"
				min={min}
				max={max}
				isDateDisabled={isDateDisabled}
			/>
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-10")));

		// addMonths(July 10, +1) = August 10, after `max`, clamped down to
		// July 20 — itself disabled. The fix searches backward and lands on
		// July 17, the first enabled day before the disabled run.
		fireEvent.keyDown(focusedCell()!, { key: "PageDown" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-17")));
		await settleLegs();
	});

	it("Shift+PageDown moves one year forward", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "PageDown", shiftKey: true });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2027-07-24")));
		await settleLegs();
	});

	it("Shift+PageUp moves one year back", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "PageUp", shiftKey: true });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2025-07-24")));
		await settleLegs();
	});

	it("skips a disabled day during arrow navigation instead of landing on it", async () => {
		const isDateDisabled = (d: Date) => d.getDate() === 25;
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" isDateDisabled={isDateDisabled} />
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-26")));
		await settleLegs();
	});

	it("marks a disabled day with aria-disabled and blocks selecting it by click", async () => {
		const isDateDisabled = (d: Date) => d.getDate() === 25;
		const onValueChange = vi.fn();
		const { container } = render(
			<DatePicker
				value={new Date(2026, 6, 24)}
				locale="en-US"
				isDateDisabled={isDateDisabled}
				onValueChange={onValueChange}
			/>
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(cellFor("2026-07-25")).not.toBeNull());

		expect(cellFor("2026-07-25")?.getAttribute("aria-disabled")).toBe("true");
		fireEvent.click(cellFor("2026-07-25")!);
		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
		await settleLegs();
	});

	it("terminates instead of hanging when every day is disabled, and leaves focus where it was", async () => {
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" isDateDisabled={() => true} />
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		// No enabled day exists anywhere, so the search gives up and focus does
		// not move — proof the bounded search actually returned rather than
		// the test simply finishing before an infinite loop would have hung it.
		expect(document.activeElement).toBe(cellFor("2026-07-24"));
		await settleLegs();
	});

	it("respects min/max as day-granularity bounds", async () => {
		const min = new Date(2026, 6, 20);
		const max = new Date(2026, 6, 26);
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" min={min} max={max} />
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(cellFor("2026-07-19")).not.toBeNull());

		expect(cellFor("2026-07-19")?.getAttribute("aria-disabled")).toBe("true");
		expect(cellFor("2026-07-27")?.getAttribute("aria-disabled")).toBe("true");
		expect(cellFor("2026-07-20")?.hasAttribute("aria-disabled")).toBe(false);
		expect(cellFor("2026-07-26")?.hasAttribute("aria-disabled")).toBe(false);
		await settleLegs();
	});

	it("Enter commits the focused day, closes the panel and returns focus to the trigger", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" onValueChange={onValueChange} />
		);
		const btn = trigger(container);
		fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-25")));

		fireEvent.keyDown(focusedCell()!, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledTimes(1);
		const committed = onValueChange.mock.calls[0]![0] as Date;
		expect(committed.getDate()).toBe(25);
		await waitFor(() => expect(panel()).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("clicking an enabled day commits it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" onValueChange={onValueChange} />
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(cellFor("2026-07-22")).not.toBeNull());

		fireEvent.click(cellFor("2026-07-22")!);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect((onValueChange.mock.calls[0]![0] as Date).getDate()).toBe(22);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("announces the month label, and updates it as the view changes", async () => {
		const { container } = render(<DatePicker value={new Date(2026, 6, 24)} locale="en-US" />);
		expect(announcement()).toBe("");

		fireEvent.click(trigger(container));
		await waitFor(() => expect(announcement()).toBe("July 2026"));

		fireEvent.click(document.querySelector('[aria-label="Next month"]')!);
		await waitFor(() => expect(announcement()).toBe("August 2026"));
		await settleLegs();
	});

	it("closes on Escape without committing a value", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" onValueChange={onValueChange} />
		);
		const btn = trigger(container);
		fireEvent.click(btn);
		await waitFor(() => expect(panel()).not.toBeNull());
		await settleLegs();

		pressEscape();
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(<DatePicker locale="en-US" />);

		fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());
		await settleLegs();

		// The jsdom version this package pins does not implement `PointerEvent`;
		// a `MouseEvent` of the same type carries everything the handler reads.
		act(() => {
			outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
		});
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("does not open while disabled", () => {
		const { container } = render(<DatePicker disabled locale="en-US" />);
		fireEvent.click(trigger(container));
		expect(panel()).toBeNull();
	});

	it("renders no hidden input when name is not set", () => {
		const { container } = render(<DatePicker />);
		expect(container.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("renders a hidden ISO-date input when name is set, submitted through FormData", () => {
		const { container } = render(<DatePicker name="deadline" value={new Date(2026, 6, 24)} />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.value).toBe("2026-07-24");

		const form = document.createElement("form");
		form.appendChild(hidden.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("deadline")).toBe("2026-07-24");
	});

	it("excludes the hidden input's value from FormData while disabled", () => {
		const { container } = render(
			<DatePicker name="deadline" value={new Date(2026, 6, 24)} disabled />
		);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;

		const form = document.createElement("form");
		form.appendChild(hidden.cloneNode(true));
		expect(new FormData(form).get("deadline")).toBeNull();
	});

	it("the hidden input is empty while no day is selected", () => {
		const { container } = render(<DatePicker name="deadline" />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.value).toBe("");
	});

	it("round-trips value through a controlled value + onValueChange pair", async () => {
		const { container, getByTestId } = render(<ValueHarness />);
		expect(getByTestId("bound-value").textContent).toBe("none");

		fireEvent.click(trigger(container));
		await waitFor(() => expect(focusedCell()).not.toBeNull());
		// Any real, in-view day works — pick the focused one (today, in this
		// harness) and commit it.
		const target = focusedCell();
		fireEvent.click(target!);

		await waitFor(() => expect(getByTestId("bound-value").textContent).not.toBe("none"));
	});

	it("round-trips the trigger element through the forwarded ref", () => {
		const { container } = render(<ValueHarness />);
		expect(trigger(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("works with a plain non-controlled value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<DatePicker value={new Date(2026, 6, 24)} locale="en-US" onValueChange={onValueChange} />
		);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(cellFor("2026-07-22")).not.toBeNull());
		fireEvent.click(cellFor("2026-07-22")!);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(<DatePicker id="solo" invalid required disabled={false} />);
		const btn = trigger(container);

		expect(btn.id).toBe("solo");
		expect(btn.getAttribute("aria-invalid")).toBe("true");
		expect(btn.getAttribute("aria-required")).toBe("true");
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
		const { container } = render(<FieldHarness context={context} />);
		const btn = trigger(container);

		expect(btn.id).toBe("ctx-id");
		expect(btn.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(btn.getAttribute("aria-invalid")).toBe("true");
		expect(btn.getAttribute("aria-required")).toBe("true");
		expect(btn.disabled).toBe(true);

		// disabled through the context, not the component's own (false) prop —
		// opening must stay blocked.
		fireEvent.click(btn);
		expect(panel()).toBeNull();
	});

	it("merges the class prop onto the trigger", () => {
		const { container } = render(<DatePicker className="w-[240px]" />);
		const btn = trigger(container);
		expect(btn.className).toContain("w-[240px]");
		expect(btn.className).toContain("ft-date-picker-trigger");
	});

	it("resolves the accessible name from the label prop", () => {
		const { container } = render(<DatePicker label="Deadline" />);
		expect(trigger(container).getAttribute("aria-label")).toBe("Deadline");
	});

	it("publishes the resolved placement and grows from the panel corner nearest the trigger", async () => {
		// The positive counterpart to the reduced-motion test below: under the
		// default stub (`matches: false`, i.e. no-preference) the entrance really
		// does run, which is what makes that test's `not.toHaveBeenCalled()`
		// discriminating instead of vacuously true. Without this line, dropping
		// the entrance leg altogether would leave both tests green.
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(<DatePicker />);
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

		const { container } = render(<DatePicker />);
		fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());
		await settleLegs();

		// A zero duration makes the transition runtime skip `element.animate()`
		// entirely rather than run a zero-length animation, so the panel is
		// simply there.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The panel leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the animation stub. These pin what must be
	// true inside it. `open`, `value` and `onValueChange` all still settle
	// synchronously, which is why every assertion on them stayed unwrapped.
	describe("exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<DatePicker />);
			const btn = trigger(container);
			fireEvent.click(btn);
			await settleLegs();
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary React attribute here (divergence D-2), carrying
			// `surfaceState`'s two values — the source had to write it
			// imperatively from `onoutrostart` because its scheduler skips
			// effects inside a branch it has marked inert.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this itself on the registered node, for the
			// whole exit — which is what stops a day cell taking a click on
			// its way out.
			expect(closing!.inert).toBe(true);
			// The trigger has already been told the panel is gone.
			expect(btn.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// `closePanel()` is a plain function outside the presence-mounted
		// subtree, so it returns focus in the same tick as the dismiss — this
		// component needs no focus-trap handle to satisfy the eager-return
		// rule. The assertion deliberately runs INSIDE the exit window, while
		// the panel is still on screen and already marked `inert`: that is
		// exactly the moment a late return would have stranded a keyboard
		// user on `<body>`.
		it("returns focus to the trigger at the dismiss, not when the fade ends", async () => {
			const { container } = render(<DatePicker />);
			const btn = trigger(container);
			fireEvent.click(btn);
			await settleLegs();

			pressEscape();

			expect(panel()).toBeTruthy(); // still fading
			expect(document.activeElement).toBe(btn);
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The `active: open` gate. A layer on its way out must not swallow the
		// key: the dismiss stack scans past it and hands Escape to whatever is
		// underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the picker, so the panel sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathHandle = attachDismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(<DatePicker />);
			fireEvent.click(trigger(container));
			await settleLegs();

			pressEscape(); // the panel is the top LIVE layer and takes this one
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the panel is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathHandle.destroy();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes the transition
		// runtime call its finish callback synchronously and never touch
		// `element.animate()`, so a visitor who asked for less motion gets
		// exactly the synchronous close this panel had before the exit existed.
		it("closes synchronously and never animates under reduced motion", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<DatePicker />);
			fireEvent.click(trigger(container));
			await settleLegs();
			expect(panel()).not.toBeNull();

			pressEscape();

			expect(panel()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});
});
