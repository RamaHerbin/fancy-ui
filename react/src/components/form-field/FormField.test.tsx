import { render, cleanup } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { FormField } from "./FormField.js";
import type { FormFieldProps } from "./FormField.js";
import { useField } from "../../internals/field.js";
import { FakeAnimation } from "../../test-setup.js";

/**
 * The animation stub finishes on a MICROTASK, and `runTransition` chains a
 * leading dummy animation into the real one, so one turn of the queue advances
 * a leg by exactly one step: after the first the dummy has finished and the
 * main animation exists, after the second the main animation has finished and
 * `onFinish` has run. Kept as an explicit step rather than `vi.waitFor`, which
 * would drain both and make the mid-flight assertions unreachable.
 */
const nextLeg = () => Promise.resolve();

/** Every animation the stub recorded for `el`, in creation order. */
function animationsOn(el: Element): FakeAnimation[] {
	return FakeAnimation.instances.filter((animation) => animation.target === el);
}

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

/**
 * Test-only rig standing in for a real control from this wave (Input,
 * Select, ...). It reads `useField()` exactly the way a real control is
 * expected to: context wins over its own id/required/disabled whenever a
 * FormField is present. Rendering this inside FormField's `children` proves
 * the wiring end-to-end without depending on a sibling component.
 */
function FormFieldControl({
	id,
	required = false,
	disabled = false,
}: {
	id?: string;
	required?: boolean;
	disabled?: boolean;
}) {
	const field = useField();
	const resolvedId = field?.controlId ?? id;
	const resolvedRequired = field?.required ?? required;
	const resolvedDisabled = field?.disabled ?? disabled;

	return (
		<input
			type="text"
			id={resolvedId}
			required={resolvedRequired}
			disabled={resolvedDisabled}
			aria-invalid={field?.invalid ? "true" : undefined}
			aria-describedby={field?.describedBy}
			data-valid={field?.valid}
			data-label-id={field?.labelId}
		/>
	);
}

/**
 * Test-only rig: a real FormField wrapping the FormFieldControl stand-in, so
 * the compound's tests can exercise the actual context propagation — id,
 * aria-describedby, aria-invalid, required, disabled all reaching a real
 * child component through real context, not a hand-built object.
 */
function Harness(
	props: Pick<
		FormFieldProps,
		"label" | "description" | "error" | "valid" | "required" | "disabled" | "id"
	>
) {
	return (
		<FormField {...props}>
			<FormFieldControl />
		</FormField>
	);
}

/**
 * Test-only rig: two independent FormFields, neither given an explicit `id`,
 * mounted together in the same render — the only way to prove their
 * generated controlIds don't collide, since the per-instance guarantee is
 * only meaningful across instances that actually coexist.
 */
function PairHarness() {
	return (
		<>
			<FormField label="First">
				<FormFieldControl />
			</FormField>
			<FormField label="Second">
				<FormFieldControl />
			</FormField>
		</>
	);
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
		const { container } = render(<Harness />);
		expect(label(container)).toBeNull();
	});

	it("renders the label text and marks it required, without being told the control's id directly", () => {
		const { container } = render(<Harness label="Username" required />);
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
		const { container } = render(<Harness label="Username" />);
		const l = label(container);

		expect(l).not.toBeNull();
		expect(l?.id).toBeTruthy();
		expect(control(container).dataset.labelId).toBe(l?.id);
	});

	it("reports labelId as undefined, and the control gets no aria-labelledby, when no label is rendered", () => {
		const { container } = render(<Harness />);
		expect(label(container)).toBeNull();
		expect(control(container).dataset.labelId).toBeUndefined();
	});

	it("gives the control the context's controlId, ignoring the control's own id prop", () => {
		const { container } = render(<Harness />);
		expect(control(container).id).toMatch(/-control$/);
	});

	it("uses the id prop as the control id when given, instead of generating one", () => {
		const { container } = render(<Harness id="username" />);
		expect(control(container).id).toBe("username");
	});

	it("gives two co-mounted FormFields with no explicit id different, non-colliding control ids", () => {
		// The generated seed is unique-by-construction per instance, but that
		// guarantee is only worth anything if it actually holds across two
		// instances that exist on the same page at once — this is the direct
		// check, not an inference from reading the implementation.
		const { container } = render(<PairHarness />);
		const [first, second] = controls(container);

		expect(first?.id).toBeTruthy();
		expect(second?.id).toBeTruthy();
		expect(first?.id).not.toBe(second?.id);
	});

	it("suffixes the message id off the same explicit id, so it is predictable for a caller", () => {
		// A control that is not context-aware still needs a stable way to wire
		// itself up by hand — this is what makes `id="username"` predict
		// `username-error` without reading anything back off the component.
		const { container } = render(<Harness id="username" error="Too short." />);
		expect(message(container)?.id).toBe("username-error");
	});

	it("renders no message and no aria-describedby when neither description nor error is set", () => {
		const { container } = render(<Harness />);
		expect(message(container)).toBeNull();
		expect(control(container).hasAttribute("aria-describedby")).toBe(false);
	});

	it("shows help text and points aria-describedby at it when only description is set", () => {
		const { container } = render(<Harness description="Never shown publicly." />);
		const p = message(container);

		expect(p?.textContent?.trim()).toBe("Never shown publicly.");
		expect(p?.id).toBeTruthy();
		expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);
		expect(control(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("shows the error text with a decorative, aria-hidden glyph and points aria-describedby at it", () => {
		const { container } = render(<Harness error="Minimum 3 characters." />);
		const p = message(container);

		expect(p?.textContent?.trim()).toBe("✕ Minimum 3 characters.");
		expect(p?.querySelector('[aria-hidden="true"]')).not.toBeNull();
		expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);
		expect(control(container).getAttribute("aria-invalid")).toBe("true");
		// An error arriving while focus is already inside the control is a
		// change to described-by content, which is not reliably re-announced —
		// the live region is what makes it audible at the moment it appears.
		expect(p?.getAttribute("role")).toBe("alert");
	});

	it("leaves the help text out of the live region — only the error announces itself", () => {
		const { container } = render(<Harness description="Never shown publicly." />);
		expect(message(container)?.hasAttribute("role")).toBe(false);
	});

	it("lets the error replace the help text rather than stacking under it", () => {
		const { container } = render(
			<Harness description="Never shown publicly." error="Minimum 3 characters." />
		);

		expect(container.querySelectorAll("p")).toHaveLength(1);
		expect(message(container)?.textContent?.trim()).toBe("✕ Minimum 3 characters.");
		// Only the error id is in the description list — the help paragraph
		// isn't in the DOM at all while an error is showing.
		expect(control(container).getAttribute("aria-describedby")).toBe(message(container)?.id);
	});

	it("restores the help text, moves aria-describedby onto it, and drops aria-invalid once the error clears", () => {
		const { container, rerender } = render(
			<Harness description="Never shown publicly." error="Minimum 3 characters." />
		);
		const errorId = message(container)?.id;

		rerender(<Harness description="Never shown publicly." />);

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

	it("removes aria-describedby entirely once the help text it pointed at is cleared", () => {
		const { container, rerender } = render(<Harness description="Never shown publicly." />);
		expect(control(container).getAttribute("aria-describedby")).toBe(message(container)?.id);

		rerender(<Harness />);

		expect(message(container)).toBeNull();
		expect(control(container).hasAttribute("aria-describedby")).toBe(false);
	});

	it("does nothing visible for valid without a description to decorate", () => {
		// A lone checkmark with no text next to it is exactly the
		// meaningless-glyph problem this prop exists to avoid — so with no
		// description, `valid` is a no-op rather than growing a message of
		// its own. The context still reports it, for a control that wants to
		// draw its own success look independent of the message paragraph.
		const { container } = render(<Harness valid />);
		expect(message(container)).toBeNull();
		expect(control(container).dataset.valid).toBe("true");
	});

	it("decorates the help text with an aria-hidden checkmark when valid", () => {
		const { container } = render(<Harness description="Used for sign-in." valid />);
		const p = message(container);
		const glyph = p?.querySelector('[aria-hidden="true"]');

		expect(p?.textContent?.trim()).toBe("✓ Used for sign-in.");
		expect(glyph).not.toBeNull();
		expect(glyph?.textContent).toBe("✓");
		expect(control(container).dataset.valid).toBe("true");
	});

	it("shows no checkmark when valid is left false", () => {
		const { container } = render(<Harness description="Used for sign-in." />);
		expect(message(container)?.querySelector('[aria-hidden="true"]')).toBeNull();
	});

	it("lets error win over valid when both are somehow set, in the DOM and in context", () => {
		const { container } = render(
			<Harness description="Used for sign-in." error="Not a valid address." valid />
		);
		const p = message(container);

		expect(p?.textContent?.trim()).toBe("✕ Not a valid address.");
		expect(p?.querySelector('[aria-hidden="true"]')?.textContent).toBe("✕");
		expect(control(container).getAttribute("aria-invalid")).toBe("true");
		expect(control(container).dataset.valid).toBe("false");
	});

	it("passes required through context, overriding the control's own required=false", () => {
		const { container } = render(<Harness required />);
		expect(control(container).required).toBe(true);
	});

	it("passes disabled through context, overriding the control's own disabled=false", () => {
		const { container } = render(<Harness disabled />);
		expect(control(container).disabled).toBe(true);
	});

	it("leaves the control enabled and optional by default", () => {
		const { container } = render(<Harness />);
		expect(control(container).required).toBe(false);
		expect(control(container).disabled).toBe(false);
	});

	it("merges the class prop onto the root", () => {
		const { container } = render(<FormField className="mt-4" />);
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
				const { container, rerender } = render(<Harness />);
				expect(message(container)).toBeNull();

				rerender(<Harness error="Minimum 3 characters." />);

				await vi.waitFor(() => {
					expect(message(container)).not.toBeNull();
				});
				expect(animateSpy).toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("swaps error for description with no overlap: exactly one paragraph, and aria-describedby lands on it in the same tick", () => {
			// The reason both branches animate in and neither animates out.
			// An exit here would leave the error paragraph on screen carrying
			// `errorId` while the control had already moved `aria-describedby`
			// onto the description — a message a screen reader is no longer
			// pointed at, still visible. This is the assertion that would go red
			// if someone "improved" it into a cross-fade.
			stubReducedMotion(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container, rerender } = render(
					<Harness description="Never shown publicly." error="Minimum 3 characters." />
				);

				rerender(<Harness description="Never shown publicly." />);

				expect(container.querySelectorAll("p")).toHaveLength(1);
				const p = message(container);
				expect(p?.textContent?.trim()).toBe("Never shown publicly.");
				expect(control(container).getAttribute("aria-describedby")).toBe(p?.id);

				// The description pops on the swap exactly as the error does.
				// Pinned on the paragraph itself rather than on the spy in
				// general, so the assertion cannot be satisfied by some other
				// element animating: `mock.contexts` holds the `this` of each
				// call — the element `animate()` ran on — and the entrance is
				// started on this `<p>` directly.
				expect(animateSpy).toHaveBeenCalled();
				expect(animateSpy.mock.contexts).toContain(p);
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("with prefers-reduced-motion: reduce, messages and the valid glyph still arrive — they just never animate", () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container, rerender } = render(<Harness />);

				rerender(<Harness description="Used for sign-in." />);
				expect(message(container)?.textContent?.trim()).toBe("Used for sign-in.");

				// The glyph is the `micro` (80ms) beat rather than the paragraph's
				// 150ms one, and it only ever animates when `valid` flips while
				// the help text is already mounted — which is exactly what this
				// second rerender does.
				rerender(<Harness description="Used for sign-in." valid />);
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
				// Rendered already-valid: the glyph's own conditional is created
				// in the same pass as the paragraph that owns it, so it skips a
				// local intro. A field that loads in a valid state should not
				// perform on arrival.
				const { container, rerender } = render(
					<Harness description="Used for sign-in." valid />
				);
				expect(container.querySelector(".ft-form-field-valid-glyph")).not.toBeNull();
				expect(animateSpy).not.toHaveBeenCalled();

				// Flipping `valid` off and back on, with the paragraph mounted
				// throughout, is the real event — and that one does animate.
				rerender(<Harness description="Used for sign-in." valid={false} />);
				rerender(<Harness description="Used for sign-in." valid />);

				await vi.waitFor(() => {
					expect(container.querySelector(".ft-form-field-valid-glyph")).not.toBeNull();
				});
				expect(animateSpy).toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("under StrictMode, a field mounted already-valid still does not pop its checkmark", async () => {
			// StrictMode replays the mount layout effect (run → cleanup → run)
			// with the same props. The entrance is gated on `valid` actually
			// flipping while the help text is on screen, so the rehearsal is a
			// no-op — a dev-only double invoke may not make a field perform on
			// arrival.
			stubReducedMotion(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container, rerender } = render(
					<StrictMode>
						<Harness description="Used for sign-in." valid />
					</StrictMode>
				);
				expect(container.querySelector(".ft-form-field-valid-glyph")).not.toBeNull();
				expect(animateSpy).not.toHaveBeenCalled();

				// And the real flip still animates inside StrictMode: the guard
				// silences the rehearsal, not the event.
				rerender(
					<StrictMode>
						<Harness description="Used for sign-in." valid={false} />
					</StrictMode>
				);
				rerender(
					<StrictMode>
						<Harness description="Used for sign-in." valid />
					</StrictMode>
				);

				await vi.waitFor(() => {
					expect(container.querySelector(".ft-form-field-valid-glyph")).not.toBeNull();
				});
				expect(animateSpy).toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("aborts the entrance when it finishes, so no fill: forwards is left on the paragraph", async () => {
			// `runTransition` ends every leg with `fill: "forwards"`, which would
			// otherwise pin `opacity: 1; transform: scale(1)` on the message for
			// good — a permanent containing block, and an animation-level
			// override of any consumer rule on `.ft-form-field-message`. Only
			// aborting the handle drops it.
			stubReducedMotion(false);

			const { container, rerender } = render(<Harness />);
			rerender(<Harness error="Minimum 3 characters." />);

			const p = message(container) as HTMLElement;
			expect(animationsOn(p)).toHaveLength(1); // the leading dummy

			await nextLeg();
			const main = animationsOn(p)[1] as FakeAnimation;
			// `abort()` nulls the effect; seeding it proves the null came from
			// the abort rather than from the stub's own initial value.
			main.effect = { pending: true };

			await nextLeg();
			expect(main.effect).toBeNull();
		});

		it("aborts a leg still in flight when the field unmounts", async () => {
			// A message swapped out — or a whole field torn down — inside the
			// 150ms window must not leave a run animating a detached node.
			stubReducedMotion(false);

			const { container, rerender, unmount } = render(<Harness />);
			rerender(<Harness error="Minimum 3 characters." />);

			const p = message(container) as HTMLElement;
			expect(animationsOn(p)).toHaveLength(1);

			unmount();
			await nextLeg();
			await nextLeg();

			// Aborted during the dummy's leg, so the main animation never came
			// into existence at all.
			expect(animationsOn(p)).toHaveLength(1);
		});
	});

	it("binds the root element", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(<FormField ref={ref} />);
		expect(ref.current).toBe(root(container));
	});
});
