import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Sources } from "./Sources.js";
import { SourcesTrigger } from "./SourcesTrigger.js";
import { SourcesList } from "./SourcesList.js";

afterEach(cleanup);

const SOURCES = [
	{ id: "1", title: "One", url: "https://one.example/a" },
	{ id: "2", title: "Two", url: "https://two.example/b" },
];

type TriggerAttrs = Partial<ComponentProps<typeof SourcesTrigger>> & Record<string, unknown>;

function Rig({ attrs }: { attrs?: TriggerAttrs }) {
	return (
		<Sources sources={SOURCES}>
			<SourcesTrigger {...attrs} />
			<SourcesList />
		</Sources>
	);
}

const trigger = () => document.querySelector(".ft-sources-trigger") as HTMLButtonElement;

describe("SourcesTrigger forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(<Rig attrs={{ id: "src", "data-testid": "t", "aria-describedby": "hint" }} />);
		expect(trigger().id).toBe("src");
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", () => {
		const onBlur = vi.fn();
		const onPointerDown = vi.fn();
		render(<Rig attrs={{ onBlur, onPointerDown }} />);
		fireEvent.blur(trigger());
		fireEvent.pointerDown(trigger());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the list toggled", () => {
		const onClick = vi.fn();
		render(<Rig attrs={{ onClick }} />);
		fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps aria-expanded and aria-controls authoritative and type fixed", () => {
		render(<Rig attrs={{ "aria-expanded": true, "aria-controls": "x", type: "submit" }} />);
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).not.toBe("x");
		expect(trigger().type).toBe("button");
	});
});
