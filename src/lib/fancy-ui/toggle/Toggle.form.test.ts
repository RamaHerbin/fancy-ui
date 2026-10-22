import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Toggle from "./Toggle.svelte";

function mountForm(props: Record<string, unknown>) {
	const form = document.body.appendChild(document.createElement("form"));
	render(Toggle, { target: form, props });
	return {
		form,
		button: form.querySelector("button") as HTMLButtonElement,
		hidden: () => form.querySelector('input[type="hidden"]') as HTMLInputElement | null,
	};
}

describe("Toggle form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders no hidden input without a name", () => {
		const { hidden } = mountForm({ pressed: true });
		expect(hidden()).toBeNull();
	});

	it("submits name=on once pressed, and nothing while off", async () => {
		const { form, button } = mountForm({ name: "bold", label: "Bold" });
		expect(new FormData(form).has("bold")).toBe(false);
		await fireEvent.click(button);
		expect(new FormData(form).get("bold")).toBe("on");
		await fireEvent.click(button);
		expect(new FormData(form).has("bold")).toBe(false);
	});

	it("submits the custom value when pressed", () => {
		const { form } = mountForm({ name: "fmt", value: "bold", pressed: true });
		expect(new FormData(form).get("fmt")).toBe("bold");
	});

	it("keeps the button itself out of the submission", async () => {
		const { form, button } = mountForm({ name: "bold", pressed: true });
		expect(button.type).toBe("button");
		expect(button.hasAttribute("name")).toBe(false);
		expect(new FormData(form).getAll("bold")).toEqual(["on"]);
	});

	it("does not submit a disabled toggle", () => {
		const { form } = mountForm({ name: "bold", pressed: true, disabled: true });
		expect(new FormData(form).has("bold")).toBe(false);
	});

	it("honours form=id on the hidden input", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = render(Toggle, { props: { name: "bold", pressed: true, form: "far" } });
		const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(input.form).toBe(target);
		expect(new FormData(target).get("bold")).toBe("on");
	});

	it("does not submit the form when pressed", async () => {
		const { form, button } = mountForm({ name: "bold" });
		let submitted = 0;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			submitted++;
		});
		await fireEvent.click(button);
		expect(submitted).toBe(0);
	});

	it("passes required and aria-invalid through to the button", () => {
		const { button } = mountForm({ required: true, "aria-invalid": "true" });
		expect(button.hasAttribute("required")).toBe(true);
		expect(button.getAttribute("aria-invalid")).toBe("true");
	});

	it("keeps the button as the only element in the form and nests the hidden input in it", () => {
		const { form, button, hidden } = mountForm({ name: "bold", pressed: true });
		expect(form.children.length).toBe(1);
		expect(form.firstElementChild).toBe(button);
		expect(button.contains(hidden())).toBe(true);
		expect(new FormData(form).get("bold")).toBe("on");
	});
});
