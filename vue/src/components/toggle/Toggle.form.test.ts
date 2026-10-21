import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import Toggle from "./Toggle.vue";

type Opts = { props?: Record<string, unknown>; attrs?: Record<string, unknown> };
const mount = render as unknown as (
	comp: unknown,
	options: Opts & Record<string, unknown>
) => ReturnType<typeof render>;

function setup(opts: Opts) {
	const form = document.body.appendChild(document.createElement("form"));
	mount(Toggle, { container: form, ...opts });
	return {
		form,
		button: form.querySelector("button") as HTMLButtonElement,
		hidden: () => form.querySelector('input[type="hidden"]'),
	};
}

describe("Toggle form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders no hidden input without a name", () => {
		expect(setup({ props: { pressed: true } }).hidden()).toBeNull();
	});

	it("submits name=on once pressed, and nothing while off", async () => {
		const { form, button } = setup({ props: { name: "bold", label: "Bold" } });
		expect(new FormData(form).has("bold")).toBe(false);
		await fireEvent.click(button);
		expect(new FormData(form).get("bold")).toBe("on");
		await fireEvent.click(button);
		expect(new FormData(form).has("bold")).toBe(false);
	});

	it("submits the custom value when pressed", () => {
		const { form } = setup({ props: { name: "fmt", value: "bold", pressed: true } });
		expect(new FormData(form).get("fmt")).toBe("bold");
	});

	it("keeps the button itself out of the submission", () => {
		const { form, button } = setup({ props: { name: "bold", pressed: true } });
		expect(button.type).toBe("button");
		expect(button.hasAttribute("name")).toBe(false);
		expect(new FormData(form).getAll("bold")).toEqual(["on"]);
	});

	it("does not submit a disabled toggle", () => {
		const { form } = setup({ props: { name: "bold", pressed: true, disabled: true } });
		expect(new FormData(form).has("bold")).toBe(false);
	});

	it("honours form=id on the hidden input", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = mount(Toggle, { props: { name: "bold", pressed: true, form: "far" } });
		const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(input.form).toBe(target);
		expect(new FormData(target).get("bold")).toBe("on");
	});

	it("does not submit the form when pressed", async () => {
		const { form, button } = setup({ props: { name: "bold" } });
		let submitted = 0;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			submitted++;
		});
		await fireEvent.click(button);
		expect(submitted).toBe(0);
	});

	it("passes required and aria-invalid through to the button", () => {
		const { button } = setup({ attrs: { required: true, "aria-invalid": "true" } });
		expect(button.hasAttribute("required")).toBe(true);
		expect(button.getAttribute("aria-invalid")).toBe("true");
	});
});
