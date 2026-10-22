import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Badge from "./Badge.vue";

const mount = render as unknown as (
	comp: unknown,
	options: {
		props?: Record<string, unknown>;
		attrs?: Record<string, unknown>;
		slots?: Record<string, unknown>;
	}
) => ReturnType<typeof render>;

afterEach(cleanup);

const slot = { default: "New" };

function root(container: Element): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Badge native attributes", () => {
	it("forwards id, aria-* and data-* to the span", () => {
		const { container } = mount(Badge, {
			slots: slot,
			attrs: {
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
		const onClick = vi.fn();
		const onKeydown = vi.fn();
		const { container } = mount(Badge, { slots: slot, attrs: { onClick, onKeydown } });
		await fireEvent.click(root(container));
		await fireEvent.keyDown(root(container), { key: "a" });
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps its own data-variant and data-size over a consumer value", () => {
		const { container } = mount(Badge, {
			props: { variant: "success", size: "sm" },
			slots: slot,
			attrs: { "data-variant": "x", "data-size": "x" },
		});
		expect(root(container)).toHaveAttribute("data-variant", "success");
		expect(root(container)).toHaveAttribute("data-size", "sm");
	});

	it("merges a consumer class with the base classes", () => {
		const { container } = mount(Badge, { props: { class: "ml-2" }, slots: slot });
		expect(root(container)).toHaveClass("ml-2", "inline-flex");
	});
});
