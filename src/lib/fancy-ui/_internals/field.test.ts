import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { createFieldState, type FieldContext } from "./field.svelte.js";
import Harness from "./FieldHarness.test.svelte";

function consumer(container: HTMLElement): HTMLElement {
	return container.querySelector('[data-testid="consumer"]') as HTMLElement;
}

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

describe("getField", () => {
	afterEach(cleanup);

	it("returns undefined with no FormField above it", () => {
		const { container } = render(Harness, { props: {} });
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

		const { container } = render(Harness, { props: { field } });
		const el = consumer(container);

		expect(el.dataset.hasField).toBe("true");
		expect(el.dataset.controlId).toBe("email");
		expect(el.dataset.labelId).toBe("email-label");
		expect(el.dataset.describedBy).toBe("email-description");
		expect(el.dataset.invalid).toBe("false");
		expect(el.dataset.required).toBe("true");
		expect(el.dataset.disabled).toBe("false");
	});
});
