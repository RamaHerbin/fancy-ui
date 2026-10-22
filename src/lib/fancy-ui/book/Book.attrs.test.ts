import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Book from "./Book.svelte";
import BookTitle from "./BookTitle.svelte";
import BookDescription from "./BookDescription.svelte";
import BookHeader from "./BookHeader.svelte";

describe("Book native attributes", () => {
	afterEach(cleanup);

	it("Book forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(Book, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".group")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("Book keeps its own classes next to a consumer class", () => {
		const { container } = render(Book, { props: { class: "extra-x", "data-testid": "the-el" } });
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("group");
		expect(el?.className).toContain("extra-x");
	});

	it("BookTitle forwards id, data-testid and aria-label to the <h1>", () => {
		const { getByTestId } = render(BookTitle, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("H1");
		expect(el.matches("h1")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BookTitle keeps its own classes next to a consumer class", () => {
		const { container } = render(BookTitle, {
			props: { class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("select-none");
		expect(el?.className).toContain("extra-x");
	});

	it("BookDescription forwards id, data-testid and aria-label to the <p>", () => {
		const { getByTestId } = render(BookDescription, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("P");
		expect(el.matches("p")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BookDescription keeps its own classes next to a consumer class", () => {
		const { container } = render(BookDescription, {
			props: { class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("select-none");
		expect(el?.className).toContain("extra-x");
	});

	it("BookHeader forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(BookHeader, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".flex-wrap")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BookHeader keeps its own classes next to a consumer class", () => {
		const { container } = render(BookHeader, {
			props: { class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("flex-wrap");
		expect(el?.className).toContain("extra-x");
	});
});
