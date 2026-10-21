import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import NeonBorder from "./NeonBorder.svelte";

describe("NeonBorder native attributes", () => {
	afterEach(cleanup);

	it("NeonBorder forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(NeonBorder, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".neon-border-container")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("NeonBorder keeps its own classes next to a consumer class", () => {
		const { container } = render(NeonBorder, {
			props: { class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("neon-border-container");
		expect(el?.className).toContain("extra-x");
	});
});
