import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import MarkdownInline from "./MarkdownInline.vue";
import { parseInline } from "./markdown.js";
import type { InlineToken } from "./markdown.js";

/*
 * `MarkdownInline` is the renderer half of the inline token tree: it walks
 * tokens and emits elements, never an HTML string. The security consequences
 * of that are pinned in `Markdown.security.test.ts`; this file is the smoke
 * suite for the mapping itself — one case per token type, plus the two
 * properties the component is easy to break silently on: it renders as a bare
 * fragment (no wrapper element to hang whitespace or classes off) and it
 * recurses into itself for every container token.
 */
const text = (value: string): InlineToken => ({ type: "text", text: value });

const mount = (tokens: InlineToken[]) => render(MarkdownInline, { props: { tokens } });

describe("MarkdownInline", () => {
	afterEach(cleanup);

	it("renders a text token as bare characters, with no wrapper element", () => {
		const { container } = mount([text("just words")]);
		expect(container.textContent).toBe("just words");
		expect(container.querySelector("*")).toBeNull();
	});

	it("maps strong, em and del onto their elements", () => {
		const { container } = mount([
			{ type: "strong", children: [text("bold")] },
			{ type: "em", children: [text("soft")] },
			{ type: "del", children: [text("gone")] },
		]);
		expect(container.querySelector("strong")?.textContent).toBe("bold");
		expect(container.querySelector("em")?.textContent).toBe("soft");
		expect(container.querySelector("del")?.textContent).toBe("gone");
	});

	it("renders a code token verbatim, with its style hook", () => {
		const { container } = mount([{ type: "code", text: "a **b** c" }]);
		const code = container.querySelector("code.ft-md-code");
		expect(code?.textContent).toBe("a **b** c");
		expect(container.querySelector("strong")).toBeNull();
	});

	it("renders a link with the hardened rel/target pair", () => {
		const { container } = mount([
			{ type: "link", href: "https://example.com/a", children: [text("docs")] },
		]);
		const anchor = container.querySelector("a.ft-md-link") as HTMLAnchorElement;
		expect(anchor.getAttribute("href")).toBe("https://example.com/a");
		expect(anchor.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");
		expect(anchor.getAttribute("target")).toBe("_blank");
		expect(anchor.textContent).toBe("docs");
	});

	/*
	 * A null destination is what `sanitizeHref` returns for a scheme it refuses.
	 * The label still has to reach the reader — dropping the token would make a
	 * hostile link delete text — but it must not be clickable.
	 */
	it("renders a refused destination as its label alone, never as an anchor", () => {
		const { container } = mount([{ type: "link", href: null, children: [text("click me")] }]);
		expect(container.querySelector("a")).toBeNull();
		expect(container.textContent).toBe("click me");
	});

	it("recurses into nested containers without losing a level", () => {
		const { container } = mount([
			{
				type: "strong",
				children: [text("very "), { type: "em", children: [text("nested")] }],
			},
		]);
		const strong = container.querySelector("strong") as HTMLElement;
		expect(strong.querySelector("em")?.textContent).toBe("nested");
		expect(strong.textContent).toBe("very nested");
	});

	/*
	 * The template is packed tight on purpose: a newline between two branches
	 * would render as a space in the output. A regression here is invisible in
	 * a screenshot and obvious in a diff of the text content.
	 */
	it("adds no whitespace between adjacent tokens", () => {
		const { container } = mount(parseInline("**a**`b`*c*"));
		expect(container.textContent).toBe("abc");
	});

	it("renders an empty token list as nothing at all", () => {
		const { container } = mount([]);
		expect(container.textContent).toBe("");
		expect(container.querySelector("*")).toBeNull();
	});

	/*
	 * A fragment root ships `<!--[-->` / `<!--]-->` anchors in the server markup:
	 * that is how the client finds the fragment's bounds at hydration, so they
	 * are part of correct output, not noise to design away. Stripping them is
	 * what lets the assertion be about the elements.
	 */
	it("emits the same elements on the server, with no wrapper element", async () => {
		const html = await renderToString(
			createSSRApp({
				render: () => h(MarkdownInline, { tokens: parseInline("go **now** [x](https://e.com)") }),
			})
		);
		const elements = html.replace(/<!--.*?-->/g, "");

		expect(elements).toContain("<strong>now</strong>");
		expect(elements).toContain('target="_blank"');
		expect(elements.startsWith("go ")).toBe(true);
		expect(elements).not.toContain("<div");
		expect(elements).not.toContain("<span");
	});
});
