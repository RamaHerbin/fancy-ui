import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import TypingIndicator from "./TypingIndicator.svelte";

describe("TypingIndicator native attributes", () => {
	afterEach(cleanup);

	it("TypingIndicator forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(TypingIndicator, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".inline-flex")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("TypingIndicator keeps its managed attributes authoritative", () => {
		const { getByTestId } = render(TypingIndicator, {
			props: { role: "presentation", "aria-live": "off", "data-testid": "the-el" },
		});
		const el = getByTestId("the-el");
		expect(el).toHaveAttribute("role", "status");
		expect(el).toHaveAttribute("aria-live", "polite");
	});
});
