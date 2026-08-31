import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import type { SourceData } from "../../internals/ai-types.js";
import { Sources } from "./Sources.js";
import { SourceCard } from "./SourceCard.js";
import { SourcesList } from "./SourcesList.js";
import { SourcesTrigger } from "./SourcesTrigger.js";
import { SourcesHarness } from "./SourcesHarness.js";

const SOURCES: SourceData[] = [
	{
		id: "s1",
		title: "Designing citation surfaces",
		url: "https://docs.example.dev/citations",
		domain: "docs.example.dev",
		snippet: "A citation is a promise that the answer can be checked.",
	},
	{
		id: "s2",
		title: "Attribution in generated answers",
		url: "https://research.example.org/attribution",
		domain: "research.example.org",
	},
	{ id: "s3", title: "Ranking retrieved passages", url: "https://notes.example.net/ranking" },
	{ id: "s4", title: "An uncited note", url: "" },
];

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

function cards(container: HTMLElement): NodeListOf<HTMLElement> {
	return container.querySelectorAll(".ft-source-card");
}

function list(container: HTMLElement): HTMLElement {
	return container.querySelector("ul") as HTMLElement;
}

describe("Sources", () => {
	afterEach(cleanup);

	it("renders a trigger and a list without being given any children", () => {
		const { container } = render(<Sources sources={SOURCES} />);

		expect(trigger(container)).toBeTruthy();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
		expect(cards(container)).toHaveLength(SOURCES.length);
	});

	it("writes `inert` onto the node itself, never as a JSX prop", () => {
		// A JSX `inert` prop is expressible on exactly ONE of this package's two
		// peer majors: React 18 drops `inert={true}` (it knows no such
		// attribute) and React 19 rejects the `inert=""` spelling that would
		// survive React 18. The attribute therefore reaches the node
		// imperatively, through `useInertAttribute`. This suite runs on React
		// 19, where both mechanisms end at the same DOM — so the mechanism is
		// the only thing left to pin, and it is exactly what React 18 needs.
		const spy = vi.spyOn(Element.prototype, "toggleAttribute");
		const { container } = render(<Sources sources={SOURCES} />);
		const inertWrites = spy.mock.calls.filter(([name]) => name === "inert");
		const applied = list(container).hasAttribute("inert");
		spy.mockRestore();

		expect(inertWrites).toContainEqual(["inert", true]);
		expect(applied).toBe(true);
	});
	it("starts closed, and says so on the root and the region", () => {
		const { container } = render(<Sources sources={SOURCES} />);

		expect((container.querySelector(".ft-sources") as HTMLElement).dataset.open).toBe("false");
		expect(container.querySelector(".ft-sources-list")?.className).not.toContain("ft-open");
		// Collapsed cards are links: leaving them reachable would drop the keyboard
		// into content nobody can see. jsdom implements no `inert` IDL property at
		// all (`"inert" in HTMLElement.prototype === false` on the pinned version),
		// so the ATTRIBUTE React writes is what there is to check — and it is also
		// what applies inertness, and what `:not([inert])` selectors and assistive
		// tech key on, in a real browser.
		expect(list(container).hasAttribute("inert")).toBe(true);
	});

	it("opens on click and reports the new state", () => {
		const onToggle = vi.fn();
		const { container } = render(<Sources sources={SOURCES} onToggle={onToggle} />);

		fireEvent.click(trigger(container));
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
		expect(list(container).hasAttribute("inert")).toBe(false);
		expect(onToggle).toHaveBeenLastCalledWith(true);

		fireEvent.click(trigger(container));
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
		expect(onToggle).toHaveBeenLastCalledWith(false);
		expect(onToggle).toHaveBeenCalledTimes(2);
	});

	it("honours an initial open, and follows the prop when it changes", () => {
		const { container, rerender } = render(<Sources sources={SOURCES} open={true} />);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");

		rerender(<Sources sources={SOURCES} open={false} />);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
	});

	it("writes the open state back out through the round trip", () => {
		const { container, getByTestId } = render(<SourcesHarness sources={SOURCES} />);
		expect(getByTestId("bound-open").textContent).toBe("false");

		fireEvent.click(trigger(container));
		expect(getByTestId("bound-open").textContent).toBe("true");

		fireEvent.click(trigger(container));
		expect(getByTestId("bound-open").textContent).toBe("false");
	});

	it("counts the sources in the trigger label, singular at one", () => {
		const many = render(<Sources sources={SOURCES} />);
		expect(trigger(many.container).textContent).toContain("4 sources");

		cleanup();
		const one = render(<Sources sources={[SOURCES[0] as SourceData]} />);
		expect(trigger(one.container).textContent).toContain("1 source");
		expect(trigger(one.container).textContent).not.toContain("1 sources");
	});

	it("survives an empty source list", () => {
		const { container } = render(<Sources sources={[]} />);

		expect(trigger(container).textContent).toContain("0 sources");
		expect(cards(container)).toHaveLength(0);
		expect(container.querySelector(".ft-sources-stack")).toBeFalsy();
	});

	it("renders one card per source, in order", () => {
		const { container } = render(<Sources sources={SOURCES} open={true} />);
		const titles = [...cards(container)].map((card) =>
			card.querySelector(".ft-source-title")?.textContent?.trim()
		);

		expect(titles).toEqual(SOURCES.map((source) => source.title));
	});

	it("reacts to a new set of sources", () => {
		const { container, rerender } = render(<Sources sources={SOURCES} />);
		expect(cards(container)).toHaveLength(4);

		rerender(<Sources sources={SOURCES.slice(0, 2)} />);
		expect(cards(container)).toHaveLength(2);
		expect(trigger(container).textContent).toContain("2 sources");
	});

	it("lets children replace the default composition entirely", () => {
		const { container } = render(
			<Sources sources={SOURCES}>
				<p data-testid="custom">Mine</p>
			</Sources>
		);

		expect(container.querySelector('[data-testid="custom"]')?.textContent).toBe("Mine");
		expect(trigger(container)).toBeFalsy();
		expect(cards(container)).toHaveLength(0);
	});

	it("points the trigger at the region it controls", () => {
		const { container } = render(<Sources sources={SOURCES} />);
		const controls = trigger(container).getAttribute("aria-controls");

		expect(controls).toBeTruthy();
		expect(list(container).id).toBe(controls);
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<Sources sources={SOURCES} className="my-sources" />);
		const root = container.querySelector(".ft-sources") as HTMLElement;

		expect(root.className).toContain("my-sources");
		expect(root.className).toContain("ft-sources");
	});

	it("composes its parts without warnings", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const { container } = render(<SourcesHarness sources={SOURCES} />);
		fireEvent.click(trigger(container));

		expect(cards(container)).toHaveLength(SOURCES.length);
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});

const PART_SOURCES: SourceData[] = [
	{ id: "s1", title: "Designing citation surfaces", url: "https://docs.example.dev/citations" },
	{ id: "s2", title: "Attribution in answers", url: "https://research.example.org/attribution" },
	{ id: "s3", title: "Ranking passages", url: "https://notes.example.net/ranking" },
	{ id: "s4", title: "Evaluating retrieval", url: "https://eval.example.io/retrieval" },
];

function card(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-source-card") as HTMLElement;
}

function text(container: HTMLElement, selector: string): string {
	return container.querySelector(selector)?.textContent?.trim() ?? "";
}

describe("SourceCard", () => {
	afterEach(cleanup);

	it("renders title, domain and snippet with no Sources root anywhere above it", () => {
		const { container } = render(
			<SourceCard
				source={{
					id: "s1",
					title: "Designing citation surfaces",
					url: "https://docs.example.dev/citations",
					domain: "docs.example.dev",
					snippet: "A citation is a promise that the answer can be checked.",
				}}
			/>
		);

		expect(text(container, ".ft-source-title")).toBe("Designing citation surfaces");
		expect(text(container, ".ft-source-domain")).toBe("docs.example.dev");
		expect(text(container, ".ft-source-snippet")).toBe(
			"A citation is a promise that the answer can be checked."
		);
	});

	it("derives the domain from the url when none is given, dropping the www", () => {
		const { container, rerender } = render(
			<SourceCard source={{ id: "s1", title: "T", url: "https://docs.example.dev/a/b?q=1" }} />
		);
		expect(text(container, ".ft-source-domain")).toBe("docs.example.dev");

		rerender(<SourceCard source={{ id: "s1", title: "T", url: "https://www.example.org/a" }} />);
		expect(text(container, ".ft-source-domain")).toBe("example.org");

		// Hand-written fixtures rarely carry a scheme; `new URL` rejects those, so
		// the fallback parser has to recognise a bare host.
		rerender(<SourceCard source={{ id: "s1", title: "T", url: "docs.example.dev/guide" }} />);
		expect(text(container, ".ft-source-domain")).toBe("docs.example.dev");

		// A relative link has no host at all — echoing its path back would be a lie.
		rerender(<SourceCard source={{ id: "s1", title: "T", url: "/local/guide" }} />);
		expect(container.querySelector(".ft-source-domain")).toBeFalsy();
	});

	it("prefers an explicit domain over the one in the url", () => {
		const { container } = render(
			<SourceCard
				source={{
					id: "s1",
					title: "T",
					url: "https://cdn.example.dev/mirror/paper.pdf",
					domain: "the standards body",
				}}
			/>
		);
		expect(text(container, ".ft-source-domain")).toBe("the standards body");
	});

	it("shows no domain line when there is nothing to show", () => {
		const { container } = render(
			<SourceCard source={{ id: "s1", title: "An uncited note", url: "" }} />
		);

		expect(container.querySelector(".ft-source-domain")).toBeFalsy();
		expect(container.querySelector(".ft-source-snippet")).toBeFalsy();
		expect(text(container, ".ft-source-title")).toBe("An uncited note");
	});

	it("is a link only when there is somewhere to go, and opens it safely", () => {
		const { container } = render(
			<SourceCard source={{ id: "s1", title: "T", url: "https://docs.example.dev/a" }} />
		);
		const anchor = container.querySelector("a") as HTMLAnchorElement;

		expect(anchor).toBeTruthy();
		expect(anchor.getAttribute("href")).toBe("https://docs.example.dev/a");
		expect(anchor.getAttribute("target")).toBe("_blank");
		expect(anchor.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");

		cleanup();
		const bare = render(<SourceCard source={{ id: "s1", title: "T", url: "" }} />);
		expect(bare.container.querySelector("a")).toBeFalsy();
		expect(card(bare.container).tagName).toBe("DIV");
	});

	it("stands in for a favicon with the domain's initial", () => {
		const { container } = render(
			<SourceCard source={{ id: "s1", title: "Zebra", url: "https://docs.example.dev/a" }} />
		);
		expect(text(container, ".ft-source-mark")).toBe("D");
	});

	it("falls back to the title's initial, then to a question mark", () => {
		const titled = render(<SourceCard source={{ id: "s1", title: "zebra", url: "" }} />);
		expect(text(titled.container, ".ft-source-mark")).toBe("Z");

		cleanup();
		const nameless = render(<SourceCard source={{ id: "s1", title: "", url: "" }} />);
		expect(text(nameless.container, ".ft-source-mark")).toBe("?");
	});

	it("keeps a whole character when the initial is outside the BMP", () => {
		const { container } = render(<SourceCard source={{ id: "s1", title: "𝒜pex", url: "" }} />);
		expect(text(container, ".ft-source-mark")).toBe("𝒜");
	});

	it("lets an icon node replace the monogram", () => {
		const { container } = render(
			<SourceCard
				source={{ id: "s1", title: "T", url: "https://docs.example.dev/a" }}
				icon={<span data-testid="icon">*</span>}
			/>
		);

		expect(container.querySelector('[data-testid="icon"]')).toBeTruthy();
		expect(text(container, ".ft-source-mark")).toBe("*");
	});

	it("merges custom classes onto both the link and the plain shapes", () => {
		const linked = render(
			<SourceCard
				source={{ id: "s1", title: "T", url: "https://docs.example.dev/a" }}
				className="mine"
			/>
		);
		expect(card(linked.container).className).toContain("mine");

		cleanup();
		const plain = render(
			<SourceCard source={{ id: "s1", title: "T", url: "" }} className="mine" />
		);
		expect(card(plain.container).className).toContain("mine");
	});
});

describe("SourcesTrigger", () => {
	afterEach(cleanup);

	it("degrades to an empty, harmless pill outside a Sources root", () => {
		const { container } = render(<SourcesTrigger />);
		const button = container.querySelector("button") as HTMLButtonElement;

		expect(button.textContent).toContain("0 sources");
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(button.getAttribute("type")).toBe("button");
		fireEvent.click(button);
		expect(button.getAttribute("aria-expanded")).toBe("false");
	});

	it("takes the count from the root it sits in", () => {
		const { container } = render(<SourcesHarness sources={PART_SOURCES} />);
		expect(container.querySelector("button")?.textContent).toContain("4 sources");
	});

	it("lets an explicit label override the count line", () => {
		const { container } = render(
			<SourcesHarness sources={PART_SOURCES} label="Checked against 4 papers" />
		);
		const button = container.querySelector("button") as HTMLButtonElement;

		expect(button.textContent).toContain("Checked against 4 papers");
		expect(button.textContent).not.toContain("4 sources");
	});

	it("stacks at most three monograms, in order, hidden from the reader", () => {
		const { container } = render(<SourcesHarness sources={PART_SOURCES} />);
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
		const { container } = render(<SourcesList />);

		expect(container.querySelectorAll(".ft-source-card")).toHaveLength(0);
		// Nothing can open it from out here, so it must not start closed and
		// swallow whatever a consumer put in it.
		expect(container.querySelector(".ft-sources-list")?.className).toContain("ft-open");
	});

	it("renders one card per source from context", () => {
		const { container } = render(<SourcesHarness sources={PART_SOURCES} open={true} />);
		expect(container.querySelectorAll(".ft-source-card")).toHaveLength(4);
	});

	it("hands each source and its index to an item renderer instead of the card", () => {
		const { container } = render(
			<SourcesHarness sources={PART_SOURCES} open={true} customItem={true} />
		);
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

	it("staggers the cards by index, and only while it is open", () => {
		const { container } = render(<SourcesHarness sources={PART_SOURCES} />);
		const items = () => [...container.querySelectorAll(".ft-sources-item")] as HTMLElement[];

		expect(items()[0]?.className).not.toContain("ft-in");

		fireEvent.click(container.querySelector("button") as HTMLButtonElement);
		expect(items()[0]?.className).toContain("ft-in");
		expect(items().map((item) => item.style.getPropertyValue("--ft-sources-index"))).toEqual([
			"0",
			"1",
			"2",
			"3",
		]);
	});

	it("merges custom classes onto the grid", () => {
		const { container } = render(<SourcesList className="my-grid" />);
		const grid = container.querySelector("ul") as HTMLElement;

		expect(grid.className).toContain("my-grid");
		expect(grid.className).toContain("ft-sources-grid");
		expect(grid.getAttribute("aria-label")).toBe("Sources");
	});

	it("mounts without warnings when the parts are used bare", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		render(<SourcesTrigger />);
		render(<SourcesList />);

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});

describe("SourceCard — model-supplied urls", () => {
	afterEach(cleanup);

	const renderCard = (url: string, props: Partial<{ interactive: boolean }> = {}) =>
		render(<SourceCard source={{ id: "s", title: "A document", url }} {...props} />);

	it("refuses a scheme the family does not link to", () => {
		for (const url of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:x"]) {
			const { container } = renderCard(url);
			expect(container.querySelector("a"), url).toBeNull();
			cleanup();
		}
	});

	it("makes a bare host absolute, so it cannot resolve against this app's origin", () => {
		const { container } = renderCard("docs.example.dev/guide");
		expect(container.querySelector("a")?.getAttribute("href")).toBe(
			"https://docs.example.dev/guide"
		);
	});

	it("leaves a genuine relative path alone", () => {
		const { container } = renderCard("/local/guide");
		expect(container.querySelector("a")?.getAttribute("href")).toBe("/local/guide");
	});

	it("renders the plain shape when it is told it cannot host a link", () => {
		const { container } = renderCard("https://docs.example.dev/guide", { interactive: false });
		expect(container.querySelector("a")).toBeNull();
		expect(container.textContent).toContain("A document");
	});
});
