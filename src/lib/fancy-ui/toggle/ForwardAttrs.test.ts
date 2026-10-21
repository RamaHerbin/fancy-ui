import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Toggle from "./Toggle.svelte";

afterEach(cleanup);

const button = () => document.querySelector("button") as HTMLButtonElement;

describe("Toggle forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Toggle, {
			label: "Bold",
			id: "mine",
			"data-testid": "tg",
			"aria-describedby": "hint",
		});
		expect(button().id).toBe("mine");
		expect(button().getAttribute("data-testid")).toBe("tg");
		expect(button().getAttribute("aria-describedby")).toBe("hint");
	});

	it("uses a consumer aria-label when no label prop is given", () => {
		render(Toggle, { "aria-label": "Italic" });
		expect(button().getAttribute("aria-label")).toBe("Italic");
	});

	it("fires listeners the component does not handle once", async () => {
		const onkeydown = vi.fn();
		const onpointerdown = vi.fn();
		render(Toggle, { onkeydown, onpointerdown });
		await fireEvent.keyDown(button(), { key: "a" });
		await fireEvent.pointerDown(button());
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after the press state changed", async () => {
		const onclick = vi.fn();
		const onPressedChange = vi.fn();
		render(Toggle, { onclick, onPressedChange });
		await fireEvent.click(button());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(onPressedChange).toHaveBeenCalledWith(true);
		expect(button().getAttribute("aria-pressed")).toBe("true");
	});

	it("calls the consumer onclick not at all while disabled", async () => {
		const onclick = vi.fn();
		render(Toggle, { disabled: true, onclick });
		await fireEvent.click(button());
		expect(onclick).not.toHaveBeenCalled();
	});

	it("keeps aria-pressed and type authoritative", () => {
		render(Toggle, { "aria-pressed": "mixed", type: "submit" });
		expect(button().getAttribute("aria-pressed")).toBe("false");
		expect(button().type).toBe("button");
	});
});
