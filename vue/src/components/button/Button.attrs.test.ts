import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import Button from "./Button.vue";

const mount = render as unknown as (
	comp: unknown,
	options: { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
) => ReturnType<typeof render>;

function root(container: Element) {
	return container.firstElementChild as HTMLElement;
}

// jsdom does not implement navigation; anchor activations would log noise.
beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));

describe("Button native attributes", () => {
	afterEach(cleanup);

	const cases = [
		{ name: "button", props: {}, tag: "BUTTON" },
		{ name: "anchor", props: { href: "/x" }, tag: "A" },
	] as const;

	describe.each(cases)("$name branch", ({ props, tag }) => {
		it("forwards id, aria-* and data-* to the native element", () => {
			const { container } = mount(Button, {
				props: { ...props },
				attrs: {
					id: "go",
					"aria-describedby": "hint",
					"aria-controls": "panel",
					"aria-expanded": "false",
					"data-testid": "btn",
				},
			});
			const el = root(container);
			expect(el.tagName).toBe(tag);
			expect(el.id).toBe("go");
			expect(el.getAttribute("aria-describedby")).toBe("hint");
			expect(el.getAttribute("aria-controls")).toBe("panel");
			expect(el.getAttribute("aria-expanded")).toBe("false");
			expect(el.getAttribute("data-testid")).toBe("btn");
		});

		it("fires a listener the component does not handle once", async () => {
			const onFocus = vi.fn();
			const onKeydown = vi.fn();
			const { container } = mount(Button, {
				props: { ...props },
				attrs: { onFocus, onKeydown },
			});
			await fireEvent.focus(root(container));
			await fireEvent.keyDown(root(container), { key: "a" });
			expect(onFocus).toHaveBeenCalledTimes(1);
			expect(onKeydown).toHaveBeenCalledTimes(1);
		});

		it("lets a consumer aria-label stand when no label prop is set", () => {
			const { container } = mount(Button, {
				props: { ...props },
				attrs: { "aria-label": "Mine" },
			});
			expect(root(container).getAttribute("aria-label")).toBe("Mine");
		});

		it("keeps aria-busy authoritative while loading", () => {
			const { container } = mount(Button, {
				props: { ...props, loading: true },
				attrs: { "aria-busy": "false" },
			});
			expect(root(container).getAttribute("aria-busy")).toBe("true");
		});

		it("calls the consumer click once, and not while loading", async () => {
			const onClick = vi.fn();
			const { container } = mount(Button, { props: { ...props }, attrs: { onClick } });
			await fireEvent.click(root(container));
			expect(onClick).toHaveBeenCalledTimes(1);
			cleanup();
			const blocked = vi.fn();
			const once = vi.fn();
			const { container: c2 } = mount(Button, {
				props: { ...props, loading: true },
				attrs: { onClick: blocked, onClickOnce: once },
			});
			await fireEvent.click(root(c2));
			expect(blocked).not.toHaveBeenCalled();
			expect(once).not.toHaveBeenCalled();
		});
	});

	it("keeps a disabled link inert whatever the consumer passes", () => {
		const { container } = mount(Button, {
			props: { href: "/x", disabled: true },
			attrs: { tabindex: 0, "aria-disabled": "false" },
		});
		const el = root(container);
		expect(el.getAttribute("tabindex")).toBe("-1");
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.hasAttribute("href")).toBe(false);
	});

	it("keeps a consumer tabindex on an enabled link", () => {
		const { container } = mount(Button, { props: { href: "/x" }, attrs: { tabindex: 0 } });
		expect(root(container).getAttribute("tabindex")).toBe("0");
	});

	it("keeps the button type authoritative", () => {
		const { container } = mount(Button, { props: { type: "submit" }, attrs: { type: "reset" } });
		expect(root(container).getAttribute("type")).toBe("submit");
	});

	it("picks up an attribute the parent adds after mount, even while inert", async () => {
		const extra = ref(false);
		const Host = defineComponent({
			render: () =>
				h(Button, { disabled: true, ...(extra.value ? { "data-x": "1" } : {}) }, () => "Go"),
		});
		const { container } = render(Host);
		expect(root(container).hasAttribute("data-x")).toBe(false);
		extra.value = true;
		await nextTick();
		expect(root(container).getAttribute("data-x")).toBe("1");
	});
});
