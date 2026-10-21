import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import Tabs from "./Tabs.vue";
import TabsList from "./TabsList.vue";
import TabsTrigger from "./TabsTrigger.vue";
import TabsContent from "./TabsContent.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

/** A trigger carrying a consumer attribute bag inside a real Tabs root. */
const Harness = defineComponent({
	name: "ForwardAttrsHarness",
	props: {
		attrs: { type: Object as PropType<Bag>, default: () => ({}) },
		disabled: { type: Boolean, default: false },
		standalone: { type: Boolean, default: false },
	},
	setup(props) {
		return () =>
			props.standalone
				? h(TabsTrigger, { value: "a", ...props.attrs }, { default: () => "Alpha" })
				: h(
						Tabs,
						{ value: "a" },
						{
							default: () => [
								h(TabsList, null, {
									default: () => [
										h(
											TabsTrigger,
											{ value: "a", disabled: props.disabled, ...props.attrs },
											{ default: () => "Alpha" }
										),
										h(TabsTrigger, { value: "b" }, { default: () => "Beta" }),
									],
								}),
								h(TabsContent, { value: "a" }, { default: () => "Panel A" }),
								h(TabsContent, { value: "b" }, { default: () => "Panel B" }),
							],
						}
					);
	},
});

const alpha = () => document.querySelector('[data-value="a"]') as HTMLButtonElement;

describe("TabsTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and title on the tab button", () => {
		render(Harness, {
			props: { attrs: { "data-testid": "tab", "aria-describedby": "hint", title: "First" } },
		});
		expect(alpha().getAttribute("data-testid")).toBe("tab");
		expect(alpha().getAttribute("aria-describedby")).toBe("hint");
		expect(alpha().title).toBe("First");
	});

	it("uses a consumer id when the trigger has no Tabs root to link with", () => {
		render(Harness, { props: { standalone: true, attrs: { id: "mine" } } });
		expect(alpha().id).toBe("mine");
	});

	it("fires listeners the component does not handle once", async () => {
		const onBlur = vi.fn();
		const onMouseenter = vi.fn();
		render(Harness, { props: { attrs: { onBlur, onMouseenter } } });
		await fireEvent.blur(alpha());
		await fireEvent.mouseEnter(alpha());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onMouseenter).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick, onFocus and onKeydown once after the internal logic", async () => {
		const onClick = vi.fn();
		const onFocus = vi.fn();
		const onKeydown = vi.fn();
		render(Harness, { props: { attrs: { onClick, onFocus, onKeydown } } });
		await fireEvent.focus(alpha());
		expect(onFocus).toHaveBeenCalledTimes(1);
		await fireEvent.keyDown(alpha(), { key: "ArrowRight" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-value="b"]')?.getAttribute("tabindex")).toBe("0");
		await fireEvent.click(alpha());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(alpha().getAttribute("aria-selected")).toBe("true");
	});

	it("calls none of the consumer listeners when disabled", async () => {
		const onClick = vi.fn();
		const onKeydown = vi.fn();
		const onFocus = vi.fn();
		render(Harness, { props: { disabled: true, attrs: { onClick, onKeydown, onFocus } } });
		await fireEvent.click(alpha());
		await fireEvent.keyDown(alpha(), { key: "Home" });
		await fireEvent.focus(alpha());
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeydown).not.toHaveBeenCalled();
		expect(onFocus).not.toHaveBeenCalled();
	});

	it("keeps role, aria-selected, aria-controls, id and the roving tabindex authoritative", async () => {
		render(Harness, {
			props: {
				attrs: {
					role: "button",
					"aria-selected": "false",
					"aria-controls": "elsewhere",
					id: "mine",
					tabindex: "5",
				},
			},
		});
		expect(alpha().getAttribute("role")).toBe("tab");
		expect(alpha().getAttribute("aria-selected")).toBe("true");
		expect(alpha().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(alpha().id).not.toBe("mine");
		await nextTick();
		expect(alpha().getAttribute("tabindex")).toBe("0");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		expect(alpha().getAttribute("data-late")).toBeNull();
		await rerender({ attrs: { "data-late": "yes" } });
		await nextTick();
		expect(alpha().getAttribute("data-late")).toBe("yes");
	});
});
