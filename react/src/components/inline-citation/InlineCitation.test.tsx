import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { InlineCitation } from "./InlineCitation.js";
import { InlineCitationHarness } from "./InlineCitationHarness.js";
import type { SourceData } from "../../internals/ai-types.js";

function source(overrides: Partial<SourceData> = {}): SourceData {
	return {
		id: "src_1",
		title: "Structured outputs for tool calls",
		url: "https://www.example.com/docs/structured-outputs",
		snippet: "Constrained decoding guarantees the model returns a payload matching your schema.",
		...overrides,
	};
}

function marker(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-citation-marker") as HTMLElement;
}

function preview(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-citation-preview");
}

/** Advances fake timers inside `act`, so the state updates their callbacks
 *  schedule are flushed before the next assertion. */
async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

/** Hover the marker and let the open delay elapse. */
async function hoverOpen(container: HTMLElement) {
	fireEvent.mouseEnter(marker(container));
	await advance(150);
}

describe("InlineCitation", () => {
	beforeEach(() => vi.useFakeTimers());

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("renders the index as a bracketed marker", () => {
		const { container } = render(<InlineCitation source={source()} index={3} />);

		expect(marker(container).textContent?.trim()).toBe("[3]");
	});

	it("names the marker with its title, since a bare number names nothing", () => {
		const { container } = render(
			<InlineCitation source={source({ title: "Retrieval evaluation" })} index={1} />
		);

		expect(marker(container).getAttribute("aria-label")).toBe("Source 1: Retrieval evaluation");
	});

	it("links to the source URL by default, safely and in a new tab", () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		const el = marker(container);

		expect(el.tagName).toBe("A");
		expect(el.getAttribute("href")).toBe("https://www.example.com/docs/structured-outputs");
		expect(el.getAttribute("target")).toBe("_blank");
		expect(el.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");
	});

	it("prefers an explicit href over the source URL", () => {
		const { container } = render(
			<InlineCitation source={source()} index={1} href="https://example.org/mirror" />
		);

		expect(marker(container).getAttribute("href")).toBe("https://example.org/mirror");
	});

	it("promotes a scheme-less host to https, and leaves a real relative path alone", () => {
		// Hand-written and model-written urls both arrive without a scheme all
		// the time. An `href` of "docs.example.dev/guide" is a RELATIVE path to
		// the browser: it resolves against the app's own origin and lands on a
		// page nobody ever published. The other source surfaces in this package
		// normalise it, and a citation marker is the same kind of link.
		const { container, rerender } = render(
			<InlineCitation source={source({ url: "docs.example.dev/guide" })} index={1} />
		);
		expect(marker(container).getAttribute("href")).toBe("https://docs.example.dev/guide");

		// A path that really is relative has no host in it and nowhere else to
		// resolve against, so it stays exactly as written.
		rerender(<InlineCitation source={source({ url: "/local/guide" })} index={1} />);
		expect(marker(container).getAttribute("href")).toBe("/local/guide");
	});

	it("renders a button, not a link, when href is an empty string", () => {
		const { container } = render(<InlineCitation source={source()} index={1} href="" />);
		const el = marker(container);

		expect(el.tagName).toBe("BUTTON");
		expect(el.getAttribute("type")).toBe("button");
		expect(el.hasAttribute("href")).toBe(false);
	});

	it("keeps the preview out of the DOM until it is shown", () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);

		expect(preview(container)).toBeFalsy();
	});

	it("opens on hover only after the delay has elapsed", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);

		fireEvent.mouseEnter(marker(container));
		await advance(140);
		expect(preview(container)).toBeFalsy();

		await advance(10);
		expect(preview(container)).toBeTruthy();
	});

	it("does not open when the pointer leaves before the delay", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);

		fireEvent.mouseEnter(marker(container));
		await advance(100);
		fireEvent.mouseLeave(marker(container));
		await advance(500);

		expect(preview(container)).toBeFalsy();
	});

	it("holds the card open through the grace window, then closes", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		await hoverOpen(container);

		fireEvent.mouseLeave(marker(container));
		await advance(240);
		expect(preview(container)).toBeTruthy();

		await advance(20);
		expect(preview(container)).toBeFalsy();
	});

	it("survives a pointer that travels into the card during the grace window", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		await hoverOpen(container);

		fireEvent.mouseLeave(marker(container));
		await advance(100);
		fireEvent.mouseEnter(preview(container) as HTMLElement);
		await advance(500);
		expect(preview(container)).toBeTruthy();

		fireEvent.mouseLeave(preview(container) as HTMLElement);
		await advance(250);
		expect(preview(container)).toBeFalsy();
	});

	it("opens immediately on focus and closes when focus leaves", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);

		fireEvent.focus(marker(container));
		expect(preview(container)).toBeTruthy();

		fireEvent.blur(marker(container));
		expect(preview(container)).toBeFalsy();
	});

	it("closes on Escape", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		fireEvent.focus(marker(container));

		fireEvent.keyDown(window, { key: "Escape" });
		expect(preview(container)).toBeFalsy();
	});

	it("ignores other keys", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		fireEvent.focus(marker(container));

		fireEvent.keyDown(window, { key: "a" });
		expect(preview(container)).toBeTruthy();
	});

	it("shows the preview when an unlinked marker is activated", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} href="" />);

		fireEvent.click(marker(container));
		expect(preview(container)).toBeTruthy();
	});

	it("fires onOpen once per appearance, not once per hover event", async () => {
		const onOpen = vi.fn();
		const { container } = render(<InlineCitation source={source()} index={1} onOpen={onOpen} />);

		await hoverOpen(container);
		expect(onOpen).toHaveBeenCalledTimes(1);

		// Still the same card on screen: re-entering announces nothing new.
		fireEvent.mouseEnter(marker(container));
		await advance(200);
		expect(onOpen).toHaveBeenCalledTimes(1);

		fireEvent.mouseLeave(marker(container));
		await advance(250);
		await hoverOpen(container);
		expect(onOpen).toHaveBeenCalledTimes(2);
	});

	it("fills the card with a SourceCard, so a cited document looks the same everywhere", async () => {
		const { container } = render(
			<InlineCitation
				source={source({
					title: "Retrieval evaluation",
					domain: "research.example.com",
					snippet: "Recall at k is the wrong metric once the reranker is in play.",
				})}
				index={1}
			/>
		);
		await hoverOpen(container);

		expect(preview(container)?.querySelector(".ft-source-card")).toBeTruthy();
		expect(container.querySelector(".ft-source-title")?.textContent?.trim()).toBe(
			"Retrieval evaluation"
		);
		expect(container.querySelector(".ft-source-domain")?.textContent?.trim()).toBe(
			"research.example.com"
		);
		expect(container.querySelector(".ft-source-snippet")?.textContent?.trim()).toBe(
			"Recall at k is the wrong metric once the reranker is in play."
		);
	});

	it("leaves the card's own chrome to the card, and puts it back for a custom body", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		await hoverOpen(container);

		// A bordered, padded box around a bordered, padded card is a card in a card.
		expect(preview(container)?.className).not.toContain("p-3");

		cleanup();
		const custom = render(
			<InlineCitation source={source()} index={1} preview={() => <span>own</span>} />
		);
		await hoverOpen(custom.container);

		expect(preview(custom.container)?.className).toContain("p-3");
	});

	it("derives the domain from the URL when the source omits one", async () => {
		const { container } = render(
			<InlineCitation source={source({ url: "https://www.example.com/a/b" })} index={1} />
		);
		await hoverOpen(container);

		expect(container.querySelector(".ft-source-domain")?.textContent?.trim()).toBe("example.com");
	});

	it("drops the domain line when there is no host to show", async () => {
		const { container } = render(
			<InlineCitation source={source({ url: "/local/notes" })} index={1} href="" />
		);
		await hoverOpen(container);

		expect(container.querySelector(".ft-source-domain")).toBeFalsy();
	});

	it("drops the snippet line when the source has none", async () => {
		const { container } = render(
			<InlineCitation source={source({ snippet: undefined })} index={1} />
		);
		await hoverOpen(container);

		expect(container.querySelector(".ft-source-snippet")).toBeFalsy();
	});

	it("replaces the card body with the preview snippet", async () => {
		const { container } = render(
			<InlineCitation
				source={source()}
				index={1}
				preview={(data) => <span className="custom">{data.title} · own card</span>}
			/>
		);
		await hoverOpen(container);

		expect(container.querySelector(".custom")?.textContent).toBe(
			"Structured outputs for tool calls · own card"
		);
		expect(container.querySelector(".ft-source-card")).toBeFalsy();
	});

	it("wires the marker to the card it describes", async () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);

		expect(marker(container).hasAttribute("aria-describedby")).toBe(false);

		await hoverOpen(container);
		const card = preview(container) as HTMLElement;

		expect(card.getAttribute("role")).toBe("tooltip");
		expect(card.id).toBeTruthy();
		expect(marker(container).getAttribute("aria-describedby")).toBe(card.id);
	});

	it("leaves no whitespace behind the marker for the sentence to trip over", () => {
		const { container } = render(<InlineCitationHarness source={source()} index={3} />);
		const prose = container.querySelector('[data-testid="prose"]') as HTMLElement;

		// A single stray text node between the marker and the closing block is
		// enough to render "read[3] ." — the full stop detached from the citation.
		expect(prose.textContent).toBe("Worth a read[3].");

		const after = [...prose.childNodes]
			.slice([...prose.childNodes].indexOf(marker(container)) + 1)
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent)
			.join("");
		expect(after).toBe(".");
	});

	it("superscripts the marker without stretching the line box it sits in", () => {
		const { container } = render(<InlineCitation source={source()} index={1} />);
		const el = marker(container);

		// jsdom lays nothing out, so the geometry is asserted where it is decided:
		// the marker carries no utility that inflates the line box, and its size and
		// lift come from the colocated rule on this class instead.
		expect(el.classList.contains("ft-citation-marker")).toBe(true);
		expect(el.classList.contains("align-super")).toBe(false);
		expect(el.className).not.toMatch(/text-\[0\.7/);
	});

	it("merges the class prop onto the marker", () => {
		const { container } = render(
			<InlineCitation source={source()} index={1} className="text-rose-500" />
		);
		const el = marker(container);

		expect(el.classList.contains("text-rose-500")).toBe(true);
		expect(el.classList.contains("ft-citation-marker")).toBe(true);
	});

	it("does not become a link for a scheme the family refuses", () => {
		const { container } = render(
			<InlineCitation index={1} source={source({ url: "javascript:alert(1)" })} />
		);

		expect(container.querySelector("a")).toBeNull();
		expect(marker(container).tagName).not.toBe("A");
	});

	it("keeps the default preview free of a link no keyboard can reach", async () => {
		// The preview is dismissed on blur, so an anchor inside it is unreachable
		// by Tab. The marker itself is already the link.
		const { container } = render(<InlineCitation index={1} source={source()} />);

		fireEvent.focus(marker(container));
		const card = container.querySelector(".ft-citation-preview") as HTMLElement;
		expect(card).not.toBeNull();
		expect(card.querySelector("a")).toBeNull();
	});
});
