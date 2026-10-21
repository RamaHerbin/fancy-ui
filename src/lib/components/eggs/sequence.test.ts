import { describe, expect, it } from "vitest";
import { createKeySequenceMatcher } from "./sequence.js";

const CODE = [
	"ArrowUp",
	"ArrowUp",
	"ArrowDown",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowLeft",
	"ArrowRight",
	"b",
	"a",
];

function feedAll(m: ReturnType<typeof createKeySequenceMatcher>, keys: string[]) {
	return keys.map((k) => m.feed(k));
}

describe("createKeySequenceMatcher", () => {
	it("fires once, on the last key, case-insensitively", () => {
		const m = createKeySequenceMatcher(CODE);
		const out = feedAll(
			m,
			CODE.map((k) => k.toUpperCase())
		);
		expect(out.filter(Boolean)).toHaveLength(1);
		expect(out.at(-1)).toBe(true);
	});

	it("fires twice when fed twice in a row", () => {
		const m = createKeySequenceMatcher(CODE);
		expect(feedAll(m, [...CODE, ...CODE]).filter(Boolean)).toHaveLength(2);
	});

	it("recovers from an overlapping prefix (three ups)", () => {
		const m = createKeySequenceMatcher(CODE);
		expect(feedAll(m, ["arrowup", ...CODE]).at(-1)).toBe(true);
	});

	it("resets on a wrong key and after reset()", () => {
		const m = createKeySequenceMatcher(["a", "b", "c"]);
		expect(feedAll(m, ["a", "b", "x", "c"]).some(Boolean)).toBe(false);
		m.feed("a");
		m.feed("b");
		m.reset();
		expect(m.feed("c")).toBe(false);
		expect(feedAll(m, ["a", "a", "b", "c"]).at(-1)).toBe(true);
	});

	it("never fires for an empty sequence", () => {
		expect(createKeySequenceMatcher([]).feed("a")).toBe(false);
	});
});
