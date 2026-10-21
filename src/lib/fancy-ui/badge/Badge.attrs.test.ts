import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Badge from "./Badge.svelte";

afterEach(cleanup);

const children = createRawSnippet(() => ({ render: () => "<span>New</span>" }));

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Badge native attributes", () => {
	it("forwards id, aria-* and data-* to the span", () => {
		const { container } = render(Badge, {
			props: {
				children,
				id: "b",
				"aria-describedby": "hint",
				"aria-label": "New items",
				"data-testid": "badge",
				title: "Fresh",
			},
		});
		const el = root(container);
		expect(el.tagName).toBe("SPAN");
		expect(el).toHaveAttribute("id", "b");
		expect(el).toHaveAttribute("aria-describedby", "hint");
		expect(el).toHaveAttribute("aria-label", "New items");
		expect(el).toHaveAttribute("data-testid", "badge");
		expect(el).toHaveAttribute("title", "Fresh");
	});

	it("fires a listener the component does not handle exactly once", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		const { container } = render(Badge, { props: { children, onclick, onkeydown } });
		await fireEvent.click(root(container));
		await fireEvent.keyDown(root(container), { key: "a" });
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(onkeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps its own data-variant and data-size over a consumer value", () => {
		const { container } = render(Badge, {
			props: { children, variant: "success", size: "sm", "data-variant": "x", "data-size": "x" },
		});
		expect(root(container)).toHaveAttribute("data-variant", "success");
		expect(root(container)).toHaveAttribute("data-size", "sm");
	});

	it("merges a consumer class with the base classes", () => {
		const { container } = render(Badge, { props: { children, class: "ml-2" } });
		expect(root(container)).toHaveClass("ml-2", "inline-flex");
	});
});
