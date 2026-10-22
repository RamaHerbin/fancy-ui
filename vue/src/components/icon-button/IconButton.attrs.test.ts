import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import IconButton from "./IconButton.vue";

const mount = render as unknown as (
	comp: unknown,
	options: {
		props?: Record<string, unknown>;
		attrs?: Record<string, unknown>;
		slots?: Record<string, unknown>;
	}
) => ReturnType<typeof render>;

const ICON = { default: '<svg aria-hidden="true"><path d="M4 4h8v8H4z" /></svg>' };

function root(container: Element) {
	return container.firstElementChild as HTMLElement;
}

describe("IconButton native attributes", () => {
	afterEach(cleanup);

	it.each([
		["button", {}, "BUTTON"],
		["anchor", { href: "/x" }, "A"],
	] as const)("forwards id, aria-* and data-* to the %s", (_name, extra, tag) => {
		const { container } = mount(IconButton, {
			props: { label: "Edit", ...extra },
			slots: ICON,
			attrs: { id: "edit", "aria-describedby": "hint", "data-testid": "ib" },
		});
		const el = root(container);
		expect(el.tagName).toBe(tag);
		expect(el.id).toBe("edit");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("ib");
		expect(el.getAttribute("aria-label")).toBe("Edit");
	});

	it("fires a listener the component does not handle once", async () => {
		const onKeydown = vi.fn();
		const { container } = mount(IconButton, {
			props: { label: "Edit" },
			slots: ICON,
			attrs: { onKeydown },
		});
		await fireEvent.keyDown(root(container), { key: "a" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps the label authoritative over a consumer aria-label", () => {
		const { container } = mount(IconButton, {
			props: { label: "Edit" },
			slots: ICON,
			attrs: { "aria-label": "Other" },
		});
		expect(root(container).getAttribute("aria-label")).toBe("Edit");
	});

	it("keeps a disabled link inert whatever the consumer passes", () => {
		const { container } = mount(IconButton, {
			props: { label: "Go", href: "/x", disabled: true },
			slots: ICON,
			attrs: { tabindex: 0 },
		});
		expect(root(container).getAttribute("tabindex")).toBe("-1");
	});
});
