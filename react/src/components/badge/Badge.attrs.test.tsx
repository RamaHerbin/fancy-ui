import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge.js";

afterEach(cleanup);

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Badge native attributes", () => {
	it("forwards id, aria-* and data-* to the span", () => {
		const { container } = render(
			<Badge
				id="b"
				aria-describedby="hint"
				aria-label="New items"
				data-testid="badge"
				title="Fresh"
			>
				New
			</Badge>
		);
		const el = root(container);
		expect(el.tagName).toBe("SPAN");
		expect(el).toHaveAttribute("id", "b");
		expect(el).toHaveAttribute("aria-describedby", "hint");
		expect(el).toHaveAttribute("aria-label", "New items");
		expect(el).toHaveAttribute("data-testid", "badge");
		expect(el).toHaveAttribute("title", "Fresh");
	});

	it("fires a listener the component does not handle exactly once", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		const { container } = render(
			<Badge onClick={onClick} onKeyDown={onKeyDown}>
				New
			</Badge>
		);
		fireEvent.click(root(container));
		fireEvent.keyDown(root(container), { key: "a" });
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("keeps its own data-variant and data-size over a consumer value", () => {
		const { container } = render(
			<Badge variant="success" size="sm" data-variant="x" data-size="x">
				New
			</Badge>
		);
		expect(root(container)).toHaveAttribute("data-variant", "success");
		expect(root(container)).toHaveAttribute("data-size", "sm");
	});

	it("merges a consumer className with the base classes", () => {
		const { container } = render(<Badge className="ml-2">New</Badge>);
		expect(root(container)).toHaveClass("ml-2", "inline-flex");
	});
});
