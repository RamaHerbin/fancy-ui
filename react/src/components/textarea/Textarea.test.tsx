import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Textarea } from "./Textarea.js";
import { TextareaHarness as ValueHarness } from "./TextareaHarness.js";
import { TextareaFieldHarness as FieldHarness } from "./TextareaFieldHarness.js";
import type { FieldContext } from "../../internals/field.js";

function textarea(container: HTMLElement): HTMLTextAreaElement {
	return container.querySelector("textarea") as HTMLTextAreaElement;
}

function counter(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-textarea-count");
}

describe("Textarea", () => {
	afterEach(cleanup);

	it("renders a real textarea, resting, with the placeholder and default rows", () => {
		const { container } = render(<Textarea placeholder="A message…" />);
		const el = textarea(container);

		expect(el.tagName).toBe("TEXTAREA");
		expect(el.placeholder).toBe("A message…");
		expect(el.rows).toBe(3);
		expect(el.disabled).toBe(false);
		expect(el.hasAttribute("aria-invalid")).toBe(false);
	});

	it("is focusable, carrying the class the focus-visible ring is scoped to", () => {
		const { container } = render(<Textarea />);
		const el = textarea(container);

		expect(el.classList.contains("ft-textarea")).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it("reflects invalid through aria-invalid and the destructive border class", () => {
		const { container } = render(<Textarea invalid />);
		const el = textarea(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.className).toContain("border-destructive/50");
	});

	it("disables the field: native disabled", () => {
		const { container } = render(<Textarea disabled />);
		expect(textarea(container).disabled).toBe(true);
	});

	it("readonly stays focusable and keeps its name, unlike disabled", () => {
		const { container } = render(<Textarea readonly name="bio" value="hello" />);
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
		// The Svelte test passes `value=""`; here that would make the textarea
		// controlled and pin it to "", so the uncontrolled default (which is
		// "") exercises the same starting state.
		const onValueChange = vi.fn();
		const { container } = render(<Textarea onValueChange={onValueChange} />);
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "hi there" } });
		expect(el.value).toBe("hi there");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hi there");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		// The Svelte side's non-bound `value="start"` — seed once, then the
		// component owns it — is React's `defaultValue`.
		const onValueChange = vi.fn();
		const { container } = render(<Textarea defaultValue="start" onValueChange={onValueChange} />);
		const el = textarea(container);

		expect(el.value).toBe("start");
		await fireEvent.input(el, { target: { value: "typed" } });
		expect(el.value).toBe("typed");
		expect(onValueChange).toHaveBeenCalledWith("typed");
	});

	it("blocks the callback while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Textarea disabled onValueChange={onValueChange} />);
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "nope" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips value through the controlled value/onValueChange pair", async () => {
		const { container, getByTestId } = render(<ValueHarness />);
		const el = textarea(container);

		expect(getByTestId("bound-value").textContent).toBe("");
		await fireEvent.input(el, { target: { value: "bound" } });
		expect(getByTestId("bound-value").textContent).toBe("bound");
		expect(el.value).toBe("bound");
	});

	it("round-trips the textarea element through the forwarded ref", () => {
		const { container } = render(<ValueHarness />);
		expect(textarea(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(<Textarea label="Message" />);
		expect(textarea(container).getAttribute("aria-label")).toBe("Message");
	});

	it("honours a custom rows count", () => {
		const { container } = render(<Textarea rows={6} />);
		expect(textarea(container).rows).toBe(6);
	});

	it("omits the counter when showCount is not set", () => {
		const { container } = render(<Textarea value="hello" maxlength={500} />);
		expect(counter(container)).toBeNull();
	});

	it("shows the n / max counter and wires it into aria-describedby", () => {
		const { container } = render(<Textarea value="hello world!" maxlength={500} showCount />);
		const el = textarea(container);
		const el2 = counter(container);

		expect(el2?.textContent).toBe("12 / 500");
		expect(el.getAttribute("aria-describedby")).toBe(el2?.id);
	});

	it("shows a bare count with no denominator when maxlength is unset", () => {
		const { container } = render(<Textarea value="hello" showCount />);
		expect(counter(container)?.textContent).toBe("5");
	});

	it("marks the limit-reached state with a non-colour attribute, not just a colour change", () => {
		const { container, rerender } = render(<Textarea value="1234" maxlength={5} showCount />);
		expect(counter(container)?.hasAttribute("data-limit-reached")).toBe(false);

		rerender(<Textarea value="12345" maxlength={5} showCount />);
		expect(counter(container)?.getAttribute("data-limit-reached")).toBe("true");
	});

	it("respects the native maxlength attribute", () => {
		const { container } = render(<Textarea maxlength={10} />);
		expect(textarea(container).maxLength).toBe(10);
	});

	it("does not touch the element's height when autoResize is off", async () => {
		const { container } = render(<Textarea />);
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "a\nb\nc\nd\ne" } });
		expect(el.style.height).toBe("");
	});

	it("sets an explicit pixel height when autoResize is on, and never throws across repeated input", async () => {
		const { container } = render(<Textarea autoResize />);
		const el = textarea(container);

		await fireEvent.input(el, { target: { value: "a" } });
		expect(el.style.height).toMatch(/^\d+(\.\d+)?px$/);

		// Repeated input exercises the effect -> grow() -> style write path
		// several times in a row; a read/write loop feeding React state back
		// into the same effect would loop long before this many iterations.
		for (let i = 0; i < 20; i++) {
			await fireEvent.input(el, { target: { value: `line ${i}\n`.repeat(i + 1) } });
		}
		expect(el.style.height).toMatch(/^\d+(\.\d+)?px$/);
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(<Textarea id="solo" invalid required disabled={false} />);
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
		const { container } = render(<FieldHarness context={context} />);
		const el = textarea(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to Textarea — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	it("merges the className prop with the base classes", () => {
		const { container } = render(<Textarea className="mt-4" />);
		const cls = textarea(container).className;

		expect(cls).toContain("ft-textarea");
		expect(cls).toContain("mt-4");
	});
});
