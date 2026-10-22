import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import Autocomplete from "./Autocomplete.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";

const DATA = ["Svelte 5", "React", "Vue"];

afterEach(() => {
	document.body.innerHTML = "";
});

function mountIt(
	props: Record<string, unknown> = {},
	attrs: Record<string, unknown> = {},
	field?: FieldContext
) {
	return mount(Autocomplete, {
		props: { suggestions: DATA, ...props },
		attrs,
		attachTo: document.body,
		global: field ? { provide: { [FIELD_KEY as symbol]: field } } : undefined,
	});
}

const SEL = 'input[role="combobox"]';

describe("Autocomplete native attribute forwarding", () => {
	it("forwards id, aria-describedby, data-*, autocomplete and inputmode to the text input", () => {
		const wrapper = mountIt(
			{ id: "fw" },
			{
				"aria-describedby": "hint",
				"data-testid": "x",
				autocomplete: "off",
				inputmode: "search",
			}
		);
		const el = wrapper.get(SEL).element;
		expect(el.id).toBe("fw");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("x");
		expect(el.getAttribute("autocomplete")).toBe("off");
		expect(el.getAttribute("inputmode")).toBe("search");
	});

	it("merges a consumer aria-describedby with the FormField's", () => {
		const field = {
			controlId: "f",
			describedBy: "f-hint",
			invalid: false,
			valid: false,
			required: false,
			disabled: false,
		} as unknown as FieldContext;
		const wrapper = mountIt({}, { "aria-describedby": "mine" }, field);
		expect(wrapper.get(SEL).attributes("aria-describedby")).toBe("f-hint mine");
	});

	it("fires consumer onFocus and onBlur once each", async () => {
		const onFocus = vi.fn();
		const onBlur = vi.fn();
		const wrapper = mountIt({}, { onFocus, onBlur });
		await wrapper.get(SEL).trigger("focus");
		expect(onFocus).toHaveBeenCalledTimes(1);
		await wrapper.get(SEL).trigger("blur");
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onKeydown once, even when prevented", async () => {
		let prevented = false;
		const onKeydown = vi.fn((e: Event) => {
			prevented = e.defaultPrevented;
		});
		const wrapper = mountIt({ value: "e" }, { onKeydown });
		await wrapper.get(SEL).trigger("keydown", { key: "ArrowDown" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(wrapper.get(SEL).attributes("aria-expanded")).toBe("true");
	});

	it("fires a consumer onInput once after the internal handling", async () => {
		const onInput = vi.fn();
		const wrapper = mountIt({}, { onInput });
		await wrapper.get(SEL).setValue("re");
		expect(onInput).toHaveBeenCalledTimes(1);
		expect(wrapper.get(SEL).attributes("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA, type and value authoritative", () => {
		const wrapper = mountIt(
			{ value: "typed" },
			{
				role: "textbox",
				type: "email",
				"aria-expanded": "true",
				"aria-haspopup": "dialog",
				"aria-autocomplete": "both",
				"aria-controls": "nope",
				"aria-activedescendant": "nope",
			}
		);
		const el = wrapper.get(SEL).element as HTMLInputElement;
		expect(el.getAttribute("type")).toBe("text");
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.getAttribute("aria-autocomplete")).toBe("list");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		expect(el.value).toBe("typed");
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = mountIt({}, { "aria-label": "Mine" });
		expect(a.get(SEL).attributes("aria-label")).toBe("Mine");
		a.unmount();
		const b = mountIt({ label: "Own" }, { "aria-label": "Mine" });
		expect(b.get(SEL).attributes("aria-label")).toBe("Own");
	});

	it("picks up an attribute added after the first render", async () => {
		const wrapper = mountIt();
		expect(wrapper.get(SEL).attributes("data-late")).toBeUndefined();
		await wrapper.setProps({ "data-late": "yes" } as never);
		expect(wrapper.get(SEL).attributes("data-late")).toBe("yes");
	});

	it("carries name, form, required and maxlength to the native input", () => {
		const wrapper = mountIt({ name: "q", required: true }, { form: "signup", maxlength: 12 });
		const el = wrapper.get(SEL).element as HTMLInputElement;
		expect(el.name).toBe("q");
		expect(el.getAttribute("form")).toBe("signup");
		expect(el.required).toBe(true);
		expect(el.getAttribute("maxlength")).toBe("12");
	});
});
