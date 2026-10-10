import { describe, it, expect } from "vitest";
import { hostOf, monogram } from "./host.js";

describe("hostOf", () => {
	it("returns the host of an absolute URL, without its path or query", () => {
		expect(hostOf("https://docs.example.dev/a/b?q=1#frag")).toBe("docs.example.dev");
	});

	it("drops the www prefix, whatever its case", () => {
		expect(hostOf("https://www.example.org/a")).toBe("example.org");
		expect(hostOf("https://WWW.example.org/a")).toBe("example.org");
		// Only the leading label: a host that merely contains "www" keeps it.
		expect(hostOf("https://wwwex.example.org")).toBe("wwwex.example.org");
	});

	it("parses the scheme-less and protocol-relative forms new URL rejects", () => {
		expect(hostOf("docs.example.dev/guide")).toBe("docs.example.dev");
		expect(hostOf("//docs.example.dev/guide")).toBe("docs.example.dev");
		expect(hostOf("www.example.org/guide")).toBe("example.org");
	});

	it("keeps credentials out of the host, on either parsing path", () => {
		expect(hostOf("https://user:pass@example.dev/guide")).toBe("example.dev");
		expect(hostOf("//user@example.dev/guide")).toBe("example.dev");
	});

	it("has nothing to show for a relative link, rather than echoing its path", () => {
		expect(hostOf("/local/notes")).toBe("");
		expect(hostOf("local-notes")).toBe("");
	});

	it("has nothing to show for a missing url", () => {
		expect(hostOf("")).toBe("");
		expect(hostOf(undefined)).toBe("");
	});

	it("keeps a port out of the way and an IDN host intact", () => {
		expect(hostOf("http://localhost:5173/x")).toBe("localhost");
		expect(hostOf("https://exämple.dev/x")).toBe("xn--exmple-cua.dev");
	});
});

describe("monogram", () => {
	it("upper-cases the first character", () => {
		expect(monogram("zebra")).toBe("Z");
		expect(monogram("docs.example.dev")).toBe("D");
	});

	it("skips leading punctuation and whitespace to the first letter or digit", () => {
		expect(monogram('"Attention Is All You Need"')).toBe("A");
		expect(monogram("  · ranking passages")).toBe("R");
		expect(monogram("— 2026 in review")).toBe("2");
	});

	it("keeps a whole character when the initial is outside the BMP", () => {
		expect(monogram("𝒜pex")).toBe("𝒜");
	});

	it("falls back to a question mark when there is nothing to draw", () => {
		expect(monogram("")).toBe("?");
		expect(monogram("!?…")).toBe("?");
		expect(monogram(undefined)).toBe("?");
	});

	it("keeps a letter that upper-cases into two, since there is room for one", () => {
		expect(monogram("ßeta docs")).toBe("ß");
		expect(monogram("ﬄ ligature")).toBe("ﬄ");
	});
});
