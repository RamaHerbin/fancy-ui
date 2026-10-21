import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Toggle } from "./Toggle.js";

afterEach(cleanup);

const button = () => document.querySelector("button") as HTMLButtonElement;

describe("Toggle forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(<Toggle label="Bold" id="mine" data-testid="tg" aria-describedby="hint" />);
		expect(button().id).toBe("mine");
		expect(button().getAttribute("data-testid")).toBe("tg");
		expect(button().getAttribute("aria-describedby")).toBe("hint");
	});

	it("uses a consumer aria-label when no label prop is given", () => {
		render(<Toggle aria-label="Italic" />);
		expect(button().getAttribute("aria-label")).toBe("Italic");
	});

	it("fires listeners the component does not handle once", () => {
		const onKeyDown = vi.fn();
		const onPointerDown = vi.fn();
		render(<Toggle onKeyDown={onKeyDown} onPointerDown={onPointerDown} />);
		fireEvent.keyDown(button(), { key: "a" });
		fireEvent.pointerDown(button());
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the press state changed", () => {
		const onClick = vi.fn();
		const onPressedChange = vi.fn();
		render(<Toggle onClick={onClick} onPressedChange={onPressedChange} />);
		fireEvent.click(button());
		expect(onPressedChange).toHaveBeenCalledWith(true);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button().getAttribute("aria-pressed")).toBe("true");
	});

	it("does not call the consumer onClick while disabled", () => {
		const onClick = vi.fn();
		render(<Toggle disabled onClick={onClick} />);
		fireEvent.click(button());
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps aria-pressed and type authoritative", () => {
		render(<Toggle {...({ "aria-pressed": "mixed", type: "submit" } as object)} />);
		expect(button().getAttribute("aria-pressed")).toBe("false");
		expect(button().type).toBe("button");
	});
});
