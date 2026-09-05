import { StrictMode } from "react";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ReasoningPanel } from "./ReasoningPanel.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";

/** Longer than the component's internal auto-collapse delay. */
const PAST_AUTO_COLLAPSE = 1000;

function header(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button[aria-expanded]") as HTMLButtonElement;
}

function body(container: HTMLElement): HTMLElement {
	const id = header(container).getAttribute("aria-controls") as string;
	return container.querySelector(`[id="${id}"]`) as HTMLElement;
}

describe("ReasoningPanel", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the label and the trace text", () => {
		vi.useFakeTimers();
		const { container } = render(
			<ReasoningPanel text="First I check the schema." label="Thinking" />
		);

		expect(header(container).textContent).toContain("Thinking");
		expect(body(container).textContent).toBe("First I check the schema.");
	});

	it("starts collapsed and points the header at the trace it controls", () => {
		vi.useFakeTimers();
		const { container } = render(<ReasoningPanel text="trace" />);

		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(header(container).getAttribute("aria-controls")).toBe(body(container).id);
		expect(body(container).getAttribute("role")).toBe("group");
	});

	it("toggles aria-expanded on click and reports every flip through onToggle", async () => {
		vi.useFakeTimers();
		const onToggle = vi.fn();
		const { container } = render(<ReasoningPanel text="trace" onToggle={onToggle} />);

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
		const { container } = render(<ReasoningPanel text="trace" streaming />);

		expect(header(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("collapses a beat after streaming ends when the reader never intervened", async () => {
		vi.useFakeTimers();
		const onToggle = vi.fn();
		const { container, rerender } = render(
			<ReasoningPanel text="trace" streaming onToggle={onToggle} />
		);
		expect(header(container).getAttribute("aria-expanded")).toBe("true");

		rerender(<ReasoningPanel text="trace" streaming={false} onToggle={onToggle} />);
		// Still open: the summary needs a moment to be read before it folds.
		expect(header(container).getAttribute("aria-expanded")).toBe("true");

		await act(async () => void (await vi.advanceTimersByTimeAsync(PAST_AUTO_COLLAPSE)));
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(onToggle).toHaveBeenLastCalledWith(false);
	});

	it("never collapses on its own once the reader has toggled it", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(<ReasoningPanel text="trace" streaming />);

		// Close then reopen by hand: the panel is the reader's from here on.
		await fireEvent.click(header(container));
		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("true");

		rerender(<ReasoningPanel text="trace" streaming={false} />);
		await act(async () => void (await vi.advanceTimersByTimeAsync(PAST_AUTO_COLLAPSE)));
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("does not reopen on a later burst once the reader has closed it", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(<ReasoningPanel text="trace" streaming={false} />);

		await fireEvent.click(header(container));
		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("false");

		rerender(<ReasoningPanel text="trace" streaming />);
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
	});

	it("summarises a finished trace with the duration it was handed", () => {
		vi.useFakeTimers();
		const { container } = render(<ReasoningPanel text="trace" durationMs={12_000} />);

		expect(header(container).textContent).toContain("Thought for 12s");
	});

	it("falls back to the duration it measured itself", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(
			<ReasoningPanel text="trace" streaming since={Date.now() - 42_000} />
		);

		rerender(<ReasoningPanel text="trace" streaming={false} />);
		expect(header(container).textContent).toContain("Thought for 42s");
	});

	it("says nothing about duration before anything has been timed", () => {
		vi.useFakeTimers();
		const { container } = render(<ReasoningPanel text="trace" />);

		expect(header(container).textContent).not.toContain("Thought for");
	});

	it("lands appended text in the DOM", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(
			<ReasoningPanel text="First I check the schema." streaming />
		);

		rerender(
			<ReasoningPanel text="First I check the schema. Then I compare it to the query." streaming />
		);
		expect(body(container).textContent).toBe(
			"First I check the schema. Then I compare it to the query."
		);
	});

	it("holds the collapsed trace inert, and releases it when expanded", async () => {
		vi.useFakeTimers();
		const { container } = render(<ReasoningPanel text="trace" />);
		// jsdom implements no `inert` IDL property, so the attribute — which is
		// what React renders and what `:not([inert])` selectors and assistive
		// tech read — is what there is to check.
		expect(body(container).hasAttribute("inert")).toBe(true);

		await fireEvent.click(header(container));
		expect(body(container).hasAttribute("inert")).toBe(false);
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
		vi.useFakeTimers();
		const { container } = render(<ReasoningPanel text="trace" />);
		const inertWrites = spy.mock.calls.filter(([name]) => name === "inert");
		const applied = body(container).hasAttribute("inert");
		spy.mockRestore();

		expect(inertWrites).toContainEqual(["inert", true]);
		expect(applied).toBe(true);
	});
	it("applies the scroll cap and merges custom classes", () => {
		vi.useFakeTimers();
		const { container } = render(
			<ReasoningPanel text="trace" maxHeight="20rem" className="my-panel" />
		);

		expect((container.firstElementChild as HTMLElement).className).toContain("my-panel");
		expect(body(container).getAttribute("style")).toContain("max-height: 20rem");
	});

	it("leaves no timer running after unmount", async () => {
		vi.useFakeTimers();
		const { rerender, unmount } = render(<ReasoningPanel text="trace" streaming />);

		rerender(<ReasoningPanel text="trace" streaming={false} />);
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		expect(() => unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("announces onToggle when a consumer rewrites the open prop directly", async () => {
		// A rewritten `open` prop never reaches the internal commit path, and
		// the README promises every change is announced.
		vi.useFakeTimers();
		const onToggle = vi.fn();
		const { container, rerender } = render(
			<ReasoningPanel text="trace" open={false} onToggle={onToggle} />
		);

		rerender(<ReasoningPanel text="trace" open onToggle={onToggle} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
		expect(onToggle).toHaveBeenLastCalledWith(true);

		rerender(<ReasoningPanel text="trace" open={false} onToggle={onToggle} />);
		expect(onToggle).toHaveBeenLastCalledWith(false);
		expect(onToggle).toHaveBeenCalledTimes(2);
	});

	it("reports the same open sequence under StrictMode as it does without it", () => {
		// StrictMode rehearses the mount effect with no render in between, so
		// `commit` has to see its own pending decision rather than the state the
		// last committed render published — otherwise the streaming auto-open
		// commits, and announces itself, a second time.
		vi.useFakeTimers();
		const plain = vi.fn();
		const first = render(<ReasoningPanel text="trace" streaming onToggle={plain} />);
		first.unmount();

		const strict = vi.fn();
		const { container } = render(
			<StrictMode>
				<ReasoningPanel text="trace" streaming onToggle={strict} />
			</StrictMode>
		);

		expect(strict.mock.calls).toEqual(plain.mock.calls);
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when the reader expands the trace, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			vi.useFakeTimers();
			const { container } = render(<ReasoningPanel text="trace" sound />);

			await fireEvent.click(header(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays close exactly once when the reader folds the trace back", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			vi.useFakeTimers();
			const { container } = render(<ReasoningPanel text="trace" sound />);

			await fireEvent.click(header(container));
			play.mockClear();
			await fireEvent.click(header(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			vi.useFakeTimers();
			const { container } = render(<ReasoningPanel text="trace" />);

			await fireEvent.click(header(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent when streaming opens the panel on its own", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			vi.useFakeTimers();
			render(<ReasoningPanel text="trace" streaming sound />);

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent when the 600ms auto-collapse folds the panel on its own", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			vi.useFakeTimers();
			const { container, rerender } = render(<ReasoningPanel text="trace" streaming sound />);

			rerender(<ReasoningPanel text="trace" streaming={false} sound />);
			await act(async () => void (await vi.advanceTimersByTimeAsync(PAST_AUTO_COLLAPSE)));

			expect(header(container).getAttribute("aria-expanded")).toBe("false");
			expect(play).not.toHaveBeenCalled();
		});
	});
});
