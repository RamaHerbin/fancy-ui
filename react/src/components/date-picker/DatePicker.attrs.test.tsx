import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "./DatePicker.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

afterEach(() => cleanup());

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[role="combobox"]') as HTMLButtonElement;
}

describe("DatePicker native attribute forwarding", () => {
	it("forwards id, aria-describedby and data-* to the trigger button", () => {
		const { container } = render(<DatePicker id="fw" aria-describedby="hint" data-testid="x" />);
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
				<DatePicker aria-describedby="mine" />
			</FieldProvider>
		);
		expect(trigger(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires consumer onFocus and onBlur once each", () => {
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const { container } = render(<DatePicker onFocus={onFocus} onBlur={onBlur} />);
		fireEvent.focus(trigger(container));
		expect(onFocus).toHaveBeenCalledTimes(1);
		fireEvent.blur(trigger(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onKeyDown once (the trigger has no keyboard handling of its own)", () => {
		const onKeyDown = vi.fn();
		const { container } = render(<DatePicker onKeyDown={onKeyDown} />);
		fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onClick once after the toggle", () => {
		const onClick = vi.fn();
		const { container } = render(<DatePicker onClick={onClick} />);
		fireEvent.click(trigger(container));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA authoritative", () => {
		const { container } = render(
			<DatePicker
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
		expect(el.getAttribute("aria-haspopup")).toBe("grid");
		expect(el.hasAttribute("aria-controls")).toBe(false);
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(<DatePicker aria-label="Mine" />);
		expect(trigger(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(<DatePicker label="Own" aria-label="Mine" />);
		expect(trigger(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input", () => {
		const { container } = render(
			<DatePicker value={new Date(2026, 0, 5)} name="when" form="signup" />
		);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("when");
		expect(hidden.getAttribute("form")).toBe("signup");
		expect(hidden.value).toBe("2026-01-05");
	});
});
