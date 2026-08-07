import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import type { SearchResultData } from "../_internals/ai-types.js";
import WebSearch from "./WebSearch.svelte";

const QUERY = "svelte 5 runes reactivity";

const RESULTS: SearchResultData[] = [
	{
		id: "r1",
		title: "Runes, one year in",
		url: "https://www.example.dev/blog/runes",
		snippet: "What changed once fine-grained reactivity replaced the compiler heuristics.",
	},
	{
		id: "r2",
		title: "Deriving state without effects",
		url: "https://notes.example.org/derived",
		snippet: "A tour of $derived and when $effect is the wrong tool.",
	},
	{
		id: "r3",
		title: "Migration notes",
		url: "https://example.net/migration",
	},
];

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function items(container: HTMLElement): HTMLLIElement[] {
	return [...container.querySelectorAll<HTMLLIElement>(".ft-websearch-item")];
}

function rows(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(".ft-websearch-row")];
}

function more(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector<HTMLButtonElement>(".ft-websearch-more");
}

function text(container: HTMLElement, selector: string): string {
	return container.querySelector(selector)?.textContent?.trim() ?? "";
}

describe("WebSearch", () => {
	afterEach(cleanup);

	it("renders the query in the header", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: [] } });
		expect(text(container, ".ft-websearch-query")).toBe(QUERY);
	});

	it("renders one row per result, in order", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: RESULTS } });

		expect(items(container)).toHaveLength(3);
		expect(
			[...container.querySelectorAll(".ft-websearch-title")].map((n) => n.textContent)
		).toEqual(RESULTS.map((r) => r.title));
	});

	it("counts the results in the header, singular and plural", () => {
		const { container, rerender } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS },
		});
		expect(text(container, ".ft-websearch-count")).toBe("3 results");

		void rerender({ query: QUERY, results: RESULTS.slice(0, 1) });
		expect(text(container, ".ft-websearch-count")).toBe("1 result");
	});

	it("omits the count while nothing has been found", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: [] } });
		expect(container.querySelector(".ft-websearch-count")).toBeNull();
	});

	it("shows the domain without its www prefix, and a monogram taken from it", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: RESULTS } });
		const domains = [...container.querySelectorAll(".ft-websearch-domain")].map(
			(n) => n.textContent
		);

		expect(domains).toEqual(["example.dev", "notes.example.org", "example.net"]);
		expect(text(container, ".ft-websearch-monogram")).toBe("E");
	});

	it("drops the domain line and falls back to the title when the url is blank", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: [{ id: "r1", title: "Local note", url: "" }] },
		});

		expect(container.querySelector(".ft-websearch-domain")).toBeNull();
		expect(text(container, ".ft-websearch-monogram")).toBe("L");
	});

	it("survives a url it cannot parse", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: [{ id: "r1", title: "Relative", url: "/not/absolute" }] },
		});

		expect(container.querySelector(".ft-websearch-domain")).toBeNull();
		expect(rows(container)[0].tagName).toBe("A");
	});

	it("keeps the rows already on screen when a result is appended", async () => {
		const first = RESULTS.slice(0, 2);
		const { container, rerender } = render(WebSearch, {
			props: { query: QUERY, results: first },
		});

		const before = items(container);
		expect(before).toHaveLength(2);

		await rerender({ query: QUERY, results: [...first, RESULTS[2]] });
		const after = items(container);

		// Identity is what the entrance hangs off: a preserved node has already
		// played its animation and will not replay it, so only the node that is new
		// here animates.
		expect(after).toHaveLength(3);
		expect(after[0]).toBe(before[0]);
		expect(after[1]).toBe(before[1]);
		expect(after[2]).not.toBe(before[1]);
	});

	it("renders the scanning bar only while searching", async () => {
		const { container, rerender } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, searching: true },
		});

		expect(container.querySelector(".ft-websearch-scan")).not.toBeNull();
		expect(root(container).getAttribute("aria-busy")).toBe("true");

		await rerender({ query: QUERY, results: RESULTS, searching: false });

		expect(container.querySelector(".ft-websearch-scan")).toBeNull();
		expect(root(container).getAttribute("aria-busy")).toBe("false");
	});

	it("says it is searching while nothing has landed yet", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: [], searching: true },
		});

		expect(text(container, ".ft-websearch-status")).toBe("Searching…");
		expect(container.querySelector(".ft-websearch-empty")).toBeNull();
	});

	it("reports an empty result set once the search is over", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: [], searching: false },
		});

		expect(text(container, ".ft-websearch-empty")).toBe("No results");
		expect(container.querySelector(".ft-websearch-status")).toBeNull();
	});

	it("links each row out when there is a url and no onSelect", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: RESULTS } });
		const anchor = rows(container)[0] as HTMLAnchorElement;

		expect(anchor.tagName).toBe("A");
		expect(anchor.getAttribute("href")).toBe(RESULTS[0].url);
		expect(anchor.getAttribute("target")).toBe("_blank");
		expect(anchor.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");
	});

	it("turns every row into a button when onSelect is given, url or not", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, onSelect: vi.fn() },
		});

		for (const row of rows(container)) {
			expect(row.tagName).toBe("BUTTON");
			expect(row.getAttribute("type")).toBe("button");
			expect(row.hasAttribute("href")).toBe(false);
		}
	});

	it("renders an inert row when there is neither a url nor an onSelect", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: [{ id: "r1", title: "Nowhere to go", url: "" }] },
		});
		expect(rows(container)[0].tagName).toBe("DIV");
	});

	it("calls onSelect with the result and its index", async () => {
		const onSelect = vi.fn();
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, onSelect },
		});

		await fireEvent.click(rows(container)[1]);

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(RESULTS[1], 1);
	});

	it("shows every result and no expander by default", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: RESULTS } });

		expect(items(container)).toHaveLength(3);
		expect(more(container)).toBeNull();
	});

	it("clamps to maxVisible and offers the rest behind an expander", async () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, maxVisible: 1 },
		});

		expect(items(container)).toHaveLength(1);

		const button = more(container);
		expect(button?.textContent?.trim()).toBe("Show 2 more");
		expect(button?.getAttribute("aria-expanded")).toBe("false");

		await fireEvent.click(button!);

		expect(items(container)).toHaveLength(3);
		expect(more(container)?.textContent?.trim()).toBe("Show less");
		expect(more(container)?.getAttribute("aria-expanded")).toBe("true");

		await fireEvent.click(more(container)!);
		expect(items(container)).toHaveLength(1);
	});

	it("points the expander at the list it controls", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, maxVisible: 2 },
		});

		const listId = container.querySelector(".ft-websearch-list")?.id;
		expect(listId).toBeTruthy();
		expect(more(container)?.getAttribute("aria-controls")).toBe(listId);
	});

	it("treats a maxVisible of zero or less as no cap at all", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, maxVisible: 0 },
		});
		expect(items(container)).toHaveLength(3);

		cleanup();

		const negative = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, maxVisible: -3 },
		});
		expect(items(negative.container)).toHaveLength(3);
		expect(more(negative.container)).toBeNull();
	});

	it("keeps the expander honest as results keep landing", async () => {
		const { container, rerender } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS.slice(0, 2), maxVisible: 1 },
		});
		expect(more(container)?.textContent?.trim()).toBe("Show 1 more");

		await rerender({ query: QUERY, results: RESULTS, maxVisible: 1 });
		expect(more(container)?.textContent?.trim()).toBe("Show 2 more");
	});

	it("retires the expansion when the list empties, so the next search starts capped", async () => {
		const { container, rerender } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, maxVisible: 1 },
		});

		await fireEvent.click(more(container)!);
		expect(items(container)).toHaveLength(3);

		// A new search wipes the list before its first hits land. The reader asked to
		// see the rest of a result set that no longer exists.
		await rerender({ query: QUERY, results: [], maxVisible: 1 });
		expect(items(container)).toHaveLength(0);

		await rerender({ query: QUERY, results: RESULTS, maxVisible: 1 });
		expect(items(container)).toHaveLength(1);
		expect(more(container)?.textContent?.trim()).toBe("Show 2 more");
		expect(more(container)?.getAttribute("aria-expanded")).toBe("false");
	});

	it("renders the item snippet in place of the built-in row body", () => {
		const item = createRawSnippet<[SearchResultData, number]>((result, index) => ({
			render: () => `<span class="custom-row">${index()}: ${result().title}</span>`,
		}));

		const { container } = render(WebSearch, { props: { query: QUERY, results: RESULTS, item } });
		const custom = container.querySelectorAll(".custom-row");

		expect(custom).toHaveLength(3);
		expect(custom[1].textContent).toBe("1: Deriving state without effects");
		expect(container.querySelector(".ft-websearch-monogram")).toBeNull();
		// The override owns the body, not the row: the link is still a link.
		expect(rows(container)[0].tagName).toBe("A");
	});

	it("exposes a labelled group, overridable through the label prop", () => {
		const { container } = render(WebSearch, { props: { query: QUERY, results: RESULTS } });
		expect(root(container).getAttribute("role")).toBe("group");
		expect(root(container).getAttribute("aria-label")).toBe("Web search");

		cleanup();

		const named = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, label: "Sources consulted" },
		});
		expect(root(named.container).getAttribute("aria-label")).toBe("Sources consulted");
	});

	it("merges the class prop with the base layout classes", () => {
		const { container } = render(WebSearch, {
			props: { query: QUERY, results: RESULTS, class: "mt-4" },
		});
		const cls = root(container).className;

		expect(cls).toContain("ft-websearch");
		expect(cls).toContain("w-full");
		expect(cls).toContain("mt-4");
	});

	describe("model-supplied result urls", () => {
		const one = (url: string) =>
			render(WebSearch, {
				props: { query: "runes", results: [{ id: "r", title: "A result", url }] },
			});

		it("refuses a scheme the family does not link to, and still shows the row", () => {
			const { container } = one("javascript:alert(1)");
			expect(container.querySelector("a")).toBeNull();
			expect(container.textContent).toContain("A result");
		});

		it("makes a bare host absolute rather than resolving it against this origin", () => {
			const { container } = one("docs.example.dev/guide");
			expect(container.querySelector("a")?.getAttribute("href")).toBe(
				"https://docs.example.dev/guide"
			);
		});
	});
});
