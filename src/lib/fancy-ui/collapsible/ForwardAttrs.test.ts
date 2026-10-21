import { render, cleanup, fireEvent, screen } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./CollapsibleHarness.test.svelte";

afterEach(cleanup);

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
		const onblur = vi.fn();
		const onpointerdown = vi.fn();
		const onmouseenter = vi.fn();
		render(Harness, {
			props: {
				triggerAttrs: { onblur, onpointerdown },
				contentAttrs: { onmouseenter },
			},
		});
		await fireEvent.blur(trigger());
		await fireEvent.pointerDown(trigger());
		await fireEvent.mouseEnter(content());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
		expect(onmouseenter).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after the toggle has been reported", async () => {
		const order: string[] = [];
		const onclick = vi.fn(() => order.push("click"));
		const onOpenChange = vi.fn(() => order.push("open-change"));
		render(Harness, { props: { onOpenChange, triggerAttrs: { onclick } } });
		await fireEvent.click(trigger());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["open-change", "click"]);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer click listener while disabled", async () => {
		const onclick = vi.fn();
		render(Harness, { props: { disabled: true, triggerAttrs: { onclick } } });
		await fireEvent.click(trigger());
		expect(onclick).not.toHaveBeenCalled();
	});

	it("runs the consumer ontransitionend once, after the component settles", async () => {
		const ontransitionend = vi.fn();
		render(Harness, { props: { open: true, contentAttrs: { ontransitionend } } });
		await fireEvent.click(trigger());
		await fireEvent(
			content(),
			Object.assign(new Event("transitionend", { bubbles: true }), {
				propertyName: "grid-template-rows",
			})
		);
		expect(ontransitionend).toHaveBeenCalledTimes(1);
		expect(content().style.visibility).toBe("hidden");
	});

	it("keeps aria-expanded, aria-controls, id, role-free state and data-state the component's", () => {
		render(Harness, {
			props: {
				triggerAttrs: {
					"aria-expanded": "true",
					"aria-controls": "elsewhere",
					id: "mine",
					type: "submit",
					"data-state": "open",
				},
				contentAttrs: { id: "other", "data-state": "open", inert: false },
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
