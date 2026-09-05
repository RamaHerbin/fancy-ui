import { render, cleanup } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { StreamingText } from "./StreamingText.js";

describe("StreamingText", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the accumulated text in full on first paint, with nothing animating", () => {
		vi.useFakeTimers();
		const { container } = render(<StreamingText text="Partial answer" />);
		const root = container.firstElementChild as HTMLElement;

		expect(root.textContent).toBe("Partial answer");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("tints only the appended delta in plain mode, then folds it in once settled", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(<StreamingText text="The answer" settleMs={100} />);
		const root = container.firstElementChild as HTMLElement;

		rerender(<StreamingText text="The answer is" settleMs={100} />);
		const fresh = container.querySelector(".ft-fresh");
		expect(fresh?.textContent).toBe(" is");
		expect(root.textContent).toBe("The answer is");

		// The settle timer publishes into the stream store from outside React,
		// so the flush it triggers has to be act-wrapped like any other update.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
		expect(root.textContent).toBe("The answer is");
	});

	it("renders markdown structure when markdown is set, with no delta span", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(
			<StreamingText text="A **bold** claim" markdown settleMs={100} />,
		);

		expect(container.querySelector("p")?.textContent).toBe("A bold claim");
		expect(container.querySelector("strong")?.textContent).toBe("bold");

		// Markdown mode re-parses the whole document, so growth produces no delta.
		rerender(<StreamingText text="A **bold** claim, restated" markdown settleMs={100} />);
		expect(container.querySelector("p")?.textContent).toBe("A bold claim, restated");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();
	});

	it("shows the cursor only while streaming", async () => {
		const { container, rerender } = render(<StreamingText text="Thinking" streaming />);

		expect(container.querySelector(".ft-streaming-cursor")).toBeTruthy();

		rerender(<StreamingText text="Thinking" streaming={false} />);
		expect(container.querySelector(".ft-streaming-cursor")).toBeFalsy();
	});

	it("fires onComplete once on the true to false edge, and never on mount", async () => {
		const onComplete = vi.fn();
		const { rerender } = render(
			<StreamingText text="Done" streaming={false} onComplete={onComplete} />,
		);

		expect(onComplete).not.toHaveBeenCalled();

		rerender(<StreamingText text="Done" streaming onComplete={onComplete} />);
		expect(onComplete).not.toHaveBeenCalled();

		rerender(<StreamingText text="Done" streaming={false} onComplete={onComplete} />);
		expect(onComplete).toHaveBeenCalledTimes(1);

		// Unrelated updates while settled must not re-report completion.
		rerender(<StreamingText text="Done." streaming={false} onComplete={onComplete} />);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("does not fire onComplete when it mounts already settled", async () => {
		const onComplete = vi.fn();
		const { rerender } = render(
			<StreamingText text="Cached transcript" streaming={false} onComplete={onComplete} />,
		);

		rerender(<StreamingText text="Cached transcript!" streaming={false} onComplete={onComplete} />);
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("merges custom classes and exposes the tint colour as a custom property", () => {
		const { container } = render(<StreamingText text="x" className="text-sm" tintColor="#ff0066" />);
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("ft-streaming-text");
		expect(root.className).toContain("text-sm");
		expect(root.getAttribute("style")).toContain("--ft-tint-color: #ff0066");
	});

	it("keeps the cursor beside the final character in markdown mode", () => {
		// Markdown renders block children: a cursor appended after the document
		// would drop to its own line under it instead of trailing the text.
		const { container } = render(<StreamingText text="A **bold** claim" markdown streaming />);

		const paragraph = container.querySelector(".ft-md-p");
		expect(paragraph?.querySelector(".ft-streaming-cursor")).toBeTruthy();
		expect(paragraph?.lastElementChild?.className).toContain("ft-streaming-cursor");
	});

	it("drops the markdown cursor as soon as the stream settles", () => {
		const { container } = render(<StreamingText text="Done." markdown streaming={false} />);
		expect(container.querySelector(".ft-streaming-cursor")).toBeNull();
	});
});
