import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import Markdown from "./Markdown.vue";

/*
 * The rendered-DOM half of `markdown-security.test.ts`, which is a merge gate.
 * The parser half stays in that file, framework-free; these blocks need the
 * components mounted, so they live here.
 *
 * What they prove is that the token tree is turned into elements and never into
 * an HTML string: no `v-html` anywhere in the renderer, which is the only reason
 * `sanitizeHref` is load-bearing rather than decorative.
 */
describe("rendered DOM cannot be broken out of", () => {
	afterEach(cleanup);

	it("a quote/angle-bracket payload in a destination stays inside the href attribute", () => {
		const { container } = render(Markdown, {
			props: { text: '[x](http://a"onmouseover="alert(1))' },
		});
		const a = container.querySelector("a");
		expect(a?.getAttributeNames()).toEqual(
			expect.not.arrayContaining(["onmouseover", "onerror", "onload"])
		);
		expect(container.querySelector("[onmouseover]")).toBeNull();
	});

	it("a link inside a link label never nests an anchor", () => {
		// Nested <a> is invalid HTML: the parser reparents it, so server markup and
		// the client's hydration tree would describe different DOM.
		const { container } = render(Markdown, {
			props: { text: "[outer [inner](https://b.example) tail](https://a.example)" },
		});
		const anchors = [...container.querySelectorAll("a")];
		expect(anchors).toHaveLength(1);
		expect(anchors[0]!.getAttribute("href")).toBe("https://a.example");
		expect(anchors[0]!.querySelector("a")).toBeNull();
		expect(anchors[0]!.textContent).toContain("[inner](https://b.example)");
	});

	it("every anchor carries rel and target", () => {
		const { container } = render(Markdown, {
			props: { text: "[a](https://x.com) and [b](/rel) and [c](#f)" },
		});
		const anchors = [...container.querySelectorAll("a")];
		expect(anchors).toHaveLength(3);
		for (const a of anchors) {
			expect(a.getAttribute("rel")).toContain("noopener");
			expect(a.getAttribute("rel")).toContain("noreferrer");
			expect(a.getAttribute("target")).toBe("_blank");
		}
	});

	it("no event-handler attribute survives onto any rendered element", () => {
		const { container } = render(Markdown, {
			props: {
				text: [
					'[x](http://a"onclick="alert(1))',
					'<div onclick="alert(1)">hi</div>',
					"`<span onmouseenter=alert(1)>`",
					"| a onload=alert(1) |\n| --- |\n| 1 |",
				].join("\n\n"),
			},
		});
		for (const el of container.querySelectorAll("*")) {
			const handlers = el.getAttributeNames().filter((name) => name.startsWith("on"));
			expect(handlers, `${el.tagName} carries ${handlers.join()}`).toEqual([]);
		}
	});

	it("raw HTML of every shape stays inert", () => {
		const payloads = [
			"<script>alert(1)</script>",
			'<img src=x onerror="alert(1)">',
			'<svg onload="alert(1)"></svg>',
			'<iframe src="javascript:alert(1)"></iframe>',
			"<style>*{x:y}</style>",
			'<a href="javascript:alert(1)">click</a>',
			"<!--[if IE]><script>alert(1)</script><![endif]-->",
			"<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
		];
		for (const payload of payloads) {
			const { container } = render(Markdown, { props: { text: payload } });
			for (const tag of ["script", "img", "svg", "iframe", "style", "math", "table"]) {
				expect(container.querySelector(tag), `${payload} -> ${tag}`).toBeNull();
			}
			expect(container.querySelector("a")).toBeNull();
			cleanup();
		}
	});

	it("table alignment cannot inject a style value", () => {
		const { container } = render(Markdown, {
			props: { text: "| a |\n| ---:red;background:url(x) |\n| 1 |" },
		});
		// Not a valid align row, so this must not be a table at all.
		expect(container.querySelector("table")).toBeNull();
		expect(container.querySelector("th")).toBeNull();
	});

	it("only left/center/right ever reach the style attribute", () => {
		const { container } = render(Markdown, {
			props: { text: "| a | b | c |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |" },
		});
		const styles = [...container.querySelectorAll("th,td")].map((c) =>
			(c as HTMLElement).getAttribute("style")
		);
		for (const s of styles) {
			expect(s === null || /^text-align:\s*(left|center|right);?$/.test(s), String(s)).toBe(true);
		}
	});
});

describe("recursion is bounded", () => {
	afterEach(cleanup);

	it("renders 5000 nested blockquotes without blowing the component stack", () => {
		expect(() => render(Markdown, { props: { text: ">".repeat(5_000) + " boom" } })).not.toThrow();
	});
});
