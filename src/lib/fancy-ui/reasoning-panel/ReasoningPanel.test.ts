import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ReasoningPanel from "./ReasoningPanel.svelte";

/** Longer than the component's internal auto-collapse delay. */
const PAST_AUTO_COLLAPSE = 1000;

function header(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button[aria-expanded]") as HTMLButtonElement;
}

function body(container: HTMLElement): HTMLElement {
	const id = header(container).getAttribute("aria-controls") as string;
	return container.querySelector(`#${id}`) as HTMLElement;
}

describe("ReasoningPanel", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the label and the trace text", () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, {
			props: { text: "First I check the schema.", label: "Thinking" },
		});

		expect(header(container).textContent).toContain("Thinking");
		expect(body(container).textContent).toBe("First I check the schema.");
	});

	it("starts collapsed and points the header at the trace it controls", () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, { props: { text: "trace" } });

		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(header(container).getAttribute("aria-controls")).toBe(body(container).id);
		expect(body(container).getAttribute("role")).toBe("group");
	});

	it("toggles aria-expanded on click and reports every flip through onToggle", async () => {
		vi.useFakeTimers();
		const onToggle = vi.fn();
		const { container } = render(ReasoningPanel, { props: { text: "trace", onToggle } });

		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
		expect(onToggle).toHaveBeenLastCalledWith(true);

		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(onToggle).toHaveBeenLastCalledWith(false);
		expect(onToggle).toHaveBeenCalledTimes(2);
	});

	it("opens on its own while streaming", () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, {
			props: { text: "trace", streaming: true },
		});

		expect(header(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("collapses a beat after streaming ends when the reader never intervened", async () => {
		vi.useFakeTimers();
		const onToggle = vi.fn();
		const { container, rerender } = render(ReasoningPanel, {
			props: { text: "trace", streaming: true, onToggle },
		});
		expect(header(container).getAttribute("aria-expanded")).toBe("true");

		await rerender({ text: "trace", streaming: false, onToggle });
		// Still open: the summary needs a moment to be read before it folds.
		expect(header(container).getAttribute("aria-expanded")).toBe("true");

		await vi.advanceTimersByTimeAsync(PAST_AUTO_COLLAPSE);
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(onToggle).toHaveBeenLastCalledWith(false);
	});

	it("never collapses on its own once the reader has toggled it", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ReasoningPanel, {
			props: { text: "trace", streaming: true },
		});

		// Close then reopen by hand: the panel is the reader's from here on.
		await fireEvent.click(header(container));
		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("true");

		await rerender({ text: "trace", streaming: false });
		await vi.advanceTimersByTimeAsync(PAST_AUTO_COLLAPSE);
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("does not reopen on a later burst once the reader has closed it", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ReasoningPanel, {
			props: { text: "trace", streaming: false },
		});

		await fireEvent.click(header(container));
		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("false");

		await rerender({ text: "trace", streaming: true });
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
	});

	it("summarises a finished trace with the duration it was handed", () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, {
			props: { text: "trace", durationMs: 12_000 },
		});

		expect(header(container).textContent).toContain("Thought for 12s");
	});

	it("falls back to the duration it measured itself", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ReasoningPanel, {
			props: { text: "trace", streaming: true, since: Date.now() - 42_000 },
		});

		await rerender({ text: "trace", streaming: false });
		expect(header(container).textContent).toContain("Thought for 42s");
	});

	it("says nothing about duration before anything has been timed", () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, { props: { text: "trace" } });

		expect(header(container).textContent).not.toContain("Thought for");
	});

	it("lands appended text in the DOM", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ReasoningPanel, {
			props: { text: "First I check the schema.", streaming: true },
		});

		await rerender({
			text: "First I check the schema. Then I compare it to the query.",
			streaming: true,
		});
		expect(body(container).textContent).toBe(
			"First I check the schema. Then I compare it to the query."
		);
	});

	it("holds the collapsed trace inert, and releases it when expanded", async () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, { props: { text: "trace" } });
		// jsdom does not implement inert, so Svelte's property assignment is what
		// there is to check — it is also what applies inertness in a real browser.
		expect(body(container).inert).toBe(true);

		await fireEvent.click(header(container));
		expect(body(container).inert).toBe(false);
	});

	it("applies the scroll cap and merges custom classes", () => {
		vi.useFakeTimers();
		const { container } = render(ReasoningPanel, {
			props: { text: "trace", maxHeight: "20rem", class: "my-panel" },
		});

		expect((container.firstElementChild as HTMLElement).className).toContain("my-panel");
		expect(body(container).getAttribute("style")).toContain("max-height: 20rem");
	});

	it("leaves no timer running after unmount", async () => {
		vi.useFakeTimers();
		const { rerender, unmount } = render(ReasoningPanel, {
			props: { text: "trace", streaming: true },
		});

		await rerender({ text: "trace", streaming: false });
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		expect(() => unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});
});
