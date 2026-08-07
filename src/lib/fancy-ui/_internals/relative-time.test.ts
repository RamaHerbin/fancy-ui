import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./relative-time.js";

const NOW = new Date("2026-01-01T12:00:00.000Z").getTime();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Expected values come from the same Intl the implementation uses, so the
 * assertions survive whatever ICU data the running Node was built with.
 */
function intl(
	value: number,
	unit: Intl.RelativeTimeFormatUnit,
	{ locale = "en", numeric = "auto" }: { locale?: string; numeric?: "auto" | "always" } = {}
) {
	return new Intl.RelativeTimeFormat(locale, { numeric }).format(value, unit);
}

describe("formatRelativeTime", () => {
	const at = (offset: number, opts: Parameters<typeof formatRelativeTime>[1] = {}) =>
		formatRelativeTime(NOW + offset, { locale: "en", now: NOW, ...opts });

	it("collapses the last 45 seconds to the locale's zero-word", () => {
		expect(at(-10 * SECOND)).toBe(intl(0, "second"));
		expect(at(-10 * SECOND)).toBe("now");
		expect(at(-44 * SECOND)).toBe("now");
	});

	it("keeps exact seconds when numeric is always", () => {
		expect(at(-10 * SECOND, { numeric: "always" })).toBe(
			intl(-10, "second", { numeric: "always" })
		);
		expect(at(-10 * SECOND, { numeric: "always" })).toBe("10 seconds ago");
	});

	it("formats past dates in the largest fitting unit", () => {
		expect(at(-5 * MINUTE)).toBe(intl(-5, "minute"));
		expect(at(-5 * MINUTE)).toMatch(/minute/);
		expect(at(-3 * HOUR)).toBe(intl(-3, "hour"));
		expect(at(-2 * DAY)).toBe(intl(-2, "day"));
		expect(at(-21 * DAY)).toBe(intl(-3, "week"));
		expect(at(-184 * DAY)).toBe(intl(-6, "month"));
		expect(at(-730 * DAY)).toBe(intl(-2, "year"));
	});

	it("crosses from seconds into minutes at 45 seconds", () => {
		expect(at(-45 * SECOND)).toBe(intl(-1, "minute"));
		expect(at(-46 * SECOND)).toMatch(/minute/);
	});

	it("formats future dates as forward-looking phrases", () => {
		expect(at(2 * HOUR)).toBe(intl(2, "hour"));
		expect(at(2 * HOUR)).toBe("in 2 hours");
		expect(at(3 * DAY)).toBe(intl(3, "day"));
		expect(at(10 * SECOND)).toBe("now");
	});

	it("accepts a Date instance as well as epoch milliseconds", () => {
		const date = new Date(NOW - 3 * HOUR);
		expect(formatRelativeTime(date, { locale: "en", now: NOW })).toBe(intl(-3, "hour"));
	});

	it("honours an explicit locale", () => {
		expect(formatRelativeTime(NOW - 5 * MINUTE, { locale: "fr", now: NOW })).toBe(
			intl(-5, "minute", { locale: "fr" })
		);
	});

	it("returns an empty string for an unusable date", () => {
		expect(formatRelativeTime(Number.NaN, { locale: "en", now: NOW })).toBe("");
		expect(formatRelativeTime(new Date("nope"), { locale: "en", now: NOW })).toBe("");
	});
});
