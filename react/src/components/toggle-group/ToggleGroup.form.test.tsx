import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { ToggleGroup } from "./ToggleGroup.js";
import { ToggleGroupItem } from "./ToggleGroupItem.js";

function setup(props: Record<string, unknown>) {
	const { container } = render(
		<form>
			<ToggleGroup label="Group" {...props}>
				<ToggleGroupItem value="left">Left</ToggleGroupItem>
				<ToggleGroupItem value="center">Center</ToggleGroupItem>
				<ToggleGroupItem value="right">Right</ToggleGroupItem>
			</ToggleGroup>
		</form>
	);
	const form = container.querySelector("form") as HTMLFormElement;
	return { form, buttons: () => Array.from(form.querySelectorAll("button")) };
}

describe("ToggleGroup form contract", () => {
	afterEach(cleanup);

	it("renders no hidden input without a name", () => {
		const { form } = setup({ value: "left" });
		expect(form.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("submits the single selected value under name", () => {
		const { form, buttons } = setup({ name: "align" });
		expect(new FormData(form).has("align")).toBe(false);
		fireEvent.click(buttons()[0]!);
		expect(new FormData(form).getAll("align")).toEqual(["left"]);
		fireEvent.click(buttons()[2]!);
		expect(new FormData(form).getAll("align")).toEqual(["right"]);
	});

	it("submits every selected value of a multiple group", () => {
		const { form, buttons } = setup({ name: "fmt", type: "multiple" });
		fireEvent.click(buttons()[0]!);
		fireEvent.click(buttons()[1]!);
		expect(new FormData(form).getAll("fmt").sort()).toEqual(["center", "left"]);
	});

	it("submits nothing when nothing is selected", () => {
		const { form } = setup({ name: "fmt", type: "multiple", value: [] });
		expect(new FormData(form).has("fmt")).toBe(false);
	});

	it("does not submit a disabled group", () => {
		const { form } = setup({ name: "fmt", value: "left", disabled: true });
		expect(new FormData(form).has("fmt")).toBe(false);
	});

	it("keeps items type=button so a click never submits the form", () => {
		const { form, buttons } = setup({ name: "align" });
		let submitted = 0;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			submitted++;
		});
		expect(buttons().every((b) => b.type === "button")).toBe(true);
		fireEvent.click(buttons()[0]!);
		expect(submitted).toBe(0);
	});

	it("honours form=id on the hidden inputs", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = render(
			<ToggleGroup label="G" name="align" value="left" form="far">
				<ToggleGroupItem value="left">Left</ToggleGroupItem>
			</ToggleGroup>
		);
		const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(input.form).toBe(target);
		target.remove();
	});
});
