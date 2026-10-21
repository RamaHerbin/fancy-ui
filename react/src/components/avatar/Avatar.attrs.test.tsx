import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Avatar } from "./Avatar.js";

afterEach(cleanup);

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Avatar native attributes", () => {
	it("forwards id, aria-describedby and data-* to the root span", () => {
		const { container } = render(
			<Avatar name="Maya Okafor" id="me" aria-describedby="hint" data-testid="avatar" />
		);
		const el = root(container);
		expect(el.tagName).toBe("SPAN");
		expect(el).toHaveAttribute("id", "me");
		expect(el).toHaveAttribute("aria-describedby", "hint");
		expect(el).toHaveAttribute("data-testid", "avatar");
	});

	it("fires a listener the component does not handle exactly once", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		const { container } = render(
			<Avatar name="Maya Okafor" onClick={onClick} onKeyDown={onKeyDown} />
		);
		fireEvent.click(root(container));
		fireEvent.keyDown(root(container), { key: "a" });
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("keeps the image role and name authoritative over a consumer role and aria-label", () => {
		render(<Avatar name="Maya Okafor" role="button" aria-label="Other" aria-hidden="true" />);
		expect(screen.getByRole("img", { name: "Maya Okafor" })).toBeInTheDocument();
	});

	it("keeps a decorative avatar hidden whatever the consumer passes", () => {
		const { container } = render(<Avatar name="Maya Okafor" alt="" role="button" />);
		expect(root(container)).toHaveAttribute("aria-hidden", "true");
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("lets a consumer role and aria-label through when the component sets none", () => {
		const { container } = render(<Avatar role="presentation" />);
		expect(root(container)).toHaveAttribute("role", "presentation");
	});

	it("keeps its own data-size, data-shape and data-status over a consumer value", () => {
		const { container } = render(
			<Avatar name="Maya" size="lg" data-size="x" data-shape="x" data-status="x" />
		);
		const el = root(container);
		expect(el).toHaveAttribute("data-size", "lg");
		expect(el).toHaveAttribute("data-shape", "circle");
		expect(el).toHaveAttribute("data-status", "fallback");
	});

	it("merges a consumer className with the base classes", () => {
		const { container } = render(<Avatar name="Maya" className="ring-2" />);
		expect(root(container)).toHaveClass("ring-2", "inline-flex");
	});
});
