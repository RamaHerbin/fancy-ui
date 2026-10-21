import { render, cleanup, fireEvent, screen } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./AccordionHarness.test.svelte";

afterEach(cleanup);

const root = () => screen.getByTestId("root");
const item = () => screen.getByTestId("item-a");
const trigger = () => screen.getByTestId("trigger-a");
const content = () => screen.getByTestId("content-a");

describe("Accordion forwards native attributes", () => {
	it("puts id, aria-label and title on the root", () => {
		render(Harness, {
			props: { rootAttrs: { id: "mine", "aria-label": "FAQ", title: "Questions" } },
		});
		expect(root().id).toBe("mine");
		expect(root().getAttribute("aria-label")).toBe("FAQ");
		expect(root().title).toBe("Questions");
	});

	it("puts id, title and data-* on an item", () => {
		render(Harness, { props: { itemAttrs: { id: "row", title: "Row", "data-extra": "1" } } });
		expect(item().id).toBe("row");
		expect(item().title).toBe("Row");
		expect(item().getAttribute("data-extra")).toBe("1");
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
		render(Harness, { props: { triggerAttrs: { onblur, onpointerdown } } });
		await fireEvent.blur(trigger());
		await fireEvent.pointerDown(trigger());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick and onkeydown once, after the internal logic", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		render(Harness, { props: { triggerAttrs: { onclick, onkeydown } } });
		trigger().focus();
		await fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(screen.getByTestId("trigger-b"));
		await fireEvent.click(trigger());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer listener on a disabled trigger", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		render(Harness, { props: { disabled: true, triggerAttrs: { onclick, onkeydown } } });
		await fireEvent.click(trigger());
		await fireEvent.keyDown(trigger(), { key: "Home" });
		expect(onclick).not.toHaveBeenCalled();
		expect(onkeydown).not.toHaveBeenCalled();
	});

	it("keeps role, aria-expanded, aria-controls, id, aria-labelledby and state the component's", () => {
		render(Harness, {
			props: {
				value: "a",
				triggerAttrs: {
					"aria-expanded": "false",
					"aria-controls": "elsewhere",
					id: "mine",
					type: "submit",
					"aria-disabled": "false",
				},
				contentAttrs: {
					role: "note",
					"aria-labelledby": "elsewhere",
					id: "other",
					"data-state": "closed",
				},
			},
		});
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
		expect(trigger().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(trigger().id).not.toBe("mine");
		expect(trigger().getAttribute("type")).toBe("button");
		expect(trigger().getAttribute("aria-disabled")).toBe("true");
		expect(content().getAttribute("role")).toBe("region");
		expect(content().getAttribute("aria-labelledby")).toBe(trigger().id);
		expect(content().id).not.toBe("other");
		expect(content().getAttribute("data-state")).toBe("open");
	});

	it("falls back to a consumer aria-disabled when the component has none to say", () => {
		render(Harness, { props: { triggerAttrs: { "aria-disabled": "true" } } });
		expect(trigger().getAttribute("aria-disabled")).toBe("true");
	});
});
