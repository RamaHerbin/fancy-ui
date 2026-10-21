import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TimePicker } from "./TimePicker.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

afterEach(() => cleanup());

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[role="combobox"]') as HTMLButtonElement;
}

describe("TimePicker native attribute forwarding", () => {
	it("forwards id, aria-describedby and data-* to the trigger button", () => {
		const { container } = render(<TimePicker id="fw" aria-describedby="hint" data-testid="x" />);
		const el = trigger(container);
		expect(el.id).toBe("fw");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("x");
	});

	it("merges a consumer aria-describedby with the FormField's", () => {
		const field = {
			controlId: "f",
			describedBy: "f-hint",
			invalid: false,
			valid: false,
			required: false,
			disabled: false,
		} as unknown as FieldContext;
		const { container } = render(
			<FieldProvider value={field}>
				<TimePicker aria-describedby="mine" />
			</FieldProvider>
		);
		expect(trigger(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires consumer onFocus and onBlur once each", () => {
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const { container } = render(<TimePicker onFocus={onFocus} onBlur={onBlur} />);
		fireEvent.focus(trigger(container));
		expect(onFocus).toHaveBeenCalledTimes(1);
		fireEvent.blur(trigger(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onKeyDown once, even when prevented", () => {
		let prevented = false;
		const onKeyDown = vi.fn((e: { defaultPrevented: boolean }) => {
			prevented = e.defaultPrevented;
		});
		const { container } = render(<TimePicker onKeyDown={onKeyDown} />);
		fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("fires a consumer onClick once after the toggle", () => {
		const onClick = vi.fn();
		const { container } = render(<TimePicker onClick={onClick} />);
		fireEvent.click(trigger(container));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA authoritative", () => {
		const { container } = render(
			<TimePicker
				{...({
					role: "button",
					type: "submit",
					"aria-expanded": true,
					"aria-haspopup": "dialog",
					"aria-controls": "nope",
				} as object)}
			/>
		);
		const el = trigger(container);
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("type")).toBe("button");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.hasAttribute("aria-controls")).toBe(false);
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(<TimePicker aria-label="Mine" />);
		expect(trigger(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(<TimePicker label="Own" aria-label="Mine" />);
		expect(trigger(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input", () => {
		const { container } = render(<TimePicker value="09:30" name="when" form="signup" />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("when");
		expect(hidden.getAttribute("form")).toBe("signup");
		expect(hidden.value).toBe("09:30");
	});
});
