import { describe, expect, it } from "vitest";
import { createTypedWordBuffer } from "./typed-word.js";

function type(buf: ReturnType<typeof createTypedWordBuffer>, text: string) {
	return [...text].map((c) => buf.feed(c));
}

describe("createTypedWordBuffer", () => {
	it("returns the word when the buffer ends with it, then clears", () => {
		const buf = createTypedWordBuffer(["retro", "hello"]);
		const out = type(buf, "xxRETRO");
		expect(out.at(-1)).toBe("retro");
		expect(out.slice(0, -1).every((r) => r === null)).toBe(true);
		// Cleared: the trailing "o" alone does not re-match anything.
		expect(buf.feed("o")).toBeNull();
	});

	it("ignores non-printable keys and keeps only the last maxLen chars", () => {
		const buf = createTypedWordBuffer(["abc"], 4);
		expect(buf.feed("Shift")).toBeNull();
		expect(buf.feed(" ")).toBeNull();
		expect(type(buf, "zzzzzab").at(-1)).toBeNull();
		expect(buf.feed("c")).toBe("abc");
	});

	it("reset() drops the partial word", () => {
		const buf = createTypedWordBuffer(["abc"]);
		type(buf, "ab");
		buf.reset();
		expect(buf.feed("c")).toBeNull();
	});
});
