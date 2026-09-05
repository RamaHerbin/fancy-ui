import { describe, it, expect } from "vitest";
import { addMonths, clampDate, formatISODate, getMonthGrid, isSameDay } from "./calendar-core.js";

describe("getMonthGrid", () => {
	it("returns 6 weeks of 7 days", () => {
		const grid = getMonthGrid(2024, 1); // February 2024
		expect(grid).toHaveLength(6);
		for (const week of grid) {
			expect(week).toHaveLength(7);
		}
	});

	it("builds the correct grid for February 2024 (leap year) starting on Sunday", () => {
		const grid = getMonthGrid(2024, 1, 0);

		// Feb 1 2024 is a Thursday, so with a Sunday week start there are 4
		// leading days from January.
		const firstDay = grid[0]![0]!;
		expect(firstDay.date.getFullYear()).toBe(2024);
		expect(firstDay.date.getMonth()).toBe(0); // January
		expect(firstDay.date.getDate()).toBe(28);
		expect(firstDay.inMonth).toBe(false);

		// Leap year: Feb has 29 days, so Feb 29 must be present and in-month.
		const flat = grid.flat();
		const feb29 = flat.find((d) => d.date.getMonth() === 1 && d.date.getDate() === 29);
		expect(feb29).toBeDefined();
		expect(feb29?.inMonth).toBe(true);

		// Grid always covers exactly 42 days.
		const lastDay = grid[5]![6]!;
		const daysBetween = Math.round(
			(lastDay.date.getTime() - firstDay.date.getTime()) / (1000 * 60 * 60 * 24)
		);
		expect(daysBetween).toBe(41);
	});

	it("builds the correct grid for February 2024 starting on Monday", () => {
		const grid = getMonthGrid(2024, 1, 1);

		// Feb 1 2024 is a Thursday, so with a Monday week start there are 3
		// leading days from January (Jan 29, 30, 31).
		const firstDay = grid[0]![0]!;
		expect(firstDay.date.getMonth()).toBe(0);
		expect(firstDay.date.getDate()).toBe(29);
		expect(firstDay.inMonth).toBe(false);

		const secondWeekFirstDay = grid[1]![0]!;
		expect(secondWeekFirstDay.date.getDay()).toBe(1); // Monday
	});

	it("marks in-month days correctly and pads with adjacent-month days", () => {
		const grid = getMonthGrid(2024, 1, 1);
		const flat = grid.flat();

		const inMonthCount = flat.filter((d) => d.inMonth).length;
		expect(inMonthCount).toBe(29); // Feb 2024 has 29 days

		const outOfMonthCount = flat.filter((d) => !d.inMonth).length;
		expect(outOfMonthCount).toBe(42 - 29);
	});

	it("each week starts on the configured weekday", () => {
		const grid = getMonthGrid(2024, 1, 1);
		for (const week of grid) {
			expect(week[0]!.date.getDay()).toBe(1); // Monday
		}
	});
});

describe("addMonths", () => {
	it("adds whole months without overflow when the day exists in the target month", () => {
		const result = addMonths(new Date(2024, 0, 15), 1);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(1);
		expect(result.getDate()).toBe(15);
	});

	it("clamps to the last day of the target month instead of rolling over", () => {
		const result = addMonths(new Date(2024, 0, 31), 1); // Jan 31 + 1 month
		expect(result.getMonth()).toBe(1); // still February
		expect(result.getDate()).toBe(29); // clamped, 2024 is a leap year
	});

	it("clamps correctly for a non-leap year", () => {
		const result = addMonths(new Date(2023, 0, 31), 1);
		expect(result.getMonth()).toBe(1);
		expect(result.getDate()).toBe(28);
	});

	it("supports negative n to go backwards", () => {
		const result = addMonths(new Date(2024, 2, 15), -1);
		expect(result.getMonth()).toBe(1);
		expect(result.getDate()).toBe(15);
	});

	it("crosses a year boundary", () => {
		const result = addMonths(new Date(2024, 11, 15), 1);
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(0);
	});
});

describe("isSameDay", () => {
	it("returns true for two dates on the same calendar day with different times", () => {
		const a = new Date(2024, 1, 29, 8, 0, 0);
		const b = new Date(2024, 1, 29, 23, 59, 59);
		expect(isSameDay(a, b)).toBe(true);
	});

	it("returns false for different days", () => {
		const a = new Date(2024, 1, 28);
		const b = new Date(2024, 1, 29);
		expect(isSameDay(a, b)).toBe(false);
	});

	it("returns false for the same day/month in different years", () => {
		const a = new Date(2023, 1, 28);
		const b = new Date(2024, 1, 28);
		expect(isSameDay(a, b)).toBe(false);
	});
});

describe("clampDate", () => {
	it("returns the date unchanged when within range", () => {
		const min = new Date(2024, 0, 1);
		const max = new Date(2024, 11, 31);
		const date = new Date(2024, 5, 15);
		expect(clampDate(date, min, max).getTime()).toBe(date.getTime());
	});

	it("clamps to min when the date is before it", () => {
		const min = new Date(2024, 0, 1);
		const date = new Date(2023, 0, 1);
		expect(clampDate(date, min).getTime()).toBe(min.getTime());
	});

	it("clamps to max when the date is after it", () => {
		const max = new Date(2024, 11, 31);
		const date = new Date(2025, 0, 1);
		expect(clampDate(date, undefined, max).getTime()).toBe(max.getTime());
	});

	it("returns a new Date instance, not the original reference", () => {
		const date = new Date(2024, 5, 15);
		const result = clampDate(date);
		expect(result).not.toBe(date);
		expect(result.getTime()).toBe(date.getTime());
	});
});

describe("formatISODate", () => {
	it("formats a date as YYYY-MM-DD", () => {
		expect(formatISODate(new Date(2024, 1, 29))).toBe("2024-02-29");
	});

	it("zero-pads single-digit months and days", () => {
		expect(formatISODate(new Date(2024, 0, 5))).toBe("2024-01-05");
	});
});
