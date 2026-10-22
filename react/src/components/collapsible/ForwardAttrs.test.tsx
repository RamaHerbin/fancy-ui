import type { ComponentProps } from "react";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Collapsible } from "./Collapsible.js";
import { CollapsibleTrigger } from "./CollapsibleTrigger.js";
import { CollapsibleContent } from "./CollapsibleContent.js";

afterEach(cleanup);

interface HarnessProps {
	defaultOpen?: boolean;
	disabled?: boolean;
	onOpenChange?: (open: boolean) => void;
	rootAttrs?: ComponentProps<"div">;
	triggerAttrs?: ComponentProps<"button">;
	contentAttrs?: ComponentProps<"div">;
}

function Harness({
	defaultOpen,
	disabled,
	onOpenChange,
	rootAttrs,
	triggerAttrs,
	contentAttrs,
}: HarnessProps) {
	return (
		<Collapsible
			defaultOpen={defaultOpen}
			disabled={disabled}
			onOpenChange={onOpenChange}
			data-testid="root"
			{...rootAttrs}
		>
			<CollapsibleTrigger data-testid="trigger" {...triggerAttrs}>
				Toggle
			</CollapsibleTrigger>
			<CollapsibleContent data-testid="content" {...contentAttrs}>
				Body
			</CollapsibleContent>
		</Collapsible>
	);
}

const trigger = () => screen.getByTestId("trigger");
const content = () => screen.getByTestId("content");
const root = () => screen.getByTestId("root");

describe("Collapsible forwards native attributes", () => {
	it("puts id, aria-describedby and title on the root", () => {
		render(<Harness rootAttrs={{ id: "mine", "aria-describedby": "hint", title: "Panel" }} />);
		expect(root().id).toBe("mine");
		expect(root().getAttribute("aria-describedby")).toBe("hint");
		expect(root().title).toBe("Panel");
	});

	it("puts aria-describedby, title and data-* on the trigger button", () => {
		render(
			<Harness
				triggerAttrs={{ "aria-describedby": "hint", title: "More", ...{ "data-extra": "1" } }}
			/>
		);
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
		expect(trigger().title).toBe("More");
		expect(trigger().getAttribute("data-extra")).toBe("1");
	});

	it("puts aria-describedby, title and data-* on the content region", () => {
		render(
			<Harness
				contentAttrs={{ "aria-describedby": "hint", title: "Body", ...{ "data-extra": "1" } }}
			/>
		);
		expect(content().getAttribute("aria-describedby")).toBe("hint");
		expect(content().title).toBe("Body");
		expect(content().getAttribute("data-extra")).toBe("1");
	});

	it("fires listeners the component does not handle once", () => {
		const onBlur = vi.fn();
		const onPointerDown = vi.fn();
		const onMouseEnter = vi.fn();
		render(<Harness triggerAttrs={{ onBlur, onPointerDown }} contentAttrs={{ onMouseEnter }} />);
		fireEvent.blur(trigger());
		fireEvent.pointerDown(trigger());
		fireEvent.mouseEnter(content());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
		expect(onMouseEnter).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the toggle has been reported", () => {
		const order: string[] = [];
		const onClick = vi.fn(() => order.push("click"));
		const onOpenChange = vi.fn(() => order.push("open-change"));
		render(<Harness onOpenChange={onOpenChange} triggerAttrs={{ onClick }} />);
		fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["open-change", "click"]);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer click listener while disabled", () => {
		const onClick = vi.fn();
		render(<Harness disabled triggerAttrs={{ onClick }} />);
		fireEvent.click(trigger());
		expect(onClick).not.toHaveBeenCalled();
	});

	it("runs the consumer onTransitionEnd once, after the component settles", () => {
		const onTransitionEnd = vi.fn();
		render(<Harness defaultOpen contentAttrs={{ onTransitionEnd }} />);
		fireEvent.click(trigger());
		fireEvent(
			content(),
			Object.assign(new Event("transitionend", { bubbles: true }), {
				propertyName: "grid-template-rows",
			})
		);
		expect(onTransitionEnd).toHaveBeenCalledTimes(1);
		expect(content().style.visibility).toBe("hidden");
	});

	it("keeps aria-expanded, aria-controls, id, type and data-state the component's", () => {
		render(
			<Harness
				triggerAttrs={{
					"aria-expanded": true,
					"aria-controls": "elsewhere",
					id: "mine",
					type: "submit",
					...{ "data-state": "open" },
				}}
				contentAttrs={{ id: "other", ...{ "data-state": "open" } }}
			/>
		);
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(trigger().id).not.toBe("mine");
		expect(trigger().getAttribute("type")).toBe("button");
		expect(trigger().getAttribute("data-state")).toBe("closed");
		expect(content().id).not.toBe("other");
		expect(content().getAttribute("data-state")).toBe("closed");
		expect(content().hasAttribute("inert")).toBe(true);
	});

	it("keeps a consumer style next to the component's visibility", () => {
		render(<Harness contentAttrs={{ style: { color: "red" } }} />);
		expect(content().style.color).toBe("red");
		expect(content().style.visibility).toBe("hidden");
	});
});
