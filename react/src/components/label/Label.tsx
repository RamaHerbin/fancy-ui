import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";

export interface LabelProps {
	/** Explicit target id. Inside a FormField the field's own control id wins — see the README. */
	htmlFor?: string;
	/** Renders the required asterisk. Inside a FormField the field's own `required` wins. */
	required?: boolean;
	/** The label text/content. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * A form label that defers to a surrounding `FormField` for its wiring.
 *
 * The root element arrives through the ref channel, per PORTING.md — the
 * Svelte source declares `ref = $bindable(null)`.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
	{ htmlFor, required = false, children, className },
	ref
) {
	// A surrounding FormField exists specifically so a caller never wires
	// `htmlFor` by hand, so it is the authority over both of these whenever
	// one is present — the same precedence every control in this wave follows
	// for its own id/required/disabled. Standalone, with no FormField above,
	// the plain props are all there is.
	const field = useField();
	const resolvedFor = field?.controlId ?? htmlFor;
	const resolvedRequired = field?.required ?? required;
	// Not a prop — `field.labelId` only exists to be carried on *this*
	// element, so a control whose root isn't labelable (a `<div
	// role="radiogroup">`, say) has an id to point its own `aria-labelledby`
	// at. `undefined` outside a FormField: nothing needs to reach a
	// standalone Label that way, `htmlFor` already does the job wherever it
	// applies.
	const labelId = field?.labelId;

	return (
		<label
			ref={ref}
			id={labelId}
			htmlFor={resolvedFor}
			className={cn("ft-label text-[13px] font-medium", className)}
		>
			{children}{" "}
			{resolvedRequired ? (
				<span aria-hidden="true" className="text-destructive">
					*
				</span>
			) : null}
		</label>
	);
});
