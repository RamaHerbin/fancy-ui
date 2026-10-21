import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import DropdownMenu from "./DropdownMenu.vue";
import DropdownMenuTrigger from "./DropdownMenuTrigger.vue";
import DropdownMenuContent from "./DropdownMenuContent.vue";
import DropdownMenuItem from "./DropdownMenuItem.vue";
import DropdownMenuSub from "./DropdownMenuSub.vue";
import DropdownMenuSubTrigger from "./DropdownMenuSubTrigger.vue";
import DropdownMenuSubContent from "./DropdownMenuSubContent.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

/** Mounts the trigger, an item and a sub-trigger with consumer attribute bags. */
const Harness = defineComponent({
	name: "ForwardAttrsHarness",
	props: {
		open: { type: Boolean, default: false },
		triggerAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		itemAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		subTriggerAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		triggerDisabled: { type: Boolean, default: false },
		itemDisabled: { type: Boolean, default: false },
		onSelect: { type: Function as PropType<() => void>, default: undefined },
	},
	setup(props) {
		return () =>
			h(DropdownMenu, props.open ? { open: true } : {}, {
				default: () => [
					h(
						DropdownMenuTrigger,
						{ disabled: props.triggerDisabled, ...props.triggerAttrs },
						{ default: () => "Open menu" }
					),
					h(DropdownMenuContent, null, {
						default: () => [
							h(
								DropdownMenuItem,
								{
									disabled: props.itemDisabled,
									closeOnSelect: false,
									onSelect: props.onSelect,
									...props.itemAttrs,
								},
								{ default: () => "Rename" }
							),
							h(DropdownMenuSub, null, {
								default: () => [
									h(DropdownMenuSubTrigger, props.subTriggerAttrs, {
										default: () => "More tools",
									}),
									h(DropdownMenuSubContent, null, {
										default: () => h(DropdownMenuItem, null, { default: () => "Nested" }),
									}),
								],
							}),
						],
					}),
				],
			});
	},
});

const trigger = () => document.querySelector(".ft-dropdown-menu-trigger") as HTMLButtonElement;
const item = () => document.querySelector('[data-variant="default"]') as HTMLButtonElement;
const subTrigger = () =>
	Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
		el.textContent?.includes("More tools")
	) as HTMLButtonElement;

describe("DropdownMenuTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and a title on the button", () => {
		render(Harness, {
			props: { triggerAttrs: { "data-testid": "t", "aria-describedby": "hint", title: "Open it" } },
		});
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
		expect(trigger().title).toBe("Open it");
	});

	it("fires a listener the component does not handle once", async () => {
		const onFocus = vi.fn();
		const onPointerdown = vi.fn();
		render(Harness, { props: { triggerAttrs: { onFocus, onPointerdown } } });
		await fireEvent.focus(trigger());
		await fireEvent(trigger(), new Event("pointerdown", { bubbles: true }));
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onPointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once and the menu still toggles", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { triggerAttrs: { onClick } } });
		await fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onKeydown once, after the internal handling", async () => {
		const onKeydown = vi.fn();
		render(Harness, { props: { triggerAttrs: { onKeydown } } });
		await fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls neither when disabled", async () => {
		const onClick = vi.fn();
		const onKeydown = vi.fn();
		render(Harness, { props: { triggerDisabled: true, triggerAttrs: { onClick, onKeydown } } });
		await fireEvent.click(trigger());
		await fireEvent.keyDown(trigger(), { key: "Enter" });
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeydown).not.toHaveBeenCalled();
	});

	it("keeps type, aria-haspopup and aria-expanded authoritative", () => {
		render(Harness, {
			props: {
				triggerAttrs: { type: "submit", "aria-haspopup": "dialog", "aria-expanded": "true" },
			},
		});
		expect(trigger().type).toBe("button");
		expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		expect(trigger().getAttribute("data-late")).toBeNull();
		await rerender({ triggerAttrs: { "data-late": "yes" } });
		await nextTick();
		expect(trigger().getAttribute("data-late")).toBe("yes");
	});
});

describe("DropdownMenuItem forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the menuitem", () => {
		render(Harness, {
			props: {
				open: true,
				itemAttrs: { id: "rename", "data-testid": "i", "aria-describedby": "hint" },
			},
		});
		expect(item().id).toBe("rename");
		expect(item().getAttribute("data-testid")).toBe("i");
		expect(item().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires an unhandled listener once", async () => {
		const onBlur = vi.fn();
		render(Harness, { props: { open: true, itemAttrs: { onBlur } } });
		await fireEvent.blur(item());
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after onSelect", async () => {
		const order: string[] = [];
		const onSelect = vi.fn(() => order.push("select"));
		const onClick = vi.fn(() => order.push("click"));
		render(Harness, { props: { open: true, onSelect, itemAttrs: { onClick } } });
		await fireEvent.click(item());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["select", "click"]);
	});

	it("calls neither onSelect nor the consumer onClick while disabled", async () => {
		const onSelect = vi.fn();
		const onClick = vi.fn();
		render(Harness, {
			props: { open: true, itemDisabled: true, onSelect, itemAttrs: { onClick } },
		});
		await fireEvent.click(item());
		expect(onSelect).not.toHaveBeenCalled();
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps role, tabindex and data-variant authoritative", () => {
		render(Harness, {
			props: {
				open: true,
				itemAttrs: { role: "button", tabindex: "0", "data-variant": "x" },
			},
		});
		expect(item().getAttribute("role")).toBe("menuitem");
		expect(item().getAttribute("tabindex")).toBe("-1");
		expect(item().getAttribute("data-variant")).toBe("default");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness, { props: { open: true } });
		await rerender({ itemAttrs: { "data-late": "yes" } });
		await nextTick();
		expect(item().getAttribute("data-late")).toBe("yes");
	});
});

describe("DropdownMenuSubTrigger forwards native attributes", () => {
	it("puts data-testid and aria-describedby on the row", () => {
		render(Harness, {
			props: { open: true, subTriggerAttrs: { "data-testid": "s", "aria-describedby": "hint" } },
		});
		expect(subTrigger().getAttribute("data-testid")).toBe("s");
		expect(subTrigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires an unhandled listener once", async () => {
		const onBlur = vi.fn();
		render(Harness, { props: { open: true, subTriggerAttrs: { onBlur } } });
		await fireEvent.blur(subTrigger());
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once and the submenu still opens", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { open: true, subTriggerAttrs: { onClick } } });
		await fireEvent.click(subTrigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(subTrigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer mouse listener while disabled, mouseleave included", async () => {
		const onMouseenter = vi.fn();
		const onMouseleave = vi.fn();
		render(Harness, {
			props: { open: true, subTriggerAttrs: { disabled: true, onMouseenter, onMouseleave } },
		});
		await fireEvent.mouseEnter(subTrigger());
		await fireEvent.mouseLeave(subTrigger());
		expect(onMouseenter).not.toHaveBeenCalled();
		expect(onMouseleave).not.toHaveBeenCalled();
		expect(subTrigger().getAttribute("aria-expanded")).toBe("false");
	});

	it("keeps role, tabindex, aria-haspopup and aria-expanded authoritative", () => {
		render(Harness, {
			props: {
				open: true,
				subTriggerAttrs: {
					role: "button",
					tabindex: "0",
					"aria-haspopup": "dialog",
					"aria-expanded": "true",
				},
			},
		});
		expect(subTrigger().getAttribute("role")).toBe("menuitem");
		expect(subTrigger().getAttribute("tabindex")).toBe("-1");
		expect(subTrigger().getAttribute("aria-haspopup")).toBe("menu");
		expect(subTrigger().getAttribute("aria-expanded")).toBe("false");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness, { props: { open: true } });
		await rerender({ subTriggerAttrs: { "data-late": "yes" } });
		await nextTick();
		expect(subTrigger().getAttribute("data-late")).toBe("yes");
	});
});
