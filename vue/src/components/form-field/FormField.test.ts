import { render, cleanup } from "@testing-library/vue";
import { config, mount } from "@vue/test-utils";
import { defineComponent, h, Fragment } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import FormField from "./FormField.vue";
import { useField } from "../../internals/field.js";

// The mounting helper stubs `<Transition>` out of every render by default,
// which would silently delete the message and glyph entrances the motion
// cases exist to pin. Opted out for this file only; Vitest isolates the
// module registry per test file.
config.global.stubs = { ...config.global.stubs, transition: false };

/**
 * Transposed assertion-for-assertion from the source component's suite. Three
 * shapes changed and nothing else did:
 *
 * - The three `.test.svelte` rigs collapse into inline `defineComponent` +
 *   `h()` components below: a control stand-in reading `useField()`, the
 *   harness wrapping it in a real FormField, and the pair harness mounting
 *   two of them at once.
 * - `rerender` MERGES here where the source replaces, so every call passes
 *   the full prop set it means, `undefined` included.
 * - The bindable `ref` is exposed on the instance, so the ref case mounts
 *   with `@vue/test-utils` and reads `wrapper.vm.ref` instead of binding a
 *   local getter/setter pair.
 */

/**
 * Test-only rig standing in for a real control from this wave (Input,
 * Select, ...) — none of which live in this folder. It reads `useField()`
 * exactly the way a real control is expected to: context wins over its own
 * id/required/disabled whenever a FormField is present. Rendering this
 * inside FormField's default slot proves the wiring end-to-end without
 * depending on a sibling component built elsewhere in this wave.
 */
const FormFieldControl = defineComponent({
	name: "FormFieldControl",
	props: {
		id: { type: String, default: undefined },
		required: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
	},
	setup(props) {
		const field = useField();

		return () =>
			h("input", {
				type: "text",
				id: field?.controlId ?? props.id,
				required: field?.required ?? props.required,
				disabled: field?.disabled ?? props.disabled,
				"aria-invalid": field?.invalid ? "true" : undefined,
				"aria-describedby": field?.describedBy,
				"data-valid": field?.valid,
				"data-label-id": field?.labelId,
			});
	},
});

/**
 * Test-only rig: a real FormField wrapping the control stand-in, so the
 * compound's tests exercise the actual context propagation — id,
 * aria-describedby, aria-invalid, required, disabled all reaching a real
 * child component through real provide/inject, not a hand-built object.
 */
const Harness = defineComponent({
	name: "FormFieldHarness",
	props: {
		label: { type: String, default: undefined },
		description: { type: String, default: undefined },
		error: { type: String, default: undefined },
		valid: { type: Boolean, default: undefined },
		required: { type: Boolean, default: undefined },
		disabled: { type: Boolean, default: undefined },
		id: { type: String, default: undefined },
	},
	setup(props) {
		return () =>
			h(
				FormField,
				{
					label: props.label,
					description: props.description,
					error: props.error,
					valid: props.valid,
					required: props.required,
					disabled: props.disabled,
					id: props.id,
				},
				{ default: () => h(FormFieldControl) }
			);
	},
});

/**
 * Test-only rig: two independent FormFields, neither given an explicit
 * `id`, mounted together in the same render — the only way to prove their
 * generated controlIds don't collide, since the id generator's
 * per-instance guarantee is only meaningful across instances that actually
 * coexist.
 */
const PairHarness = defineComponent({
	name: "FormFieldPairHarness",
	setup() {
		return () =>
			h(Fragment, [
				h(FormField, { label: "First" }, { default: () => h(FormFieldControl) }),
				h(FormField, { label: "Second" }, { default: () => h(FormFieldControl) }),
			]);
	},
});

function root(container: Element): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function label(container: Element): HTMLLabelElement | null {
	return container.querySelector("label");
}

function control(container: Element): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function controls(container: Element): HTMLInputElement[] {
	return Array.from(container.querySelectorAll("input"));
}

function message(container: Element): HTMLElement | null {
	return container.querySelector("p");
}

/**
 * jsdom has no `matchMedia`; `src/test-setup.ts` installs one that answers
 * `matches: false` to everything, which is the "full motion" branch. This
 * swaps in a stub that discriminates on the query string, so a test can pick
 * the branch it means rather than turning every media query true at once.
 */
function stubReducedMotion(reduce: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: reduce && query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("FormField", () => {
	afterEach(cleanup);

	it("renders no label element when label is omitted", () => {
		const { container } = render(Harness, { props: {} });
		expect(label(container)).toBeNull();
	});

	it("renders the label text and marks it required, without being told the control's id directly", () => {
		const { container } = render(Harness, { props: { label: "Username", required: true } });
		const l = label(container);

		expect(l?.textContent?.trim()).toContain("Username");
		expect(l?.querySelector('[aria-hidden="true"]')?.textContent).toBe("*");
		// Proves the Label resolved `for` from this FormField's own context,
		// not from a value FormField had to pass it by hand.
		expect(l?.getAttribute("for")).toBe(control(container).id);
	});

	it("publishes labelId matching the id actually on the rendered label — not just a generated string", () => {
		// The failure mode this guards: an id that exists in the context but on
		// no element at all — exactly the bug a control's aria-labelledby would
		// silently inherit if FormField ever generated labelId without also
		// putting it on the <label>.
		const { container } = render(Harness, { props: { label: "Username" } });
		const l = label(container);

		expect(l).not.toBeNull();
		expect(l?.id).toBeTruthy();
		expect(control(container).dataset.labelId).toBe(l?.id);
	});

	it("reports labelId as undefined, and the control gets no aria-labelledby, when no label is rendered", () => {
		const { container } = render(Harness, { props: {} });
		expect(label(container)).toBeNull();
		expect(control(container).dataset.labelId).toBeUndefined();
	});

	it("gives the control the context's controlId, ignoring the control's own id prop", () => {
		const { container } = render(Harness, { props: {} });
		expect(control(container).id).toMatch(/-control$/);
	});

	it("uses the id prop as the control id when given, instead of generating one", () => {
		const { container } = render(Harness, { props: { id: "username" } });
		expect(control(container).id).toBe("username");
	});

	it("gives two co-mounted FormFields with no explicit id different, non-colliding control ids", () => {
		// The id generator is unique-by-construction per instance, but that
		// guarantee is only worth anything if it actually holds across two
		// instances that exist on the same page at once — this is the direct
		// check, not an inference from reading the implementation.
		const { container } = render(PairHarness, { props: {} });
		const [first, second] = controls(container) as [HTMLInputElement, HTMLInputElement];

		expect(first.id).toBeTruthy();
		expect(second.id).toBeTruthy();
		expect(first.id).not.toBe(second.id);
	});

	it("suffixes the message id off the same explicit id, so it is predictable for a caller", () => {
		// A control that is not context-aware still needs a stable way to wire
		// itself up by hand — this is what makes `id="username"` predict
		// `username-error` without reading anything back off the component.
		const { container } = render(Harness, { props: { id: "username", error: "Too short." } });
		expect(message(container)?.id).toBe("username-error");
	});

	it("renders no message and no aria-describedby when neither description nor error is set", () => {
		const { container } = render(Harness, { props: {} });
		expect(message(container)).toBeNull();
		expect(control(container).hasAttribute("aria-describedby")).toBe(false);
	});

	it("shows help text and points aria-describedby at it when only description is set", () => {
		const { container } = render(Harness, {
			props: { description: "Never shown publicly." },
		});
		const p = message(container);

		expect(p?.textContent?.trim()).toBe("Never shown publicly.");
		expect(p?.id).toBeTruthy();
		expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);
		expect(control(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("shows the error text with a decorative, aria-hidden glyph and points aria-describedby at it", () => {
		const { container } = render(Harness, {
			props: { error: "Minimum 3 characters." },
		});
		const p = message(container);

		expect(p?.textContent?.trim()).toBe("✕ Minimum 3 characters.");
		expect(p?.querySelector('[aria-hidden="true"]')).not.toBeNull();
		expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);
		expect(control(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("lets the error replace the help text rather than stacking under it", () => {
		const { container } = render(Harness, {
			props: { description: "Never shown publicly.", error: "Minimum 3 characters." },
		});

		expect(container.querySelectorAll("p")).toHaveLength(1);
		expect(message(container)?.textContent?.trim()).toBe("✕ Minimum 3 characters.");
		// Only the error id is in the description list — the help paragraph
		// isn't in the DOM at all while an error is showing.
		expect(control(container).getAttribute("aria-describedby")).toBe(message(container)?.id);
	});

	it("restores the help text, moves aria-describedby onto it, and drops aria-invalid once the error clears", async () => {
		const { container, rerender } = render(Harness, {
			props: { description: "Never shown publicly.", error: "Minimum 3 characters." },
		});
		const errorId = message(container)?.id;

		await rerender({ description: "Never shown publicly.", error: undefined });

		const p = message(container);
		expect(p?.textContent?.trim()).toBe("Never shown publicly.");
		expect(control(container).hasAttribute("aria-invalid")).toBe(false);
		// The highest-risk part of this transition: aria-describedby has to
		// move with it, not keep pointing at the errorId that just left the
		// DOM. Checking the surviving paragraph's own id, not just its text,
		// is what would catch a regression that left the old id behind.
		expect(p?.id).not.toBe(errorId);
		expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);
	});

	it("removes aria-describedby entirely once the help text it pointed at is cleared", async () => {
		const { container, rerender } = render(Harness, {
			props: { description: "Never shown publicly." },
		});
		expect(control(container).getAttribute("aria-describedby")).toBe(message(container)?.id);

		await rerender({ description: undefined });

		expect(message(container)).toBeNull();
		expect(control(container).hasAttribute("aria-describedby")).toBe(false);
	});

	it("does nothing visible for valid without a description to decorate", () => {
		// A lone checkmark with no text next to it is exactly the
		// meaningless-glyph problem this prop exists to avoid — so with no
		// description, `valid` is a no-op rather than growing a message of
		// its own. The context still reports it, for a control that wants to
		// draw its own success look independent of the message paragraph.
		const { container } = render(Harness, { props: { valid: true } });
		expect(message(container)).toBeNull();
		expect(control(container).dataset.valid).toBe("true");
	});

	it("decorates the help text with an aria-hidden checkmark when valid", () => {
		const { container } = render(Harness, {
			props: { description: "Used for sign-in.", valid: true },
		});
		const p = message(container);
		const glyph = p?.querySelector('[aria-hidden="true"]');

		expect(p?.textContent?.trim()).toBe("✓ Used for sign-in.");
		expect(glyph).not.toBeNull();
		expect(glyph?.textContent).toBe("✓");
		expect(control(container).dataset.valid).toBe("true");
	});

	it("shows no checkmark when valid is left false", () => {
		const { container } = render(Harness, { props: { description: "Used for sign-in." } });
		expect(message(container)?.querySelector('[aria-hidden="true"]')).toBeNull();
	});

	it("lets error win over valid when both are somehow set, in the DOM and in context", () => {
		const { container } = render(Harness, {
			props: { description: "Used for sign-in.", error: "Not a valid address.", valid: true },
		});
		const p = message(container);

		expect(p?.textContent?.trim()).toBe("✕ Not a valid address.");
		expect(p?.querySelector('[aria-hidden="true"]')?.textContent).toBe("✕");
		expect(control(container).getAttribute("aria-invalid")).toBe("true");
		expect(control(container).dataset.valid).toBe("false");
	});

	it("passes required through context, overriding the control's own required=false", () => {
		const { container } = render(Harness, { props: { required: true } });
		expect(control(container).required).toBe(true);
	});

	it("passes disabled through context, overriding the control's own disabled=false", () => {
		const { container } = render(Harness, { props: { disabled: true } });
		expect(control(container).disabled).toBe(true);
	});

	it("leaves the control enabled and optional by default", () => {
		const { container } = render(Harness, { props: {} });
		expect(control(container).required).toBe(false);
		expect(control(container).disabled).toBe(false);
	});

	it("merges the class prop onto the root", () => {
		const { container } = render(FormField, { props: { class: "mt-4" } });
		const el = root(container);

		expect(el.className).toContain("ft-form-field");
		expect(el.className).toContain("mt-4");
	});

	describe("motion", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("animates a message in when it appears after first render", async () => {
			stubReducedMotion(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container, rerender } = render(Harness, { props: {} });
				expect(message(container)).toBeNull();

				await rerender({ error: "Minimum 3 characters." });

				await vi.waitFor(() => {
					expect(message(container)).not.toBeNull();
				});
				expect(animateSpy).toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("swaps error for description with no overlap: exactly one paragraph, and aria-describedby lands on it in the same tick", async () => {
			// The reason both branches animate in and neither animates out. An
			// exit here would leave the error paragraph on screen carrying
			// `errorId` while the control had already moved `aria-describedby`
			// onto the description — a message a screen reader is no longer
			// pointed at, still visible. This is the assertion that would go red
			// if someone "improved" it into a cross-fade.
			stubReducedMotion(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container, rerender } = render(Harness, {
					props: { description: "Never shown publicly.", error: "Minimum 3 characters." },
				});

				await rerender({ description: "Never shown publicly.", error: undefined });

				expect(container.querySelectorAll("p")).toHaveLength(1);
				const p = message(container);
				expect(p?.textContent?.trim()).toBe("Never shown publicly.");
				expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);

				// The `<Transition>` wrapping both branches is already mounted by
				// the time the swap happens, so the description pops on the swap
				// exactly as the error does. Pinned on the paragraph itself rather
				// than on the spy in general, so the assertion cannot be satisfied
				// by some other element animating: `mock.contexts` holds the `this`
				// of each call — the element `animate()` ran on.
				expect(animateSpy).toHaveBeenCalled();
				expect(animateSpy.mock.contexts).toContain(p);
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("with prefers-reduced-motion: reduce, messages and the valid glyph still arrive — they just never animate", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container, rerender } = render(Harness, { props: {} });

				await rerender({ description: "Used for sign-in." });
				expect(message(container)?.textContent?.trim()).toBe("Used for sign-in.");

				// The glyph is the `micro` (80ms) beat rather than the paragraph's
				// 150ms one, and it only ever animates when `valid` flips while
				// the help text is already mounted — which is exactly what this
				// second rerender does.
				await rerender({ description: "Used for sign-in.", valid: true });
				const glyph = container.querySelector(".ft-form-field-valid-glyph");
				expect(glyph?.textContent).toBe("✓");

				expect(animateSpy).not.toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("animates the valid glyph in only once the help text is already on screen", async () => {
			stubReducedMotion(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				// Rendered already-valid: the glyph's own `<Transition>` is created
				// in the same pass as the paragraph that owns it, so it runs no
				// enter leg. A field that loads in a valid state should not perform
				// on arrival.
				const { container, rerender } = render(Harness, {
					props: { description: "Used for sign-in.", valid: true },
				});
				expect(container.querySelector(".ft-form-field-valid-glyph")).not.toBeNull();
				expect(animateSpy).not.toHaveBeenCalled();

				// Flipping `valid` off and back on, with the paragraph mounted
				// throughout, is the real event — and that one does animate.
				await rerender({ description: "Used for sign-in.", valid: false });
				await rerender({ description: "Used for sign-in.", valid: true });

				await vi.waitFor(() => {
					expect(container.querySelector(".ft-form-field-valid-glyph")).not.toBeNull();
				});
				expect(animateSpy).toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});
	});

	it("exposes the root element", () => {
		const wrapper = mount(FormField, { attachTo: document.body });
		expect(wrapper.vm.ref).toBe(document.body.querySelector(".ft-form-field"));
		wrapper.unmount();
	});
});
