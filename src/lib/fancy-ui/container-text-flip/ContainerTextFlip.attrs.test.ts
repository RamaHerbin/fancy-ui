import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ContainerTextFlip from "./ContainerTextFlip.svelte";

describe("ContainerTextFlip native attributes", () => {
	afterEach(cleanup);

	it("ContainerTextFlip forwards id, data-testid and aria-label to the <p>", () => {
		const { getByTestId } = render(ContainerTextFlip, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("P");
		expect(el.matches("p")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("ContainerTextFlip keeps its own classes next to a consumer class", () => {
		const { container } = render(ContainerTextFlip, {
			props: { class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("inline-block");
		expect(el?.className).toContain("extra-x");
	});
});
