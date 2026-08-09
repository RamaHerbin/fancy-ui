import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Textarea from "./Textarea.svelte";
import ValueHarness from "./TextareaHarness.test.svelte";
import FieldHarness from "./TextareaFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

function textarea(container: HTMLElement): HTMLTextAreaElement {
	return container.querySelector("textarea") as HTMLTextAreaElement;
}

function counter(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-textarea-count");
}

describe("Textarea", () => {
	afterEach(cleanup);

	it("renders a real textarea, resting, with the placeholder and default rows", () => {
		const { container } = render(Textarea, { props: { placeholder: "A message…" } });
		const el = textarea(container);

		expect(el.tagName).toBe("TEXTAREA");
		expect(el.placeholder).toBe("A message…");
		expect(el.rows).toBe(3);
		expect(el.disabled).toBe(false);
		expect(el.hasAttribute("aria-invalid")).toBe(false);
	});

	it("is focusable, carrying the class the focus-visible ring is scoped to", () => {
		const { container } = render(Textarea, { props: {} });
		const el = textarea(container);

		expect(el.classList.contains("ft-textarea")).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it("reflects invalid through aria-invalid and the destructive border class", () => {
		const { container } = render(Textarea, { props: { invalid: true } });
		const el = textarea(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.className).toContain("border-destructive/50");
	});

	it("disables the field: native disabled", () => {
		const { container } = render(Textarea, { props: { disabled: true } });
		expect(textarea(container).disabled).toBe(true);
	});

	it("readonly stays focusable and keeps its name, unlike disabled", () => {
		const { container } = render(Textarea, {
			props: { readonly: true, name: "bio", value: "hello" },
		});
		const el = textarea(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("bio")).toBe("hello");
	});

	it("calls onValueChange with the new value on input", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Textarea, { props: { value: "", onValueChange } });
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "hi there" } });
		expect(el.value).toBe("hi there");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hi there");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Textarea, { props: { value: "start", onValueChange } });
		const el = textarea(container);

		expect(el.value).toBe("start");
		await fireEvent.input(el, { target: { value: "typed" } });
		expect(el.value).toBe("typed");
		expect(onValueChange).toHaveBeenCalledWith("typed");
	});

	it("blocks the callback while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Textarea, { props: { disabled: true, onValueChange } });
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "nope" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = textarea(container);

		expect(getByTestId("bound-value").textContent).toBe("");
		await fireEvent.input(el, { target: { value: "bound" } });
		expect(getByTestId("bound-value").textContent).toBe("bound");
		expect(el.value).toBe("bound");
	});

	it("round-trips the textarea element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(textarea(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(Textarea, { props: { label: "Message" } });
		expect(textarea(container).getAttribute("aria-label")).toBe("Message");
	});

	it("honours a custom rows count", () => {
		const { container } = render(Textarea, { props: { rows: 6 } });
		expect(textarea(container).rows).toBe(6);
	});

	it("omits the counter when showCount is not set", () => {
		const { container } = render(Textarea, { props: { value: "hello", maxlength: 500 } });
		expect(counter(container)).toBeNull();
	});

	it("shows the n / max counter and wires it into aria-describedby", () => {
		const { container } = render(Textarea, {
			props: { value: "hello world!", maxlength: 500, showCount: true },
		});
		const el = textarea(container);
		const el2 = counter(container);

		expect(el2?.textContent).toBe("12 / 500");
		expect(el.getAttribute("aria-describedby")).toBe(el2?.id);
	});

	it("shows a bare count with no denominator when maxlength is unset", () => {
		const { container } = render(Textarea, { props: { value: "hello", showCount: true } });
		expect(counter(container)?.textContent).toBe("5");
	});

	it("marks the limit-reached state with a non-colour attribute, not just a colour change", () => {
		const { container, rerender } = render(Textarea, {
			props: { value: "1234", maxlength: 5, showCount: true },
		});
		expect(counter(container)?.hasAttribute("data-limit-reached")).toBe(false);

		rerender({ value: "12345", maxlength: 5, showCount: true });
		expect(counter(container)?.getAttribute("data-limit-reached")).toBe("true");
	});

	it("respects the native maxlength attribute", () => {
		const { container } = render(Textarea, { props: { maxlength: 10 } });
		expect(textarea(container).maxLength).toBe(10);
	});

	it("does not touch the element's height when autoResize is off", async () => {
		const { container } = render(Textarea, { props: { value: "" } });
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "a\nb\nc\nd\ne" } });
		expect(el.style.height).toBe("");
	});

	it("sets an explicit pixel height when autoResize is on, and never throws across repeated input", async () => {
		const { container } = render(Textarea, { props: { value: "", autoResize: true } });
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "a" } });
		expect(el.style.height).toMatch(/^\d+(\.\d+)?px$/);

		// Repeated input exercises the effect -> grow() -> style write path
		// several times in a row; a read/write loop on the same $state would
		// blow Svelte's effect-depth guard well before this many iterations.
		for (let i = 0; i < 20; i++) {
			await fireEvent.input(el, { target: { value: `line ${i}\n`.repeat(i + 1) } });
		}
		expect(el.style.height).toMatch(/^\d+(\.\d+)?px$/);
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Textarea, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = textarea(container);

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
		const el = textarea(container);

		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Textarea, { props: { class: "mt-4" } });
		const cls = textarea(container).className;

		expect(cls).toContain("ft-textarea");
		expect(cls).toContain("mt-4");
	});
});
