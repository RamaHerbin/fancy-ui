import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import IconButton from "./IconButton.svelte";

const icon = () =>
	createRawSnippet(() => ({
		render: () => '<svg aria-hidden="true"><path d="M4 4h8v8H4z" /></svg>',
	}));

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

describe("IconButton native attributes", () => {
	afterEach(cleanup);

	it.each([
		["button", {}, "BUTTON"],
		["anchor", { href: "/x" }, "A"],
	] as const)("forwards id, aria-* and data-* to the %s", (_name, extra, tag) => {
		const { container } = render(IconButton, {
			props: {
				label: "Edit",
				children: icon(),
				...extra,
				id: "edit",
				"aria-describedby": "hint",
				"data-testid": "ib",
			},
		});
		const el = root(container);
		expect(el.tagName).toBe(tag);
		expect(el.id).toBe("edit");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("ib");
		expect(el.getAttribute("aria-label")).toBe("Edit");
	});

	it("fires a listener the component does not handle once", async () => {
		const onkeydown = vi.fn();
		const { container } = render(IconButton, {
			props: { label: "Edit", children: icon(), onkeydown },
		});
		await fireEvent.keyDown(root(container), { key: "a" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps the label authoritative over a consumer aria-label", () => {
		const { container } = render(IconButton, {
			props: { label: "Edit", children: icon(), "aria-label": "Other" },
		});
		expect(root(container).getAttribute("aria-label")).toBe("Edit");
	});

	it("keeps a disabled link inert whatever the consumer passes", () => {
		const { container } = render(IconButton, {
			props: { label: "Go", href: "/x", disabled: true, tabindex: 0 },
		});
		expect(root(container).getAttribute("tabindex")).toBe("-1");
	});
});
