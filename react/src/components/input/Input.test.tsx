import { render, cleanup, fireEvent } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Input } from "./Input.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

/**
 * Transposed from the Svelte value harness: `bind:value` becomes the
 * controlled `value` + `onValueChange` pair — the harness owns the value,
 * writes it back from the callback, and echoes it into the DOM so a test can
 * prove it travels back out to the consumer rather than merely changing what
 * the input draws. The ref effect mirrors the Svelte harness's `$effect`
 * proving `bind:ref` lands on the consumer's variable.
 */
function ValueHarness({ onValueChange }: { onValueChange?: (value: string) => void }) {
	const [value, setValue] = useState("");
	const el = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<Input
				ref={el}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
				label="Email"
			/>
			<span data-testid="bound-value">{value}</span>
		</>
	);
}

/**
 * Transposed from the Svelte field harness: publishes a hand-built
 * FieldContext through FieldProvider instead of rendering a real FormField —
 * this wave's components are built against the frozen FieldContext surface,
 * not against each other, so a fake provider here is the one way to test the
 * consumer side in isolation.
 */
function FieldHarness({ context }: { context: FieldContext }) {
	// Deliberately passed own props that disagree with the context, so a test
	// can prove the context wins rather than merely matching by coincidence.
	return (
		<FieldProvider value={context}>
			<Input id="own-id" invalid={false} required={false} disabled={false} />
		</FieldProvider>
	);
}

describe("Input", () => {
	afterEach(cleanup);

	it("renders a real input, resting, with the placeholder", () => {
		const { container } = render(<Input placeholder="Placeholder…" />);
		const el = input(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("text");
		expect(el.placeholder).toBe("Placeholder…");
		expect(el.disabled).toBe(false);
		expect(el.hasAttribute("aria-invalid")).toBe(false);
	});

	it("is focusable, carrying the class the focus-visible ring is scoped to", () => {
		const { container } = render(<Input />);
		const el = input(container);

		expect(el.classList.contains("ft-input")).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);
	});

	it("reflects invalid through aria-invalid and the destructive border class", () => {
		const { container } = render(<Input invalid />);
		const el = input(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.className).toContain("border-destructive/50");
	});

	it("disables the field: native disabled, out of the tab order", () => {
		const { container } = render(<Input disabled />);
		const el = input(container);

		expect(el.disabled).toBe(true);
	});

	it("readonly stays focusable and keeps its name, unlike disabled", () => {
		const { container } = render(<Input readonly name="email" value="rama@fancy.ui" />);
		const el = input(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);

		// A readonly field still submits; a disabled one is excluded entirely.
		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("email")).toBe("rama@fancy.ui");
	});

	it("calls onValueChange with the new value on input", async () => {
		// The Svelte test passes `value=""`; here that would make the input
		// controlled and pin it to "", so the uncontrolled default (which is
		// "") exercises the same starting state.
		const onValueChange = vi.fn();
		const { container } = render(<Input onValueChange={onValueChange} />);
		const el = input(container);

		await fireEvent.input(el, { target: { value: "hi" } });
		expect(el.value).toBe("hi");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hi");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		// The Svelte side's non-bound `value="start"` — seed once, then the
		// component owns it — is React's `defaultValue`.
		const onValueChange = vi.fn();
		const { container } = render(<Input defaultValue="start" onValueChange={onValueChange} />);
		const el = input(container);

		expect(el.value).toBe("start");
		await fireEvent.input(el, { target: { value: "typed" } });
		expect(el.value).toBe("typed");
		expect(onValueChange).toHaveBeenCalledWith("typed");
	});

	it("blocks the callback while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(<Input disabled onValueChange={onValueChange} />);
		const el = input(container);

		await fireEvent.input(el, { target: { value: "nope" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips value through the controlled value/onValueChange pair", async () => {
		const { container, getByTestId } = render(<ValueHarness />);
		const el = input(container);

		expect(getByTestId("bound-value").textContent).toBe("");
		await fireEvent.input(el, { target: { value: "bound" } });
		expect(getByTestId("bound-value").textContent).toBe("bound");
		expect(el.value).toBe("bound");
	});

	it("round-trips the input element through the forwarded ref", () => {
		const { container } = render(<ValueHarness />);
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(<Input label="Email" />);
		expect(input(container).getAttribute("aria-label")).toBe("Email");
	});

	it.each(["text", "email", "url", "tel", "password", "search", "number"] as const)(
		"applies the %s type",
		(type) => {
			const { container } = render(<Input type={type} />);
			expect(input(container).type).toBe(type);
		}
	);

	it("merges the className prop with the base classes", () => {
		const { container } = render(<Input className="mt-4" />);
		const cls = input(container).className;

		expect(cls).toContain("ft-input");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(<Input id="solo" invalid required disabled={false} />);
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
		const { container } = render(<FieldHarness context={context} />);
		const el = input(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to Input — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});
});
