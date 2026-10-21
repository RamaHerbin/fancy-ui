import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./ForwardAttrsHarness.test.svelte";

afterEach(cleanup);

const alpha = () => document.querySelector('[data-value="a"]') as HTMLButtonElement;

describe("TabsTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and title on the tab button", () => {
		render(Harness, {
			attrs: { "data-testid": "tab", "aria-describedby": "hint", title: "First" },
		});
		expect(alpha().getAttribute("data-testid")).toBe("tab");
		expect(alpha().getAttribute("aria-describedby")).toBe("hint");
		expect(alpha().title).toBe("First");
	});

	it("uses a consumer id when the trigger has no Tabs root to link with", () => {
		render(Harness, { standalone: true, attrs: { id: "mine" } });
		expect(alpha().id).toBe("mine");
	});

	it("fires listeners the component does not handle once", async () => {
		const onblur = vi.fn();
		const onpointerdown = vi.fn();
		render(Harness, { attrs: { onblur, onpointerdown } });
		await fireEvent.blur(alpha());
		await fireEvent.pointerDown(alpha());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick, onfocus and onkeydown once after the internal logic", async () => {
		const onclick = vi.fn();
		const onfocus = vi.fn();
		const onkeydown = vi.fn();
		render(Harness, { attrs: { onclick, onfocus, onkeydown } });
		await fireEvent.keyDown(alpha(), { key: "ArrowRight" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-value="b"]')?.getAttribute("tabindex")).toBe("0");
		await fireEvent.click(alpha());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(alpha().getAttribute("aria-selected")).toBe("true");
		// The click moves real focus onto the tab, which fires onfocus once.
		expect(onfocus).toHaveBeenCalledTimes(1);
	});

	it("calls none of the consumer listeners when disabled", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		const onfocus = vi.fn();
		render(Harness, { disabled: true, attrs: { onclick, onkeydown, onfocus } });
		await fireEvent.click(alpha());
		await fireEvent.keyDown(alpha(), { key: "Home" });
		await fireEvent.focus(alpha());
		expect(onfocus).not.toHaveBeenCalled();
		expect(onclick).not.toHaveBeenCalled();
		expect(onkeydown).not.toHaveBeenCalled();
	});

	it("keeps role, aria-selected, aria-controls, id and the roving tabindex authoritative", () => {
		render(Harness, {
			attrs: {
				role: "button",
				"aria-selected": "false",
				"aria-controls": "elsewhere",
				id: "mine",
				tabindex: "5",
			},
		});
		expect(alpha().getAttribute("role")).toBe("tab");
		expect(alpha().getAttribute("aria-selected")).toBe("true");
		expect(alpha().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(alpha().id).not.toBe("mine");
		expect(alpha().getAttribute("tabindex")).toBe("0");
	});
});
