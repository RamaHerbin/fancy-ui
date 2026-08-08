import type { Snippet } from "svelte";

/**
 * FormField wraps a single control with a label, help/error text and the id
 * plumbing the field.svelte.ts context publishes — see that module for the
 * FieldContext contract every control in this wave reads through
 * `getField()`.
 */
export interface FormFieldProps {
	/**
	 * Label text — the common case. For label content beyond plain text,
	 * render a `Label` yourself as part of `children` instead: it resolves
	 * `for` and `required` from this same FormField's context on its own, so
	 * there is nothing extra to wire.
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
	children?: Snippet;
	/** Additional CSS classes */
	class?: string;
	/** Element reference */
	ref?: HTMLDivElement | null;
}
