import { describe, expect, it } from "vitest";
import { MOCK_NOW } from "$lib/data/mock.js";
import { formatDate, formatRelative } from "./format.js";

const minus = (ms: number) => new Date(MOCK_NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelative (measured from the demo's pretend clock)", () => {
	it.each([
		[30_000, "Just now"],
		[5 * MIN, "5 minutes ago"],
		[MIN, "1 minute ago"],
		[2 * HOUR, "2 hours ago"],
		[3 * DAY, "3 days ago"],
	])("%i ms ago reads %s", (ms, expected) => {
		expect(formatRelative(minus(ms))).toBe(expected);
	});

	it("falls back to a date after two weeks", () => {
		expect(formatRelative(minus(30 * DAY))).toBe("Sep 21, 2026");
	});
});

describe("formatDate", () => {
	it("is stable across time zones", () => {
		expect(formatDate("2026-10-03T23:30:00.000Z")).toBe("Oct 3, 2026");
	});
});
