import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Select } from "./Select.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

const OPTIONS = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
];

afterEach(() => cleanup());

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('[role="combobox"]') as HTMLButtonElement;
}

describe("Select native attribute forwarding", () => {
	it("forwards id, aria-describedby and data-* to the trigger button", () => {
		const { container } = render(
			<Select options={OPTIONS} id="plan" aria-describedby="hint" data-testid="sel" />
		);
		const el = trigger(container);
		expect(el.id).toBe("plan");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("sel");
	});

	it("merges a consumer aria-describedby with the FormField's", () => {
		const field = {
			controlId: "f",
			describedBy: "f-hint",
			disabled: false,
			required: false,
			invalid: false,
		} as unknown as FieldContext;
		const { container } = render(
			<FieldProvider value={field}>
				<Select options={OPTIONS} aria-describedby="mine" />
			</FieldProvider>
		);
		expect(trigger(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires a consumer onBlur once", () => {
		const onBlur = vi.fn();
		const { container } = render(<Select options={OPTIONS} onBlur={onBlur} />);
		fireEvent.blur(trigger(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onKeyDown once, even when prevented", () => {
		let prevented = false;
		const onKeyDown = vi.fn((e: { defaultPrevented: boolean }) => {
			prevented = e.defaultPrevented;
		});
		const { container } = render(<Select options={OPTIONS} onKeyDown={onKeyDown} />);
		fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("fires a consumer onClick once after the toggle", () => {
		const onClick = vi.fn();
		const { container } = render(<Select options={OPTIONS} onClick={onClick} />);
		fireEvent.click(trigger(container));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA authoritative", () => {
		const { container } = render(
			<Select
				options={OPTIONS}
				{...({
					role: "button",
					"aria-expanded": true,
					"aria-haspopup": "dialog",
					"aria-controls": "nope",
					"aria-activedescendant": "nope",
					type: "submit",
				} as object)}
			/>
		);
		const el = trigger(container);
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		expect(el.getAttribute("type")).toBe("button");
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(<Select options={OPTIONS} aria-label="Mine" />);
		expect(trigger(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(<Select options={OPTIONS} label="Own" aria-label="Mine" />);
		expect(trigger(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input", () => {
		const { container } = render(
			<Select options={OPTIONS} value="react" name="fw" form="signup" />
		);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("fw");
		expect(hidden.getAttribute("form")).toBe("signup");
	});
});
