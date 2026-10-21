import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import type { ComponentProps } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { ToggleGroup } from "./ToggleGroup.js";
import { ToggleGroupItem } from "./ToggleGroupItem.js";

afterEach(cleanup);

type ItemAttrs = Partial<ComponentProps<typeof ToggleGroupItem>> & Record<string, unknown>;

function Rig({ attrs, disabled }: { attrs?: ItemAttrs; disabled?: boolean }) {
	const [value, setValue] = useState<string | string[]>("b");
	return (
		<ToggleGroup type="single" value={value} onValueChange={setValue}>
			<ToggleGroupItem value="a" disabled={disabled} {...attrs}>
				Alpha
			</ToggleGroupItem>
			<ToggleGroupItem value="b">Beta</ToggleGroupItem>
		</ToggleGroup>
	);
}

const alpha = () => document.querySelector('[data-value="a"]') as HTMLButtonElement;

describe("ToggleGroupItem forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(<Rig attrs={{ id: "mine", "data-testid": "item", "aria-describedby": "hint" }} />);
		expect(alpha().id).toBe("mine");
		expect(alpha().getAttribute("data-testid")).toBe("item");
		expect(alpha().getAttribute("aria-describedby")).toBe("hint");
	});

	it("uses a consumer aria-label when no label prop is given", () => {
		render(<Rig attrs={{ "aria-label": "Bold" }} />);
		expect(alpha().getAttribute("aria-label")).toBe("Bold");
	});

	it("fires listeners the component does not handle once", () => {
		const onBlur = vi.fn();
		const onPointerDown = vi.fn();
		render(<Rig attrs={{ onBlur, onPointerDown }} />);
		fireEvent.blur(alpha());
		fireEvent.pointerDown(alpha());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick, onFocus and onKeyDown once after the internal logic", () => {
		const onClick = vi.fn();
		const onFocus = vi.fn();
		const onKeyDown = vi.fn();
		render(<Rig attrs={{ onClick, onFocus, onKeyDown }} />);
		fireEvent.focus(alpha());
		expect(onFocus).toHaveBeenCalledTimes(1);
		fireEvent.click(alpha());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(alpha().getAttribute("aria-pressed")).toBe("true");
		fireEvent.keyDown(alpha(), { key: "ArrowRight" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-value="b"]')?.getAttribute("tabindex")).toBe("0");
	});

	it("calls none of the consumer listeners when disabled", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		const onFocus = vi.fn();
		render(<Rig disabled attrs={{ onClick, onKeyDown, onFocus }} />);
		fireEvent.click(alpha());
		fireEvent.keyDown(alpha(), { key: "Home" });
		fireEvent.focus(alpha());
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
		expect(onFocus).not.toHaveBeenCalled();
	});

	it("keeps aria-pressed and the roving tabindex authoritative", () => {
		render(<Rig attrs={{ "aria-pressed": true, tabIndex: 5 }} />);
		expect(alpha().getAttribute("aria-pressed")).toBe("false");
		expect(alpha().getAttribute("tabindex")).toBe("-1");
	});
});
