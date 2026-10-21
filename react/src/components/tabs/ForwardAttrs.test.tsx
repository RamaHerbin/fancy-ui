import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Tabs } from "./Tabs.js";
import { TabsList } from "./TabsList.js";
import { TabsTrigger } from "./TabsTrigger.js";
import { TabsContent } from "./TabsContent.js";

afterEach(cleanup);

type TriggerAttrs = Partial<ComponentProps<typeof TabsTrigger>> & Record<string, unknown>;

function Rig({ attrs, disabled }: { attrs?: TriggerAttrs; disabled?: boolean }) {
	return (
		<Tabs value="a">
			<TabsList>
				<TabsTrigger value="a" disabled={disabled} {...attrs}>
					Alpha
				</TabsTrigger>
				<TabsTrigger value="b">Beta</TabsTrigger>
			</TabsList>
			<TabsContent value="a">Panel A</TabsContent>
			<TabsContent value="b">Panel B</TabsContent>
		</Tabs>
	);
}

const alpha = () => document.querySelector('[data-value="a"]') as HTMLButtonElement;

describe("TabsTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and title on the tab button", () => {
		render(<Rig attrs={{ "data-testid": "tab", "aria-describedby": "hint", title: "First" }} />);
		expect(alpha().getAttribute("data-testid")).toBe("tab");
		expect(alpha().getAttribute("aria-describedby")).toBe("hint");
		expect(alpha().title).toBe("First");
	});

	it("uses a consumer id when the trigger has no Tabs root to link with", () => {
		render(
			<TabsTrigger value="a" id="mine">
				Alpha
			</TabsTrigger>
		);
		expect(alpha().id).toBe("mine");
	});

	it("fires listeners the component does not handle once", () => {
		const onPointerDown = vi.fn();
		const onMouseEnter = vi.fn();
		render(<Rig attrs={{ onPointerDown, onMouseEnter }} />);
		fireEvent.pointerDown(alpha());
		fireEvent.mouseEnter(alpha());
		expect(onPointerDown).toHaveBeenCalledTimes(1);
		expect(onMouseEnter).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick, onFocus, onBlur and onKeyDown once after the internal logic", () => {
		const onClick = vi.fn();
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const onKeyDown = vi.fn();
		render(<Rig attrs={{ onClick, onFocus, onBlur, onKeyDown }} />);
		fireEvent.focus(alpha());
		expect(onFocus).toHaveBeenCalledTimes(1);
		fireEvent.blur(alpha());
		expect(onBlur).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(alpha(), { key: "ArrowRight" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-value="b"]')?.getAttribute("tabindex")).toBe("0");
		fireEvent.click(alpha());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(alpha().getAttribute("aria-selected")).toBe("true");
	});

	it("calls neither click nor keydown listener when disabled", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		render(<Rig disabled attrs={{ onClick, onKeyDown }} />);
		fireEvent.click(alpha());
		fireEvent.keyDown(alpha(), { key: "Home" });
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
	});

	it("keeps role, aria-selected, aria-controls, id and the roving tabindex authoritative", () => {
		render(
			<Rig
				attrs={{
					role: "button",
					"aria-selected": false,
					"aria-controls": "elsewhere",
					id: "mine",
					tabIndex: 5,
				}}
			/>
		);
		expect(alpha().getAttribute("role")).toBe("tab");
		expect(alpha().getAttribute("aria-selected")).toBe("true");
		expect(alpha().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(alpha().id).not.toBe("mine");
		expect(alpha().getAttribute("tabindex")).toBe("0");
	});
});
