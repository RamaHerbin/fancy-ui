import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import type { SourceData } from "../_internals/ai-types.js";
import SourceCard from "./SourceCard.svelte";
import SourcesList from "./SourcesList.svelte";
import SourcesTrigger from "./SourcesTrigger.svelte";
import Harness from "./SourcesHarness.test.svelte";

const SOURCES: SourceData[] = [
	{ id: "s1", title: "Designing citation surfaces", url: "https://docs.example.dev/citations" },
	{ id: "s2", title: "Attribution in answers", url: "https://research.example.org/attribution" },
	{ id: "s3", title: "Ranking passages", url: "https://notes.example.net/ranking" },
	{ id: "s4", title: "Evaluating retrieval", url: "https://eval.example.io/retrieval" },
];

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function card(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-source-card") as HTMLElement;
}

function text(container: HTMLElement, selector: string): string {
	return container.querySelector(selector)?.textContent?.trim() ?? "";
}

describe("SourceCard", () => {
	afterEach(cleanup);

	it("renders title, domain and snippet with no Sources root anywhere above it", () => {
		const { container } = render(SourceCard, {
			props: {
				source: {
					id: "s1",
					title: "Designing citation surfaces",
					url: "https://docs.example.dev/citations",
					domain: "docs.example.dev",
					snippet: "A citation is a promise that the answer can be checked.",
				},
			},
		});

		expect(text(container, ".ft-source-title")).toBe("Designing citation surfaces");
		expect(text(container, ".ft-source-domain")).toBe("docs.example.dev");
		expect(text(container, ".ft-source-snippet")).toBe(
			"A citation is a promise that the answer can be checked."
		);
	});

	it("derives the domain from the url when none is given, dropping the www", async () => {
		const { container, rerender } = render(SourceCard, {
			props: { source: { id: "s1", title: "T", url: "https://docs.example.dev/a/b?q=1" } },
		});
		expect(text(container, ".ft-source-domain")).toBe("docs.example.dev");

		await rerender({ source: { id: "s1", title: "T", url: "https://www.example.org/a" } });
		expect(text(container, ".ft-source-domain")).toBe("example.org");

		// Hand-written fixtures rarely carry a scheme; `new URL` rejects those, so
		// the fallback parser has to recognise a bare host.
		await rerender({ source: { id: "s1", title: "T", url: "docs.example.dev/guide" } });
		expect(text(container, ".ft-source-domain")).toBe("docs.example.dev");

		// A relative link has no host at all — echoing its path back would be a lie.
		await rerender({ source: { id: "s1", title: "T", url: "/local/guide" } });
		expect(container.querySelector(".ft-source-domain")).toBeFalsy();
	});

	it("prefers an explicit domain over the one in the url", () => {
		const { container } = render(SourceCard, {
			props: {
				source: {
					id: "s1",
					title: "T",
					url: "https://cdn.example.dev/mirror/paper.pdf",
					domain: "the standards body",
				},
			},
		});
		expect(text(container, ".ft-source-domain")).toBe("the standards body");
	});

	it("shows no domain line when there is nothing to show", () => {
		const { container } = render(SourceCard, {
			props: { source: { id: "s1", title: "An uncited note", url: "" } },
		});

		expect(container.querySelector(".ft-source-domain")).toBeFalsy();
		expect(container.querySelector(".ft-source-snippet")).toBeFalsy();
		expect(text(container, ".ft-source-title")).toBe("An uncited note");
	});

	it("is a link only when there is somewhere to go, and opens it safely", () => {
		const { container } = render(SourceCard, {
			props: { source: { id: "s1", title: "T", url: "https://docs.example.dev/a" } },
		});
		const anchor = container.querySelector("a") as HTMLAnchorElement;

		expect(anchor).toBeTruthy();
		expect(anchor.getAttribute("href")).toBe("https://docs.example.dev/a");
		expect(anchor.getAttribute("target")).toBe("_blank");
		expect(anchor.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");

		cleanup();
		const bare = render(SourceCard, { props: { source: { id: "s1", title: "T", url: "" } } });
		expect(bare.container.querySelector("a")).toBeFalsy();
		expect(card(bare.container).tagName).toBe("DIV");
	});

	it("stands in for a favicon with the domain's initial", () => {
		const { container } = render(SourceCard, {
			props: { source: { id: "s1", title: "Zebra", url: "https://docs.example.dev/a" } },
		});
		expect(text(container, ".ft-source-mark")).toBe("D");
	});

	it("falls back to the title's initial, then to a question mark", () => {
		const titled = render(SourceCard, { props: { source: { id: "s1", title: "zebra", url: "" } } });
		expect(text(titled.container, ".ft-source-mark")).toBe("Z");

		cleanup();
		const nameless = render(SourceCard, { props: { source: { id: "s1", title: "", url: "" } } });
		expect(text(nameless.container, ".ft-source-mark")).toBe("?");
	});

	it("keeps a whole character when the initial is outside the BMP", () => {
		const { container } = render(SourceCard, {
			props: { source: { id: "s1", title: "𝒜pex", url: "" } },
		});
		expect(text(container, ".ft-source-mark")).toBe("𝒜");
	});

	it("lets an icon snippet replace the monogram", () => {
		const { container } = render(SourceCard, {
			props: {
				source: { id: "s1", title: "T", url: "https://docs.example.dev/a" },
				icon: snippet('<span data-testid="icon">*</span>'),
			},
		});

		expect(container.querySelector('[data-testid="icon"]')).toBeTruthy();
		expect(text(container, ".ft-source-mark")).toBe("*");
	});

	it("merges custom classes onto both the link and the plain shapes", () => {
		const linked = render(SourceCard, {
			props: { source: { id: "s1", title: "T", url: "https://docs.example.dev/a" }, class: "mine" },
		});
		expect(card(linked.container).className).toContain("mine");

		cleanup();
		const plain = render(SourceCard, {
			props: { source: { id: "s1", title: "T", url: "" }, class: "mine" },
		});
		expect(card(plain.container).className).toContain("mine");
	});
});

describe("SourcesTrigger", () => {
	afterEach(cleanup);

	it("degrades to an empty, harmless pill outside a Sources root", async () => {
		const { container } = render(SourcesTrigger, {});
		const button = container.querySelector("button") as HTMLButtonElement;

		expect(button.textContent).toContain("0 sources");
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(button.getAttribute("type")).toBe("button");
		await fireEvent.click(button);
		expect(button.getAttribute("aria-expanded")).toBe("false");
	});

	it("takes the count from the root it sits in", () => {
		const { container } = render(Harness, { props: { sources: SOURCES } });
		expect(container.querySelector("button")?.textContent).toContain("4 sources");
	});

	it("lets an explicit label override the count line", () => {
		const { container } = render(Harness, {
			props: { sources: SOURCES, label: "Checked against 4 papers" },
		});
		const button = container.querySelector("button") as HTMLButtonElement;

		expect(button.textContent).toContain("Checked against 4 papers");
		expect(button.textContent).not.toContain("4 sources");
	});

	it("stacks at most three monograms, in order, hidden from the reader", () => {
		const { container } = render(Harness, { props: { sources: SOURCES } });
		const stack = container.querySelector(".ft-sources-stack") as HTMLElement;
		const chips = [...stack.querySelectorAll(".ft-sources-chip")].map((chip) =>
			chip.textContent?.trim()
		);

		expect(chips).toEqual(["D", "R", "N"]);
		expect(stack.getAttribute("aria-hidden")).toBe("true");
	});
});

describe("SourcesList", () => {
	afterEach(cleanup);

	it("renders nothing but an open region outside a Sources root", () => {
		const { container } = render(SourcesList, {});

		expect(container.querySelectorAll(".ft-source-card")).toHaveLength(0);
		// Nothing can open it from out here, so it must not start closed and
		// swallow whatever a consumer put in it.
		expect(container.querySelector(".ft-sources-list")?.className).toContain("ft-open");
	});

	it("renders one card per source from context", () => {
		const { container } = render(Harness, { props: { sources: SOURCES, open: true } });
		expect(container.querySelectorAll(".ft-source-card")).toHaveLength(4);
	});

	it("hands each source and its index to an item snippet instead of the card", () => {
		const { container } = render(Harness, {
			props: { sources: SOURCES, open: true, customItem: true },
		});
		const rows = [...container.querySelectorAll('[data-testid="custom-item"]')].map(
			(row) => row.textContent
		);

		expect(rows).toEqual([
			"0:Designing citation surfaces",
			"1:Attribution in answers",
			"2:Ranking passages",
			"3:Evaluating retrieval",
		]);
		expect(container.querySelectorAll(".ft-source-card")).toHaveLength(0);
	});

	it("staggers the cards by index, and only while it is open", async () => {
		const { container } = render(Harness, { props: { sources: SOURCES } });
		const items = () => [...container.querySelectorAll(".ft-sources-item")] as HTMLElement[];

		expect(items()[0].className).not.toContain("ft-in");

		await fireEvent.click(container.querySelector("button") as HTMLButtonElement);
		expect(items()[0].className).toContain("ft-in");
		expect(items().map((item) => item.style.getPropertyValue("--ft-sources-index"))).toEqual([
			"0",
			"1",
			"2",
			"3",
		]);
	});

	it("merges custom classes onto the grid", () => {
		const { container } = render(SourcesList, { props: { class: "my-grid" } });
		const grid = container.querySelector("ul") as HTMLElement;

		expect(grid.className).toContain("my-grid");
		expect(grid.className).toContain("ft-sources-grid");
		expect(grid.getAttribute("aria-label")).toBe("Sources");
	});

	it("mounts without warnings when the parts are used bare", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		render(SourcesTrigger, {});
		render(SourcesList, {});

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});

describe("SourceCard — model-supplied urls", () => {
	afterEach(cleanup);

	const card = (url: string, props: Record<string, unknown> = {}) =>
		render(SourceCard, {
			props: { source: { id: "s", title: "A document", url } as SourceData, ...props },
		});

	it("refuses a scheme the family does not link to", () => {
		for (const url of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:x"]) {
			const { container } = card(url);
			expect(container.querySelector("a"), url).toBeNull();
			cleanup();
		}
	});

	it("makes a bare host absolute, so it cannot resolve against this app's origin", () => {
		const { container } = card("docs.example.dev/guide");
		expect(container.querySelector("a")?.getAttribute("href")).toBe(
			"https://docs.example.dev/guide"
		);
	});

	it("leaves a genuine relative path alone", () => {
		const { container } = card("/local/guide");
		expect(container.querySelector("a")?.getAttribute("href")).toBe("/local/guide");
	});

	it("renders the plain shape when it is told it cannot host a link", () => {
		const { container } = card("https://docs.example.dev/guide", { interactive: false });
		expect(container.querySelector("a")).toBeNull();
		expect(container.textContent).toContain("A document");
	});
});
