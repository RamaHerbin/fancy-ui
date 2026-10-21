import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import TerminalBlock from "./TerminalBlock.svelte";

describe("TerminalBlock native attributes", () => {
	afterEach(cleanup);

	it("TerminalBlock forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(TerminalBlock, {
			props: { output: "hi", id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".ft-terminal")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("TerminalBlock keeps its own classes next to a consumer class", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "hi", class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("ft-terminal");
		expect(el?.className).toContain("extra-x");
	});
});
