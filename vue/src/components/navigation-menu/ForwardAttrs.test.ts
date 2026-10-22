import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import NavigationMenu from "./NavigationMenu.vue";
import NavigationMenuList from "./NavigationMenuList.vue";
import NavigationMenuItem from "./NavigationMenuItem.vue";
import NavigationMenuTrigger from "./NavigationMenuTrigger.vue";
import NavigationMenuContent from "./NavigationMenuContent.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

/** A navigation trigger carrying a consumer attribute bag. */
const Harness = defineComponent({
	name: "ForwardAttrsHarness",
	props: { attrs: { type: Object as PropType<Bag>, default: () => ({}) } },
	setup(props) {
		return () =>
			h(
				NavigationMenu,
				{ label: "Test navigation" },
				{
					default: () =>
						h(NavigationMenuList, null, {
							default: () => [
								h(
									NavigationMenuItem,
									{ value: "products" },
									{
										default: () => [
											h(NavigationMenuTrigger, props.attrs, { default: () => "Products" }),
											h(NavigationMenuContent, null, { default: () => "Panel" }),
										],
									}
								),
								h(
									NavigationMenuItem,
									{ value: "company" },
									{
										default: () => [
											h(NavigationMenuTrigger, null, { default: () => "Company" }),
											h(NavigationMenuContent, null, { default: () => "Panel" }),
										],
									}
								),
							],
						}),
				}
			);
	},
});

const first = () => document.querySelector('[data-value="products"]') as HTMLButtonElement;

describe("NavigationMenuTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and title on the button", () => {
		render(Harness, {
			props: { attrs: { "data-testid": "nav", "aria-describedby": "hint", title: "Products" } },
		});
		expect(first().getAttribute("data-testid")).toBe("nav");
		expect(first().getAttribute("aria-describedby")).toBe("hint");
		expect(first().title).toBe("Products");
	});

	it("fires listeners the component does not handle once", async () => {
		const onBlur = vi.fn();
		const onFocus = vi.fn();
		render(Harness, { props: { attrs: { onBlur, onFocus } } });
		await fireEvent.blur(first());
		await fireEvent.focus(first());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onFocus).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the panel toggled", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { attrs: { onClick } } });
		await fireEvent.click(first());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(first().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onKeydown once, after the internal handling", async () => {
		const onKeydown = vi.fn();
		render(Harness, { props: { attrs: { onKeydown } } });
		await fireEvent.keyDown(first(), { key: "ArrowDown" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(first().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs consumer pointer listeners once", async () => {
		const onPointerenter = vi.fn();
		const onPointerleave = vi.fn();
		render(Harness, { props: { attrs: { onPointerenter, onPointerleave } } });
		await fireEvent(first(), new Event("pointerenter"));
		await fireEvent(first(), new Event("pointerleave"));
		expect(onPointerenter).toHaveBeenCalledTimes(1);
		expect(onPointerleave).toHaveBeenCalledTimes(1);
	});

	it("keeps id, aria-expanded, aria-controls and the roving tabindex authoritative", async () => {
		render(Harness, {
			props: {
				attrs: { id: "mine", "aria-expanded": "true", "aria-controls": "x", tabindex: "5" },
			},
		});
		expect(first().id).not.toBe("mine");
		expect(first().getAttribute("aria-expanded")).toBe("false");
		expect(first().getAttribute("aria-controls")).toBeNull();
		await nextTick();
		expect(first().getAttribute("tabindex")).toBe("0");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		await rerender({ attrs: { "data-late": "yes" } });
		await nextTick();
		expect(first().getAttribute("data-late")).toBe("yes");
	});
});

describe("NavigationMenuTrigger with a forwarded disabled", () => {
	const second = () => document.querySelector('[data-value="company"]') as HTMLButtonElement;

	it("hands the tab stop to the first enabled trigger", async () => {
		render(Harness, { props: { attrs: { disabled: true } } });
		await nextTick();
		expect(first().disabled).toBe(true);
		expect(first().getAttribute("tabindex")).toBe("-1");
		expect(second().getAttribute("tabindex")).toBe("0");
	});

	it("is skipped by arrow navigation", async () => {
		render(Harness, { props: { attrs: { disabled: true } } });
		await nextTick();
		second().focus();
		await fireEvent.keyDown(second(), { key: "ArrowRight" });
		expect(document.activeElement).toBe(second());
		expect(second().getAttribute("tabindex")).toBe("0");
		await fireEvent.keyDown(second(), { key: "Home" });
		expect(first().getAttribute("tabindex")).toBe("-1");
		expect(second().getAttribute("tabindex")).toBe("0");
	});

	it("does not open or call consumer listeners", async () => {
		const onClick = vi.fn();
		const onKeydown = vi.fn();
		const onPointerenter = vi.fn();
		render(Harness, {
			props: { attrs: { disabled: true, onClick, onKeydown, onPointerenter } },
		});
		await fireEvent.click(first());
		await fireEvent.keyDown(first(), { key: "ArrowDown" });
		await fireEvent(first(), new Event("pointerenter"));
		expect(first().getAttribute("aria-expanded")).toBe("false");
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeydown).not.toHaveBeenCalled();
		expect(onPointerenter).not.toHaveBeenCalled();
	});
});
