import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Combobox } from "./Combobox.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

const OPTIONS = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
];

afterEach(() => cleanup());

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector('input[role="combobox"]') as HTMLInputElement;
}

describe("Combobox native attribute forwarding", () => {
	it("forwards id, aria-describedby, data-*, autoComplete and inputMode to the text input", () => {
		const { container } = render(
			<Combobox
				options={OPTIONS}
				id="fw"
				aria-describedby="hint"
				data-testid="cb"
				autoComplete="off"
				inputMode="search"
			/>
		);
		const el = input(container);
		expect(el.id).toBe("fw");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("cb");
		expect(el.getAttribute("autocomplete")).toBe("off");
		expect(el.getAttribute("inputmode")).toBe("search");
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
				<Combobox options={OPTIONS} aria-describedby="mine" />
			</FieldProvider>
		);
		expect(input(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires consumer onFocus and onBlur once each", () => {
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const { container } = render(<Combobox options={OPTIONS} onFocus={onFocus} onBlur={onBlur} />);
		fireEvent.focus(input(container));
		expect(onFocus).toHaveBeenCalledTimes(1);
		fireEvent.blur(input(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onKeyDown once, even when prevented", () => {
		let prevented = false;
		const onKeyDown = vi.fn((e: { defaultPrevented: boolean }) => {
			prevented = e.defaultPrevented;
		});
		const { container } = render(<Combobox options={OPTIONS} onKeyDown={onKeyDown} />);
		fireEvent.keyDown(input(container), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(input(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("fires a consumer onChange once after the internal filtering", () => {
		const onChange = vi.fn();
		const { container } = render(<Combobox options={OPTIONS} onChange={onChange} />);
		fireEvent.change(input(container), { target: { value: "re" } });
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(input(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA, type and value authoritative", () => {
		const { container } = render(
			<Combobox
				options={OPTIONS}
				value="react"
				{...({
					role: "textbox",
					type: "email",
					"aria-expanded": true,
					"aria-haspopup": "dialog",
					"aria-autocomplete": "both",
					"aria-controls": "nope",
					"aria-activedescendant": "nope",
				} as object)}
			/>
		);
		const el = input(container);
		expect(el.getAttribute("type")).toBe("text");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.getAttribute("aria-autocomplete")).toBe("list");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		expect(el.value).toBe("React");
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(<Combobox options={OPTIONS} aria-label="Mine" />);
		expect(input(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(<Combobox options={OPTIONS} label="Own" aria-label="Mine" />);
		expect(input(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input and required to the visible one", () => {
		const { container } = render(
			<Combobox options={OPTIONS} value="react" name="fw" form="signup" required />
		);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("fw");
		expect(hidden.getAttribute("form")).toBe("signup");
		expect(input(container).required).toBe(true);
	});
});
