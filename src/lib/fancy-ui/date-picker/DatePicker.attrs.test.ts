import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import DatePicker from "./DatePicker.svelte";
import FieldHarness from "./DatePickerFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

afterEach(() => cleanup());

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[role="combobox"]') as HTMLButtonElement;
}

describe("DatePicker native attribute forwarding", () => {
	it("forwards id, aria-describedby and data-* to the trigger button", () => {
		const { container } = render(DatePicker, {
			id: "fw",
			"aria-describedby": "hint",
			"data-testid": "x",
		} as never);
		const el = trigger(container);
		expect(el.id).toBe("fw");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("x");
	});

	it("merges a consumer aria-describedby with the FormField's", () => {
		const FIELD = {
			controlId: "f",
			describedBy: "f-hint",
			invalid: false,
			valid: false,
			required: false,
			disabled: false,
		} as unknown as FieldContext;
		const { container } = render(FieldHarness, {
			props: { context: FIELD, "aria-describedby": "mine" },
		} as never);
		expect(trigger(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires consumer onfocus and onblur once each", async () => {
		const onfocus = vi.fn();
		const onblur = vi.fn();
		const { container } = render(DatePicker, { onfocus, onblur } as never);
		await fireEvent.focus(trigger(container));
		expect(onfocus).toHaveBeenCalledTimes(1);
		await fireEvent.blur(trigger(container));
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onkeydown once (the trigger has no keyboard handling of its own)", async () => {
		const onkeydown = vi.fn();
		const { container } = render(DatePicker, { onkeydown } as never);
		await fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onclick once after the toggle", async () => {
		const onclick = vi.fn();
		const { container } = render(DatePicker, { onclick } as never);
		await fireEvent.click(trigger(container));
		await tick();
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA authoritative", () => {
		const { container } = render(DatePicker, {
			role: "button",
			type: "submit",
			"aria-expanded": "true",
			"aria-haspopup": "dialog",
			"aria-controls": "nope",
		} as never);
		const el = trigger(container);
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("type")).toBe("button");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("grid");
		expect(el.hasAttribute("aria-controls")).toBe(false);
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(DatePicker, { "aria-label": "Mine" } as never);
		expect(trigger(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(DatePicker, { label: "Own", "aria-label": "Mine" } as never);
		expect(trigger(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input", () => {
		const { container } = render(DatePicker, {
			value: new Date(2026, 0, 5),
			name: "when",
			form: "signup",
		} as never);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("when");
		expect(hidden.getAttribute("form")).toBe("signup");
		expect(hidden.value).toBe("2026-01-05");
	});
});
