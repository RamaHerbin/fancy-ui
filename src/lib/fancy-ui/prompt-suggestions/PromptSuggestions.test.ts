import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import PromptSuggestions from "./PromptSuggestions.svelte";

const SUGGESTIONS = ["Summarize this", "Explain the tradeoffs", "Draft a reply"];

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function pills(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll<HTMLButtonElement>(".ft-suggestion")];
}

describe("PromptSuggestions", () => {
	afterEach(cleanup);

	it("renders one pill per suggestion, in order", () => {
		const { container } = render(PromptSuggestions, { props: { suggestions: SUGGESTIONS } });
		const buttons = pills(container);

		expect(buttons).toHaveLength(3);
		expect(buttons.map((b) => b.textContent?.trim())).toEqual(SUGGESTIONS);
	});

	it("renders nothing but the group when the list is empty", () => {
		const { container } = render(PromptSuggestions, { props: { suggestions: [] } });

		expect(pills(container)).toHaveLength(0);
		expect(root(container).getAttribute("role")).toBe("group");
	});

	it("marks every pill as type=button so it never submits a surrounding form", () => {
		const { container } = render(PromptSuggestions, { props: { suggestions: SUGGESTIONS } });

		for (const button of pills(container)) {
			expect(button.getAttribute("type")).toBe("button");
		}
	});

	it("calls onSelect with the suggestion text and its index", async () => {
		const onSelect = vi.fn();
		const { container } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, onSelect },
		});

		await fireEvent.click(pills(container)[1]);

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith("Explain the tradeoffs", 1);
	});

	it("stays inert when no onSelect is given", async () => {
		const { container } = render(PromptSuggestions, { props: { suggestions: SUGGESTIONS } });
		await expect(fireEvent.click(pills(container)[0])).resolves.not.toThrow();
	});

	it("exposes a labelled group, overridable through the label prop", () => {
		const { container } = render(PromptSuggestions, { props: { suggestions: SUGGESTIONS } });
		expect(root(container).getAttribute("aria-label")).toBe("Suggestions");

		cleanup();

		const named = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, label: "Follow-up prompts" },
		});
		expect(root(named.container).getAttribute("aria-label")).toBe("Follow-up prompts");
	});

	it("hides the group when visible is false", async () => {
		const { container, rerender } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, visible: false },
		});

		expect(root(container).style.display).toBe("none");

		await rerender({ suggestions: SUGGESTIONS, visible: true });
		expect(root(container).style.display).toBe("");
	});

	it("staggers each pill by its index off the shared custom property", () => {
		const { container } = render(PromptSuggestions, { props: { suggestions: SUGGESTIONS } });

		expect(root(container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("60ms");

		const delays = pills(container).map((b) => b.style.getPropertyValue("--ft-suggestions-delay"));
		expect(delays).toEqual([
			"calc(var(--ft-suggestions-stagger) * 0)",
			"calc(var(--ft-suggestions-stagger) * 1)",
			"calc(var(--ft-suggestions-stagger) * 2)",
		]);
	});

	it("writes the staggerMs prop into the root custom property", () => {
		const { container } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, staggerMs: 120 },
		});
		expect(root(container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("120ms");
	});

	it("clamps the stagger to a non-negative, bounded delay", () => {
		const { container } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, staggerMs: -40 },
		});
		expect(root(container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("0ms");

		cleanup();

		const huge = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, staggerMs: 9000 },
		});
		expect(root(huge.container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("400ms");
	});

	it("recreates the pills when visible flips false to true, so the entrance replays", async () => {
		const { container, rerender } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, visible: false },
		});

		const before = pills(container);
		await rerender({ suggestions: SUGGESTIONS, visible: true });
		const after = pills(container);

		expect(after).toHaveLength(3);
		expect(after[0]).not.toBe(before[0]);
	});

	it("keeps the same pills when visible stays true", async () => {
		const { container, rerender } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, visible: true },
		});

		const before = pills(container);
		await rerender({ suggestions: SUGGESTIONS, visible: true, staggerMs: 90 });

		expect(pills(container)[0]).toBe(before[0]);
	});

	it("renders the item snippet in place of the plain label", () => {
		const item = createRawSnippet<[string, number]>((suggestion, index) => ({
			render: () => `<span class="custom-pill">${index()}: ${suggestion()}</span>`,
		}));

		const { container } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, item },
		});

		const custom = container.querySelectorAll(".custom-pill");
		expect(custom).toHaveLength(3);
		expect(custom[2].textContent).toBe("2: Draft a reply");
	});

	it("merges the class prop with the base layout classes", () => {
		const { container } = render(PromptSuggestions, {
			props: { suggestions: SUGGESTIONS, class: "mt-4" },
		});
		const cls = root(container).className;

		expect(cls).toContain("flex");
		expect(cls).toContain("flex-wrap");
		expect(cls).toContain("mt-4");
	});
});
