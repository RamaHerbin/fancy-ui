import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { TypingIndicator } from "./TypingIndicator.js";

describe("TypingIndicator native attributes", () => {
	afterEach(cleanup);

	it("TypingIndicator forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(
			<TypingIndicator id={"the-id"} data-testid={"the-el"} aria-label={"the label"} />
		);
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".inline-flex")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("TypingIndicator keeps its managed attributes authoritative", () => {
		const { getByTestId } = render(
			<TypingIndicator role={"presentation"} aria-live={"off"} data-testid={"the-el"} />
		);
		const el = getByTestId("the-el");
		expect(el).toHaveAttribute("role", "status");
		expect(el).toHaveAttribute("aria-live", "polite");
	});
});
