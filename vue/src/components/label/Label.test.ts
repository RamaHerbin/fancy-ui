import { render, cleanup } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, it, expect } from "vitest";
import Label from "./Label.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Two
 * shapes changed and nothing else did:
 *
 * - The `children` snippet becomes the default slot, so `createRawSnippet`
 *   becomes a slot string.
 * - `LabelHarness.test.svelte` collapses into `global.provide`: it existed
 *   only to publish a hand-built `FieldContext` directly, which
 *   `global: { provide: { [FIELD_KEY]: … } }` does without a rig — including
 *   making the context disagree with `Label`'s own `for`/`required` props,
 *   the only way to prove the context wins rather than merely matching by
 *   coincidence. The harness also gave the label a default "Label" text
 *   child, which the slot below reproduces.
 * - The bindable `ref` is exposed on the instance, so the ref case mounts
 *   with `@vue/test-utils` and reads `wrapper.vm.ref` instead of binding a
 *   local getter/setter pair.
 */

function label(container: Element): HTMLLabelElement {
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

describe("Label", () => {
	afterEach(cleanup);

	it("renders a real label with its children as content", () => {
		const { container } = render(Label, { slots: { default: "<span>Email</span>" } });
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
			props: { required: true },
			slots: { default: "<span>Email</span>" },
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
		const wrapper = mount(Label, { attachTo: document.body });

		expect(wrapper.vm.ref).toBe(label(document.body));
		wrapper.unmount();
	});

	describe("inside a FormField context", () => {
		it("resolves for from the context's controlId, ignoring its own for prop", () => {
			const { container } = render(Label, {
				props: { for: "own-id" },
				slots: { default: "Label" },
				global: { provide: { [FIELD_KEY]: field({ controlId: "ctx-id" }) } },
			});
			expect(label(container).getAttribute("for")).toBe("ctx-id");
		});

		it("resolves required from the context, overriding its own required=false", () => {
			const { container } = render(Label, {
				props: { required: false },
				slots: { default: "Label" },
				global: { provide: { [FIELD_KEY]: field({ required: true }) } },
			});
			expect(label(container).querySelector("span")).not.toBeNull();
		});

		it("resolves required from the context even when it disagrees the other way", () => {
			// The context is the authority in both directions, not just an OR with
			// the local prop — proven by making the context say false while the
			// component's own prop says true.
			const { container } = render(Label, {
				props: { required: true },
				slots: { default: "Label" },
				global: { provide: { [FIELD_KEY]: field({ required: false }) } },
			});
			expect(label(container).querySelector("span")).toBeNull();
		});

		it("carries the context's labelId as its own id, for a control whose root isn't labelable", () => {
			const { container } = render(Label, {
				slots: { default: "Label" },
				global: { provide: { [FIELD_KEY]: field({ labelId: "ctx-label" }) } },
			});
			expect(label(container).id).toBe("ctx-label");
		});

		it("has no id when the context reports no labelId", () => {
			const { container } = render(Label, {
				slots: { default: "Label" },
				global: { provide: { [FIELD_KEY]: field() } },
			});
			expect(label(container).hasAttribute("id")).toBe(false);
		});
	});
});
