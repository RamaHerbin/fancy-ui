import { describe, it, expect } from "vitest";
import { parseMarkdown, parseInline, sanitizeHref } from "./markdown.js";

const text = (value: string) => ({ type: "text", text: value });

describe("parseInline", () => {
	it("returns a single text token for plain prose", () => {
		expect(parseInline("just words")).toEqual([text("just words")]);
	});

	it("parses strong, em and del", () => {
		expect(parseInline("**bold**")).toEqual([{ type: "strong", children: [text("bold")] }]);
		expect(parseInline("*soft*")).toEqual([{ type: "em", children: [text("soft")] }]);
		expect(parseInline("~~gone~~")).toEqual([{ type: "del", children: [text("gone")] }]);
	});

	it("parses a code span and leaves its content untouched", () => {
		expect(parseInline("run `a **b** c` now")).toEqual([
			text("run "),
			{ type: "code", text: "a **b** c" },
			text(" now"),
		]);
	});

	it("parses a link into a token with the destination", () => {
		expect(parseInline("see [the docs](https://example.com/a)")).toEqual([
			text("see "),
			{
				type: "link",
				href: "https://example.com/a",
				children: [text("the docs")],
			},
		]);
	});

	it("drops a link title and keeps only the destination", () => {
		expect(parseInline('[x](https://example.com "Title")')).toEqual([
			{ type: "link", href: "https://example.com", children: [text("x")] },
		]);
	});

	it("nests emphasis inside strong and inside a link label", () => {
		expect(parseInline("**a *b* c**")).toEqual([
			{
				type: "strong",
				children: [text("a "), { type: "em", children: [text("b")] }, text(" c")],
			},
		]);
		expect(parseInline("[a `b`](/x)")).toEqual([
			{
				type: "link",
				href: "/x",
				children: [text("a "), { type: "code", text: "b" }],
			},
		]);
	});

	it("renders an image as its alt text with no link token", () => {
		expect(parseInline("![a cat](https://example.com/cat.png)")).toEqual([text("a cat")]);
	});

	it("keeps HTML tags as literal text", () => {
		expect(parseInline("<b>hi</b>")).toEqual([text("<b>hi</b>")]);
	});

	it("honours backslash escapes", () => {
		expect(parseInline("\\*not em\\*")).toEqual([text("*not em*")]);
	});
});

describe("parseMarkdown", () => {
	it("returns an empty list for an empty document", () => {
		expect(parseMarkdown("")).toEqual([]);
		expect(parseMarkdown("\n\n  \n")).toEqual([]);
	});

	it("splits paragraphs on blank lines and joins soft-wrapped lines", () => {
		expect(parseMarkdown("one\ntwo\n\nthree")).toEqual([
			{ type: "paragraph", children: [text("one\ntwo")] },
			{ type: "paragraph", children: [text("three")] },
		]);
	});

	it("parses ATX headings at every depth", () => {
		expect(parseMarkdown("# a\n\n###### f")).toEqual([
			{ type: "heading", depth: 1, children: [text("a")] },
			{ type: "heading", depth: 6, children: [text("f")] },
		]);
	});

	it("does not treat a hash without a space as a heading", () => {
		expect(parseMarkdown("#tag")).toEqual([{ type: "paragraph", children: [text("#tag")] }]);
	});

	it("parses a fenced code block with its language tag", () => {
		expect(parseMarkdown("```ts\nconst a = 1;\n```")).toEqual([
			{ type: "code", lang: "ts", text: "const a = 1;" },
		]);
	});

	it("keeps markdown inside a fence as raw text", () => {
		expect(parseMarkdown("```\n# not a heading\n```")).toEqual([
			{ type: "code", lang: "", text: "# not a heading" },
		]);
	});

	it("parses an unordered list into flat items", () => {
		expect(parseMarkdown("- one\n- **two**")).toEqual([
			{
				type: "list",
				ordered: false,
				start: 1,
				items: [[text("one")], [{ type: "strong", children: [text("two")] }]],
			},
		]);
	});

	it("parses an ordered list and respects its start number", () => {
		expect(parseMarkdown("3. c\n4. d")).toEqual([
			{
				type: "list",
				ordered: true,
				start: 3,
				items: [[text("c")], [text("d")]],
			},
		]);
	});

	it("parses a blockquote and the blocks inside it", () => {
		expect(parseMarkdown("> ## title\n> body")).toEqual([
			{
				type: "blockquote",
				children: [
					{ type: "heading", depth: 2, children: [text("title")] },
					{ type: "paragraph", children: [text("body")] },
				],
			},
		]);
	});

	it("nests blockquotes", () => {
		expect(parseMarkdown("> > deep")).toEqual([
			{
				type: "blockquote",
				children: [
					{ type: "blockquote", children: [{ type: "paragraph", children: [text("deep")] }] },
				],
			},
		]);
	});

	it("parses a thematic break", () => {
		expect(parseMarkdown("a\n\n---\n\nb")).toEqual([
			{ type: "paragraph", children: [text("a")] },
			{ type: "hr" },
			{ type: "paragraph", children: [text("b")] },
		]);
	});

	it("parses a table with per-column alignment", () => {
		expect(parseMarkdown("| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |")).toEqual([
			{
				type: "table",
				align: ["left", "center", "right"],
				header: [[text("a")], [text("b")], [text("c")]],
				rows: [[[text("1")], [text("2")], [text("3")]]],
			},
		]);
	});

	it("leaves alignment null when the delimiter row has no colons", () => {
		const [table] = parseMarkdown("a | b\n--- | ---\n1 | 2");
		expect(table).toMatchObject({ type: "table", align: [null, null] });
	});

	it("pads short table rows to the column count", () => {
		const [table] = parseMarkdown("| a | b |\n| --- | --- |\n| 1 |");
		expect(table).toMatchObject({ type: "table", rows: [[[text("1")], []]] });
	});

	it("flattens a shallowly indented nested item into a sibling", () => {
		const [list] = parseMarkdown("- a\n  - b");
		expect(list).toMatchObject({ type: "list", items: [[text("a")], [text("b")]] });
	});

	it("folds a deeply indented nested item into its parent item's text", () => {
		const [list] = parseMarkdown("- a\n    - b");
		expect(list).toMatchObject({ type: "list", items: [[text("a\n- b")]] });
	});
});

describe("sanitizeHref", () => {
	it("rejects a javascript: destination", () => {
		expect(sanitizeHref("javascript:alert(1)")).toBeNull();
	});

	it("rejects a javascript: destination whatever its casing", () => {
		expect(sanitizeHref("JaVaScRiPt:x")).toBeNull();
	});

	it("rejects a javascript: destination hidden behind leading whitespace", () => {
		expect(sanitizeHref(" javascript:x")).toBeNull();
		expect(sanitizeHref("\t\njavascript:x")).toBeNull();
	});

	it("rejects a scheme split by a control character", () => {
		expect(sanitizeHref("java\nscript:x")).toBeNull();
		expect(sanitizeHref("java\tscript:x")).toBeNull();
	});

	it("rejects data: and vbscript: destinations", () => {
		expect(sanitizeHref("data:text/html,x")).toBeNull();
		expect(sanitizeHref("vbscript:msgbox")).toBeNull();
	});

	it("does not decode entities before checking the scheme", () => {
		// Left encoded, the browser decodes it after the check — so it must not
		// be treated as a bare relative URL.
		expect(sanitizeHref("&#106;avascript:alert(1)")).toBe("&#106;avascript:alert(1)");
	});

	it("passes http, https and mailto through", () => {
		expect(sanitizeHref("https://ok.com")).toBe("https://ok.com");
		expect(sanitizeHref("http://ok.com")).toBe("http://ok.com");
		expect(sanitizeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
	});

	it("passes relative and anchor destinations through", () => {
		expect(sanitizeHref("/relative")).toBe("/relative");
		expect(sanitizeHref("#anchor")).toBe("#anchor");
		expect(sanitizeHref("docs/page.html")).toBe("docs/page.html");
		// A space cannot be part of a scheme, so this is just a relative path.
		expect(sanitizeHref("java script:x")).toBe("java script:x");
	});

	it("returns null for an empty destination", () => {
		expect(sanitizeHref("")).toBeNull();
		expect(sanitizeHref("   ")).toBeNull();
	});

	it("marks an unsafe link token with a null href", () => {
		expect(parseInline("[x](javascript:alert(1))")).toEqual([
			{ type: "link", href: null, children: [text("x")] },
		]);
	});
});

describe("totality", () => {
	it("leaves an unterminated fence open as a code block", () => {
		expect(parseMarkdown("```js\nconst a =")).toEqual([
			{ type: "code", lang: "js", text: "const a =" },
		]);
	});

	it("renders unterminated emphasis literally", () => {
		expect(parseInline("**half written")).toEqual([text("**half written")]);
		expect(parseInline("a ~~b")).toEqual([text("a ~~b")]);
	});

	it("renders an unterminated code span literally", () => {
		expect(parseInline("`open")).toEqual([text("`open")]);
	});

	it("renders an unterminated link literally", () => {
		expect(parseInline("[label](https://exa")).toEqual([text("[label](https://exa")]);
	});

	it("never throws on hostile or malformed input", () => {
		const nasty = [
			"[".repeat(400),
			"*".repeat(200),
			"`".repeat(120),
			"> ".repeat(120) + "x",
			"|---|\n".repeat(40),
			"#".repeat(50) + " x",
			"- ".repeat(80),
			"![a](".repeat(60),
			"\u0000�\\",
			"**a*b**c*d~~e`f",
			"| a | b |\n| --- |\n| 1 |",
			"```".repeat(30),
			"\r\n\r\n\t\t",
		];
		for (const src of nasty) {
			expect(() => parseMarkdown(src)).not.toThrow();
			expect(Array.isArray(parseMarkdown(src))).toBe(true);
			expect(() => parseInline(src)).not.toThrow();
		}
	});

	it("keeps every character of a plain-text document", () => {
		const src = "hello <script> & \"quotes\" 'and' ünïcodé";
		expect(parseMarkdown(src)).toEqual([{ type: "paragraph", children: [text(src)] }]);
	});
});
