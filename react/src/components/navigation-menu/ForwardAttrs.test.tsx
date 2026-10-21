import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { NavigationMenu } from "./NavigationMenu.js";
import { NavigationMenuList } from "./NavigationMenuList.js";
import { NavigationMenuItem } from "./NavigationMenuItem.js";
import { NavigationMenuTrigger } from "./NavigationMenuTrigger.js";
import { NavigationMenuContent } from "./NavigationMenuContent.js";

afterEach(cleanup);

type TriggerAttrs = Partial<ComponentProps<typeof NavigationMenuTrigger>> & Record<string, unknown>;

function Rig({ attrs }: { attrs?: TriggerAttrs }) {
	return (
		<NavigationMenu label="Test navigation">
			<NavigationMenuList>
				<NavigationMenuItem value="products">
					<NavigationMenuTrigger {...attrs}>Products</NavigationMenuTrigger>
					<NavigationMenuContent>Panel</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem value="company">
					<NavigationMenuTrigger>Company</NavigationMenuTrigger>
					<NavigationMenuContent>Panel</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}

const first = () => document.querySelector('[data-value="products"]') as HTMLButtonElement;

describe("NavigationMenuTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and title on the button", () => {
		render(<Rig attrs={{ "data-testid": "nav", "aria-describedby": "hint", title: "Products" }} />);
		expect(first().getAttribute("data-testid")).toBe("nav");
		expect(first().getAttribute("aria-describedby")).toBe("hint");
		expect(first().title).toBe("Products");
	});

	it("fires listeners the component does not handle once", () => {
		const onBlur = vi.fn();
		const onPointerDown = vi.fn();
		render(<Rig attrs={{ onBlur, onPointerDown }} />);
		fireEvent.blur(first());
		fireEvent.pointerDown(first());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the panel toggled", () => {
		const onClick = vi.fn();
		render(<Rig attrs={{ onClick }} />);
		fireEvent.click(first());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(first().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onKeyDown once, after the internal handling", () => {
		const onKeyDown = vi.fn();
		render(<Rig attrs={{ onKeyDown }} />);
		fireEvent.keyDown(first(), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(first().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs consumer pointer listeners once", () => {
		const onPointerEnter = vi.fn();
		const onPointerLeave = vi.fn();
		render(<Rig attrs={{ onPointerEnter, onPointerLeave }} />);
		fireEvent.pointerEnter(first());
		fireEvent.pointerLeave(first());
		expect(onPointerEnter).toHaveBeenCalledTimes(1);
		expect(onPointerLeave).toHaveBeenCalledTimes(1);
	});

	it("keeps id, aria-expanded, aria-controls and the roving tabindex authoritative", () => {
		render(
			<Rig attrs={{ id: "mine", "aria-expanded": true, "aria-controls": "x", tabIndex: 5 }} />
		);
		expect(first().id).not.toBe("mine");
		expect(first().getAttribute("aria-expanded")).toBe("false");
		expect(first().getAttribute("aria-controls")).toBeNull();
		expect(first().getAttribute("tabindex")).toBe("0");
	});
});

describe("NavigationMenuTrigger with a forwarded disabled", () => {
	const second = () => document.querySelector('[data-value="company"]') as HTMLButtonElement;

	it("hands the tab stop to the first enabled trigger", () => {
		render(<Rig attrs={{ disabled: true }} />);
		expect(first().disabled).toBe(true);
		expect(first().getAttribute("tabindex")).toBe("-1");
		expect(second().getAttribute("tabindex")).toBe("0");
	});

	it("is skipped by arrow navigation", () => {
		render(<Rig attrs={{ disabled: true }} />);
		second().focus();
		fireEvent.keyDown(second(), { key: "ArrowRight" });
		expect(document.activeElement).toBe(second());
		expect(second().getAttribute("tabindex")).toBe("0");
		fireEvent.keyDown(second(), { key: "Home" });
		expect(first().getAttribute("tabindex")).toBe("-1");
		expect(second().getAttribute("tabindex")).toBe("0");
	});

	it("does not open or call consumer listeners", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		render(<Rig attrs={{ disabled: true, onClick, onKeyDown }} />);
		fireEvent.click(first());
		fireEvent.keyDown(first(), { key: "ArrowDown" });
		expect(first().getAttribute("aria-expanded")).toBe("false");
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
	});
});
