import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Select from "./Select.svelte";
import Harness from "./SelectHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

const OPTIONS = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
];

afterEach(() => cleanup());

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('[role="combobox"]') as HTMLButtonElement;
}

describe("Select native attribute forwarding", () => {
	it("forwards id, aria-describedby and data-* to the trigger button", () => {
		const { container } = render(Select, {
			options: OPTIONS,
			id: "plan",
			"aria-describedby": "hint",
			"data-testid": "sel",
		} as never);
		const el = trigger(container);
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
		const { container } = render(Harness, {
			options: OPTIONS,
			field,
			"aria-describedby": "mine",
		} as never);
		expect(trigger(container).getAttribute("aria-describedby")).toBe("f-hint mine");
	});

	it("fires a consumer onblur once", async () => {
		const onblur = vi.fn();
		const { container } = render(Select, { options: OPTIONS, onblur } as never);
		await fireEvent.blur(trigger(container));
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("runs the internal keyboard handling and then the consumer onkeydown once, even when prevented", async () => {
		let prevented = false;
		const onkeydown = vi.fn((e: KeyboardEvent) => {
			prevented = e.defaultPrevented;
		});
		const { container } = render(Select, { options: OPTIONS, onkeydown } as never);
		await fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		await tick();
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(prevented).toBe(true);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("fires a consumer onclick once after the toggle", async () => {
		const onclick = vi.fn();
		const { container } = render(Select, { options: OPTIONS, onclick } as never);
		await fireEvent.click(trigger(container));
		await tick();
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps the managed ARIA authoritative", () => {
		const { container } = render(Select, {
			options: OPTIONS,
			role: "button",
			"aria-expanded": "true",
			"aria-haspopup": "dialog",
			"aria-controls": "nope",
			"aria-activedescendant": "nope",
			type: "submit",
		} as never);
		const el = trigger(container);
		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.getAttribute("aria-haspopup")).toBe("listbox");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);
		expect(el.getAttribute("type")).toBe("button");
	});

	it("keeps a consumer aria-label when the label prop is absent, and prefers the label prop", () => {
		const a = render(Select, { options: OPTIONS, "aria-label": "Mine" } as never);
		expect(trigger(a.container).getAttribute("aria-label")).toBe("Mine");
		cleanup();
		const b = render(Select, { options: OPTIONS, label: "Own", "aria-label": "Mine" } as never);
		expect(trigger(b.container).getAttribute("aria-label")).toBe("Own");
	});

	it("carries name and form to the hidden input", () => {
		const { container } = render(Select, {
			options: OPTIONS,
			value: "react",
			name: "fw",
			form: "signup",
		} as never);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.name).toBe("fw");
		expect(hidden.getAttribute("form")).toBe("signup");
	});
});
