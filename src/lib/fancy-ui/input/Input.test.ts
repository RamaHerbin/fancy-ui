import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Input from "./Input.svelte";
import ValueHarness from "./InputHarness.test.svelte";
import FieldHarness from "./InputFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

describe("Input", () => {
	afterEach(cleanup);

	it("renders a real input, resting, with the placeholder", () => {
		const { container } = render(Input, { props: { placeholder: "Placeholder…" } });
		const el = input(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("text");
		expect(el.placeholder).toBe("Placeholder…");
		expect(el.disabled).toBe(false);
		expect(el.hasAttribute("aria-invalid")).toBe(false);
	});

	it("is focusable, carrying the class the focus-visible ring is scoped to", () => {
		const { container } = render(Input, { props: {} });
		const el = input(container);

		expect(el.classList.contains("ft-input")).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it("reflects invalid through aria-invalid and the destructive border class", () => {
		const { container } = render(Input, { props: { invalid: true } });
		const el = input(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.className).toContain("border-destructive/50");
	});

	it("disables the field: native disabled, out of the tab order", () => {
		const { container } = render(Input, { props: { disabled: true } });
		const el = input(container);

		expect(el.disabled).toBe(true);
	});

	it("readonly stays focusable and keeps its name, unlike disabled", () => {
		const { container } = render(Input, {
			props: { readonly: true, name: "email", value: "rama@fancy.ui" },
		});
		const el = input(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);

		// A readonly field still submits; a disabled one is excluded entirely.
		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("email")).toBe("rama@fancy.ui");
	});

	it("calls onValueChange with the new value on input", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Input, { props: { value: "", onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "hi" } });
		expect(el.value).toBe("hi");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hi");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Input, { props: { value: "start", onValueChange } });
		const el = input(container);

		expect(el.value).toBe("start");
		await fireEvent.input(el, { target: { value: "typed" } });
		expect(el.value).toBe("typed");
		expect(onValueChange).toHaveBeenCalledWith("typed");
	});

	it("blocks the callback while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Input, { props: { disabled: true, onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "nope" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = input(container);

		expect(getByTestId("bound-value").textContent).toBe("");
		await fireEvent.input(el, { target: { value: "bound" } });
		expect(getByTestId("bound-value").textContent).toBe("bound");
		expect(el.value).toBe("bound");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(Input, { props: { label: "Email" } });
		expect(input(container).getAttribute("aria-label")).toBe("Email");
	});

	it.each(["text", "email", "url", "tel", "password", "search", "number"] as const)(
		"applies the %s type",
		(type) => {
			const { container } = render(Input, { props: { type } });
			expect(input(container).type).toBe(type);
		}
	);

	it("merges the class prop with the base classes", () => {
		const { container } = render(Input, { props: { class: "mt-4" } });
		const cls = input(container).className;

		expect(cls).toContain("ft-input");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Input, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = input(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = input(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to Input — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});
});
