import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { DropdownMenu } from "./DropdownMenu.js";
import { DropdownMenuTrigger } from "./DropdownMenuTrigger.js";
import { DropdownMenuContent } from "./DropdownMenuContent.js";
import { DropdownMenuItem } from "./DropdownMenuItem.js";
import { DropdownMenuSub } from "./DropdownMenuSub.js";
import { DropdownMenuSubTrigger } from "./DropdownMenuSubTrigger.js";
import { DropdownMenuSubContent } from "./DropdownMenuSubContent.js";

afterEach(cleanup);

interface RigProps {
	open?: boolean;
	triggerDisabled?: boolean;
	itemDisabled?: boolean;
	onSelect?: () => void;
	trigger?: Record<string, unknown>;
	item?: Record<string, unknown>;
	subTrigger?: Record<string, unknown>;
}

function Rig({
	open = false,
	triggerDisabled,
	itemDisabled,
	onSelect,
	trigger,
	item,
	subTrigger,
}: RigProps) {
	return (
		<DropdownMenu open={open}>
			<DropdownMenuTrigger
				disabled={triggerDisabled}
				{...(trigger as ComponentProps<typeof DropdownMenuTrigger>)}
			>
				Open menu
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					disabled={itemDisabled}
					closeOnSelect={false}
					onSelect={onSelect}
					{...(item as ComponentProps<typeof DropdownMenuItem>)}
				>
					Rename
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger
						{...(subTrigger as ComponentProps<typeof DropdownMenuSubTrigger>)}
					>
						More tools
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>Nested</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const trigger = () => document.querySelector(".ft-dropdown-menu-trigger") as HTMLButtonElement;
const item = () => document.querySelector('[data-variant="default"]') as HTMLButtonElement;
const subTrigger = () =>
	Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
		el.textContent?.includes("More tools")
	) as HTMLButtonElement;

describe("DropdownMenuTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and a title on the button", () => {
		render(<Rig trigger={{ "data-testid": "t", "aria-describedby": "hint", title: "Open it" }} />);
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
		expect(trigger().title).toBe("Open it");
	});

	it("fires a listener the component does not handle once", () => {
		const onFocus = vi.fn();
		const onPointerDown = vi.fn();
		render(<Rig trigger={{ onFocus, onPointerDown }} />);
		fireEvent.focus(trigger());
		fireEvent.pointerDown(trigger());
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once and the menu still toggles", () => {
		const onClick = vi.fn();
		render(<Rig trigger={{ onClick }} />);
		fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onKeyDown once, after the internal handling", () => {
		const onKeyDown = vi.fn();
		render(<Rig trigger={{ onKeyDown }} />);
		fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls neither when disabled", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		render(<Rig triggerDisabled trigger={{ onClick, onKeyDown }} />);
		fireEvent.click(trigger());
		fireEvent.keyDown(trigger(), { key: "Enter" });
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
	});

	it("keeps type, aria-haspopup and aria-expanded authoritative", () => {
		render(
			<Rig trigger={{ type: "submit", "aria-haspopup": "dialog", "aria-expanded": "true" }} />
		);
		expect(trigger().type).toBe("button");
		expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
	});
});

describe("DropdownMenuItem forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the menuitem", () => {
		render(<Rig open item={{ id: "rename", "data-testid": "i", "aria-describedby": "hint" }} />);
		expect(item().id).toBe("rename");
		expect(item().getAttribute("data-testid")).toBe("i");
		expect(item().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires an unhandled listener once", () => {
		const onBlur = vi.fn();
		const onPointerDown = vi.fn();
		render(<Rig open item={{ onBlur, onPointerDown }} />);
		fireEvent.blur(item());
		fireEvent.pointerDown(item());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after onSelect", () => {
		const order: string[] = [];
		const onSelect = vi.fn(() => order.push("select"));
		const onClick = vi.fn(() => order.push("click"));
		render(<Rig open onSelect={onSelect} item={{ onClick }} />);
		fireEvent.click(item());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["select", "click"]);
	});

	it("calls neither onSelect nor the consumer onClick while disabled", () => {
		const onSelect = vi.fn();
		const onClick = vi.fn();
		render(<Rig open itemDisabled onSelect={onSelect} item={{ onClick }} />);
		fireEvent.click(item());
		expect(onSelect).not.toHaveBeenCalled();
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps role, tabindex and data-variant authoritative", () => {
		render(<Rig open item={{ role: "button", tabIndex: 0, "data-variant": "x" }} />);
		expect(item().getAttribute("role")).toBe("menuitem");
		expect(item().getAttribute("tabindex")).toBe("-1");
		expect(item().getAttribute("data-variant")).toBe("default");
	});
});

describe("DropdownMenuSubTrigger forwards native attributes", () => {
	it("puts data-testid and aria-describedby on the row", () => {
		render(<Rig open subTrigger={{ "data-testid": "s", "aria-describedby": "hint" }} />);
		expect(subTrigger().getAttribute("data-testid")).toBe("s");
		expect(subTrigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires an unhandled listener once", () => {
		const onBlur = vi.fn();
		render(<Rig open subTrigger={{ onBlur }} />);
		fireEvent.blur(subTrigger());
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once and the submenu still opens", () => {
		const onClick = vi.fn();
		render(<Rig open subTrigger={{ onClick }} />);
		fireEvent.click(subTrigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(subTrigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer mouse listener while disabled, mouseleave included", () => {
		const onMouseEnter = vi.fn();
		const onMouseLeave = vi.fn();
		render(<Rig open subTrigger={{ disabled: true, onMouseEnter, onMouseLeave }} />);
		fireEvent.mouseEnter(subTrigger());
		fireEvent.mouseLeave(subTrigger());
		expect(onMouseEnter).not.toHaveBeenCalled();
		expect(onMouseLeave).not.toHaveBeenCalled();
		expect(subTrigger().getAttribute("aria-expanded")).toBe("false");
	});

	it("keeps role, tabindex, aria-haspopup and aria-expanded authoritative", () => {
		render(
			<Rig
				open
				subTrigger={{
					role: "button",
					tabIndex: 0,
					"aria-haspopup": "dialog",
					"aria-expanded": "true",
				}}
			/>
		);
		expect(subTrigger().getAttribute("role")).toBe("menuitem");
		expect(subTrigger().getAttribute("tabindex")).toBe("-1");
		expect(subTrigger().getAttribute("aria-haspopup")).toBe("menu");
		expect(subTrigger().getAttribute("aria-expanded")).toBe("false");
	});
});
