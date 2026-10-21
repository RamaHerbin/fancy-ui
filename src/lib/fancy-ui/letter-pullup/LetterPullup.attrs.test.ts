import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import LetterPullup from "./LetterPullup.svelte";

describe("LetterPullup native attributes", () => {
	afterEach(cleanup);

	it("LetterPullup forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(LetterPullup, {
			props: { words: "hi", id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".letter-pullup")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("LetterPullup keeps its own classes when a class is passed", () => {
		const { container } = render(LetterPullup, {
			props: { words: "hi", class: "extra-x", "data-testid": "the-el" },
		});
		const root = container.querySelector(".letter-pullup") as HTMLElement;
		expect(root).toBeTruthy();
		expect(container.querySelector(".letter-pullup-char")?.className).toContain("extra-x");
	});
});
