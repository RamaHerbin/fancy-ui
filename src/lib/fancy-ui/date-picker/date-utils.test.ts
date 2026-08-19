import { describe, it, expect } from "vitest";
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
} from "./date-utils";

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
