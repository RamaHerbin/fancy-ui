import { describe, it, expect } from "vitest";
import {
	filterByBounds,
	formatSlotLabel,
	fromMinutes,
	generateSlots,
	nearestIndex,
	toMinutes,
} from "./time-utils";

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
