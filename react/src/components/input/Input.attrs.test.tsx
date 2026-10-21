import { render, cleanup, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Input } from "./Input.js";
import { FormField } from "../form-field/FormField.js";

function el(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

describe("Input native attribute forwarding", () => {
	afterEach(cleanup);

	it("forwards id, name, form, title, data-* and aria-* to the native element", () => {
		const { container } = render(
			<Input
				id="consumer-id"
				name="field-name"
				form="some-form"
				title="tip"
				data-testid="control"
				aria-describedby="ext-hint"
				aria-errormessage="ext-error"
			/>
		);
		const node = el(container);
		expect(node.id).toBe("consumer-id");
		expect(node.getAttribute("name")).toBe("field-name");
		expect(node.getAttribute("form")).toBe("some-form");
		expect(node.getAttribute("title")).toBe("tip");
		expect(node.getAttribute("data-testid")).toBe("control");
		expect(node.getAttribute("aria-describedby")).toBe("ext-hint");
		expect(node.getAttribute("aria-errormessage")).toBe("ext-error");
	});

	it("a consumer aria-label is used when no `label` prop is given, and `label` wins when both are", () => {
		const a = render(<Input aria-label="From attr" />);
		expect(el(a.container).getAttribute("aria-label")).toBe("From attr");
		cleanup();
		const b = render(<Input label="From prop" aria-label="From attr" />);
		expect(el(b.container).getAttribute("aria-label")).toBe("From prop");
	});

	it("a consumer onBlur fires once with the event", () => {
		const onBlur = vi.fn();
		const { container } = render(<Input onBlur={onBlur} />);
		fireEvent.blur(el(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("a consumer onKeyDown fires once for a key the component does not handle", () => {
		const onKeyDown = vi.fn();
		const { container } = render(<Input onKeyDown={onKeyDown} />);
		fireEvent.keyDown(el(container), { key: "a" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("a consumer onInput fires once", () => {
		const onInput = vi.fn();
		const { container } = render(<Input onInput={onInput} />);
		fireEvent.input(el(container), { target: { value: "hello" } });
		expect(onInput).toHaveBeenCalledTimes(1);
	});

	it("a consumer onChange fires once, after the internal handling, and onValueChange / the shown value still update", () => {
		const calls: string[] = [];
		const onValueChange = vi.fn(() => calls.push("internal"));
		const onChange = vi.fn(() => calls.push("consumer"));
		const { container } = render(<Input onValueChange={onValueChange} onChange={onChange} />);
		fireEvent.change(el(container), { target: { value: "hello" } });
		expect(calls).toEqual(["internal", "consumer"]);
		expect(onValueChange).toHaveBeenCalledWith("hello");
		expect(el(container).value).toBe("hello");
	});

	it("a form-library style spread (name, onChange, onBlur, ref) works on an uncontrolled field", () => {
		const ref = createRef<HTMLInputElement>();
		const onChange = vi.fn();
		const onBlur = vi.fn();
		const registered = { name: "email", onChange, onBlur, ref };
		const { container } = render(<Input {...registered} />);
		expect(ref.current).toBe(el(container));
		expect(el(container).name).toBe("email");
		fireEvent.change(el(container), { target: { value: "hello" } });
		fireEvent.blur(el(container));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(ref.current?.value).toBe("hello");
	});

	it("a guarded (disabled) input calls neither the internal logic nor the consumer onChange", () => {
		const onChange = vi.fn();
		const onValueChange = vi.fn();
		const { container } = render(
			<Input disabled onChange={onChange} onValueChange={onValueChange} />
		);
		fireEvent.change(el(container), { target: { value: "hello" } });
		expect(onValueChange).not.toHaveBeenCalled();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("native React-cased attributes (autoComplete, readOnly) reach the element", () => {
		const { container } = render(<Input autoComplete="email" readOnly />);
		expect(el(container).getAttribute("autocomplete")).toBe("email");
		expect(el(container).readOnly).toBe(true);
	});

	it("a consumer cannot turn off aria-invalid while the field is invalid", () => {
		const { container } = render(<Input invalid aria-invalid="false" />);
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("a consumer aria-invalid shows through while the field is not invalid", () => {
		const { container } = render(<Input aria-invalid="true" />);
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("inside a FormField: the field id drives the label's htmlFor, and the consumer description merges with the error id", () => {
		const { container } = render(
			<FormField label="Field label" error="Something is wrong" id="custom-field">
				<Input aria-describedby="ext-hint" data-testid="control" />
			</FormField>
		);
		const node = el(container);
		const label = container.querySelector("label") as HTMLLabelElement;
		expect(node.id).toBe("custom-field");
		expect(label.getAttribute("for")).toBe(node.id);
		const parts = (node.getAttribute("aria-describedby") ?? "").split(" ");
		expect(parts).toContain("ext-hint");
		expect(parts).toContain("custom-field-error");
		expect(node.getAttribute("data-testid")).toBe("control");
	});

	it("does not repeat an id in aria-describedby when the consumer passes the FormField's own error id", () => {
		const { container } = render(
			<FormField label="Field label" error="Something is wrong" id="custom-field">
				<Input aria-describedby="custom-field-error" />
			</FormField>
		);
		expect(el(container).getAttribute("aria-describedby")).toBe("custom-field-error");
	});
});
