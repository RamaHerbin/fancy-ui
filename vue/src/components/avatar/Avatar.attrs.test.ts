import { render, cleanup, fireEvent, screen } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Avatar from "./Avatar.vue";

const mount = render as unknown as (
	comp: unknown,
	options: { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
) => ReturnType<typeof render>;

afterEach(cleanup);

function root(container: Element): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Avatar native attributes", () => {
	it("forwards id, aria-describedby and data-* to the root span", () => {
		const { container } = mount(Avatar, {
			props: { name: "Maya Okafor" },
			attrs: { id: "me", "aria-describedby": "hint", "data-testid": "avatar" },
		});
		const el = root(container);
		expect(el.tagName).toBe("SPAN");
		expect(el).toHaveAttribute("id", "me");
		expect(el).toHaveAttribute("aria-describedby", "hint");
		expect(el).toHaveAttribute("data-testid", "avatar");
	});

	it("fires a listener the component does not handle exactly once", async () => {
		const onClick = vi.fn();
		const onKeydown = vi.fn();
		const { container } = mount(Avatar, {
			props: { name: "Maya Okafor" },
			attrs: { onClick, onKeydown },
		});
		await fireEvent.click(root(container));
		await fireEvent.keyDown(root(container), { key: "a" });
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps the image role and name authoritative over a consumer role and aria-label", () => {
		mount(Avatar, {
			props: { name: "Maya Okafor" },
			attrs: { role: "button", "aria-label": "Other", "aria-hidden": "true" },
		});
		expect(screen.getByRole("img", { name: "Maya Okafor" })).toBeInTheDocument();
	});

	it("keeps a decorative avatar hidden whatever the consumer passes", () => {
		const { container } = mount(Avatar, {
			props: { name: "Maya Okafor", alt: "" },
			attrs: { role: "button" },
		});
		expect(root(container)).toHaveAttribute("aria-hidden", "true");
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("lets a consumer role and aria-label through when the component sets none", () => {
		const { container } = mount(Avatar, { props: {}, attrs: { role: "presentation" } });
		expect(root(container)).toHaveAttribute("role", "presentation");
	});

	it("keeps its own data-size, data-shape and data-status over a consumer value", () => {
		const { container } = mount(Avatar, {
			props: { name: "Maya", size: "lg" },
			attrs: { "data-size": "x", "data-shape": "x", "data-status": "x" },
		});
		const el = root(container);
		expect(el).toHaveAttribute("data-size", "lg");
		expect(el).toHaveAttribute("data-shape", "circle");
		expect(el).toHaveAttribute("data-status", "fallback");
	});

	it("merges a consumer class with the base classes", () => {
		const { container } = mount(Avatar, { props: { name: "Maya", class: "ring-2" } });
		expect(root(container)).toHaveClass("ring-2", "inline-flex");
	});
});
