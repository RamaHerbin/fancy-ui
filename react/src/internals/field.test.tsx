import type { ReactNode } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
	createFieldState,
	FieldProvider,
	useField,
	type FieldContext,
	type FieldStateOptions,
} from "./field.js";

function consumer(container: HTMLElement): HTMLElement {
	return container.querySelector('[data-testid="consumer"]') as HTMLElement;
}

/**
 * The `FieldStateOptions` shape every case below starts from, so each test
 * spells out only the entries it is actually about. The Svelte suite repeated
 * all nine per case because a getter literal cannot be spread as cheaply.
 */
const base: FieldStateOptions = {
	controlId: "c",
	labelId: undefined,
	descriptionId: "c-description",
	errorId: "c-error",
	hasDescription: false,
	hasError: false,
	valid: false,
	required: false,
	disabled: false,
};

/**
 * Test-only rig, the React replacement for `FieldConsumer.test.svelte`: a
 * stand-in for "any control in this wave". It calls `useField()` the same way
 * a real one would and dumps the result onto its own attributes so a test can
 * read it back — proving `undefined` outside a provider, and the exact object
 * a provider published inside one.
 */
function FieldConsumer() {
	const field = useField();

	return (
		<div
			data-testid="consumer"
			data-has-field={field !== undefined}
			data-control-id={field?.controlId}
			data-label-id={field?.labelId}
			data-described-by={field?.describedBy}
			data-invalid={field?.invalid}
			data-valid={field?.valid}
			data-required={field?.required}
			data-disabled={field?.disabled}
		/>
	);
}

/**
 * Test-only rig, the React replacement for `FieldHarness.test.svelte`:
 * publishes `field` when given, then renders a `FieldConsumer` beneath it.
 *
 * With no `field` prop it renders the consumer with NO provider above it at
 * all, rather than a provider publishing `undefined` — the "no FormField"
 * case is `createContext`'s own default, and proving that is the point.
 */
function FieldHarness({ field }: { field?: FieldContext }) {
	if (field === undefined) return <FieldConsumer />;
	return (
		<FieldProvider value={field}>
			<FieldConsumer />
		</FieldProvider>
	);
}

describe("createFieldState", () => {
	it("reports no described-by ids when neither help nor error is rendered", () => {
		const field = createFieldState({ ...base, hasDescription: false, hasError: false });

		expect(field.describedBy).toBeUndefined();
	});

	it("lists only the description id when just help is rendered", () => {
		const field = createFieldState({ ...base, hasDescription: true, hasError: false });

		expect(field.describedBy).toBe("c-description");
	});

	it("lists only the error id when just the error is rendered", () => {
		const field = createFieldState({ ...base, hasDescription: false, hasError: true });

		expect(field.describedBy).toBe("c-error");
	});

	it("space-joins both ids when help and error are both rendered", () => {
		const field = createFieldState({ ...base, hasDescription: true, hasError: true });

		expect(field.describedBy).toBe("c-description c-error");
	});

	it("recomputes from the inputs it is handed, not from a snapshot of an earlier call", () => {
		// FormField rebuilds this from a `useMemo` as its own props change; a
		// module that cached the answer across calls would go stale the moment
		// help text turns into an error.
		const withHelp = createFieldState({ ...base, hasDescription: true, hasError: false });
		expect(withHelp.describedBy).toBe("c-description");

		const withError = createFieldState({ ...base, hasDescription: false, hasError: true });
		expect(withError.describedBy).toBe("c-error");
		expect(withHelp.describedBy).toBe("c-description");
	});

	it("mirrors invalid from hasError, independent of the required/disabled inputs", () => {
		const field = createFieldState({ ...base, hasError: true });

		expect(field.invalid).toBe(true);
	});

	it("reports valid when the valid input says so and there is no error", () => {
		const field = createFieldState({ ...base, hasError: false, valid: true });

		expect(field.valid).toBe(true);
	});

	it("keeps valid false while hasError is true, even when the valid input says true", () => {
		// The context is the authority on "error wins", not something every
		// caller has to remember to AND together itself before passing `valid`
		// in — a FormField that (by a future bug) forwarded valid=true and
		// error text at the same time still can't produce a context that
		// claims both.
		const field = createFieldState({ ...base, hasError: true, valid: true });

		expect(field.valid).toBe(false);
		expect(field.invalid).toBe(true);
	});

	it("defaults valid to false", () => {
		const field = createFieldState({ ...base, hasError: false, valid: false });

		expect(field.valid).toBe(false);
	});

	it("passes labelId straight through when a label is rendered", () => {
		const field = createFieldState({ ...base, labelId: "c-label" });

		expect(field.labelId).toBe("c-label");
	});

	it("reports labelId as undefined when no label is rendered", () => {
		const field = createFieldState({ ...base, labelId: undefined });

		expect(field.labelId).toBeUndefined();
	});

	it("passes controlId, required and disabled straight through", () => {
		const field: FieldContext = createFieldState({
			...base,
			controlId: "field-42",
			descriptionId: "field-42-description",
			errorId: "field-42-error",
			required: true,
			disabled: true,
		});

		expect(field.controlId).toBe("field-42");
		expect(field.required).toBe(true);
		expect(field.disabled).toBe(true);
	});
});

describe("useField", () => {
	afterEach(cleanup);

	it("returns undefined with no FormField above it", () => {
		const { container } = render(<FieldHarness />);
		expect(consumer(container).dataset.hasField).toBe("false");
		expect(consumer(container).dataset.controlId).toBeUndefined();
	});

	it("returns the exact context a provider published", () => {
		const field = createFieldState({
			controlId: "email",
			labelId: "email-label",
			descriptionId: "email-description",
			errorId: "email-error",
			hasDescription: true,
			hasError: false,
			valid: false,
			required: true,
			disabled: false,
		});

		const { container } = render(<FieldHarness field={field} />);
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

/**
 * §9.4's hydration suite. `describedBy` is derived in the render path rather
 * than registered from an effect precisely so the server HTML's
 * `aria-describedby` is already correct; that claim is only worth anything if
 * a real `renderToString` → `hydrateRoot` round trip produces no mismatch.
 */
describe("field hydration", () => {
	/** A miniature FormField: derives the state in the render path and describes its control. */
	function Form({ children }: { children?: ReactNode }) {
		const field = createFieldState({
			controlId: "email",
			labelId: "email-label",
			descriptionId: "email-description",
			errorId: "email-error",
			hasDescription: true,
			hasError: true,
			valid: true,
			required: true,
			disabled: false,
		});

		return (
			<FieldProvider value={field}>
				<input
					id={field.controlId}
					aria-describedby={field.describedBy}
					aria-invalid={field.invalid}
					required={field.required}
					readOnly
				/>
				<p id="email-description">help</p>
				<p id="email-error">boom</p>
				{children}
			</FieldProvider>
		);
	}

	it("puts a correct aria-describedby in the server HTML and hydrates it with no mismatch", () => {
		const html = renderToString(
			<Form>
				<FieldConsumer />
			</Form>
		);

		expect(html).toContain('aria-describedby="email-description email-error"');
		expect(html).toContain('data-described-by="email-description email-error"');

		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(
				container,
				<Form>
					<FieldConsumer />
				</Form>
			);
		});

		const control = container.querySelector("input") as HTMLInputElement;
		expect(control.getAttribute("aria-describedby")).toBe("email-description email-error");
		expect(consumer(container).dataset.describedBy).toBe("email-description email-error");
		// "error wins" survives the round trip, on both sides of it.
		expect(consumer(container).dataset.valid).toBe("false");
		expect(consumer(container).dataset.invalid).toBe("true");
		expect(errors).not.toHaveBeenCalled();

		act(() => {
			root?.unmount();
		});
		container.remove();
		errors.mockRestore();
	});

	it("hydrates a consumer with no provider without a mismatch", () => {
		const html = renderToString(<FieldConsumer />);
		expect(html).toContain('data-has-field="false"');

		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(container, <FieldConsumer />);
		});

		expect(consumer(container).dataset.hasField).toBe("false");
		expect(errors).not.toHaveBeenCalled();

		act(() => {
			root?.unmount();
		});
		container.remove();
		errors.mockRestore();
	});
});
