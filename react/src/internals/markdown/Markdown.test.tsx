import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Markdown } from "./Markdown.js";

/*
 * The rendered half of `../markdown.test.ts`. The Svelte suite keeps these in
 * the parser file because that repo is developed on a case-insensitive
 * filesystem where `Markdown.test.ts` and `markdown.test.ts` are the same file;
 * here they live next to the components they exercise, in the components' own
 * directory.
 */
describe("Markdown", () => {
	afterEach(cleanup);

	it("renders a script tag as visible text, not as an element", () => {
		const source = "<script>alert(1)</script>";
		const { container } = render(<Markdown text={source} />);
		expect(container.querySelector("script")).toBeNull();
		expect(container.textContent).toContain(source);
	});

	it("renders an image tag with an event handler as text, not as an element", () => {
		const { container } = render(<Markdown text={'<img src=x onerror="alert(1)">'} />);
		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toContain("onerror");
	});

	it("renders a javascript: link as plain text with no anchor", () => {
		const { container } = render(<Markdown text="[x](javascript:alert(1))" />);
		expect(container.querySelector("a")).toBeNull();
		expect(container.textContent).toContain("x");
	});

	it("renders a safe link as an anchor with hardened rel and target", () => {
		const { container } = render(<Markdown text="[docs](https://example.com/a)" />);
		const anchor = container.querySelector("a");
		expect(anchor).toHaveAttribute("href", "https://example.com/a");
		expect(anchor).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
		expect(anchor).toHaveAttribute("target", "_blank");
		expect(anchor?.textContent).toBe("docs");
	});

	it("renders a fenced block as pre > code carrying the language", () => {
		const { container } = render(<Markdown text={"```ts\nconst a = 1;\n```"} />);
		const code = container.querySelector("pre > code");
		expect(code).toBeInTheDocument();
		expect(code?.textContent).toBe("const a = 1;");
		expect(container.querySelector("pre")).toHaveAttribute("data-lang", "ts");
	});

	it("renders a table with its header, body and column alignment", () => {
		const { container } = render(<Markdown text={"| a | b |\n| :-- | --: |\n| 1 | 2 |"} />);
		expect(container.querySelector("table")).toBeInTheDocument();
		expect(container.querySelectorAll("th")).toHaveLength(2);
		expect(container.querySelectorAll("tbody td")).toHaveLength(2);
		expect((container.querySelectorAll("th")[1] as HTMLElement).style.textAlign).toBe("right");
	});

	it("renders the block set: heading, list, blockquote and rule", () => {
		const { container } = render(<Markdown text={"## Title\n\n- one\n- two\n\n> quoted\n\n---"} />);
		expect(container.querySelector("h2")?.textContent?.trim()).toBe("Title");
		expect(container.querySelectorAll("ul > li")).toHaveLength(2);
		expect(container.querySelector("blockquote p")?.textContent).toContain("quoted");
		expect(container.querySelector("hr")).toBeInTheDocument();
	});

	it("starts an ordered list at the number the source gives", () => {
		const { container } = render(<Markdown text={"5. five\n6. six"} />);
		expect(container.querySelector("ol")).toHaveAttribute("start", "5");
	});

	it("renders inline emphasis without leaking the markers", () => {
		const { container } = render(<Markdown text="**bold** and *soft* and ~~gone~~ and `code`" />);
		expect(container.querySelector("strong")?.textContent).toBe("bold");
		expect(container.querySelector("em")?.textContent).toBe("soft");
		expect(container.querySelector("del")?.textContent).toBe("gone");
		expect(container.querySelector("code")?.textContent).toBe("code");
		expect(container.textContent).not.toContain("**");
	});

	it("applies custom class names alongside the base class", () => {
		const { container } = render(<Markdown text="hi" className="my-md" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("ft-md");
		expect(root.className).toContain("my-md");
	});

	it("keeps indentation and line breaks inside a fenced block", () => {
		const { container } = render(<Markdown text={"```\n  indented\nplain\n```"} />);
		expect(container.querySelector("pre > code")?.textContent).toBe("  indented\nplain");
	});

	it("renders nothing but an empty root for empty text", () => {
		const { container } = render(<Markdown text="" />);
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
		const { container } = render(<Markdown text={source} />);

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
		const { container } = render(<Markdown text="`snippet` and [docs](https://example.com)" />);
		expect(container.querySelector("code.ft-md-code")).toBeInTheDocument();
		expect(container.querySelector("a.ft-md-link")).toBeInTheDocument();
	});

	/*
	 * A blockquote renders this component inside itself, so the quoted content
	 * carries the same `.ft-md` root class as the document and the block rules in
	 * `markdown.css` reach it unchanged. If this ever stops holding, quoted
	 * content silently loses every default.
	 *
	 * The Svelte original also compared the compiler's `svelte-*` scoping class
	 * on the outer and inner roots; plain CSS has no scoping class, so that half
	 * of the assertion is Svelte mechanics and is dropped. What survives — and is
	 * what the styles actually depend on — is the class the rules are anchored on.
	 */
	it("gives a nested blockquote the same style scope as the root", () => {
		const { container } = render(<Markdown text={"> ## quoted\n> body"} />);

		const root = container.querySelector(".ft-md") as HTMLElement;
		const nested = container.querySelector(".ft-md-quote > .ft-md") as HTMLElement;
		expect(root).toBeInTheDocument();
		expect(nested).toBeInTheDocument();
		expect(nested.querySelector(".ft-md-h")).toBeInTheDocument();
	});
});

describe("Markdown trailingCursor", () => {
	afterEach(cleanup);

	// Every block this renders is block-level, so a caret appended after the
	// component sits on its own line. It has to go inside the last inline run.
	const cursor = <span className="test-cursor" />;

	const cursorParent = (container: HTMLElement) =>
		container.querySelector(".test-cursor")?.parentElement;

	it("lands inside the last paragraph, after its text", () => {
		const { container } = render(
			<Markdown text={"First para\n\nA **bold** claim"} trailingCursor={cursor} />
		);
		const host = cursorParent(container);
		expect(host?.classList.contains("ft-md-p")).toBe(true);
		expect(host?.textContent).toContain("bold");
		expect(host?.lastElementChild?.classList.contains("test-cursor")).toBe(true);
	});

	it("lands inside a trailing heading", () => {
		const { container } = render(<Markdown text={"body\n\n## Next up"} trailingCursor={cursor} />);
		expect(cursorParent(container)?.classList.contains("ft-md-h")).toBe(true);
	});

	it("lands inside the last item of a trailing list", () => {
		const { container } = render(<Markdown text={"- one\n- two"} trailingCursor={cursor} />);
		const host = cursorParent(container);
		expect(host?.tagName).toBe("LI");
		expect(host?.textContent).toContain("two");
	});

	it("follows a trailing blockquote down into its own last block", () => {
		const { container } = render(<Markdown text="> quoted body" trailingCursor={cursor} />);
		const host = cursorParent(container);
		expect(host?.classList.contains("ft-md-p")).toBe(true);
		expect(container.querySelector(".ft-md-quote")?.contains(host ?? null)).toBe(true);
	});

	it("appears once, only at the end", () => {
		const { container } = render(<Markdown text={"one\n\ntwo\n\nthree"} trailingCursor={cursor} />);
		expect(container.querySelectorAll(".test-cursor")).toHaveLength(1);
		expect(cursorParent(container)?.textContent).toContain("three");
	});

	it("is dropped when the document ends with no inline tail to hold it", () => {
		for (const source of ["```\ncode\n```", "---", ""]) {
			const { container } = render(<Markdown text={source} trailingCursor={cursor} />);
			expect(container.querySelector(".test-cursor"), source).toBeNull();
			cleanup();
		}
	});

	it("renders nothing extra when no cursor is passed", () => {
		const { container } = render(<Markdown text="plain" />);
		expect(container.querySelector(".test-cursor")).toBeNull();
	});
});
