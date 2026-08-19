import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import PasswordInput from "./PasswordInput.svelte";
import ValueHarness from "./PasswordInputHarness.test.svelte";
import FieldHarness from "./PasswordInputFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function toggleButton(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector("button");
}

function strengthLabel(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-password-strength span[id]");
}

describe("PasswordInput", () => {
	afterEach(cleanup);

	it("renders a real input, type password, resting", () => {
		const { container } = render(PasswordInput, { props: { placeholder: "Enter your password" } });
		const el = input(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("password");
		expect(el.placeholder).toBe("Enter your password");
		expect(el.disabled).toBe(false);
	});

	it("defaults autocomplete to current-password", () => {
		const { container } = render(PasswordInput, { props: {} });
		expect(input(container).autocomplete).toBe("current-password");
	});

	it("applies new-password when set, for a password manager to offer to generate one", () => {
		const { container } = render(PasswordInput, { props: { autocomplete: "new-password" } });
		expect(input(container).autocomplete).toBe("new-password");
	});

	it("reflects invalid through aria-invalid and the destructive border class on the field surface", () => {
		const { container } = render(PasswordInput, { props: { invalid: true } });
		const el = input(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.closest(".ft-password-input")?.className).toContain("border-destructive/50");
	});

	it("disables the field: native disabled, out of the tab order", () => {
		const { container } = render(PasswordInput, { props: { disabled: true } });
		expect(input(container).disabled).toBe(true);
	});

	it("readonly stays focusable and keeps its name, unlike disabled — and still submits", () => {
		const { container } = render(PasswordInput, {
			props: { readonly: true, name: "password", value: "hunter2" },
		});
		const el = input(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);

		// A readonly field still submits; a disabled one is excluded entirely.
		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("password")).toBe("hunter2");
	});

	it("calls onValueChange with the new value on input", async () => {
		const onValueChange = vi.fn();
		const { container } = render(PasswordInput, { props: { value: "", onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "hi" } });
		expect(el.value).toBe("hi");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hi");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(PasswordInput, { props: { value: "start", onValueChange } });
		const el = input(container);

		expect(el.value).toBe("start");
		await fireEvent.input(el, { target: { value: "typed" } });
		expect(el.value).toBe("typed");
		expect(onValueChange).toHaveBeenCalledWith("typed");
	});

	it("blocks the callback while disabled, even from a synthetic input event", async () => {
		const onValueChange = vi.fn();
		const { container } = render(PasswordInput, { props: { disabled: true, onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "nope" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = input(container);

		expect(getByTestId("bound-value").textContent).toBe("");
		await fireEvent.input(el, { target: { value: "bound" } });
		expect(getByTestId("bound-value").textContent).toBe("bound");
		expect(el.value).toBe("bound");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(PasswordInput, { props: { label: "Password" } });
		expect(input(container).getAttribute("aria-label")).toBe("Password");
	});

	it("merges the class prop with the base classes on the field surface", () => {
		const { container } = render(PasswordInput, { props: { class: "mt-4" } });
		const wrapper = container.querySelector(".ft-password-input");

		expect(wrapper?.className).toContain("ft-password-input");
		expect(wrapper?.className).toContain("mt-4");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(PasswordInput, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = input(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = input(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to PasswordInput — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The test above only exercises context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` derived
	// values would pass it too, since `true || false` is still `true`. The
	// three below pin the polarity that actually tells `??` and `||` apart:
	// own prop `true`, context `false`, expecting the context's `false` to
	// win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const context: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context, disabled: true } });
		expect(input(container).disabled).toBe(false);
	});

	it("lets the context's required=false win over the component's own required=true prop", () => {
		const context: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context, required: true } });
		expect(input(container).required).toBe(false);
	});

	it("lets the context's invalid=false win over the component's own invalid=true prop", () => {
		const context: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context, invalid: true } });
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	describe("reveal toggle", () => {
		it("is rendered by default, with a name that starts as Show password", () => {
			const { container } = render(PasswordInput, { props: {} });
			const btn = toggleButton(container);

			expect(btn).not.toBeNull();
			expect(btn?.getAttribute("aria-label")).toBe("Show password");
			expect(btn?.getAttribute("aria-pressed")).toBe("false");
		});

		it("is absent when showToggle is false", () => {
			const { container } = render(PasswordInput, { props: { showToggle: false } });
			expect(toggleButton(container)).toBeNull();
		});

		it("flips the input type, the accessible name and aria-pressed on activation", async () => {
			const { container } = render(PasswordInput, { props: { value: "hunter2" } });
			const el = input(container);
			const btn = toggleButton(container)!;

			await fireEvent.click(btn);

			expect(el.type).toBe("text");
			expect(btn.getAttribute("aria-label")).toBe("Hide password");
			expect(btn.getAttribute("aria-pressed")).toBe("true");

			await fireEvent.click(btn);

			expect(el.type).toBe("password");
			expect(btn.getAttribute("aria-label")).toBe("Show password");
			expect(btn.getAttribute("aria-pressed")).toBe("false");
		});

		it("is disabled, and inert, while the field is disabled", async () => {
			const { container } = render(PasswordInput, { props: { disabled: true, value: "hunter2" } });
			const el = input(container);
			const btn = toggleButton(container)!;

			expect(btn.disabled).toBe(true);

			// A disabled button blocks a real click, but a synthetic dispatch
			// walks straight past that guard the same way it does on a native
			// `disabled` input — the handler repeats the guard rather than
			// trusting the attribute alone.
			await fireEvent.click(btn);
			expect(el.type).toBe("password");
		});

		it("preserves the caret/selection across a reveal toggle", async () => {
			const { container } = render(PasswordInput, { props: { value: "hunter2" } });
			const el = input(container);
			const btn = toggleButton(container)!;

			el.focus();
			el.setSelectionRange(2, 5);

			await fireEvent.click(btn);
			await tick();

			expect(el.type).toBe("text");
			expect(el.selectionStart).toBe(2);
			expect(el.selectionEnd).toBe(5);
		});

		it("explicitly restores the captured selection via setSelectionRange, not just by accident", async () => {
			// jsdom, unlike a real browser, does not reset selection on its own
			// when `type` changes — so the assertion above would pass even with
			// no restore logic at all. This spies on the DOM call the component
			// makes so the restore step itself is what's under test, not an
			// environment quirk that happens to leave the answer unchanged.
			const { container } = render(PasswordInput, { props: { value: "hunter2" } });
			const el = input(container);
			const btn = toggleButton(container)!;

			el.focus();
			el.setSelectionRange(2, 5);
			const setSelectionRangeSpy = vi.spyOn(el, "setSelectionRange");

			await fireEvent.click(btn);
			await tick();

			// jsdom's own default selectionDirection is the string "none", not
			// null/undefined — the captured value round-trips through as-is.
			expect(setSelectionRangeSpy).toHaveBeenCalledWith(2, 5, "none");
		});
	});

	describe("strength meter", () => {
		it("is absent by default", () => {
			const { container } = render(PasswordInput, { props: { value: "hunter2" } });
			expect(container.querySelector(".ft-password-strength")).toBeNull();
		});

		it("is absent while the field is empty, even with showStrength set", () => {
			const { container } = render(PasswordInput, { props: { showStrength: true, value: "" } });
			expect(container.querySelector(".ft-password-strength")).toBeNull();
		});

		it("labels a short, single-class password as very weak", () => {
			const { container } = render(PasswordInput, {
				props: { showStrength: true, value: "a" },
			});
			expect(strengthLabel(container)?.textContent?.trim()).toBe("Very weak");
		});

		it("labels a long password mixing all character classes as strong", () => {
			const { container } = render(PasswordInput, {
				props: { showStrength: true, value: "Abcdefghijkl1!" },
			});
			expect(strengthLabel(container)?.textContent?.trim()).toBe("Strong");
		});

		it("changes label as the value changes", async () => {
			const { container } = render(PasswordInput, {
				props: { showStrength: true, value: "a" },
			});
			const el = input(container);
			expect(strengthLabel(container)?.textContent?.trim()).toBe("Very weak");

			await fireEvent.input(el, { target: { value: "Abcdefghijkl1!" } });
			expect(strengthLabel(container)?.textContent?.trim()).toBe("Strong");
		});

		it("a custom strength function overrides the built-in scorer entirely", () => {
			const strength = vi.fn(() => ({ score: 2 as const, label: "Custom tier" }));
			const { container } = render(PasswordInput, {
				props: { showStrength: true, value: "a", strength },
			});

			expect(strength).toHaveBeenCalledWith("a");
			expect(strengthLabel(container)?.textContent?.trim()).toBe("Custom tier");
		});

		it("wires the strength label into aria-describedby once shown", () => {
			const { container } = render(PasswordInput, {
				props: { showStrength: true, value: "Abcdefghijkl1!" },
			});
			const el = input(container);
			const label = strengthLabel(container)!;

			expect(label.id).not.toBe("");
			expect(el.getAttribute("aria-describedby")).toBe(label.id);
		});
	});
});
