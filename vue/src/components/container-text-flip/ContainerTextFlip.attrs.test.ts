import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import ContainerTextFlip from "./ContainerTextFlip.vue";

describe("ContainerTextFlip native attributes", () => {
	afterEach(cleanup);

	it("ContainerTextFlip forwards id, data-testid and aria-label to the <p>", () => {
		const { getByTestId } = render(ContainerTextFlip, {
			props: {},
			attrs: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("P");
		expect(el.matches("p")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("ContainerTextFlip picks up an attribute added on a later render", async () => {
		const { container, rerender } = render(ContainerTextFlip, { props: {} });
		const el = container.firstElementChild as HTMLElement;
		expect(el).not.toHaveAttribute("data-late");
		await rerender({ "data-late": "yes" });
		expect(el).toHaveAttribute("data-late", "yes");
	});

	it("ContainerTextFlip keeps its own classes next to a consumer class", () => {
		const { container } = render(ContainerTextFlip, {
			props: { ...{}, class: "extra-x" },
			attrs: { "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("inline-block");
		expect(el?.className).toContain("extra-x");
	});
});
