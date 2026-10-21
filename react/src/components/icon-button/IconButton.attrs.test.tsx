import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { IconButton } from "./IconButton.js";

const icon = (
	<svg aria-hidden="true">
		<path d="M4 4h8v8H4z" />
	</svg>
);

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

describe("IconButton native attributes", () => {
	afterEach(cleanup);

	it.each([
		["button", {}, "BUTTON"],
		["anchor", { href: "/x" }, "A"],
	] as const)("forwards id, aria-* and data-* to the %s", (_name, extra, tag) => {
		const { container } = render(
			<IconButton label="Edit" {...extra} id="edit" aria-describedby="hint" data-testid="ib">
				{icon}
			</IconButton>
		);
		const el = root(container);
		expect(el.tagName).toBe(tag);
		expect(el.id).toBe("edit");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("ib");
		expect(el.getAttribute("aria-label")).toBe("Edit");
	});

	it("fires a listener the component does not handle once", () => {
		const onKeyDown = vi.fn();
		const { container } = render(
			<IconButton label="Edit" onKeyDown={onKeyDown}>
				{icon}
			</IconButton>
		);
		fireEvent.keyDown(root(container), { key: "a" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("keeps the label authoritative over a consumer aria-label", () => {
		const { container } = render(
			<IconButton label="Edit" aria-label="Other">
				{icon}
			</IconButton>
		);
		expect(root(container).getAttribute("aria-label")).toBe("Edit");
	});

	it("keeps a disabled link inert whatever the consumer passes", () => {
		const { container } = render(
			<IconButton label="Go" href="/x" disabled tabIndex={0}>
				{icon}
			</IconButton>
		);
		expect(root(container).getAttribute("tabindex")).toBe("-1");
	});
});
