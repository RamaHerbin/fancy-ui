import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import Select from "./Select.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";

const OPTIONS = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
];

afterEach(() => {
	document.body.innerHTML = "";
});

function mountSelect(
	props: Record<string, unknown> = {},
	attrs: Record<string, unknown> = {},
	field?: FieldContext
) {
	return mount(Select, {
		props: { options: OPTIONS, ...props },
		attrs,
		attachTo: document.body,
		global: field ? { provide: { [FIELD_KEY as symbol]: field } } : undefined,
	});
}

describe("Select native attribute forwarding", () => {
	it("forwards id, aria-describedby and data-* to the trigger button", () => {
		const wrapper = mountSelect(
			{ id: "plan" },
			{ "aria-describedby": "hint", "data-testid": "sel" }
		);
		const el = wrapper.get('[role="combobox"]').element;
		expect(el.id).toBe("plan");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("sel");
	});

	it("merges a consumer aria-describedby with the FormField's", () => {
		const field = {
			controlId: "f",
			describedBy: "f-hint",
			disabled: false,
			required: false,
			invalid: false,
		} as unknown as FieldContext;
		const wrapper = mountSelect({}, { "aria-describedby": "mine" }, field);
		expect(wrapper.get('[role="combobox"]').attributes("aria-describedby")).toBe("f-hint mine");
	});

	it("fires a consumer onBlur once", async () => {
		const onBlur = vi.fn();
		const wrapper = mountSelect({}, { onBlur });
		await wrapper.get('[role="combobox"]').trigger("blur");
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onKeydown once, even when prevented", async () => {
		let prevented = false;
		const onKeydown = vi.fn((e: Event) => {
			prevented = e.defaultPrevented;
		});
		const wrapper = mountSelect({}, { onKeydown });
		await wrapper.get('[role="combobox"]').trigger("keydown", { key: "ArrowDown" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(wrapper.get('[role="combobox"]').attributes("aria-expanded")).toBe("true");
	});

	it("fires a consumer onClick once after the toggle", async () => {
		const onClick = vi.fn();
		const wrapper = mountSelect({}, { onClick });
		await wrapper.get('[role="combobox"]').trigger("click");
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(wrapper.get('[role="combobox"]').attributes("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA authoritative", () => {
		const wrapper = mountSelect(
			{},
			{
				role: "button",
				"aria-expanded": "true",
				"aria-haspopup": "dialog",
				"aria-controls": "nope",
				"aria-activedescendant": "nope",
				type: "submit",
			}
		);
		const el = wrapper.get("button").element;
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		expect(el.getAttribute("type")).toBe("button");
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = mountSelect({}, { "aria-label": "Mine" });
		expect(a.get('[role="combobox"]').attributes("aria-label")).toBe("Mine");
		a.unmount();
		const b = mountSelect({ label: "Own" }, { "aria-label": "Mine" });
		expect(b.get('[role="combobox"]').attributes("aria-label")).toBe("Own");
	});

	it("picks up an attribute added after the first render", async () => {
		const wrapper = mountSelect();
		expect(wrapper.get('[role="combobox"]').attributes("data-late")).toBeUndefined();
		await wrapper.setProps({ "data-late": "yes" } as never);
		expect(wrapper.get('[role="combobox"]').attributes("data-late")).toBe("yes");
	});

	it("carries name and form to the hidden input", () => {
		const wrapper = mountSelect({ value: "react", name: "fw" }, { form: "signup" });
		const hidden = wrapper.get('input[type="hidden"]').element as HTMLInputElement;
		expect(hidden.name).toBe("fw");
		expect(hidden.getAttribute("form")).toBe("signup");
	});
});
