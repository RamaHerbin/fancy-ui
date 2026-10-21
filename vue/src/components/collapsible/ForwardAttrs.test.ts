import { render, cleanup, fireEvent, screen } from "@testing-library/vue";
import { defineComponent, h, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import Collapsible from "./Collapsible.vue";
import CollapsibleTrigger from "./CollapsibleTrigger.vue";
import CollapsibleContent from "./CollapsibleContent.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

/** A real root whose three pieces each carry a consumer attribute bag. */
const Harness = defineComponent({
	name: "ForwardAttrsHarness",
	props: {
		disabled: { type: Boolean, default: false },
		onOpenChange: Function as PropType<(open: boolean) => void>,
		rootAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		triggerAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		contentAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
	},
	setup(props) {
		return () =>
			h(
				Collapsible,
				{
					disabled: props.disabled,
					onOpenChange: props.onOpenChange,
					"data-testid": "root",
					...props.rootAttrs,
				},
				{
					default: () => [
						h(
							CollapsibleTrigger,
							{ "data-testid": "trigger", ...props.triggerAttrs },
							{ default: () => "Toggle" }
						),
						h(
							CollapsibleContent,
							{ "data-testid": "content", ...props.contentAttrs },
							{ default: () => "Body" }
						),
					],
				}
			);
	},
});

const trigger = () => screen.getByTestId("trigger");
const content = () => screen.getByTestId("content");
const root = () => screen.getByTestId("root");

describe("Collapsible forwards native attributes", () => {
	it("puts id, aria-describedby and title on the root", () => {
		render(Harness, {
			props: { rootAttrs: { id: "mine", "aria-describedby": "hint", title: "Panel" } },
		});
		expect(root().id).toBe("mine");
		expect(root().getAttribute("aria-describedby")).toBe("hint");
		expect(root().title).toBe("Panel");
	});

	it("puts aria-describedby, title and data-* on the trigger button", () => {
		render(Harness, {
			props: { triggerAttrs: { "aria-describedby": "hint", title: "More", "data-extra": "1" } },
		});
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
		expect(trigger().title).toBe("More");
		expect(trigger().getAttribute("data-extra")).toBe("1");
	});

	it("puts aria-describedby, title and data-* on the content region", () => {
		render(Harness, {
			props: { contentAttrs: { "aria-describedby": "hint", title: "Body", "data-extra": "1" } },
		});
		expect(content().getAttribute("aria-describedby")).toBe("hint");
		expect(content().title).toBe("Body");
		expect(content().getAttribute("data-extra")).toBe("1");
	});

	it("fires listeners the component does not handle once", async () => {
		const onBlur = vi.fn();
		const onPointerdown = vi.fn();
		const onMouseenter = vi.fn();
		render(Harness, {
			props: {
				triggerAttrs: { onBlur, onPointerdown },
				contentAttrs: { onMouseenter },
			},
		});
		await fireEvent.blur(trigger());
		await fireEvent.pointerDown(trigger());
		await fireEvent.mouseEnter(content());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerdown).toHaveBeenCalledTimes(1);
		expect(onMouseenter).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the toggle has been reported", async () => {
		const order: string[] = [];
		const onClick = vi.fn(() => order.push("click"));
		const onOpenChange = vi.fn(() => order.push("open-change"));
		render(Harness, { props: { onOpenChange, triggerAttrs: { onClick } } });
		await fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["open-change", "click"]);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer click listener while disabled", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { disabled: true, triggerAttrs: { onClick } } });
		await fireEvent.click(trigger());
		expect(onClick).not.toHaveBeenCalled();
	});

	it("also keeps modified listeners such as .once away from a disabled trigger", async () => {
		const onClickOnce = vi.fn();
		render(Harness, { props: { disabled: true, triggerAttrs: { onClickOnce } } });
		await fireEvent.click(trigger());
		expect(onClickOnce).not.toHaveBeenCalled();
	});

	it("runs the consumer onTransitionend once, after the component settles", async () => {
		const onTransitionend = vi.fn();
		render(Harness, { props: { contentAttrs: { onTransitionend } } });
		await fireEvent.click(trigger());
		await fireEvent.click(trigger());
		await fireEvent(
			content(),
			Object.assign(new Event("transitionend", { bubbles: true }), {
				propertyName: "grid-template-rows",
			})
		);
		expect(onTransitionend).toHaveBeenCalledTimes(1);
		expect(content().style.visibility).toBe("hidden");
	});

	it("keeps aria-expanded, aria-controls, id, type and data-state the component's", () => {
		render(Harness, {
			props: {
				triggerAttrs: {
					"aria-expanded": "true",
					"aria-controls": "elsewhere",
					id: "mine",
					type: "submit",
					"data-state": "open",
				},
				contentAttrs: { id: "other", "data-state": "open" },
			},
		});
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(trigger().id).not.toBe("mine");
		expect(trigger().getAttribute("type")).toBe("button");
		expect(trigger().getAttribute("data-state")).toBe("closed");
		expect(content().id).not.toBe("other");
		expect(content().getAttribute("data-state")).toBe("closed");
		expect(content().hasAttribute("inert")).toBe(true);
	});

	it("keeps a consumer style next to the component's visibility", () => {
		render(Harness, { props: { contentAttrs: { style: "color: red" } } });
		expect(content().style.color).toBe("red");
		expect(content().style.visibility).toBe("hidden");
	});
});
