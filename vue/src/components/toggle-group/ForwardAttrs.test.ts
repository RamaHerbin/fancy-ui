import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import ToggleGroup from "./ToggleGroup.vue";
import ToggleGroupItem from "./ToggleGroupItem.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

/** A group item carrying a consumer attribute bag inside a real group. */
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
				? h(ToggleGroupItem, { value: "a", ...props.attrs }, { default: () => "Alpha" })
				: h(
						ToggleGroup,
						{ type: "single", value: "b" },
						{
							default: () => [
								h(
									ToggleGroupItem,
									{ value: "a", disabled: props.disabled, ...props.attrs },
									{ default: () => "Alpha" }
								),
								h(ToggleGroupItem, { value: "b" }, { default: () => "Beta" }),
							],
						}
					);
	},
});

const alpha = () => document.querySelector('[data-value="a"]') as HTMLButtonElement;

describe("ToggleGroupItem forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Harness, {
			props: { attrs: { id: "mine", "data-testid": "item", "aria-describedby": "hint" } },
		});
		expect(alpha().id).toBe("mine");
		expect(alpha().getAttribute("data-testid")).toBe("item");
		expect(alpha().getAttribute("aria-describedby")).toBe("hint");
	});

	it("uses a consumer aria-label when no label prop is given", () => {
		render(Harness, { props: { attrs: { "aria-label": "Bold" } } });
		expect(alpha().getAttribute("aria-label")).toBe("Bold");
	});

	it("uses a consumer tabindex outside a group", () => {
		render(Harness, { props: { standalone: true, attrs: { tabindex: "3" } } });
		expect(alpha().getAttribute("tabindex")).toBe("3");
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
		await fireEvent.click(alpha());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(alpha().getAttribute("aria-pressed")).toBe("true");
		await fireEvent.keyDown(alpha(), { key: "ArrowRight" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-value="b"]')?.getAttribute("tabindex")).toBe("0");
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

	it("keeps aria-pressed and the roving tabindex authoritative", () => {
		render(Harness, { props: { attrs: { "aria-pressed": "true", tabindex: "5" } } });
		expect(alpha().getAttribute("aria-pressed")).toBe("false");
		expect(alpha().getAttribute("tabindex")).toBe("-1");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		await rerender({ attrs: { "data-late": "yes" } });
		await nextTick();
		expect(alpha().getAttribute("data-late")).toBe("yes");
	});
});
