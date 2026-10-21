import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Popover from "./Popover.svelte";

afterEach(cleanup);

const trigger = () => document.querySelector(".ft-popover-trigger") as HTMLButtonElement;

describe("Popover trigger forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the trigger button", () => {
		render(Popover, { id: "pop", "data-testid": "t", "aria-describedby": "hint" });
		expect(trigger().id).toBe("pop");
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires listeners the component does not handle once", async () => {
		const onkeydown = vi.fn();
		const onpointerdown = vi.fn();
		render(Popover, { onkeydown, onpointerdown });
		await fireEvent.keyDown(trigger(), { key: "a" });
		await fireEvent.pointerDown(trigger());
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after the panel opened", async () => {
		const onclick = vi.fn();
		const onOpenChange = vi.fn();
		render(Popover, { onclick, onOpenChange });
		await fireEvent.click(trigger());
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps type, aria-expanded and aria-controls authoritative", () => {
		render(Popover, { type: "submit", "aria-expanded": "true", "aria-controls": "x" });
		expect(trigger().type).toBe("button");
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).toBeNull();
	});
});
