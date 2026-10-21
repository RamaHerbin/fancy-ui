import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h } from "vue";
import { afterEach, describe, it, expect } from "vitest";
import ToggleGroup from "./ToggleGroup.vue";
import ToggleGroupItem from "./ToggleGroupItem.vue";

const Harness = defineComponent({
	props: {
		name: { type: String, default: undefined },
		form: { type: String, default: undefined },
		type: { type: String, default: "single" },
		value: { type: [String, Array], default: undefined },
		disabled: { type: Boolean, default: false },
	},
	setup(props) {
		return () =>
			h(
				ToggleGroup as never,
				{
					label: "Group",
					name: props.name,
					form: props.form,
					type: props.type,
					disabled: props.disabled,
					...(props.value !== undefined ? { value: props.value } : {}),
				},
				{
					default: () =>
						["left", "center", "right"].map((v) =>
							h(ToggleGroupItem as never, { value: v }, { default: () => v })
						),
				}
			);
	},
});

type Opts = { props?: Record<string, unknown> };
const mount = render as unknown as (
	comp: unknown,
	options: Opts & Record<string, unknown>
) => ReturnType<typeof render>;

function setup(props: Record<string, unknown>) {
	const form = document.body.appendChild(document.createElement("form"));
	mount(Harness, { container: form, props });
	return { form, buttons: () => Array.from(form.querySelectorAll("button")) };
}

describe("ToggleGroup form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders no hidden input without a name", () => {
		const { form } = setup({ value: "left" });
		expect(form.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("submits the single selected value under name", async () => {
		const { form, buttons } = setup({ name: "align" });
		expect(new FormData(form).has("align")).toBe(false);
		await fireEvent.click(buttons()[0]!);
		expect(new FormData(form).getAll("align")).toEqual(["left"]);
		await fireEvent.click(buttons()[2]!);
		expect(new FormData(form).getAll("align")).toEqual(["right"]);
	});

	it("submits every selected value of a multiple group", async () => {
		const { form, buttons } = setup({ name: "fmt", type: "multiple" });
		await fireEvent.click(buttons()[0]!);
		await fireEvent.click(buttons()[1]!);
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

	it("keeps items type=button so a click never submits the form", async () => {
		const { form, buttons } = setup({ name: "align" });
		let submitted = 0;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			submitted++;
		});
		expect(buttons().every((b) => b.type === "button")).toBe(true);
		await fireEvent.click(buttons()[0]!);
		expect(submitted).toBe(0);
	});

	it("honours form=id on the hidden inputs", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = mount(Harness, {
			props: { name: "align", value: "left", form: "far" },
		});
		const input = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(input.form).toBe(target);
	});

	it("still submits a selected item that is disabled on its own: only a disabled group submits nothing", () => {
		const Own = defineComponent({
			setup() {
				return () =>
					h("form", [
						h(
							ToggleGroup as never,
							{ label: "Group", name: "fmt", type: "multiple", value: ["left", "right"] },
							{
								default: () => [
									h(
										ToggleGroupItem as never,
										{ value: "left", disabled: true },
										{ default: () => "left" }
									),
									h(ToggleGroupItem as never, { value: "center" }, { default: () => "center" }),
									h(ToggleGroupItem as never, { value: "right" }, { default: () => "right" }),
								],
							}
						),
					]);
			},
		});
		const { container } = render(Own);
		const form = container.querySelector("form") as HTMLFormElement;
		expect(new FormData(form).getAll("fmt")).toEqual(["left", "right"]);
	});
});
