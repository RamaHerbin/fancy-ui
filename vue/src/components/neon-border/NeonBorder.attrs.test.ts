import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import NeonBorder from "./NeonBorder.vue";

describe("NeonBorder native attributes", () => {
	afterEach(cleanup);

	it("NeonBorder forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(NeonBorder, {
			props: {},
			attrs: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".neon-border-container")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("NeonBorder picks up an attribute added on a later render", async () => {
		const { container, rerender } = render(NeonBorder, { props: {} });
		const el = container.firstElementChild as HTMLElement;
		expect(el).not.toHaveAttribute("data-late");
		await rerender({ "data-late": "yes" });
		expect(el).toHaveAttribute("data-late", "yes");
	});

	it("NeonBorder keeps its own classes next to a consumer class", () => {
		const { container } = render(NeonBorder, {
			props: { ...{}, class: "extra-x" },
			attrs: { "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("neon-border-container");
		expect(el?.className).toContain("extra-x");
	});
});
