import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect } from "vitest";
import { defineComponent, h } from "vue";
import { createFieldState, FIELD_KEY, useField, type FieldContext } from "./field.js";

// `container` is typed `Element` here, where the Svelte renderer types it
// `HTMLElement` — the only edit this helper needs.
function consumer(container: Element): HTMLElement {
	return container.querySelector('[data-testid="consumer"]') as HTMLElement;
}

/**
 * Stand-in for "any control in this wave": it calls `useField()` the way a real
 * one would and dumps the result onto its own attributes so a test can read it
 * back. Inline rather than a `.test.vue` rig — the template is one element, and
 * a component that merely consumes an injection needs no template compiler.
 */
const FieldConsumer = defineComponent({
	name: "FieldConsumer",
	setup() {
		const field = useField();
		return () =>
			h("div", {
				"data-testid": "consumer",
				"data-has-field": field !== undefined,
				"data-control-id": field?.controlId,
				"data-label-id": field?.labelId,
				"data-described-by": field?.describedBy,
				"data-invalid": field?.invalid,
				"data-valid": field?.valid,
				"data-required": field?.required,
				"data-disabled": field?.disabled,
			});
	},
});

describe("createFieldState", () => {
	it("reports no described-by ids when neither help nor error is rendered", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => false,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.describedBy).toBeUndefined();
	});

	it("lists only the description id when just help is rendered", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => true,
			hasError: () => false,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.describedBy).toBe("c-description");
	});

	it("lists only the error id when just the error is rendered", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => true,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.describedBy).toBe("c-error");
	});

	it("space-joins both ids when help and error are both rendered", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => true,
			hasError: () => true,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.describedBy).toBe("c-description c-error");
	});

	it("recomputes on every read, not just once at construction", () => {
		// FormField reruns these getters as its own reactive state changes; a
		// context object that snapshotted the answer at construction time would
		// go stale the moment help text turns into an error.
		let hasDescription = true;
		let hasError = false;
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => hasDescription,
			hasError: () => hasError,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.describedBy).toBe("c-description");

		hasDescription = false;
		hasError = true;
		expect(field.describedBy).toBe("c-error");
	});

	it("mirrors invalid from hasError, independent of the required/disabled getters", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => true,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.invalid).toBe(true);
	});

	it("reports valid when the valid getter says so and there is no error", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => false,
			valid: () => true,
			required: () => false,
			disabled: () => false,
		});

		expect(field.valid).toBe(true);
	});

	it("keeps valid false while hasError is true, even when the valid getter says true", () => {
		// The context is the authority on "error wins", not something every
		// caller has to remember to AND together itself before passing `valid`
		// in — a FormField that (by a future bug) forwarded valid=true and
		// error text at the same time still can't produce a context that
		// claims both.
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => true,
			valid: () => true,
			required: () => false,
			disabled: () => false,
		});

		expect(field.valid).toBe(false);
		expect(field.invalid).toBe(true);
	});

	it("defaults valid to false", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => false,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.valid).toBe(false);
	});

	it("passes labelId straight through when a label is rendered", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => "c-label",
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => false,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.labelId).toBe("c-label");
	});

	it("reports labelId as undefined when no label is rendered", () => {
		const field = createFieldState({
			controlId: () => "c",
			labelId: () => undefined,
			descriptionId: () => "c-description",
			errorId: () => "c-error",
			hasDescription: () => false,
			hasError: () => false,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		expect(field.labelId).toBeUndefined();
	});

	it("passes controlId, required and disabled straight through", () => {
		const field: FieldContext = createFieldState({
			controlId: () => "field-42",
			labelId: () => undefined,
			descriptionId: () => "field-42-description",
			errorId: () => "field-42-error",
			hasDescription: () => false,
			hasError: () => false,
			valid: () => false,
			required: () => true,
			disabled: () => true,
		});

		expect(field.controlId).toBe("field-42");
		expect(field.required).toBe(true);
		expect(field.disabled).toBe(true);
	});
});

describe("useField", () => {
	afterEach(cleanup);

	it("returns undefined with no FormField above it", () => {
		const { container } = render(FieldConsumer);
		expect(consumer(container).dataset.hasField).toBe("false");
		expect(consumer(container).dataset.controlId).toBeUndefined();
	});

	it("returns the exact context a provider published", () => {
		const field = createFieldState({
			controlId: () => "email",
			labelId: () => "email-label",
			descriptionId: () => "email-description",
			errorId: () => "email-error",
			hasDescription: () => true,
			hasError: () => false,
			valid: () => false,
			required: () => true,
			disabled: () => false,
		});

		const { container } = render(FieldConsumer, {
			global: { provide: { [FIELD_KEY]: field } },
		});
		const el = consumer(container);

		expect(el.dataset.hasField).toBe("true");
		expect(el.dataset.controlId).toBe("email");
		expect(el.dataset.labelId).toBe("email-label");
		expect(el.dataset.describedBy).toBe("email-description");
		expect(el.dataset.invalid).toBe("false");
		expect(el.dataset.required).toBe("true");
		expect(el.dataset.disabled).toBe("false");
	});

	// The getters are read at render time, not copied at injection time: a
	// control that reads `field.describedBy` in its own render sees whatever
	// the provider's flags say at that moment, which is what keeps the
	// server-rendered `aria-describedby` honest.
	it("reads the published getters live, not a snapshot taken at injection", async () => {
		let hasError = false;
		const field = createFieldState({
			controlId: () => "email",
			labelId: () => undefined,
			descriptionId: () => "email-description",
			errorId: () => "email-error",
			hasDescription: () => false,
			hasError: () => hasError,
			valid: () => false,
			required: () => false,
			disabled: () => false,
		});

		const { container } = render(FieldConsumer, {
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(consumer(container).dataset.describedBy).toBeUndefined();

		hasError = true;
		expect(field.describedBy).toBe("email-error");
	});
});
