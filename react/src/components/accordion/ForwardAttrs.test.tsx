import type { ComponentProps } from "react";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Accordion } from "./Accordion.js";
import { AccordionItem } from "./AccordionItem.js";
import { AccordionTrigger } from "./AccordionTrigger.js";
import { AccordionContent } from "./AccordionContent.js";

afterEach(cleanup);

interface HarnessProps {
	defaultValue?: string;
	disabled?: boolean;
	rootAttrs?: Omit<ComponentProps<"div">, "defaultValue">;
	itemAttrs?: Omit<ComponentProps<"div">, "defaultValue">;
	triggerAttrs?: ComponentProps<"button">;
	contentAttrs?: ComponentProps<"div">;
}

/** Attribute bags land on the first item's pieces only, like the Svelte rig. */
function Harness({
	defaultValue,
	disabled,
	rootAttrs,
	itemAttrs,
	triggerAttrs,
	contentAttrs,
}: HarnessProps) {
	return (
		<Accordion defaultValue={defaultValue} disabled={disabled} data-testid="root" {...rootAttrs}>
			{["a", "b"].map((value, index) => (
				<AccordionItem
					key={value}
					value={value}
					data-testid={`item-${value}`}
					{...(index === 0 ? itemAttrs : {})}
				>
					<AccordionTrigger data-testid={`trigger-${value}`} {...(index === 0 ? triggerAttrs : {})}>
						{value}
					</AccordionTrigger>
					<AccordionContent data-testid={`content-${value}`} {...(index === 0 ? contentAttrs : {})}>
						Panel {value}
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

const root = () => screen.getByTestId("root");
const item = () => screen.getByTestId("item-a");
const trigger = () => screen.getByTestId("trigger-a");
const content = () => screen.getByTestId("content-a");

describe("Accordion forwards native attributes", () => {
	it("puts id, aria-label and title on the root", () => {
		render(<Harness rootAttrs={{ id: "mine", "aria-label": "FAQ", title: "Questions" }} />);
		expect(root().id).toBe("mine");
		expect(root().getAttribute("aria-label")).toBe("FAQ");
		expect(root().title).toBe("Questions");
	});

	it("puts id, title and data-* on an item", () => {
		render(<Harness itemAttrs={{ id: "row", title: "Row", ...{ "data-extra": "1" } }} />);
		expect(item().id).toBe("row");
		expect(item().title).toBe("Row");
		expect(item().getAttribute("data-extra")).toBe("1");
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
		render(<Harness triggerAttrs={{ onBlur, onPointerDown }} />);
		fireEvent.blur(trigger());
		fireEvent.pointerDown(trigger());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick and onKeyDown once, after the internal logic", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		render(<Harness triggerAttrs={{ onClick, onKeyDown }} />);
		trigger().focus();
		fireEvent.keyDown(trigger(), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(document.activeElement).toBe(screen.getByTestId("trigger-b"));
		fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("calls no consumer listener on a disabled trigger", () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		render(<Harness disabled triggerAttrs={{ onClick, onKeyDown }} />);
		fireEvent.click(trigger());
		fireEvent.keyDown(trigger(), { key: "Home" });
		expect(onClick).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
	});

	it("keeps role, aria-expanded, aria-controls, id, aria-labelledby and state the component's", () => {
		render(
			<Harness
				defaultValue="a"
				triggerAttrs={{
					"aria-expanded": false,
					"aria-controls": "elsewhere",
					id: "mine",
					type: "submit",
					"aria-disabled": false,
				}}
				contentAttrs={{
					role: "note",
					"aria-labelledby": "elsewhere",
					id: "other",
					...{ "data-state": "closed" },
				}}
			/>
		);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
		expect(trigger().getAttribute("aria-controls")).not.toBe("elsewhere");
		expect(trigger().id).not.toBe("mine");
		expect(trigger().getAttribute("type")).toBe("button");
		expect(trigger().getAttribute("aria-disabled")).toBe("true");
		expect(content().getAttribute("role")).toBe("region");
		expect(content().getAttribute("aria-labelledby")).toBe(trigger().id);
		expect(content().id).not.toBe("other");
		expect(content().getAttribute("data-state")).toBe("open");
	});

	it("falls back to a consumer aria-disabled when the component has none to say", () => {
		render(<Harness triggerAttrs={{ "aria-disabled": true }} />);
		expect(trigger().getAttribute("aria-disabled")).toBe("true");
	});
});
