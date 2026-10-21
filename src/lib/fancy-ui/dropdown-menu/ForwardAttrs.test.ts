import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./ForwardAttrsHarness.test.svelte";

afterEach(cleanup);

const trigger = () => document.querySelector(".ft-dropdown-menu-trigger") as HTMLButtonElement;
const item = () => document.querySelector('[data-variant="default"]') as HTMLButtonElement;
const subTrigger = () =>
	Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
		el.textContent?.includes("More tools")
	) as HTMLButtonElement;

describe("DropdownMenuTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and a title on the button", () => {
		render(Harness, {
			triggerAttrs: { "data-testid": "t", "aria-describedby": "hint", title: "Open it" },
		});
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
		expect(trigger().title).toBe("Open it");
	});

	it("fires a listener the component does not handle once", async () => {
		const onfocus = vi.fn();
		const onpointerdown = vi.fn();
		render(Harness, { triggerAttrs: { onfocus, onpointerdown } });
		await fireEvent.focus(trigger());
		await fireEvent.pointerDown(trigger());
		expect(onfocus).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once and the menu still toggles", async () => {
		const onclick = vi.fn();
		render(Harness, { triggerAttrs: { onclick } });
		await fireEvent.click(trigger());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onkeydown once, after the internal handling", async () => {
		const onkeydown = vi.fn();
		render(Harness, { triggerAttrs: { onkeydown } });
		await fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls neither when disabled", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		render(Harness, { triggerDisabled: true, triggerAttrs: { onclick, onkeydown } });
		await fireEvent.click(trigger());
		await fireEvent.keyDown(trigger(), { key: "Enter" });
		expect(onclick).not.toHaveBeenCalled();
		expect(onkeydown).not.toHaveBeenCalled();
	});

	it("keeps type, aria-haspopup and aria-expanded authoritative", () => {
		render(Harness, {
			triggerAttrs: { type: "submit", "aria-haspopup": "dialog", "aria-expanded": "true" },
		});
		expect(trigger().type).toBe("button");
		expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
	});
});

describe("DropdownMenuItem forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the menuitem", () => {
		render(Harness, {
			open: true,
			itemAttrs: { id: "rename", "data-testid": "i", "aria-describedby": "hint" },
		});
		expect(item().id).toBe("rename");
		expect(item().getAttribute("data-testid")).toBe("i");
		expect(item().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires an unhandled listener once", async () => {
		const onblur = vi.fn();
		const onpointerdown = vi.fn();
		render(Harness, { open: true, itemAttrs: { onblur, onpointerdown } });
		await fireEvent.blur(item());
		await fireEvent.pointerDown(item());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after onSelect", async () => {
		const order: string[] = [];
		const onSelect = vi.fn(() => order.push("select"));
		const onclick = vi.fn(() => order.push("click"));
		render(Harness, { open: true, onSelect, itemAttrs: { onclick } });
		await fireEvent.click(item());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["select", "click"]);
	});

	it("calls neither onSelect nor the consumer onclick while disabled", async () => {
		const onSelect = vi.fn();
		const onclick = vi.fn();
		render(Harness, { open: true, itemDisabled: true, onSelect, itemAttrs: { onclick } });
		await fireEvent.click(item());
		expect(onSelect).not.toHaveBeenCalled();
		expect(onclick).not.toHaveBeenCalled();
	});

	it("keeps role, tabindex and data-variant authoritative", () => {
		render(Harness, {
			open: true,
			itemAttrs: { role: "button", tabindex: "0", "data-variant": "x" },
		});
		expect(item().getAttribute("role")).toBe("menuitem");
		expect(item().getAttribute("tabindex")).toBe("-1");
		expect(item().getAttribute("data-variant")).toBe("default");
	});
});

describe("DropdownMenuSubTrigger forwards native attributes", () => {
	it("puts data-testid and aria-describedby on the row", () => {
		render(Harness, {
			open: true,
			subTriggerAttrs: { "data-testid": "s", "aria-describedby": "hint" },
		});
		expect(subTrigger().getAttribute("data-testid")).toBe("s");
		expect(subTrigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires an unhandled listener once", async () => {
		const onfocus = vi.fn();
		render(Harness, { open: true, subTriggerAttrs: { onfocus } });
		await fireEvent.focus(subTrigger());
		expect(onfocus).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once and the submenu still opens", async () => {
		const onclick = vi.fn();
		render(Harness, { open: true, subTriggerAttrs: { onclick } });
		await fireEvent.click(subTrigger());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(subTrigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer mouse listener while disabled, mouseleave included", async () => {
		const onmouseenter = vi.fn();
		const onmouseleave = vi.fn();
		render(Harness, {
			open: true,
			subTriggerAttrs: { disabled: true, onmouseenter, onmouseleave },
		});
		await fireEvent.mouseEnter(subTrigger());
		await fireEvent.mouseLeave(subTrigger());
		expect(onmouseenter).not.toHaveBeenCalled();
		expect(onmouseleave).not.toHaveBeenCalled();
		expect(subTrigger().getAttribute("aria-expanded")).toBe("false");
	});

	it("keeps role, tabindex, aria-haspopup and aria-expanded authoritative", () => {
		render(Harness, {
			open: true,
			subTriggerAttrs: {
				role: "button",
				tabindex: "0",
				"aria-haspopup": "dialog",
				"aria-expanded": "true",
			},
		});
		expect(subTrigger().getAttribute("role")).toBe("menuitem");
		expect(subTrigger().getAttribute("tabindex")).toBe("-1");
		expect(subTrigger().getAttribute("aria-haspopup")).toBe("menu");
		expect(subTrigger().getAttribute("aria-expanded")).toBe("false");
	});
});
