import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import NumberInput from "./NumberInput.svelte";
import ValueHarness from "./NumberInputHarness.test.svelte";
import FieldHarness from "./NumberInputFieldHarness.test.svelte";

function field(container: HTMLElement): HTMLInputElement {
	return container.querySelector(".ft-number-input-field") as HTMLInputElement;
}

function decrementButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Decrease value"]') as HTMLButtonElement;
}

function incrementButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Increase value"]') as HTMLButtonElement;
}

describe("NumberInput", () => {
	afterEach(cleanup);

	// A real type="number" input sanitizes its own `.value` to "" for ANY
	// syntactically incomplete number (see the decimal-typing describe block
	// below), indistinguishable from a genuine clear — so this is a plain
	// text input with `inputmode="decimal"` for the numeric keyboard hint,
	// parsed entirely by hand instead.
	it("renders a real text input flanked by two real buttons", () => {
		const { container } = render(NumberInput, { props: {} });

		expect(field(container).tagName).toBe("INPUT");
		expect(field(container).type).toBe("text");
		expect(field(container).getAttribute("inputmode")).toBe("decimal");
		expect(decrementButton(container).tagName).toBe("BUTTON");
		expect(incrementButton(container).tagName).toBe("BUTTON");
	});

	it("gives both step buttons type=button, so they never submit a surrounding form", () => {
		const { container } = render(NumberInput, { props: {} });

		expect(decrementButton(container).getAttribute("type")).toBe("button");
		expect(incrementButton(container).getAttribute("type")).toBe("button");
	});

	it("gives both step buttons an accessible name beyond their glyph", () => {
		const { container } = render(NumberInput, { props: {} });

		expect(decrementButton(container).getAttribute("aria-label")).toBe("Decrease value");
		expect(incrementButton(container).getAttribute("aria-label")).toBe("Increase value");
	});

	it("steps up and down by `step`", async () => {
		const { container } = render(NumberInput, { props: { value: 10, step: 5 } });

		await fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("15");

		await fireEvent.click(decrementButton(container));
		await fireEvent.click(decrementButton(container));
		expect(field(container).value).toBe("5");
	});

	// The load-bearing case: naive float addition drifts (0.1 + 0.1 + ... !==
	// 1), so each step result is rounded to the grid's own precision. Ten 0.1
	// increments from 0 must land on exactly 1, not 0.9999999999999999.
	it("does not accumulate float drift over repeated fractional steps", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, { props: { value: 0, step: 0.1, onValueChange } });
		const button = incrementButton(container);

		for (let i = 0; i < 10; i += 1) {
			await fireEvent.click(button);
		}

		expect(field(container).value).toBe("1");
		expect(onValueChange).toHaveBeenLastCalledWith(1);
	});

	// The step grid is anchored at `min`, not at `step`'s own decimal count:
	// 0.25 + 0.5 is exactly 0.75, but rounding to step's one decimal place
	// alone would corrupt that already-exact result to 0.8.
	it("anchors step rounding at min, not just at step's own decimal count", async () => {
		const { container } = render(NumberInput, { props: { value: 0.25, min: 0.25, step: 0.5 } });

		await fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("0.75");
	});

	it("ArrowUp/ArrowDown step through the keyboard, with the same rounding the buttons use", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, { props: { value: 0, step: 0.1, onValueChange } });
		const el = field(container);

		for (let i = 0; i < 10; i += 1) {
			await fireEvent.keyDown(el, { key: "ArrowUp" });
		}
		expect(el.value).toBe("1");
		expect(onValueChange).toHaveBeenLastCalledWith(1);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.value).toBe("0.9");
	});

	it("ArrowUp/ArrowDown are blocked while disabled or readonly", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 5, disabled: true, onValueChange },
		});
		const el = field(container);

		await fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("clamps at the upper bound and disables the increment button there", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 9, min: 0, max: 10, step: 1, onValueChange },
		});
		const button = incrementButton(container);

		await fireEvent.click(button);
		expect(field(container).value).toBe("10");
		expect(button.disabled).toBe(true);

		onValueChange.mockClear();
		// A synthetic click still reaches a disabled button's handler; the
		// handler's own guard is what actually stops it, not the attribute.
		await fireEvent.click(button);
		expect(field(container).value).toBe("10");
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("clamps at the lower bound and disables the decrement button there", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 1, min: 0, max: 10, step: 1, onValueChange },
		});
		const button = decrementButton(container);

		await fireEvent.click(button);
		expect(field(container).value).toBe("0");
		expect(button.disabled).toBe(true);

		onValueChange.mockClear();
		await fireEvent.click(button);
		expect(field(container).value).toBe("0");
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// Documented, deliberate choice (see the README): a step that lands past
	// a bound clamps there, and every step after that continues arithmetic
	// from the clamped value instead of re-snapping to the nearest point on
	// the original 0/3/6/9 grid — matching how a native number input's own
	// stepUp()/stepDown() keeps going from wherever clamping left it.
	it("continues stepping from a clamped value rather than re-snapping to the original grid", async () => {
		const { container } = render(NumberInput, { props: { value: 9, min: 0, max: 10, step: 3 } });
		const inc = incrementButton(container);
		const dec = decrementButton(container);

		await fireEvent.click(inc); // 9 -> would be 12, clamped to 10
		expect(field(container).value).toBe("10");

		await fireEvent.click(dec); // 10 - 3 = 7, not back to 9
		expect(field(container).value).toBe("7");
		await fireEvent.click(dec); // 7 - 3 = 4
		expect(field(container).value).toBe("4");
		await fireEvent.click(dec); // 4 - 3 = 1
		expect(field(container).value).toBe("1");
	});

	it("leaves both buttons enabled when there is no min/max", () => {
		const { container } = render(NumberInput, { props: { value: 5 } });

		expect(decrementButton(container).disabled).toBe(false);
		expect(incrementButton(container).disabled).toBe(false);
	});

	it("steps up from an empty field to min, not min + step or NaN", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: null, min: 3, step: 5, onValueChange },
		});

		await fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("3");
		expect(onValueChange).toHaveBeenCalledWith(3);
	});

	it("steps up from an empty field to 0 when there is no min", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, { props: { value: null, step: 5, onValueChange } });

		await fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("0");
		expect(onValueChange).toHaveBeenCalledWith(0);
	});

	it("renders an empty field as blank, not as 0 or NaN", () => {
		const { container } = render(NumberInput, { props: { value: null } });
		expect(field(container).value).toBe("");
	});

	it("clearing the field sets value to null and calls onValueChange(null)", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, { props: { value: 5, onValueChange } });
		const el = field(container);

		await fireEvent.input(el, { target: { value: "" } });
		expect(el.value).toBe("");
		expect(onValueChange).toHaveBeenCalledWith(null);
	});

	it("calls onValueChange with the typed number on input", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, { props: { value: 1, onValueChange } });
		const el = field(container);

		await fireEvent.input(el, { target: { value: "42" } });
		expect(el.value).toBe("42");
		expect(onValueChange).toHaveBeenCalledWith(42);
	});

	// The critical bug this whole describe block pins: a real type="number"
	// input reports its `.value` as "" for ANY syntactically incomplete
	// number — "9.", "-", "1e" all read back empty, indistinguishable from an
	// actual clear. That collapsed "still typing a decimal" into "cleared",
	// nulling the bound value the instant a "." landed — deleting it isn't
	// hypothetical, it happened on every single fractional entry. These tests
	// simulate the actual intermediate keystrokes, not just the end state.
	describe("typing a decimal or a negative number, keystroke by keystroke", () => {
		it("does not null the value when a decimal point is typed mid-entry", async () => {
			const onValueChange = vi.fn();
			const { container } = render(NumberInput, { props: { value: null, onValueChange } });
			const el = field(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "9" } });
			expect(el.value).toBe("9");
			expect(onValueChange).toHaveBeenLastCalledWith(9);

			// The load-bearing keystroke. A native type="number" input's own
			// sanitization would already report "" here.
			await fireEvent.input(el, { target: { value: "9." } });
			expect(el.value).toBe("9."); // still shows exactly what was typed
			expect(onValueChange).not.toHaveBeenCalledWith(null); // never nulled

			await fireEvent.input(el, { target: { value: "9.5" } });
			expect(el.value).toBe("9.5");
			expect(onValueChange).toHaveBeenLastCalledWith(9.5);

			await fireEvent.blur(el);
			expect(el.value).toBe("9.5");
		});

		it("does not null the value when a leading minus sign is typed mid-entry", async () => {
			const onValueChange = vi.fn();
			const { container } = render(NumberInput, { props: { value: 5, onValueChange } });
			const el = field(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "-" } });
			expect(el.value).toBe("-");
			expect(onValueChange).not.toHaveBeenCalledWith(null);

			await fireEvent.input(el, { target: { value: "-3" } });
			expect(el.value).toBe("-3");
			expect(onValueChange).toHaveBeenLastCalledWith(-3);
		});

		it("does not strip a trailing zero while focused, since it already parses to the same number", async () => {
			const { container } = render(NumberInput, { props: { value: 1 } });
			const el = field(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "1.20" } });
			expect(el.value).toBe("1.20"); // not clobbered back to "1.2" mid-entry

			await fireEvent.blur(el);
			expect(el.value).toBe("1.2"); // canonicalised once typing is done
		});

		it("leaves an incomplete exponent ('1e') untouched rather than treating it as empty", async () => {
			const onValueChange = vi.fn();
			const { container } = render(NumberInput, { props: { value: 1, onValueChange } });
			const el = field(container);

			await fireEvent.focus(el);
			await fireEvent.input(el, { target: { value: "1e" } });
			expect(el.value).toBe("1e");
			expect(onValueChange).not.toHaveBeenCalledWith(null);
		});
	});

	it("clamps an out-of-range typed value on blur, not on every keystroke", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 5, min: 0, max: 10, onValueChange },
		});
		const el = field(container);

		await fireEvent.input(el, { target: { value: "999" } });
		expect(el.value).toBe("999"); // not clamped mid-typing
		expect(onValueChange).toHaveBeenLastCalledWith(999);

		await fireEvent.blur(el);
		expect(el.value).toBe("10");
		expect(onValueChange).toHaveBeenLastCalledWith(10);
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, { props: { value: 3, onValueChange } });

		expect(field(container).value).toBe("3");
		await fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("4");
		expect(onValueChange).toHaveBeenCalledWith(4);
	});

	it("blocks typing, the buttons and the callback while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 5, disabled: true, onValueChange },
		});

		expect(field(container).disabled).toBe(true);
		expect(decrementButton(container).disabled).toBe(true);
		expect(incrementButton(container).disabled).toBe(true);

		await fireEvent.click(incrementButton(container));
		await fireEvent.input(field(container), { target: { value: "9" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("readonly blocks typing and the buttons but stays focusable and still submits", async () => {
		const onValueChange = vi.fn();
		const { container } = render(NumberInput, {
			props: { value: 5, readonly: true, name: "qty", onValueChange },
		});
		const el = field(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		expect(decrementButton(container).disabled).toBe(true);
		expect(incrementButton(container).disabled).toBe(true);

		el.focus();
		expect(document.activeElement).toBe(el);

		// A readonly field still submits its current value; check this before
		// simulating any input below, since a raw synthetic `input` event sets
		// the DOM value property directly (the way a real blocked keystroke
		// never would) and would otherwise contaminate this snapshot.
		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("qty")).toBe("5");

		await fireEvent.click(incrementButton(container));
		await fireEvent.input(el, { target: { value: "9" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("reflects invalid through aria-invalid and the destructive border class", () => {
		const { container } = render(NumberInput, { props: { invalid: true } });
		const wrap = container.querySelector(".ft-number-input") as HTMLElement;

		expect(field(container).getAttribute("aria-invalid")).toBe("true");
		expect(wrap.className).toContain("border-destructive/50");
	});

	it("sets the native required attribute from the required prop", () => {
		const { container } = render(NumberInput, { props: { required: true } });
		expect(field(container).required).toBe(true);
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = field(container);

		expect(getByTestId("bound-value").textContent).toBe("null");
		await fireEvent.input(el, { target: { value: "7" } });
		expect(getByTestId("bound-value").textContent).toBe("7");
		expect(el.value).toBe("7");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(field(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(NumberInput, { props: { label: "Quantity" } });
		expect(field(container).getAttribute("aria-label")).toBe("Quantity");
	});

	it("merges the class prop with the base wrapper classes", () => {
		const { container } = render(NumberInput, { props: { class: "mt-4" } });
		const wrap = container.querySelector(".ft-number-input") as HTMLElement;

		expect(wrap.className).toContain("ft-number-input");
		expect(wrap.className).toContain("mt-4");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(NumberInput, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = field(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = field(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to NumberInput — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});
});
