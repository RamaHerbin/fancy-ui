// @vitest-environment node
/**
 * Server-side safety net for the field contract.
 *
 * Runs in the `node` environment, so there is no `window` and no `document`.
 * This is the module the whole "derive `describedBy`, never register it"
 * argument was written for: the server render must already carry a correct
 * `aria-describedby`, and a control with no FormField above it must degrade
 * to `undefined` there exactly as it does in the browser.
 *
 * The import is dynamic and preceded by `vi.resetModules()` so the module is
 * evaluated *inside* the test run, with the node globals in place; a static
 * import would be hoisted and evaluated before any assertion could observe it.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

let mod: typeof import("./field.js");
let importError: unknown = null;

beforeAll(async () => {
	vi.resetModules();
	try {
		mod = await import("./field.js");
	} catch (error) {
		importError = error;
	}
});

describe("field on the server", () => {
	it("runs with no browser globals in scope", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
	});

	it("imports without touching a browser global", () => {
		expect(importError).toBeNull();
		expect(typeof mod.createFieldState).toBe("function");
		expect(typeof mod.FieldProvider).toBe("function");
		expect(typeof mod.useField).toBe("function");
	});

	it("builds a full context, describedBy included, with no DOM in sight", () => {
		const field = mod.createFieldState({
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

		expect(field.describedBy).toBe("email-description email-error");
		expect(field.invalid).toBe(true);
		expect(field.valid).toBe(false);
	});

	it("puts the described-by ids in the server HTML, in the same pass that renders the paragraphs", () => {
		function Control() {
			const field = mod.useField();
			return createElement("input", {
				id: field?.controlId,
				"aria-describedby": field?.describedBy,
				"aria-invalid": field?.invalid,
			});
		}

		function Form() {
			const field = mod.createFieldState({
				controlId: "email",
				labelId: undefined,
				descriptionId: "email-description",
				errorId: "email-error",
				hasDescription: true,
				hasError: false,
				valid: false,
				required: false,
				disabled: false,
			});

			return createElement(
				mod.FieldProvider,
				{ value: field },
				createElement(Control),
				createElement("p", { id: "email-description" }, "help")
			);
		}

		const html = renderToString(createElement(Form));

		expect(html).toContain('aria-describedby="email-description"');
		expect(html).toContain('id="email-description"');
	});

	it("degrades to undefined on the server with no provider above the control", () => {
		function Control() {
			const field = mod.useField();
			return createElement("input", { "data-has-field": field !== undefined });
		}

		const html = renderToString(createElement(Control));

		expect(html).toContain('data-has-field="false"');
		expect(html).not.toContain("aria-describedby");
	});
});
