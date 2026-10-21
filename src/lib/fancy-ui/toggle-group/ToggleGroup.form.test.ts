import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Harness from "./ToggleGroupHarness.test.svelte";

const ITEMS = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
];

function mountForm(props: Record<string, unknown>) {
	const form = document.body.appendChild(document.createElement("form"));
	render(Harness, { target: form, props: { items: ITEMS, ...props } });
	const buttons = () => Array.from(form.querySelectorAll("button"));
	return { form, buttons };
}

describe("ToggleGroup form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders no hidden input without a name", () => {
		const { form } = mountForm({ value: "left" });
		expect(form.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("submits the single selected value under name", async () => {
		const { form, buttons } = mountForm({ name: "align", value: "left" });
		expect(new FormData(form).getAll("align")).toEqual(["left"]);
		await fireEvent.click(buttons()[2]);
		expect(new FormData(form).getAll("align")).toEqual(["right"]);
	});

	it("submits every selected value of a multiple group", async () => {
		const { form, buttons } = mountForm({ name: "fmt", type: "multiple", value: ["left"] });
		await fireEvent.click(buttons()[1]);
		expect(new FormData(form).getAll("fmt").sort()).toEqual(["center", "left"]);
	});

	it("submits nothing when nothing is selected", () => {
		const { form } = mountForm({ name: "fmt", type: "multiple", value: [] });
		expect(new FormData(form).has("fmt")).toBe(false);
	});

	it("does not submit a disabled group", () => {
		const { form } = mountForm({ name: "fmt", value: "left", disabled: true });
		expect(new FormData(form).has("fmt")).toBe(false);
	});

	it("keeps items type=button so a click never submits the form", async () => {
		const { form, buttons } = mountForm({ name: "align", value: "" });
		let submitted = 0;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			submitted++;
		});
		expect(buttons().every((b) => b.type === "button")).toBe(true);
		await fireEvent.click(buttons()[0]);
		expect(submitted).toBe(0);
	});

	it("honours form=id on the hidden inputs", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = render(Harness, {
			props: { items: ITEMS, name: "align", value: "left", form: "far" },
		});
		const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(input.form).toBe(target);
	});
});
