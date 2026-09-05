import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { PromptSuggestions } from "./PromptSuggestions.js";
import { sound } from "../../sound/sound.js";

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
		const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} />);
		const buttons = pills(container);

		expect(buttons).toHaveLength(3);
		expect(buttons.map((b) => b.textContent?.trim())).toEqual(SUGGESTIONS);
	});

	it("renders nothing but the group when the list is empty", () => {
		const { container } = render(<PromptSuggestions suggestions={[]} />);

		expect(pills(container)).toHaveLength(0);
		expect(root(container).getAttribute("role")).toBe("group");
	});

	it("marks every pill as type=button so it never submits a surrounding form", () => {
		const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} />);

		for (const button of pills(container)) {
			expect(button.getAttribute("type")).toBe("button");
		}
	});

	it("calls onSelect with the suggestion text and its index", async () => {
		const onSelect = vi.fn();
		const { container } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} onSelect={onSelect} />
		);

		await fireEvent.click(pills(container)[1]!);

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith("Explain the tradeoffs", 1);
	});

	it("stays inert when no onSelect is given", () => {
		const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} />);
		expect(() => fireEvent.click(pills(container)[0]!)).not.toThrow();
	});

	it("exposes a labelled group, overridable through the label prop", () => {
		const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} />);
		expect(root(container).getAttribute("aria-label")).toBe("Suggestions");

		cleanup();

		const named = render(
			<PromptSuggestions suggestions={SUGGESTIONS} label="Follow-up prompts" />
		);
		expect(root(named.container).getAttribute("aria-label")).toBe("Follow-up prompts");
	});

	it("hides the group when visible is false", async () => {
		const { container, rerender } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} visible={false} />
		);

		expect(root(container).style.display).toBe("none");

		rerender(<PromptSuggestions suggestions={SUGGESTIONS} visible={true} />);
		expect(root(container).style.display).toBe("");
	});

	it("staggers each pill by its index off the shared custom property, defaulting through CSS", () => {
		const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} />);

		// No staggerMs given: the inline property is left unset so an ancestor's
		// own --ft-suggestions-stagger can theme the subtree; the 60ms default
		// only applies as the CSS fallback below.
		expect(root(container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("");

		const delays = pills(container).map((b) =>
			b.style.getPropertyValue("--ft-suggestions-delay")
		);
		expect(delays).toEqual([
			"calc(var(--ft-suggestions-stagger, 60ms) * 0)",
			"calc(var(--ft-suggestions-stagger, 60ms) * 1)",
			"calc(var(--ft-suggestions-stagger, 60ms) * 2)",
		]);
	});

	it("writes the staggerMs prop into the root custom property", () => {
		const { container } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} staggerMs={120} />
		);
		expect(root(container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("120ms");
	});

	it("clamps the stagger to a non-negative, bounded delay", () => {
		const { container } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} staggerMs={-40} />
		);
		expect(root(container).style.getPropertyValue("--ft-suggestions-stagger")).toBe("0ms");

		cleanup();

		const huge = render(<PromptSuggestions suggestions={SUGGESTIONS} staggerMs={9000} />);
		expect(huge.container.firstElementChild).not.toBeNull();
		expect(root(huge.container).style.getPropertyValue("--ft-suggestions-stagger")).toBe(
			"400ms"
		);
	});

	it("recreates the pills when visible flips false to true, so the entrance replays", async () => {
		const { container, rerender } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} visible={false} />
		);

		const before = pills(container);
		rerender(<PromptSuggestions suggestions={SUGGESTIONS} visible={true} />);
		const after = pills(container);

		expect(after).toHaveLength(3);
		expect(after[0]).not.toBe(before[0]);
	});

	it("keeps the same pills when visible stays true", async () => {
		const { container, rerender } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} visible={true} />
		);

		const before = pills(container);
		rerender(<PromptSuggestions suggestions={SUGGESTIONS} visible={true} staggerMs={90} />);

		expect(pills(container)[0]!).toBe(before[0]);
	});

	it("renders the item snippet in place of the plain label", () => {
		const { container } = render(
			<PromptSuggestions
				suggestions={SUGGESTIONS}
				item={(suggestion, index) => (
					<span className="custom-pill">
						{index}: {suggestion}
					</span>
				)}
			/>
		);

		const custom = container.querySelectorAll(".custom-pill");
		expect(custom).toHaveLength(3);
		expect(custom[2]!.textContent).toBe("2: Draft a reply");
	});

	it("merges the class prop with the base layout classes", () => {
		const { container } = render(
			<PromptSuggestions suggestions={SUGGESTIONS} className="mt-4" />
		);
		const cls = root(container).className;

		expect(cls).toContain("flex");
		expect(cls).toContain("flex-wrap");
		expect(cls).toContain("mt-4");
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the select cue exactly once when a pill is picked with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} sound />);

			await fireEvent.click(pills(container)[1]!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<PromptSuggestions suggestions={SUGGESTIONS} />);

			await fireEvent.click(pills(container)[0]!);

			expect(play).not.toHaveBeenCalled();
		});

		it("reports the right suggestion and index alongside the cue, one pick at a time", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onSelect = vi.fn();
			const { container } = render(
				<PromptSuggestions suggestions={SUGGESTIONS} sound onSelect={onSelect} />
			);

			await fireEvent.click(pills(container)[2]!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenCalledWith("Draft a reply", 2);
		});

		it("never plays when the staggered entrance replays — only a pick plays the cue", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { rerender } = render(
				<PromptSuggestions suggestions={SUGGESTIONS} sound visible={false} />
			);

			rerender(<PromptSuggestions suggestions={SUGGESTIONS} sound visible={true} />);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
