// Dates the screens show. Fixed to UTC and to English so the prerendered
// pages, the tests and the browser agree; "now" is the demo's pretend clock.
import { MOCK_NOW } from "$lib/data/mock.js";

const dateFormat = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

export function formatDate(iso: string): string {
	return dateFormat.format(new Date(iso));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function plural(count: number, unit: string): string {
	return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

/** "5 minutes ago" up to two weeks, a date after that. */
export function formatRelative(iso: string): string {
	const elapsed = MOCK_NOW - Date.parse(iso);
	if (elapsed < MINUTE) return "Just now";
	if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), "minute");
	if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), "hour");
	if (elapsed < 14 * DAY) return plural(Math.floor(elapsed / DAY), "day");
	return formatDate(iso);
}
