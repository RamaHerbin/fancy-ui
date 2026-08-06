import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Markdown from "./Markdown.svelte";
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

/*
 * Rendered tests. These live here rather than in a `Markdown.test.ts` because
 * the repo is developed on a case-insensitive filesystem, where that name is
 * the same file as this one.
 */
describe("Markdown", () => {
	afterEach(cleanup);

	it("renders a script tag as visible text, not as an element", () => {
		const source = "<script>alert(1)</script>";
		const { container } = render(Markdown, { props: { text: source } });
		expect(container.querySelector("script")).toBeNull();
		expect(container.textContent).toContain(source);
	});

	it("renders an image tag with an event handler as text, not as an element", () => {
		const { container } = render(Markdown, {
			props: { text: '<img src=x onerror="alert(1)">' },
		});
		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toContain("onerror");
	});

	it("renders a javascript: link as plain text with no anchor", () => {
		const { container } = render(Markdown, { props: { text: "[x](javascript:alert(1))" } });
		expect(container.querySelector("a")).toBeNull();
		expect(container.textContent).toContain("x");
	});

	it("renders a safe link as an anchor with hardened rel and target", () => {
		const { container } = render(Markdown, {
			props: { text: "[docs](https://example.com/a)" },
		});
		const anchor = container.querySelector("a");
		expect(anchor).toHaveAttribute("href", "https://example.com/a");
		expect(anchor).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
		expect(anchor).toHaveAttribute("target", "_blank");
		expect(anchor?.textContent).toBe("docs");
	});

	it("renders a fenced block as pre > code carrying the language", () => {
		const { container } = render(Markdown, {
			props: { text: "```ts\nconst a = 1;\n```" },
		});
		const code = container.querySelector("pre > code");
		expect(code).toBeInTheDocument();
		expect(code?.textContent).toBe("const a = 1;");
		expect(container.querySelector("pre")).toHaveAttribute("data-lang", "ts");
	});

	it("renders a table with its header, body and column alignment", () => {
		const { container } = render(Markdown, {
			props: { text: "| a | b |\n| :-- | --: |\n| 1 | 2 |" },
		});
		expect(container.querySelector("table")).toBeInTheDocument();
		expect(container.querySelectorAll("th")).toHaveLength(2);
		expect(container.querySelectorAll("tbody td")).toHaveLength(2);
		expect(container.querySelectorAll("th")[1].style.textAlign).toBe("right");
	});

	it("renders the block set: heading, list, blockquote and rule", () => {
		const { container } = render(Markdown, {
			props: { text: "## Title\n\n- one\n- two\n\n> quoted\n\n---" },
		});
		expect(container.querySelector("h2")?.textContent?.trim()).toBe("Title");
		expect(container.querySelectorAll("ul > li")).toHaveLength(2);
		expect(container.querySelector("blockquote p")?.textContent).toContain("quoted");
		expect(container.querySelector("hr")).toBeInTheDocument();
	});

	it("starts an ordered list at the number the source gives", () => {
		const { container } = render(Markdown, { props: { text: "5. five\n6. six" } });
		expect(container.querySelector("ol")).toHaveAttribute("start", "5");
	});

	it("renders inline emphasis without leaking the markers", () => {
		const { container } = render(Markdown, {
			props: { text: "**bold** and *soft* and ~~gone~~ and `code`" },
		});
		expect(container.querySelector("strong")?.textContent).toBe("bold");
		expect(container.querySelector("em")?.textContent).toBe("soft");
		expect(container.querySelector("del")?.textContent).toBe("gone");
		expect(container.querySelector("code")?.textContent).toBe("code");
		expect(container.textContent).not.toContain("**");
	});

	it("applies custom class names alongside the base class", () => {
		const { container } = render(Markdown, { props: { text: "hi", class: "my-md" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("ft-md");
		expect(root.className).toContain("my-md");
	});

	it("keeps indentation and line breaks inside a fenced block", () => {
		const { container } = render(Markdown, {
			props: { text: "```\n  indented\nplain\n```" },
		});
		expect(container.querySelector("pre > code")?.textContent).toBe("  indented\nplain");
	});

	it("renders nothing but an empty root for empty text", () => {
		const { container } = render(Markdown, { props: { text: "" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root).toBeInTheDocument();
		expect(root.textContent?.trim()).toBe("");
	});

	/*
	 * The default styles key off these class names, so the hooks are part of the
	 * contract: dropping one leaves the matching block unstyled downstream.
	 */
	it("labels every block with the class its default styles hang off", () => {
		const source = [
			"# Title",
			"",
			"body",
			"",
			"- one",
			"",
			"1. first",
			"",
			"> quoted",
			"",
			"```\ncode\n```",
			"",
			"| a |\n| --- |\n| 1 |",
			"",
			"---",
		].join("\n");
		const { container } = render(Markdown, { props: { text: source } });

		for (const selector of [
			".ft-md",
			".ft-md-h",
			".ft-md-p",
			".ft-md-ul",
			".ft-md-ol",
			".ft-md-quote",
			".ft-md-pre",
			".ft-md-table-scroll",
			".ft-md-table",
			".ft-md-hr",
		]) {
			expect(container.querySelector(selector), selector).toBeInTheDocument();
		}
		expect(container.querySelector(".ft-md-h")).toHaveAttribute("data-depth", "1");
	});

	it("labels inline code and links with their own style hooks", () => {
		const { container } = render(Markdown, {
			props: { text: "`snippet` and [docs](https://example.com)" },
		});
		expect(container.querySelector("code.ft-md-code")).toBeInTheDocument();
		expect(container.querySelector("a.ft-md-link")).toBeInTheDocument();
	});

	/*
	 * A blockquote renders this component inside itself. A recursive instance is
	 * still the same component class, so it carries the same scoping class and
	 * the block styles reach it — which is why they need no :global escape. If
	 * this ever stops holding, quoted content silently loses every default.
	 */
	it("gives a nested blockquote the same style scope as the root", () => {
		const scopeOf = (el: Element) => [...el.classList].find((name) => name.startsWith("svelte-"));
		const { container } = render(Markdown, { props: { text: "> ## quoted\n> body" } });

		const root = container.querySelector(".ft-md") as HTMLElement;
		const nested = container.querySelector(".ft-md-quote > .ft-md") as HTMLElement;
		expect(nested).toBeInTheDocument();
		expect(scopeOf(root)).toBeDefined();
		expect(scopeOf(nested)).toBe(scopeOf(root));
		expect(scopeOf(nested.querySelector(".ft-md-h") as HTMLElement)).toBe(scopeOf(root));
	});
});
