import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import FormField from "./FormField.svelte";
import Harness from "./FormFieldHarness.test.svelte";
import PairHarness from "./FormFieldPairHarness.test.svelte";

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function label(container: HTMLElement): HTMLLabelElement | null {
	return container.querySelector("label");
}

function control(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function controls(container: HTMLElement): HTMLInputElement[] {
	return Array.from(container.querySelectorAll("input"));
}

function message(container: HTMLElement): HTMLElement | null {
	return container.querySelector("p");
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
		// $props.id() is unique-by-construction per instance, but that
		// guarantee is only worth anything if it actually holds across two
		// instances that exist on the same page at once — this is the direct
		// check, not an inference from reading the implementation.
		const { container } = render(PairHarness, { props: {} });
		const [first, second] = controls(container);

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

	it("binds the root element", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(FormField, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(root(container));
	});
});
