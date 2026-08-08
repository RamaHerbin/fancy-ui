import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import Label from "./Label.svelte";
import Harness from "./LabelHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";

function label(container: HTMLElement): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
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

describe("Label", () => {
	afterEach(cleanup);

	it("renders a real label with its children as content", () => {
		const { container } = render(Label, { props: { children: snippet("<span>Email</span>") } });
		expect(label(container).textContent?.trim()).toBe("Email");
	});

	it("carries the for prop through when standalone", () => {
		const { container } = render(Label, { props: { for: "email-input" } });
		expect(label(container).getAttribute("for")).toBe("email-input");
	});

	it("omits for entirely when neither a prop nor a field context supplies one", () => {
		const { container } = render(Label, { props: {} });
		expect(label(container).hasAttribute("for")).toBe(false);
	});

	it("has no id when standalone, with no field context at all", () => {
		const { container } = render(Label, { props: {} });
		expect(label(container).hasAttribute("id")).toBe(false);
	});

	it("shows no asterisk by default", () => {
		const { container } = render(Label, { props: {} });
		expect(label(container).querySelector("span")).toBeNull();
	});

	it("renders a required asterisk marked aria-hidden, not conveyed by the accessible name alone", () => {
		const { container } = render(Label, {
			props: { required: true, children: snippet("<span>Email</span>") },
		});
		const asterisk = label(container).querySelector('[aria-hidden="true"]');

		expect(asterisk).not.toBeNull();
		expect(asterisk?.textContent).toBe("*");
	});

	it("merges the class prop", () => {
		const { container } = render(Label, { props: { class: "mt-2" } });
		const cls = label(container).className;
		expect(cls).toContain("ft-label");
		expect(cls).toContain("mt-2");
	});

	it("binds the label element", () => {
		let ref: HTMLLabelElement | null = null;
		const { container } = render(Label, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLLabelElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(label(container));
	});

	describe("inside a FormField context", () => {
		it("resolves for from the context's controlId, ignoring its own for prop", () => {
			const { container } = render(Harness, {
				props: { field: field({ controlId: "ctx-id" }), for: "own-id" },
			});
			expect(label(container).getAttribute("for")).toBe("ctx-id");
		});

		it("resolves required from the context, overriding its own required=false", () => {
			const { container } = render(Harness, {
				props: { field: field({ required: true }), required: false },
			});
			expect(label(container).querySelector("span")).not.toBeNull();
		});

		it("resolves required from the context even when it disagrees the other way", () => {
			// The context is the authority in both directions, not just an OR with
			// the local prop — proven by making the context say false while the
			// component's own prop says true.
			const { container } = render(Harness, {
				props: { field: field({ required: false }), required: true },
			});
			expect(label(container).querySelector("span")).toBeNull();
		});

		it("carries the context's labelId as its own id, for a control whose root isn't labelable", () => {
			const { container } = render(Harness, {
				props: { field: field({ labelId: "ctx-label" }) },
			});
			expect(label(container).id).toBe("ctx-label");
		});

		it("has no id when the context reports no labelId", () => {
			const { container } = render(Harness, { props: { field: field() } });
			expect(label(container).hasAttribute("id")).toBe(false);
		});
	});
});
