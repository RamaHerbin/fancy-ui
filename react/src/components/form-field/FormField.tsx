import { forwardRef, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { FieldProvider, createFieldState } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { runTransition } from "../../internals/motion/animate.js";
import type { TransitionRun } from "../../internals/motion/animate.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { Label } from "../label/index.js";
import "./form-field.css";

/**
 * FormField wraps a single control with a label, help/error text and the id
 * plumbing the field context publishes — see `internals/field.ts` for the
 * FieldContext contract every control in this wave reads through
 * `useField()`.
 */
export interface FormFieldProps {
	/**
	 * Label text — the common case. For label content beyond plain text,
	 * render a `Label` yourself as part of `children` instead: it resolves
	 * `htmlFor` and `required` from this same FormField's context on its own,
	 * so there is nothing extra to wire.
	 */
	label?: string;
	/** Help text under the control, replaced by `error` while the field is invalid. */
	description?: string;
	/** Error text. Setting it marks the field invalid and replaces the help text. */
	error?: string;
	/**
	 * Marks the field as passing validation — a decorative checkmark next to
	 * the help text, plus `valid` on the field context for a control to draw
	 * its own success look. `error` always wins if both are set. See the
	 * README for why this stays decorative rather than growing its own
	 * message the way `error` does.
	 */
	valid?: boolean;
	/** Marks the field required: the label gets an asterisk and the control gets `aria-required`. */
	required?: boolean;
	/** Disables the field: reaches the wrapped control through context. */
	disabled?: boolean;
	/** Opts out of the generated id. */
	id?: string;
	/** The control. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

// Both message paragraphs and the valid glyph arrive the same way: a small
// grow-and-fade, so a message that appears under a field the user is typing
// in reads as "this just changed" instead of as a layout jolt.
//
// An ENTRANCE only, never a two-way transition. The error and the
// description are the two branches of ONE conditional, and each carries the
// id that `aria-describedby` points at — an exit would leave a paragraph on
// screen for 150ms after the control had already stopped describing it,
// which is an accessibility hazard rather than a nicety. Entering only, the
// outgoing branch is gone in the same commit the incoming one lands, so the
// id wiring and the pixels never disagree. That is also why this component
// runs `runTransition` by hand instead of reaching for `usePresence`: there
// is no exit leg to own, and nothing here may ever delay an unmount.
//
// Module scope, not per instance: `preset()` is a pure factory returning a
// pure function, so one instance serves every field.
const pop = preset("scale");

/** Which message paragraph, if any, is currently rendered. */
type MessageBranch = "error" | "description" | null;

/**
 * A single form control's label, help/error text and id plumbing.
 *
 * The root element arrives through the ref channel, per PORTING.md — the
 * Svelte source declares `ref = $bindable(null)`. Rest props are not spread:
 * the Svelte source takes no rest props either.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
	{
		label,
		description,
		error,
		valid = false,
		required = false,
		disabled = false,
		id,
		children,
		className,
	},
	ref
) {
	// A single per-instance seed, suffixed for the control and both message
	// ids — a page with ten fields has no collisions, from a single generator
	// call. `useFancyId()` (React's `useId()`) is the counterpart of the
	// Svelte side's `$props.id()`: one seed, N collision-free suffixes across
	// a page, identical in the server HTML and in the hydration render.
	// `uid()` is deliberately NOT used — it throws outside the browser by
	// design, and a FormField that only renders once JS has hydrated is not
	// on the table for a form primitive.
	//
	// `base` is that seed, or the caller's own `id` when given — either way,
	// every id this field hands out is a suffix of the same value, so a
	// caller who supplies `id="email"` can predict `email-description` and
	// `email-error` too. That matters beyond tidiness: a control that isn't
	// context-aware still has a documented, stable way to wire itself up by
	// hand.
	const uid = useFancyId();
	const base = id ?? uid;
	const controlId = id ?? `${uid}-control`;
	const descriptionId = `${base}-description`;
	const errorId = `${base}-error`;
	// Undefined, not a generated id with nothing pointing at it, while no
	// label is rendered — labelId exists specifically so a control's
	// aria-labelledby never targets an id with no element behind it, the same
	// rule describedBy already follows for help/error.
	const labelId = label ? `${base}-label` : undefined;

	const hasError = !!error;
	// Error replaces help text rather than stacking under it — the mockup
	// never shows both at once, and stale help sitting under a live error
	// would just be noise competing with the message that actually matters.
	const hasDescription = !hasError && !!description;
	// `createFieldState` itself also enforces "error wins" on `field.valid` —
	// this local copy only needs to gate FormField's own decorative glyph
	// below, but is derived the same way so the two never disagree.
	const showValid = valid && !hasError;

	// A field-by-field dependency array, never the options object, so the
	// published identity is stable across unrelated parent re-renders and
	// changes exactly when a consumer must re-render.
	const field = useMemo(
		() =>
			createFieldState({
				controlId,
				labelId,
				descriptionId,
				errorId,
				hasDescription,
				hasError,
				valid,
				required,
				disabled,
			}),
		[
			controlId,
			labelId,
			descriptionId,
			errorId,
			hasDescription,
			hasError,
			valid,
			required,
			disabled,
		]
	);

	const branch: MessageBranch = hasError ? "error" : hasDescription ? "description" : null;

	const messageRef = useRef<HTMLParagraphElement | null>(null);
	const glyphRef = useRef<HTMLSpanElement | null>(null);
	const firstPassRef = useRef(true);
	const previousBranchRef = useRef<MessageBranch>(null);
	// The glyph leg is gated on `showValid` FLIPPING, not on it being true, so
	// a second run of this effect over the same DOM — which is exactly what a
	// StrictMode mount rehearsal is — cannot pop a checkmark on a field that
	// merely rendered already-valid.
	const previousValidRef = useRef(false);

	// A layout effect, per the effect-phase policy: intros start pre-paint,
	// and a passive effect would paint one frame at rest first.
	//
	// `prefersReducedMotion()` is called here, at the instant the leg starts,
	// rather than kept as state: the preference is read then, never at
	// construction and never during SSR. `duration: 0` makes `runTransition`
	// finish synchronously and never touch `element.animate()`.
	useIsomorphicLayoutEffect(() => {
		const first = firstPassRef.current;
		firstPassRef.current = false;
		const previousBranch = previousBranchRef.current;
		previousBranchRef.current = branch;
		const previousValid = previousValidRef.current;
		previousValidRef.current = showValid;

		// A field that renders with its message already present gets no
		// entrance: a local intro never plays on the first run of the block
		// that owns it, and only a real change should perform.
		if (first) return;

		// The handle is kept and aborted on finish, which drops the
		// `fill: forwards` the run leaves behind so the element falls back to
		// its resting style — the visible end state by construction. The same
		// handle is aborted from the cleanup, so a leg still in flight when the
		// branch swaps (or the field unmounts) does not keep running on a
		// paragraph that has left the DOM. On the reduced-motion duration-0
		// path `onFinish` fires before the assignment, and `run` is still
		// unset: aborting nothing is the right no-op there.
		let run: TransitionRun | undefined;

		if (branch !== null && branch !== previousBranch) {
			const el = messageRef.current;
			if (el) {
				run = runTransition(
					el,
					pop(el, { duration: prefersReducedMotion() ? 0 : DURATIONS.fast }, {
						direction: "in",
					}),
					1,
					undefined,
					() => run?.abort()
				);
			}
			// The glyph's own conditional is created in the same pass as the
			// paragraph that owns it, so it skips a local intro here — which
			// is exactly right for a field that renders already-valid.
			return () => run?.abort();
		}

		// A glyph-scale beat, not a message-scale one: it is one character
		// wide, so it gets `micro` (80ms) rather than the paragraph's 150ms.
		// It only animates when `valid` FLIPS while the help text is ALREADY
		// on screen — the flip, not the current value, so re-running this
		// effect over unchanged props is silent.
		if (
			branch === "description" &&
			previousBranch === "description" &&
			showValid &&
			!previousValid
		) {
			const el = glyphRef.current;
			if (el) {
				run = runTransition(
					el,
					pop(el, { duration: prefersReducedMotion() ? 0 : DURATIONS.micro }, {
						direction: "in",
					}),
					1,
					undefined,
					() => run?.abort()
				);
			}
		}

		return () => run?.abort();
	}, [branch, showValid]);

	return (
		<FieldProvider value={field}>
			<div ref={ref} className={cn("ft-form-field flex flex-col gap-1.5", className)}>
				{label ? (
					// No htmlFor/required passed explicitly: Label reads both
					// straight off this same context, which is the entire point of
					// publishing it.
					<Label>{label}</Label>
				) : null}

				{children}

				{/* Keyed on the branch so a swap replaces the paragraph rather
				    than mutating one in place — the outgoing message and its id
				    leave together, in the same commit the incoming one lands. */}
				{branch === "error" ? (
					<p
						key="error"
						ref={messageRef}
						id={errorId}
						// An error that appears while focus is already inside the
						// control is a change to described-by content, which a
						// screen reader is not required to re-announce — the user
						// would see the field turn invalid and hear nothing. The
						// branch is keyed, so a new message is a fresh mount and
						// `role="alert"` announces it without extra bookkeeping.
						// The description paragraph stays silent: it is read on
						// focus, and announcing help text as it arrives would talk
						// over the user.
						role="alert"
						className="ft-form-field-message text-destructive flex items-center gap-1.5 text-[12px]"
					>
						<span aria-hidden="true">✕</span> {error}
					</p>
				) : branch === "description" ? (
					<p
						key="description"
						ref={messageRef}
						id={descriptionId}
						className="ft-form-field-message text-muted-foreground flex items-center gap-1.5 text-[12px]"
					>
						{showValid ? (
							// Decorative reinforcement of the help text next to it,
							// not a replacement for it — see the README for why this
							// doesn't grow its own message the way the error state
							// does.
							<span aria-hidden="true" className="ft-form-field-valid-glyph" ref={glyphRef}>
								✓
							</span>
						) : null}{" "}
						{description}
					</p>
				) : null}
			</div>
		</FieldProvider>
	);
});
