import { cleanup, fireEvent, render } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import Input from "./Input.vue";
import FormField from "../form-field/FormField.vue";

function el(container: Element): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

describe("Input native attribute forwarding", () => {
	afterEach(cleanup);

	it("forwards id, name, form, title, data-* and aria-* to the native element", () => {
		const { container } = render(Input, {
			props: { id: "consumer-id", name: "field-name" },
			attrs: {
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
		const a = render(Input, { attrs: { "aria-label": "From attr" } });
		expect(el(a.container).getAttribute("aria-label")).toBe("From attr");
		cleanup();
		const b = render(Input, {
			props: { label: "From prop" },
			attrs: { "aria-label": "From attr" },
		});
		expect(el(b.container).getAttribute("aria-label")).toBe("From prop");
	});

	it("a consumer onBlur fires once with the native event", async () => {
		const onBlur = vi.fn();
		const { container } = render(Input, { attrs: { onBlur } });
		await fireEvent.blur(el(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onBlur.mock.calls[0]?.[0]).toBeInstanceOf(Event);
	});

	it("a consumer onKeydown fires once for a key the component does not handle", async () => {
		const onKeydown = vi.fn();
		const { container } = render(Input, { attrs: { onKeydown } });
		await fireEvent.keyDown(el(container), { key: "a" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("a consumer onInput fires once, after the internal handling, and onValueChange / the shown value still update", async () => {
		const calls: string[] = [];
		const onValueChange = vi.fn(() => calls.push("internal"));
		const onInput = vi.fn(() => calls.push("consumer"));
		const { container } = render(Input, {
			props: { onValueChange },
			attrs: { onInput },
		});
		await fireEvent.update(el(container), "hello");
		expect(calls).toEqual(["internal", "consumer"]);
		expect(onValueChange).toHaveBeenCalledWith("hello");
		expect(el(container).value).toBe("hello");
	});

	it("a consumer onChange fires once", async () => {
		const onChange = vi.fn();
		const { container } = render(Input, { attrs: { onChange } });
		await fireEvent.change(el(container), { target: { value: "hello" } });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("a consumer cannot turn off aria-invalid while the field is invalid", () => {
		const { container } = render(Input, {
			props: { invalid: true },
			attrs: { "aria-invalid": "false" },
		});
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("a consumer aria-invalid shows through while the field is not invalid", () => {
		const { container } = render(Input, { attrs: { "aria-invalid": "true" } });
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("inside a FormField: the field id drives the label's for, and the consumer description merges with the error id", () => {
		const Harness = defineComponent({
			setup: () => () =>
				h(
					FormField,
					{ label: "Field label", error: "Something is wrong", id: "custom-field" },
					{
						default: () => h(Input, { "aria-describedby": "ext-hint", "data-testid": "control" }),
					}
				),
		});
		const { container } = render(Harness);
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
		const Harness = defineComponent({
			setup: () => () =>
				h(
					FormField,
					{ label: "Field label", error: "Something is wrong", id: "custom-field" },
					{ default: () => h(Input, { "aria-describedby": "custom-field-error" }) }
				),
		});
		const { container } = render(Harness);
		expect(el(container).getAttribute("aria-describedby")).toBe("custom-field-error");
	});

	it("reads a changed consumer aria-describedby on the next render", async () => {
		const described = ref("first");
		const Harness = defineComponent({
			setup: () => () => h(Input, { "aria-describedby": described.value }),
		});
		const { container } = render(Harness);
		expect(el(container).getAttribute("aria-describedby")).toBe("first");
		described.value = "second";
		await nextTick();
		expect(el(container).getAttribute("aria-describedby")).toBe("second");
	});
});
