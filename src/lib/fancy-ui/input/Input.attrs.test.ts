import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Input from "./Input.svelte";
import ForwardFieldHarness from "../input/ForwardFieldHarness.test.svelte";

function el(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

describe("Input native attribute forwarding", () => {
	afterEach(cleanup);

	it("forwards id, name, form, title, data-* and aria-* to the native element", () => {
		const { container } = render(Input, {
			props: {
				id: "consumer-id",
				name: "field-name",
				form: "some-form",
				title: "tip",
				"data-testid": "control",
				"aria-describedby": "ext-hint",
				"aria-errormessage": "ext-error",
			},
		});
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
		const a = render(Input, { props: { "aria-label": "From attr" } });
		expect(el(a.container).getAttribute("aria-label")).toBe("From attr");
		cleanup();
		const b = render(Input, { props: { label: "From prop", "aria-label": "From attr" } });
		expect(el(b.container).getAttribute("aria-label")).toBe("From prop");
	});

	it("a consumer onblur fires once with the native event", async () => {
		const onblur = vi.fn();
		const { container } = render(Input, { props: { onblur } });
		await fireEvent.blur(el(container));
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onblur.mock.calls[0][0]).toBeInstanceOf(Event);
	});

	it("a consumer onkeydown fires once for a key the component does not handle", async () => {
		const onkeydown = vi.fn();
		const { container } = render(Input, { props: { onkeydown } });
		await fireEvent.keyDown(el(container), { key: "a" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
	});

	it("a consumer oninput fires once and the internal value update still happens", async () => {
		const oninput = vi.fn();
		const onValueChange = vi.fn();
		const { container } = render(Input, { props: { oninput, onValueChange } });
		await fireEvent.input(el(container), { target: { value: "hello" } });
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hello");
		expect(oninput).toHaveBeenCalledTimes(1);
		expect(el(container).value).toBe("hello");
	});

	it("a consumer onchange fires once", async () => {
		const onchange = vi.fn();
		const { container } = render(Input, { props: { onchange } });
		await fireEvent.change(el(container), { target: { value: "hello" } });
		expect(onchange).toHaveBeenCalledTimes(1);
	});

	it("a guarded (disabled) input calls neither the internal logic nor the consumer oninput", async () => {
		const oninput = vi.fn();
		const onValueChange = vi.fn();
		const { container } = render(Input, {
			props: { disabled: true, oninput, onValueChange },
		});
		await fireEvent.input(el(container), { target: { value: "hello" } });
		expect(onValueChange).not.toHaveBeenCalled();
		expect(oninput).not.toHaveBeenCalled();
	});

	it("a consumer cannot turn off aria-invalid while the field is invalid", () => {
		const { container } = render(Input, { props: { invalid: true, "aria-invalid": "false" } });
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("a consumer aria-invalid shows through while the field is not invalid", () => {
		const { container } = render(Input, { props: { "aria-invalid": "true" } });
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("inside a FormField: the field id drives the label's for, and the consumer description merges with the error id", () => {
		const { container } = render(ForwardFieldHarness, { props: { kind: "Input" } });
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
		const { container } = render(ForwardFieldHarness, { props: { kind: "Input", dup: true } });
		expect(el(container).getAttribute("aria-describedby")).toBe("custom-field-error");
	});
});
