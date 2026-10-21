import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Popover } from "./Popover.js";

afterEach(cleanup);

const trigger = () => document.querySelector(".ft-popover-trigger") as HTMLButtonElement;

describe("Popover trigger forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the trigger button", () => {
		render(<Popover id="pop" data-testid="t" aria-describedby="hint" />);
		expect(trigger().id).toBe("pop");
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires listeners the component does not handle once", () => {
		const onKeyDown = vi.fn();
		const onPointerDown = vi.fn();
		render(<Popover onKeyDown={onKeyDown} onPointerDown={onPointerDown} />);
		fireEvent.keyDown(trigger(), { key: "a" });
		fireEvent.pointerDown(trigger());
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the panel opened", () => {
		const onClick = vi.fn();
		const onOpenChange = vi.fn();
		render(<Popover onClick={onClick} onOpenChange={onOpenChange} />);
		fireEvent.click(trigger());
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps type, aria-expanded and aria-controls authoritative", () => {
		render(
			<Popover {...({ type: "submit", "aria-expanded": true, "aria-controls": "x" } as object)} />
		);
		expect(trigger().type).toBe("button");
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).toBeNull();
	});
});
