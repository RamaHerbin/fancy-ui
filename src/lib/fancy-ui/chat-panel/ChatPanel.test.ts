import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ChatPanel from "./ChatPanel.svelte";
import ChatEmptyState from "./ChatEmptyState.svelte";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

// jsdom has no layout, so scrollHeight/clientHeight are always 0. Patching them
// onto the instance gives the region 1000px of content in a 400px viewport: the
// bottom sits at scrollTop 600.
const SCROLL_HEIGHT = 1000;
const CLIENT_HEIGHT = 400;
const BOTTOM = SCROLL_HEIGHT - CLIENT_HEIGHT;

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-panel") as HTMLElement;
}

function scrollRegion(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-panel-scroll") as HTMLElement;
}

function pill(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector(".ft-panel-return");
}

function patchGeometry(node: HTMLElement, scrollTop: number): HTMLElement {
	Object.defineProperty(node, "scrollHeight", { value: SCROLL_HEIGHT, configurable: true });
	Object.defineProperty(node, "clientHeight", { value: CLIENT_HEIGHT, configurable: true });
	Object.defineProperty(node, "scrollTop", {
		value: scrollTop,
		writable: true,
		configurable: true,
	});
	return node;
}

/** Let the MutationObserver callback land, then wait out the action's rAF. */
async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Patch the region's geometry and tell it the reader has scrolled to the top. */
async function scrollAway(container: HTMLElement): Promise<HTMLElement> {
	const region = patchGeometry(scrollRegion(container), 0);
	await fireEvent.scroll(region);
	return region;
}

describe("ChatPanel", () => {
	afterEach(cleanup);

	it("names itself as the conversation and lays out its four regions", () => {
		const { container } = render(ChatPanel, {
			props: {
				header: snippet('<div data-testid="header">Thread</div>'),
				children: snippet('<div data-testid="stream">two turns</div>'),
				composer: snippet('<div data-testid="composer">draft</div>'),
			},
		});

		expect(root(container).getAttribute("role")).toBe("region");
		expect(root(container).getAttribute("aria-label")).toBe("Conversation");

		expect(container.querySelector(".ft-panel-header")).toBeTruthy();
		expect(scrollRegion(container)).toBeTruthy();
		expect(container.querySelector(".ft-panel-composer")).toBeTruthy();

		expect(container.querySelector('[data-testid="header"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="stream"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="composer"]')).toBeTruthy();
	});

	it("leaves out the header and composer rows when nothing fills them", () => {
		// Rendering the rows regardless would leave two rules across an otherwise
		// bare panel.
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>") },
		});

		expect(container.querySelector(".ft-panel-header")).toBeFalsy();
		expect(container.querySelector(".ft-panel-composer")).toBeFalsy();
		expect(scrollRegion(container)).toBeTruthy();
	});

	it("swaps the stream for the empty state, and back", async () => {
		const props = {
			children: snippet('<div data-testid="stream">two turns</div>'),
			emptyState: snippet('<div data-testid="greeting">How can I help?</div>'),
		};
		const { container, rerender } = render(ChatPanel, { props });

		expect(container.querySelector('[data-testid="stream"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="greeting"]')).toBeFalsy();

		await rerender({ ...props, empty: true });
		expect(container.querySelector('[data-testid="stream"]')).toBeFalsy();
		expect(container.querySelector('[data-testid="greeting"]')).toBeTruthy();

		await rerender({ ...props, empty: false });
		expect(container.querySelector('[data-testid="stream"]')).toBeTruthy();
	});

	it("mirrors streaming and empty onto the root as data attributes", async () => {
		const props = { children: snippet("<p>two turns</p>") };
		const { container, rerender } = render(ChatPanel, { props });

		expect(root(container).hasAttribute("data-streaming")).toBe(false);
		expect(root(container).hasAttribute("data-empty")).toBe(false);

		await rerender({ ...props, streaming: true, empty: true });
		expect(root(container).hasAttribute("data-streaming")).toBe(true);
		expect(root(container).hasAttribute("data-empty")).toBe(true);
	});

	it("pins the scroll region to the bottom only while streaming", async () => {
		const props = { children: snippet("<p>two turns</p>"), streaming: false };
		const { container, rerender } = render(ChatPanel, { props });
		// Scrolled by hand, so the panel stops treating arriving content as the
		// conversation opening and the pinning is the action's alone to do.
		const region = patchGeometry(scrollRegion(container), BOTTOM);
		await fireEvent.scroll(region);

		// Off: the action is disconnected, so a growing transcript moves nothing.
		region.scrollTop = 0;
		region.appendChild(document.createElement("p"));
		await settle();
		expect(region.scrollTop).toBe(0);

		// On, from the bottom: the same growth now drags the region back down.
		region.scrollTop = BOTTOM;
		await fireEvent.scroll(region);
		await rerender({ ...props, streaming: true });
		region.scrollTop = 0; // proof the pin ran, without dispatching a scroll event
		region.appendChild(document.createElement("p"));
		await settle();
		expect(region.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("opens at the latest turn when the transcript arrives after mount", async () => {
		// The mount-time scroll runs before the children are in the DOM, so a
		// transcript resolved a frame later would leave the panel at the top of the
		// thread. Nothing is streaming here: only the panel can explain the result.
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), streaming: false },
		});
		const region = patchGeometry(scrollRegion(container), 0);

		region.appendChild(document.createElement("p"));
		await settle();

		expect(region.scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("stops opening at the latest turn once the reader has taken the scrollbar", async () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), streaming: false },
		});
		const region = await scrollAway(container);

		region.appendChild(document.createElement("p"));
		await settle();

		// They scrolled up to read something. Nothing may take that away from them.
		expect(region.scrollTop).toBe(0);
	});

	it("offers the pill when content grows under a scrollbar that never moved", async () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), streaming: false },
		});
		const region = patchGeometry(scrollRegion(container), BOTTOM);
		await fireEvent.scroll(region);
		expect(pill(container)).toBeFalsy();

		// A reply lands below them. The scrollbar has not moved, so no scroll event
		// fires — the transcript growing is the only thing that says the bottom is
		// now a thousand pixels away.
		Object.defineProperty(region, "scrollHeight", { value: 2000, configurable: true });
		region.appendChild(document.createElement("p"));
		await settle();

		expect(pill(container)?.textContent).toContain("Jump to latest");
	});

	it("re-reads the geometry when the empty state gives way to a transcript", async () => {
		const props = {
			children: snippet("<p>two turns</p>"),
			emptyState: snippet("<p>How can I help?</p>"),
			empty: true,
			streaming: false,
		};
		const { container, rerender } = render(ChatPanel, { props });
		const region = patchGeometry(scrollRegion(container), 0);
		await fireEvent.scroll(region);
		region.scrollTop = BOTTOM;

		// The swap moves no scrollbar and fires no scroll event, but it is exactly
		// the moment the region's contents — and its height — change underneath.
		await rerender({ ...props, empty: false });

		expect(pill(container)).toBeFalsy();
	});

	it("keeps the return pill away while the reader is at the bottom", () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>") },
		});
		expect(pill(container)).toBeFalsy();
	});

	it("offers the return pill once the reader scrolls up, whether or not a reply is streaming", async () => {
		// `streaming: false` on purpose: the action releases its listeners when
		// disabled, so the panel has to track the scroll position itself.
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), streaming: false },
		});

		const region = await scrollAway(container);
		expect(pill(container)?.textContent).toContain("Jump to latest");

		region.scrollTop = BOTTOM;
		await fireEvent.scroll(region);
		expect(pill(container)).toBeFalsy();
	});

	it("returns to the bottom on click, taking focus with it", async () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>") },
		});
		const region = await scrollAway(container);

		await fireEvent.click(pill(container) as HTMLButtonElement);

		expect(region.scrollTop).toBe(SCROLL_HEIGHT);
		// The pill is about to vanish: focus has to land somewhere useful.
		expect(document.activeElement).toBe(region);

		await fireEvent.scroll(region);
		expect(pill(container)).toBeFalsy();
	});

	it("arrives instead of travelling when the reader asked for less motion", async () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>") },
		});
		const region = await scrollAway(container);
		// jsdom has no Element.scrollTo, so the behaviour is only observable through
		// one we put there ourselves.
		const scrollTo = vi.fn();
		Object.defineProperty(region, "scrollTo", { value: scrollTo, configurable: true });

		await fireEvent.click(pill(container) as HTMLButtonElement);
		expect(scrollTo).toHaveBeenLastCalledWith({ top: SCROLL_HEIGHT, behavior: "smooth" });

		const matchMedia = vi
			.spyOn(window, "matchMedia")
			.mockReturnValue({ matches: true } as MediaQueryList);
		region.scrollTop = 0;
		await fireEvent.scroll(region);
		await fireEvent.click(pill(container) as HTMLButtonElement);

		expect(scrollTo).toHaveBeenLastCalledWith({ top: SCROLL_HEIGHT, behavior: "instant" });
		matchMedia.mockRestore();
	});

	it("names itself however it is told to", () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), label: "Support thread" },
		});

		expect(root(container).getAttribute("aria-label")).toBe("Support thread");
	});

	it("labels the return pill with returnLabel", async () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), returnLabel: "Back to the answer" },
		});

		await scrollAway(container);
		expect(pill(container)?.textContent).toContain("Back to the answer");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(ChatPanel, {
			props: { children: snippet("<p>two turns</p>"), class: "my-panel" },
		});

		expect(root(container).className).toContain("my-panel");
		expect(root(container).className).toContain("ft-panel");
	});
});

describe("ChatEmptyState", () => {
	afterEach(cleanup);

	it("greets with a default title and a decorative mark", () => {
		const { container } = render(ChatEmptyState);

		expect(container.querySelector(".ft-empty-title")?.textContent).toBe("How can I help?");
		expect(container.querySelector(".ft-empty-title")?.tagName).toBe("H2");
		// The greeting carries the meaning; the sparkle is not announced.
		expect(container.querySelector(".ft-empty-icon")?.getAttribute("aria-hidden")).toBe("true");
		expect(container.querySelector(".ft-empty-icon svg")).toBeTruthy();
		expect(container.querySelector(".ft-empty-description")).toBeFalsy();
	});

	it("takes a title and a description", () => {
		const { container } = render(ChatEmptyState, {
			props: { title: "Ask me anything", description: "I can read the docs and cite them." },
		});

		expect(container.querySelector(".ft-empty-title")?.textContent).toBe("Ask me anything");
		expect(container.querySelector(".ft-empty-description")?.textContent?.trim()).toBe(
			"I can read the docs and cite them."
		);
	});

	it("lets a snippet replace the mark, and renders children under the description", () => {
		const { container } = render(ChatEmptyState, {
			props: {
				description: "Pick a starting point.",
				icon: snippet('<span data-testid="icon">✻</span>'),
				children: snippet('<span data-testid="suggestions">pills</span>'),
			},
		});

		expect(container.querySelector('[data-testid="icon"]')).toBeTruthy();
		expect(container.querySelector(".ft-empty-icon svg")).toBeFalsy();
		expect(container.querySelector('[data-testid="suggestions"]')).toBeTruthy();
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(ChatEmptyState, { props: { class: "my-empty" } });
		const el = container.querySelector(".ft-empty") as HTMLElement;

		expect(el.className).toContain("my-empty");
		expect(el.className).toContain("ft-empty");
	});
});
