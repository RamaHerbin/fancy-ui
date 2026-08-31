import { render, cleanup } from "@testing-library/react";
import { createRef } from "react";
import type { ReactNode } from "react";
import { afterEach, describe, it, expect } from "vitest";
import { Label } from "./Label.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

function label(container: HTMLElement): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

function field(overrides: Partial<FieldContext> = {}): FieldContext {
	return {
		controlId: "field-control",
		describedBy: undefined,
		invalid: false,
		required: false,
		disabled: false,
		...overrides,
	};
}

/**
 * Test-only rig. Publishes a hand-built FieldContext directly through the
 * provider rather than going through a real FormField, so a test gets
 * precise control over exactly what the context reports — including making
 * it disagree with Label's own `htmlFor`/`required` props, which is the only
 * way to prove the context wins rather than merely matching it by
 * coincidence.
 */
function Harness({
	field,
	htmlFor,
	required,
	children,
}: {
	field: FieldContext;
	htmlFor?: string;
	required?: boolean;
	children?: ReactNode;
}) {
	return (
		<FieldProvider value={field}>
			<Label htmlFor={htmlFor} required={required}>
				{children ?? "Label"}
			</Label>
		</FieldProvider>
	);
}

describe("Label", () => {
	afterEach(cleanup);

	it("renders a real label with its children as content", () => {
		const { container } = render(
			<Label>
				<span>Email</span>
			</Label>
		);
		expect(label(container).textContent?.trim()).toBe("Email");
	});

	it("carries the for attribute through when standalone", () => {
		const { container } = render(<Label htmlFor="email-input" />);
		expect(label(container).getAttribute("for")).toBe("email-input");
	});

	it("omits for entirely when neither a prop nor a field context supplies one", () => {
		const { container } = render(<Label />);
		expect(label(container).hasAttribute("for")).toBe(false);
	});

	it("has no id when standalone, with no field context at all", () => {
		const { container } = render(<Label />);
		expect(label(container).hasAttribute("id")).toBe(false);
	});

	it("shows no asterisk by default", () => {
		const { container } = render(<Label />);
		expect(label(container).querySelector("span")).toBeNull();
	});

	it("renders a required asterisk marked aria-hidden, not conveyed by the accessible name alone", () => {
		const { container } = render(
			<Label required>
				<span>Email</span>
			</Label>
		);
		const asterisk = label(container).querySelector('[aria-hidden="true"]');

		expect(asterisk).not.toBeNull();
		expect(asterisk?.textContent).toBe("*");
	});

	it("merges the className prop", () => {
		const { container } = render(<Label className="mt-2" />);
		const cls = label(container).className;
		expect(cls).toContain("ft-label");
		expect(cls).toContain("mt-2");
	});

	it("binds the label element", () => {
		const ref = createRef<HTMLLabelElement>();
		const { container } = render(<Label ref={ref} />);
		expect(ref.current).toBe(label(container));
	});

	describe("inside a FormField context", () => {
		it("resolves for from the context's controlId, ignoring its own htmlFor prop", () => {
			const { container } = render(
				<Harness field={field({ controlId: "ctx-id" })} htmlFor="own-id" />
			);
			expect(label(container).getAttribute("for")).toBe("ctx-id");
		});

		it("resolves required from the context, overriding its own required=false", () => {
			const { container } = render(<Harness field={field({ required: true })} required={false} />);
			expect(label(container).querySelector("span")).not.toBeNull();
		});

		it("resolves required from the context even when it disagrees the other way", () => {
			// The context is the authority in both directions, not just an OR with
			// the local prop — proven by making the context say false while the
			// component's own prop says true.
			const { container } = render(<Harness field={field({ required: false })} required={true} />);
			expect(label(container).querySelector("span")).toBeNull();
		});

		it("carries the context's labelId as its own id, for a control whose root isn't labelable", () => {
			const { container } = render(<Harness field={field({ labelId: "ctx-label" })} />);
			expect(label(container).id).toBe("ctx-label");
		});

		it("has no id when the context reports no labelId", () => {
			const { container } = render(<Harness field={field()} />);
			expect(label(container).hasAttribute("id")).toBe(false);
		});
	});
});
