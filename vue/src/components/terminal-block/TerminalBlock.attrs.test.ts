import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import TerminalBlock from "./TerminalBlock.vue";

describe("TerminalBlock native attributes", () => {
	afterEach(cleanup);

	it("TerminalBlock forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(TerminalBlock, {
			props: { output: "hi" },
			attrs: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".ft-terminal")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("TerminalBlock picks up an attribute added on a later render", async () => {
		const { container, rerender } = render(TerminalBlock, { props: { output: "hi" } });
		const el = container.firstElementChild as HTMLElement;
		expect(el).not.toHaveAttribute("data-late");
		await rerender({ "data-late": "yes" });
		expect(el).toHaveAttribute("data-late", "yes");
	});

	it("TerminalBlock keeps its own classes next to a consumer class", () => {
		const { container } = render(TerminalBlock, {
			props: { ...{ output: "hi" }, class: "extra-x" },
			attrs: { "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("ft-terminal");
		expect(el?.className).toContain("extra-x");
	});
});
