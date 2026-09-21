import { afterEach, describe, it, expect } from "vitest";
import { findTriggerToken, measureCaretRect, type TriggerToken } from "./caret.js";

/** `|` marks the caret in the case names — it is not part of the value. */
const CASES: Array<[name: string, value: string, caret: number, expected: TriggerToken | null]> = [
	["opens the draft: /de|", "/de", 3, { start: 0, query: "de" }],
	["follows a space: run /de|", "run /de", 7, { start: 4, query: "de" }],
	["follows a newline: one\\n/de|", "one\n/de", 7, { start: 4, query: "de" }],
	["is still empty: /|", "/", 1, { start: 0, query: "" }],
	["stops at the caret, not at the word end: /de|ploy", "/deploy", 3, { start: 0, query: "de" }],
	["sits mid-word: src/li|", "src/li", 6, null],
	["sits inside a word: a/b|", "a/b", 3, null],
	["has the caret before it: |/de", "/de", 0, null],
	["has the caret on its trigger: run |/de", "run /de", 4, null],
	["is a plain word: hello|", "hello", 5, null],
	["is closed by a space: /de |", "/de ", 4, null],
	["is another trigger's: /help @jo|", "/help @jo", 9, null],
	["is empty: |", "", 0, null],
	["is whitespace: ␣␣|", "  ", 2, null],
];

describe("findTriggerToken", () => {
	it.each(CASES)("returns %s", (_name, value, caret, expected) => {
		expect(findTriggerToken(value, caret, "/")).toEqual(expected);
	});

	it("reads a mention trigger by the same rules", () => {
		expect(findTriggerToken("ping @jo", 8, "@")).toEqual({ start: 5, query: "jo" });
		expect(findTriggerToken("ping @jo", 8, "/")).toBeNull();
		expect(findTriggerToken("mail@example", 12, "@")).toBeNull();
	});

	it("takes a multi-character trigger whole", () => {
		expect(findTriggerToken("::sm", 4, "::")).toEqual({ start: 0, query: "sm" });
		// Only half of it typed so far: not a token yet.
		expect(findTriggerToken(":", 1, "::")).toBeNull();
	});

	it("refuses an empty trigger, which every position would match", () => {
		expect(findTriggerToken("/de", 3, "")).toBeNull();
		expect(findTriggerToken("", 0, "")).toBeNull();
	});

	it("clamps a caret that falls outside the value", () => {
		expect(findTriggerToken("/de", 99, "/")).toEqual({ start: 0, query: "de" });
		expect(findTriggerToken("/de", -5, "/")).toBeNull();
	});

	it("ignores everything after the caret, token or not", () => {
		expect(findTriggerToken("/de rest of the sentence", 3, "/")).toEqual({ start: 0, query: "de" });
	});
});

describe("measureCaretRect", () => {
	const mounted: HTMLTextAreaElement[] = [];

	afterEach(() => {
		while (mounted.length > 0) mounted.pop()?.remove();
	});

	function textarea(value: string): HTMLTextAreaElement {
		const el = document.createElement("textarea");
		el.value = value;
		document.body.appendChild(el);
		mounted.push(el);
		return el;
	}

	// jsdom lays nothing out, so the offsets are zero; what is worth pinning down
	// is the shape, the line height fallback, and the fact that nothing throws.
	it("returns a zero-width rect one line tall", () => {
		const rect = measureCaretRect(textarea("hello world"), 6);
		expect(Object.keys(rect).sort()).toEqual(["height", "width", "x", "y"]);
		expect(Number.isFinite(rect.x)).toBe(true);
		expect(Number.isFinite(rect.y)).toBe(true);
		expect(rect.width).toBe(0);
		expect(rect.height).toBeGreaterThan(0);
	});

	it("leaves no mirror behind in the document", () => {
		const el = textarea("hello");
		const before = document.body.childElementCount;
		measureCaretRect(el, 3);
		measureCaretRect(el, 0);
		expect(document.body.childElementCount).toBe(before);
	});

	it("clamps an index outside the value instead of throwing", () => {
		const el = textarea("hi");
		expect(() => measureCaretRect(el, 999)).not.toThrow();
		expect(() => measureCaretRect(el, -20)).not.toThrow();
		expect(Number.isFinite(measureCaretRect(el, 999).y)).toBe(true);
	});

	it("measures an empty textarea, where the caret has no text to sit after", () => {
		const rect = measureCaretRect(textarea(""), 0);
		expect(Number.isFinite(rect.x)).toBe(true);
		expect(rect.height).toBeGreaterThan(0);
	});
});
