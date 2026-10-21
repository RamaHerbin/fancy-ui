import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Combobox from "./Combobox.svelte";
import FieldHarness from "./ComboboxFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

const OPTIONS = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
];

afterEach(() => cleanup());

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector('input[role="combobox"]') as HTMLInputElement;
}

describe("Combobox native attribute forwarding", () => {
	it("forwards id, aria-describedby, data-*, autocomplete and inputmode to the text input", () => {
		const { container } = render(Combobox, {
			options: OPTIONS,
			id: "fw",
			"aria-describedby": "hint",
			"data-testid": "cb",
			autocomplete: "off",
			inputmode: "search",
		} as never);
		const el = input(container);
		expect(el.id).toBe("fw");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("cb");
		expect(el.getAttribute("autocomplete")).toBe("off");
		expect(el.getAttribute("inputmode")).toBe("search");
	});

	it("merges a consumer aria-describedby with the FormField's", () => {
		const context = {
			controlId: "f",
			describedBy: "f-hint",
			invalid: false,
			valid: false,
			required: false,
			disabled: false,
		} as unknown as FieldContext;
		const { container } = render(FieldHarness, {
			props: {
				options: OPTIONS,
				context,
				"aria-describedby": "mine",
			},
		} as never);
		expect(input(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires consumer onfocus and onblur once each", async () => {
		const onfocus = vi.fn();
		const onblur = vi.fn();
		const { container } = render(Combobox, { options: OPTIONS, onfocus, onblur } as never);
		await fireEvent.focus(input(container));
		expect(onfocus).toHaveBeenCalledTimes(1);
		await fireEvent.blur(input(container));
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onkeydown once, even when prevented", async () => {
		let prevented = false;
		const onkeydown = vi.fn((e: KeyboardEvent) => {
			prevented = e.defaultPrevented;
		});
		const { container } = render(Combobox, { options: OPTIONS, onkeydown } as never);
		await fireEvent.keyDown(input(container), { key: "ArrowDown" });
		await tick();
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(input(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("fires a consumer oninput once after the internal filtering", async () => {
		const oninput = vi.fn();
		const { container } = render(Combobox, { options: OPTIONS, oninput } as never);
		await fireEvent.input(input(container), { target: { value: "re" } });
		await tick();
		expect(oninput).toHaveBeenCalledTimes(1);
		expect(input(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA, type and value authoritative", () => {
		const { container } = render(Combobox, {
			options: OPTIONS,
			value: "react",
			role: "textbox",
			type: "email",
			"aria-expanded": "true",
			"aria-haspopup": "dialog",
			"aria-autocomplete": "both",
			"aria-controls": "nope",
			"aria-activedescendant": "nope",
		} as never);
		const el = input(container);
		expect(el.getAttribute("type")).toBe("text");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.getAttribute("aria-autocomplete")).toBe("list");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		expect(el.value).toBe("React");
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(Combobox, { options: OPTIONS, "aria-label": "Mine" } as never);
		expect(input(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(Combobox, { options: OPTIONS, label: "Own", "aria-label": "Mine" } as never);
		expect(input(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input and required to the visible one", () => {
		const { container } = render(Combobox, {
			options: OPTIONS,
			value: "react",
			name: "fw",
			form: "signup",
			required: true,
		} as never);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("fw");
		expect(hidden.getAttribute("form")).toBe("signup");
		expect(input(container).required).toBe(true);
	});
});
