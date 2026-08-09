import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Slider from "./Slider.svelte";
import ValueHarness from "./SliderHarness.test.svelte";
import FieldHarness from "./SliderFieldHarness.test.svelte";

function slider(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input[type=range]") as HTMLInputElement;
}

describe("Slider", () => {
	afterEach(cleanup);

	it("renders a real range input with the default bounds and step", () => {
		const { container } = render(Slider, { props: {} });
		const el = slider(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("range");
		expect(el.min).toBe("0");
		expect(el.max).toBe("100");
		expect(el.step).toBe("1");
		expect(el.disabled).toBe(false);
	});

	it("respects custom min, max and step", () => {
		const { container } = render(Slider, { props: { min: 10, max: 20, step: 0.5, value: 15 } });
		const el = slider(container);

		expect(el.min).toBe("10");
		expect(el.max).toBe("20");
		expect(el.step).toBe("0.5");
		expect(el.value).toBe("15");
	});

	// The browser reads aria-valuemin/max/now (and, independently, the native
	// min/max/step attributes above) to drive its own keyboard interaction —
	// jsdom does not implement that UA-level widget behaviour, so what is
	// testable here is that both sets of attributes are wired correctly
	// rather than the keypress-to-pixel behaviour itself.
	it("keeps aria-valuemin, aria-valuemax and aria-valuenow in sync with the bounds and value", () => {
		const { container } = render(Slider, { props: { min: 0, max: 50, value: 30 } });
		const el = slider(container);

		expect(el.getAttribute("aria-valuemin")).toBe("0");
		expect(el.getAttribute("aria-valuemax")).toBe("50");
		expect(el.getAttribute("aria-valuenow")).toBe("30");
	});

	it("is focusable, carrying the class the vendor thumb rules are scoped to", () => {
		const { container } = render(Slider, { props: {} });
		const el = slider(container);

		expect(el.classList.contains("ft-slider")).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it("calls onValueChange with the new value on input, matching a step-sized move", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Slider, { props: { value: 40, step: 5, onValueChange } });
		const el = slider(container);

		await fireEvent.input(el, { target: { value: "45" } });
		expect(el.value).toBe("45");
		expect(el.getAttribute("aria-valuenow")).toBe("45");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith(45);
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Slider, { props: { value: 20, onValueChange } });
		const el = slider(container);

		expect(el.value).toBe("20");
		await fireEvent.input(el, { target: { value: "60" } });
		expect(el.value).toBe("60");
		expect(onValueChange).toHaveBeenCalledWith(60);
	});

	it("blocks the callback while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Slider, { props: { disabled: true, onValueChange } });
		const el = slider(container);

		expect(el.disabled).toBe(true);
		await fireEvent.input(el, { target: { value: "99" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// A native range input clamps its own displayed value to [min,max]
	// silently — without this, aria-valuenow and the value attribute would
	// report a raw out-of-range prop while the thumb sat wherever the
	// browser actually clamped it, a real mismatch a sighted user can see.
	it("clamps aria-valuenow and the input's value when the prop starts out of range", () => {
		const onValueChange = vi.fn();
		const { container } = render(Slider, { props: { value: 150, max: 100, onValueChange } });
		const el = slider(container);

		expect(el.getAttribute("aria-valuenow")).toBe("100");
		expect(el.value).toBe("100");
		// Also corrects the bindable prop itself, the same way NumberInput
		// clamps on blur, so a caller's own bound variable does not stay
		// silently out of range.
		expect(onValueChange).toHaveBeenCalledWith(100);
	});

	it("clamps the value (and calls onValueChange) when max shrinks below the current value at runtime", async () => {
		const onValueChange = vi.fn();
		const { container, rerender } = render(Slider, {
			props: { value: 80, max: 100, onValueChange },
		});
		const el = slider(container);
		expect(el.getAttribute("aria-valuenow")).toBe("80");

		await rerender({ value: 80, max: 50, onValueChange });
		expect(el.getAttribute("aria-valuenow")).toBe("50");
		expect(el.value).toBe("50");
		expect(onValueChange).toHaveBeenCalledWith(50);
	});

	it("keeps the showValue bubble in sync with the clamped value, not the raw out-of-range prop", () => {
		const { container } = render(Slider, { props: { value: 150, max: 100, showValue: true } });
		const bubble = container.querySelector(".ft-slider-bubble");
		expect(bubble?.textContent?.trim()).toBe("100");
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = slider(container);

		expect(getByTestId("bound-value").textContent).toBe("0");
		await fireEvent.input(el, { target: { value: "42" } });
		expect(getByTestId("bound-value").textContent).toBe("42");
		expect(el.value).toBe("42");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(slider(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(Slider, { props: { label: "Volume" } });
		expect(slider(container).getAttribute("aria-label")).toBe("Volume");
	});

	it("merges the class prop with the base wrapper classes", () => {
		const { container } = render(Slider, { props: { class: "mt-4" } });
		const wrap = container.querySelector(".ft-slider-wrap") as HTMLElement;

		expect(wrap.className).toContain("ft-slider-wrap");
		expect(wrap.className).toContain("mt-4");
	});

	it("shows the value bubble only when showValue is set, tracking the current value", async () => {
		const { container, rerender } = render(Slider, { props: { value: 60, showValue: false } });
		expect(container.querySelector(".ft-slider-bubble")).toBeNull();

		await rerender({ value: 60, showValue: true });
		const bubble = container.querySelector(".ft-slider-bubble");
		expect(bubble).not.toBeNull();
		expect(bubble?.textContent?.trim()).toBe("60");
		expect(bubble?.getAttribute("aria-hidden")).toBe("true");
	});

	it("shows min/max end labels only when showBounds is set", () => {
		const { container: withoutBounds } = render(Slider, {
			props: { min: 0, max: 100, showBounds: false },
		});
		expect(withoutBounds.querySelectorAll(".ft-slider-wrap > div")).toHaveLength(1);

		const { container } = render(Slider, { props: { min: 0, max: 100, showBounds: true } });
		const rows = container.querySelectorAll(".ft-slider-wrap > div");
		expect(rows).toHaveLength(2);
		const bounds = rows[1].querySelectorAll("span");
		expect(bounds[0].textContent).toBe("0");
		expect(bounds[1].textContent).toBe("100");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Slider, { props: { id: "solo", disabled: false } });
		const el = slider(container);

		expect(el.id).toBe("solo");
		expect(el.disabled).toBe(false);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid and disabled", () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = slider(container);

		// The harness passes id="own-id" disabled={false} straight to Slider —
		// both are overridden by the context above. `required` has no
		// counterpart on Slider at all — see the component's own comment on
		// why aria-required is never wired for the slider role.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.disabled).toBe(true);
	});
});
