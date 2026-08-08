import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Checkbox from "./Checkbox.svelte";
import ValueHarness from "./CheckboxHarness.test.svelte";
import FieldHarness from "./CheckboxFieldHarness.test.svelte";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function checkbox(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function wrapper(container: HTMLElement): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

describe("Checkbox", () => {
	afterEach(cleanup);

	it("renders a real checkbox input, unchecked by default", () => {
		const { container } = render(Checkbox, { props: { label: "Agree" } });
		const el = checkbox(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("checkbox");
		expect(el.checked).toBe(false);
		expect(el.indeterminate).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
	});

	it("renders the checked mockup state: checked property true, aria-checked true", () => {
		const { container } = render(Checkbox, { props: { checked: true, label: "Agree" } });
		const el = checkbox(container);

		expect(el.checked).toBe(true);
		expect(el.indeterminate).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("true");
	});

	it("renders the indeterminate mockup state as a DOM property, not an attribute, with aria-checked=mixed", () => {
		const { container } = render(Checkbox, {
			props: { indeterminate: true, label: "Agree" },
		});
		const el = checkbox(container);

		expect(el.indeterminate).toBe(true);
		expect(el.hasAttribute("indeterminate")).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("mixed");
	});

	it("renders the disabled mockup state: native disabled, dimmed wrapper", () => {
		const { container } = render(Checkbox, { props: { disabled: true, label: "Agree" } });
		const el = checkbox(container);
		const label = wrapper(container);

		expect(el.disabled).toBe(true);
		expect(label.className).toContain("opacity-50");
		expect(label.className).toContain("cursor-not-allowed");
	});

	it("reapplies the indeterminate DOM property whenever the prop changes, not only on mount", async () => {
		const { container, rerender } = render(Checkbox, {
			props: { indeterminate: false, label: "Agree" },
		});
		const el = checkbox(container);
		expect(el.indeterminate).toBe(false);

		await rerender({ indeterminate: true, label: "Agree" });
		expect(el.indeterminate).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("mixed");

		await rerender({ indeterminate: false, label: "Agree" });
		expect(el.indeterminate).toBe(false);
	});

	it("a click on an indeterminate box clears indeterminate and lands on the real checked value", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, indeterminate: true, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);
		expect(el.indeterminate).toBe(true);

		await fireEvent.click(el);

		expect(el.indeterminate).toBe(false);
		expect(el.checked).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("calls onCheckedChange exactly once with the new value on each toggle", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);

		await fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(onCheckedChange).toHaveBeenCalledWith(true);

		await fireEvent.click(el);
		expect(el.checked).toBe(false);
		expect(onCheckedChange).toHaveBeenCalledTimes(2);
		expect(onCheckedChange).toHaveBeenLastCalledWith(false);
	});

	it("works with a plain non-bound checked plus a callback", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);

		expect(el.checked).toBe(false);
		await fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("works uncontrolled, with neither checked nor onCheckedChange passed in", async () => {
		const { container } = render(Checkbox, { props: { label: "Agree" } });
		const el = checkbox(container);

		expect(el.checked).toBe(false);
		await fireEvent.click(el);
		expect(el.checked).toBe(true);
	});

	it("blocks both the state change and the callback while disabled, via a synthetic event that bypasses the native guard", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, disabled: true, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);
		expect(el.disabled).toBe(true);

		// A `change` dispatched straight at the element reaches the handler
		// regardless of the native `disabled` guard on real interaction —
		// proving the component's own guard, not the attribute, is what stops
		// the state from moving.
		await fireEvent.change(el, { target: { checked: true } });

		expect(el.checked).toBe(false);
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("round-trips checked through bind:checked", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = checkbox(container);

		expect(getByTestId("bound-checked").textContent).toBe("false");
		await fireEvent.click(el);
		expect(getByTestId("bound-checked").textContent).toBe("true");
		expect(el.checked).toBe(true);
	});

	it("round-trips indeterminate through bind:indeterminate, cleared by a click", async () => {
		const { container, getByTestId } = render(ValueHarness, {
			props: { indeterminate: true },
		});
		const el = checkbox(container);
		expect(getByTestId("bound-indeterminate").textContent).toBe("true");
		expect(el.indeterminate).toBe(true);

		await fireEvent.click(el);
		expect(getByTestId("bound-indeterminate").textContent).toBe("false");
		expect(el.indeterminate).toBe(false);
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(checkbox(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("resolves the accessible name from the label prop when there is no visible children text", () => {
		const { container } = render(Checkbox, { props: { label: "Agree to terms" } });
		expect(checkbox(container).getAttribute("aria-label")).toBe("Agree to terms");
	});

	it("falls through to children's own text as the accessible name when label is not given", () => {
		const { container } = render(Checkbox, {
			props: { children: snippet("<span>I agree</span>") },
		});
		const el = checkbox(container);

		expect(el.hasAttribute("aria-label")).toBe(false);
		expect(wrapper(container).textContent).toContain("I agree");
	});

	it("applies label as aria-label even alongside icon-only children with no text of their own", () => {
		// The component cannot introspect an arbitrary Snippet to tell whether
		// it renders text, so `label` must win whenever it is passed — this is
		// exactly the icon-only-children-plus-label case the prop exists for.
		const { container } = render(Checkbox, {
			props: {
				label: "Agree to terms",
				children: snippet('<svg aria-hidden="true"></svg>'),
			},
		});
		expect(checkbox(container).getAttribute("aria-label")).toBe("Agree to terms");
	});

	it("merges the class prop onto the wrapping label", () => {
		const { container } = render(Checkbox, { props: { class: "mt-4", label: "Agree" } });
		const label = wrapper(container);

		expect(label.className).toContain("ft-checkbox");
		expect(label.className).toContain("mt-4");
	});

	it("reflects invalid through aria-invalid and data-invalid", () => {
		const { container } = render(Checkbox, { props: { invalid: true, label: "Agree" } });
		const el = checkbox(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.getAttribute("data-invalid")).toBe("true");
	});

	it("leaves aria-invalid unset by default", () => {
		const { container } = render(Checkbox, { props: { label: "Agree" } });
		expect(checkbox(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("submits its value through FormData when checked and named", () => {
		const { container } = render(Checkbox, {
			props: { checked: true, name: "terms", value: "agreed", label: "Agree" },
		});
		const el = checkbox(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("terms")).toBe("agreed");
	});

	it("is excluded from form submission while unchecked", () => {
		const { container } = render(Checkbox, {
			props: { checked: false, name: "terms", value: "agreed", label: "Agree" },
		});
		const el = checkbox(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("terms")).toBeNull();
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Checkbox, {
			props: { id: "solo", invalid: true, required: true, disabled: false, label: "Agree" },
		});
		const el = checkbox(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = checkbox(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to Checkbox — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});
});
