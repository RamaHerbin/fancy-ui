// Pure helpers layered on top of `internals/calendar-core.ts` for exactly
// what DatePicker needs beyond the shared month math: day-granularity
// comparisons, a bounded "skip disabled days" search, week edges, and
// locale-aware labels. Nothing here reimplements `getMonthGrid`/`addMonths`/
// `isSameDay`/`clampDate`/`formatISODate` — those come straight from
// `calendar-core.js`.
//
// Every date in and out of this module is a local-time `Date` at, or
// truncated to, local midnight — never a UTC/ISO round trip. Constructing a
// `Date` from a Y/M/D triple and formatting it in another time zone can shift
// the calendar day; staying in local components throughout, the same
// convention `calendar-core.ts` itself uses, is what avoids that.

import type { WeekStartsOn } from "../../internals/calendar-core.js";

/** Truncates `date` to local midnight. Always returns a new Date. */
export function dayOnly(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Returns a new date `n` days away from `date`, in local time. */
export function addDays(date: Date, n: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Whether `date` falls strictly before `bound`, comparing whole days only. */
export function isBeforeDay(date: Date, bound: Date): boolean {
	return dayOnly(date).getTime() < dayOnly(bound).getTime();
}

/** Whether `date` falls strictly after `bound`, comparing whole days only. */
export function isAfterDay(date: Date, bound: Date): boolean {
	return dayOnly(date).getTime() > dayOnly(bound).getTime();
}

/** Whether `date` falls within `[min, max]` (either bound optional), comparing whole days only. */
export function isDayInRange(date: Date, min?: Date, max?: Date): boolean {
	if (min && isBeforeDay(date, min)) return false;
	if (max && isAfterDay(date, max)) return false;
	return true;
}

// A generous but finite ceiling for "keep stepping one day at a time until an
// enabled day turns up" — about ten years. Real usage (a `min`/`max` window,
// or an `isDateDisabled` blocking weekends/holidays) resolves in a handful of
// steps; this exists only so a caller who disables every day, accidentally or
// not, terminates instead of hanging the tab. Mirrors the same "every option
// disabled must still terminate" rule the shared listbox contract documents.
export const MAX_DAY_SEARCH = 3660;

/**
 * Steps from `from` one day at a time in `direction` until `isDisabled`
 * returns false, including `from` itself. Returns `null` if nothing enabled
 * turns up within `MAX_DAY_SEARCH` steps.
 */
export function findEnabledDay(
	from: Date,
	direction: 1 | -1,
	isDisabled: (date: Date) => boolean
): Date | null {
	let candidate = from;
	let steps = 0;
	while (isDisabled(candidate)) {
		if (steps >= MAX_DAY_SEARCH) return null;
		candidate = addDays(candidate, direction);
		steps++;
	}
	return candidate;
}

/** The first day (in `weekStartsOn` terms) of the week `date` falls in. */
export function weekStartOf(date: Date, weekStartsOn: WeekStartsOn): Date {
	const offset = (date.getDay() - weekStartsOn + 7) % 7;
	return addDays(date, -offset);
}

/**
 * Scans the 7-day row containing `date` from one edge inward for the first
 * enabled day, stopping at the far edge of that same row rather than
 * spilling into the next week. Returns `null` if the whole row is disabled.
 */
export function findEnabledInRow(
	date: Date,
	weekStartsOn: WeekStartsOn,
	edge: "start" | "end",
	isDisabled: (date: Date) => boolean
): Date | null {
	const start = weekStartOf(date, weekStartsOn);
	const direction = edge === "start" ? 1 : -1;
	let candidate = edge === "start" ? start : addDays(start, 6);
	for (let steps = 0; steps < 7; steps++) {
		if (!isDisabled(candidate)) return candidate;
		candidate = addDays(candidate, direction);
	}
	return null;
}

/**
 * Short weekday names ("Mon", "Tue", ...) ordered starting from
 * `weekStartsOn`, formatted with `locale`. A fixed reference week (a known
 * Sunday plus offsets) stands in for "any week" — only the weekday, not the
 * date, ever reaches the formatter.
 */
export function getWeekdayNames(weekStartsOn: WeekStartsOn, locale?: string): string[] {
	// 2023-01-01 is a Sunday; Sunday + weekStartsOn lands on the configured
	// first day of the week.
	const referenceSunday = new Date(2023, 0, 1);
	const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
	return Array.from({ length: 7 }, (_, i) =>
		formatter.format(addDays(referenceSunday, weekStartsOn + i))
	);
}

/** "July 2026"-style label for the currently displayed month, locale-aware. */
export function formatMonthYear(date: Date, locale?: string): string {
	return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

/** Full accessible name for a single day cell — never just the bare number. */
export function formatDayAccessibleName(date: Date, locale?: string): string {
	return new Intl.DateTimeFormat(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);
}

/** Short label for the trigger button, e.g. "24 Jul 2026". `null`/`undefined` format to `undefined`. */
export function formatTriggerDate(
	date: Date | null | undefined,
	locale?: string
): string | undefined {
	if (!date) return undefined;
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(date);
}
