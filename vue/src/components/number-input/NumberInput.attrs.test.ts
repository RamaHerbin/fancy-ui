import { cleanup, fireEvent, render } from "@testing-library/vue";
import { defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import NumberInput from "./NumberInput.vue";
import FormField from "../form-field/FormField.vue";

function el(container: Element): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

describe("NumberInput native attribute forwarding", () => {
	afterEach(cleanup);

	it("forwards id, name, form, title, data-* and aria-* to the native element", () => {
		const { container } = render(NumberInput, {
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
		const a = render(NumberInput, { attrs: { "aria-label": "From attr" } });
		expect(el(a.container).getAttribute("aria-label")).toBe("From attr");
		cleanup();
		const b = render(NumberInput, {
			props: { label: "From prop" },
			attrs: { "aria-label": "From attr" },
		});
		expect(el(b.container).getAttribute("aria-label")).toBe("From prop");
	});

	it("a consumer onBlur fires once with the native event", async () => {
		const onBlur = vi.fn();
		const { container } = render(NumberInput, { attrs: { onBlur } });
		await fireEvent.blur(el(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onBlur.mock.calls[0]?.[0]).toBeInstanceOf(Event);
	});

	it("a consumer onKeydown fires once for a key the component does not handle", async () => {
		const onKeydown = vi.fn();
		const { container } = render(NumberInput, { attrs: { onKeydown } });
		await fireEvent.keyDown(el(container), { key: "a" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("a consumer onInput fires once, after the internal handling, and onValueChange / the shown value still update", async () => {
		const calls: string[] = [];
		const onValueChange = vi.fn(() => calls.push("internal"));
		const onInput = vi.fn(() => calls.push("consumer"));
		const { container } = render(NumberInput, {
			props: { onValueChange },
			attrs: { onInput },
		});
		await fireEvent.update(el(container), "5");
		expect(calls).toEqual(["internal", "consumer"]);
		expect(onValueChange).toHaveBeenCalledWith(5);
		expect(el(container).value).toBe("5");
	});

	it("a consumer onChange fires once", async () => {
		const onChange = vi.fn();
		const { container } = render(NumberInput, { attrs: { onChange } });
		await fireEvent.change(el(container), { target: { value: "5" } });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("a consumer cannot turn off aria-invalid while the field is invalid", () => {
		const { container } = render(NumberInput, {
			props: { invalid: true },
			attrs: { "aria-invalid": "false" },
		});
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("a consumer aria-invalid shows through while the field is not invalid", () => {
		const { container } = render(NumberInput, { attrs: { "aria-invalid": "true" } });
		expect(el(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("a consumer onKeydown fires once, after the arrow-key stepping the component does itself", async () => {
		const calls: string[] = [];
		const onValueChange = vi.fn(() => calls.push("step"));
		const onKeydown = vi.fn(() => calls.push("consumer"));
		const { container } = render(NumberInput, {
			props: { value: 1, onValueChange },
			attrs: { onKeydown },
		});
		await fireEvent.keyDown(el(container), { key: "ArrowUp" });
		expect(calls).toEqual(["step", "consumer"]);
	});

	it("a consumer onFocus and onBlur each fire once, around the component's own clamping", async () => {
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 20, max: 10 },
			attrs: { onFocus, onBlur },
		});
		await fireEvent.focus(el(container));
		await fireEvent.blur(el(container));
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(el(container).value).toBe("10");
	});

	it("inputmode defaults to decimal but a consumer can choose another", () => {
		const a = render(NumberInput);
		expect(el(a.container).getAttribute("inputmode")).toBe("decimal");
		cleanup();
		const b = render(NumberInput, { attrs: { inputmode: "numeric" } });
		expect(el(b.container).getAttribute("inputmode")).toBe("numeric");
	});

	it("inside a FormField: the field id drives the label's for, and the consumer description merges with the error id", () => {
		const Harness = defineComponent({
			setup: () => () =>
				h(
					FormField,
					{ label: "Field label", error: "Something is wrong", id: "custom-field" },
					{
						default: () =>
							h(NumberInput, { "aria-describedby": "ext-hint", "data-testid": "control" }),
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
					{ default: () => h(NumberInput, { "aria-describedby": "custom-field-error" }) }
				),
		});
		const { container } = render(Harness);
		expect(el(container).getAttribute("aria-describedby")).toBe("custom-field-error");
	});

	it("reads a changed consumer aria-describedby on the next render", async () => {
		const described = ref("first");
		const Harness = defineComponent({
			setup: () => () => h(NumberInput, { "aria-describedby": described.value }),
		});
		const { container } = render(Harness);
		expect(el(container).getAttribute("aria-describedby")).toBe("first");
		described.value = "second";
		await nextTick();
		expect(el(container).getAttribute("aria-describedby")).toBe("second");
	});
});
