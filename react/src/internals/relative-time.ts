/**
 * Locale-aware relative timestamps ("5 minutes ago", "in 2 hours") built on
 * `Intl.RelativeTimeFormat`. Pure and dependency-free: pass `now` to make the
 * output deterministic in tests.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.436875 * DAY; // Average Gregorian month.
const YEAR = 365.2425 * DAY;

/** Largest absolute delta each unit covers, in ascending order. */
const BUCKETS: ReadonlyArray<[limit: number, step: number, unit: Intl.RelativeTimeFormatUnit]> = [
	[45 * SECOND, SECOND, "second"],
	[45 * MINUTE, MINUTE, "minute"],
	[22 * HOUR, HOUR, "hour"],
	[7 * DAY, DAY, "day"],
	[4 * WEEK, WEEK, "week"],
	[11 * MONTH, MONTH, "month"],
	[Infinity, YEAR, "year"],
];

const formatters = new Map<string, Intl.RelativeTimeFormat>();

function formatter(locale: string | undefined, numeric: "auto" | "always") {
	const key = `${locale ?? ""}|${numeric}`;
	let rtf = formatters.get(key);
	if (!rtf) {
		rtf = new Intl.RelativeTimeFormat(locale, { numeric });
		formatters.set(key, rtf);
	}
	return rtf;
}

export interface RelativeTimeOptions {
	/** BCP 47 tag. Defaults to the runtime locale. */
	locale?: string;
	/**
	 * Epoch ms to measure against. Defaults to `Date.now()`. A non-finite
	 * value (the `useNow` "clock not started" sentinel) yields `""`.
	 */
	now?: number;
	/** Defaults to `"auto"`, which yields idiomatic words ("now", "yesterday"). */
	numeric?: "auto" | "always";
}

/**
 * Format `date` relative to `now`. Past dates read "5 minutes ago", future
 * dates "in 2 hours".
 *
 * Under `numeric: "auto"` anything inside the last (or next) 45 seconds is
 * reported as the locale's zero-word — "now" in English — rather than an exact
 * second count. Pass `numeric: "always"` to get "10 seconds ago" instead.
 */
export function formatRelativeTime(date: number | Date, opts: RelativeTimeOptions = {}): string {
	const target = date instanceof Date ? date.getTime() : date;
	if (!Number.isFinite(target)) return "";

	/*
	 * A non-finite `now` is the shared clock's "not started yet" sentinel
	 * (`useNow` returns `NaN` on the server and through the hydration
	 * render). Reporting nothing is the only honest answer: measuring against
	 * it would print a label off by decades, and `Intl.RelativeTimeFormat`
	 * throws on a non-finite value.
	 */
	const now = opts.now ?? Date.now();
	if (!Number.isFinite(now)) return "";

	const numeric = opts.numeric ?? "auto";
	const rtf = formatter(opts.locale, numeric);
	const diff = target - now;
	const abs = Math.abs(diff);

	for (const [limit, step, unit] of BUCKETS) {
		if (abs >= limit) continue;
		const value = unit === "second" && numeric === "auto" ? 0 : Math.round(diff / step);
		return rtf.format(value, unit);
	}
	return "";
}
