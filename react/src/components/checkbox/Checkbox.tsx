import { forwardRef, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./checkbox.css";

export interface CheckboxProps {
	/**
	 * Whether the box is checked. Controlled when supplied: pair it with
	 * `onCheckedChange`, the React counterpart of the Svelte source's
	 * `bind:checked`. This is the real state underneath even while
	 * `indeterminate` is true — a click always resolves to this value,
	 * never to a third state.
	 */
	checked?: boolean;
	/** Initial checked state when uncontrolled (no `checked` prop given). */
	defaultChecked?: boolean;
	/**
	 * Mixed/dash visual state. A DOM property with no HTML attribute
	 * equivalent, so it is assigned straight to the element and reapplied
	 * whenever this prop changes, not only on mount. Any interaction that
	 * changes `checked` clears it back to `false` — a controlled caller
	 * that wants it to stay cleared simply stops re-passing `true`, which
	 * it learns to do from `onCheckedChange`.
	 */
	indeterminate?: boolean;
	/** Called with the new checked value whenever the box is activated. */
	onCheckedChange?: (checked: boolean) => void;
	/** Blocks interaction; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission. */
	name?: string;
	/** Form value submitted while checked. */
	value?: string;
	/**
	 * Accessible name, rendered as `aria-label`. Typically for a control
	 * with no visible `children` text; also applies alongside `children`
	 * that render no text of their own (e.g. an icon), since the two props
	 * aren't mutually exclusive and there is no way to detect from here
	 * whether an arbitrary node renders text. Skip this when `children`
	 * already supplies the visible label text — passing both means
	 * `aria-label` wins the accessible name and the visible text is
	 * announced by nothing.
	 */
	label?: string;
	/** Visible label text, rendered beside the box. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the wrapping `<label>`. */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A native `<input type="checkbox">` with a drawn tick, a real indeterminate
 * state and full FormField integration.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<input>`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
	(
		{
			checked: checkedProp,
			defaultChecked = false,
			indeterminate: indeterminateProp = false,
			onCheckedChange,
			disabled = false,
			required = false,
			invalid = false,
			id,
			name,
			value,
			label,
			children,
			className,
			sound = false,
		},
		forwardedRef
	) => {
		const isControlled = checkedProp !== undefined;
		const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
		const checked = isControlled ? checkedProp : uncontrolledChecked;

		// `indeterminate` mirrors the Svelte side's `$bindable`: the prop
		// seeds local state, a later prop CHANGE re-syncs it (the render-phase
		// adjustment below), and an interaction clears it locally regardless
		// of what the caller last passed.
		const [indeterminate, setIndeterminate] = useState(indeterminateProp);
		const prevIndeterminateProp = useRef(indeterminateProp);
		if (indeterminateProp !== prevIndeterminateProp.current) {
			prevIndeterminateProp.current = indeterminateProp;
			setIndeterminate(indeterminateProp);
		}

		// Undefined outside a FormField — every fallback below then uses this
		// component's own props instead of the context, so the control works
		// standalone exactly as it does wrapped.
		const field = useField();

		const effectiveId = field?.controlId ?? id;
		const effectiveDisabled = field?.disabled ?? disabled;
		const effectiveRequired = field?.required ?? required;
		const effectiveInvalid = field?.invalid ?? invalid;

		const playCue = useSoundCue(sound);

		// The node, not a bare ref: the effect below must re-run when the
		// element is (re)bound, which a state-published node gives for free
		// (convention C-1).
		const [input, inputRef] = useElementRef<HTMLInputElement>();
		const composedRef = useComposedRefs(forwardedRef, inputRef);

		// No HTML attribute reflects `indeterminate` — it exists only as a DOM
		// property — so it has to be assigned imperatively. Re-running on every
		// change (not just on mount) is what keeps a later prop update in
		// sync; keying on the node also covers the element being (re)bound.
		useEffect(() => {
			if (input) input.indeterminate = indeterminate;
		}, [input, indeterminate]);

		// The native `disabled` attribute already blocks real interaction, but
		// a synthetic event dispatched straight at the element — as a test
		// does — walks past that guard, so the handler repeats it. Reading the
		// DOM's own post-toggle `checked` (rather than computing `!checked`
		// ourselves) trusts the browser's native activation behaviour for a
		// checkbox, which already resolves an indeterminate box to a real
		// boolean on interaction; `indeterminate` is still cleared explicitly
		// below so the prop mirrors that outcome regardless of how faithfully
		// a given environment applies it.
		function handleChange(event: ChangeEvent<HTMLInputElement>) {
			if (effectiveDisabled) {
				// A disabled control must never let its visible state drift
				// from the app's own model. A real browser already refuses to
				// run the default toggle action on a disabled checkbox, but a
				// synthetic event dispatched straight at the element — as a
				// test does — can still mutate the DOM property directly, so
				// the handler puts it back rather than trusting the guard
				// above alone.
				event.currentTarget.checked = checked;
				return;
			}
			const next = event.currentTarget.checked;
			if (!isControlled) setUncontrolledChecked(next);
			setIndeterminate(false);
			playCue(next ? "toggle-on" : "toggle-off");
			onCheckedChange?.(next);
		}

		const wrapperClasses = cn(
			"ft-checkbox inline-flex items-center gap-[10px] text-[13px]",
			effectiveDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
			className
		);

		return (
			<label className={wrapperClasses}>
				{/*
					The mark is a SIBLING overlaid on the input, not a child of
					it: the control is a real `<input type="checkbox">`, and an
					`<input>` is a void element that cannot contain an SVG. This
					`<span>` is the only box the markup gains — the positioning
					context the overlay needs. Clicking the mark still toggles,
					both because it sits inside the `<label>` and because
					`pointer-events: none` hands the event straight to the input
					underneath.
				*/}
				<span className="ft-checkbox-box">
					<input
						ref={composedRef}
						type="checkbox"
						className="ft-checkbox-control border-input"
						id={effectiveId}
						name={name}
						value={value}
						checked={checked}
						disabled={effectiveDisabled}
						required={effectiveRequired}
						aria-checked={indeterminate ? "mixed" : checked}
						aria-invalid={effectiveInvalid ? "true" : undefined}
						aria-describedby={field?.describedBy}
						aria-label={label}
						data-invalid={effectiveInvalid ? "true" : undefined}
						onChange={handleChange}
					/>
					{/*
						`focusable="false"` alongside `aria-hidden`: older
						engines put SVG elements in the tab order on their own,
						and a decorative mark that can be tabbed to is a
						keyboard trap between the box and whatever follows it.
					*/}
					<svg
						className="ft-checkbox-mark"
						viewBox="0 0 18 18"
						aria-hidden="true"
						focusable="false"
					>
						<path
							className="ft-checkbox-mark-check"
							d="M4 9.2 7.2 12.4 14 5.6"
							pathLength={1}
							vectorEffect="non-scaling-stroke"
						/>
						<path
							className="ft-checkbox-mark-dash"
							d="M4.5 9h9"
							pathLength={1}
							vectorEffect="non-scaling-stroke"
						/>
					</svg>
				</span>
				{children}
			</label>
		);
	}
);

Checkbox.displayName = "Checkbox";
