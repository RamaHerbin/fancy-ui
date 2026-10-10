// Pure calendar math shared by date-picker style components. Everything here
// operates on native `Date` objects in local time and has no DOM dependency,
// so it is trivially unit-testable and safe to call during SSR.
//
// Usage:
//   const weeks = getMonthGrid(2024, 1); // February 2024, 6 weeks x 7 days

export type WeekStartsOn = 0 | 1;

export interface MonthGridDay {
	date: Date;
	/** False for the leading/trailing days that pad the grid but belong to an adjacent month. */
	inMonth: boolean;
}

const DAYS_IN_WEEK = 7;
const WEEKS_IN_GRID = 6;

/**
 * Builds a 6-week x 7-day grid for `month` (0-11) of `year`, padded with the
 * trailing days of the previous month and the leading days of the next one
 * so every week is complete.
 *
 * @param weekStartsOn - 0 for Sunday, 1 for Monday. Defaults to 0.
 */
export function getMonthGrid(
	year: number,
	month: number,
	weekStartsOn: WeekStartsOn = 0
): MonthGridDay[][] {
	// Normalize through Date so out-of-range month values (e.g. 12) resolve
	// the same way the rest of this module treats them.
	const reference = new Date(year, month, 1);
	const firstWeekday = reference.getDay();
	const leadingDays = (firstWeekday - weekStartsOn + 7) % 7;

	const gridStart = new Date(reference.getFullYear(), reference.getMonth(), 1 - leadingDays);

	const days: MonthGridDay[] = [];
	for (let i = 0; i < WEEKS_IN_GRID * DAYS_IN_WEEK; i++) {
		const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
		days.push({
			date,
			inMonth:
				date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear(),
		});
	}

	const weeks: MonthGridDay[][] = [];
	for (let w = 0; w < WEEKS_IN_GRID; w++) {
		weeks.push(days.slice(w * DAYS_IN_WEEK, (w + 1) * DAYS_IN_WEEK));
	}
	return weeks;
}

/**
 * Returns a new date `n` months away from `date`. Clamps the day-of-month to
 * the target month's length instead of letting it roll over (e.g. Jan 31 + 1
 * month lands on Feb 28/29, not Mar 2/3).
 */
export function addMonths(date: Date, n: number): Date {
	const day = date.getDate();

	// Move to day 1 first so setMonth can't overflow into an unrelated month.
	const result = new Date(date);
	result.setDate(1);
	result.setMonth(result.getMonth() + n);

	const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
	result.setDate(Math.min(day, daysInTargetMonth));
	result.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
	return result;
}

/** Whether `a` and `b` fall on the same calendar day (year/month/date), ignoring time. */
export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/** Clamps `date` into the `[min, max]` range (either bound optional). Always returns a new Date. */
export function clampDate(date: Date, min?: Date, max?: Date): Date {
	if (min && date.getTime() < min.getTime()) {
		return new Date(min);
	}
	if (max && date.getTime() > max.getTime()) {
		return new Date(max);
	}
	return new Date(date);
}

/** Formats `date` as a "YYYY-MM-DD" string using its local date components. */
export function formatISODate(date: Date): string {
	const year = date.getFullYear().toString().padStart(4, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}
