import { forwardRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./switch.css";

export type SwitchSize = "sm" | "md" | "lg";

export interface SwitchProps {
	/**
	 * Whether the switch is on. Controlled when supplied: pair it with
	 * `onCheckedChange`, the React counterpart of the Svelte source's
	 * `bind:checked`.
	 */
	checked?: boolean;
	/** Initial on/off state when uncontrolled (no `checked` prop given). */
	defaultChecked?: boolean;
	/** Called with the new value whenever the switch is activated. */
	onCheckedChange?: (checked: boolean) => void;
	/** Blocks interaction; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission. */
	name?: string;
	/** Form value submitted while on. */
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
	/** Visible label text, rendered beside the track. */
	children?: ReactNode;
	/** Track/knob size. */
	size?: SwitchSize;
	/** Additional CSS classes, merged onto the wrapping `<label>`. */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A native `<input type="checkbox">` with `role="switch"` — the input IS the
 * track, restyled rather than replaced, with the knob drawn as a pseudo-element
 * so the input stays the only focusable, checkable thing.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<input>`.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
	(
		{
			checked: checkedProp,
			defaultChecked = false,
			onCheckedChange,
			disabled = false,
			required = false,
			id,
			name,
			value,
			label,
			children,
			size = "md",
			className,
			sound = false,
		},
		forwardedRef
	) => {
		const isControlled = checkedProp !== undefined;
		const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
		const checked = isControlled ? checkedProp : uncontrolledChecked;

		// Undefined outside a FormField — every fallback below then uses this
		// component's own props instead of the context, so the control works
		// standalone exactly as it does wrapped. Switch has no own `invalid`
		// prop (a switch takes effect immediately; there is usually nothing to
		// validate), but it still surfaces aria-invalid when a surrounding
		// FormField says the field is invalid.
		const field = useField();

		const effectiveId = field?.controlId ?? id;
		const effectiveDisabled = field?.disabled ?? disabled;
		const effectiveRequired = field?.required ?? required;
		const effectiveInvalid = field?.invalid ?? false;

		const playCue = useSoundCue(sound);

		// The native `disabled` attribute already blocks real interaction, but
		// a synthetic event dispatched straight at the element — as a test
		// does — walks past that guard, so the handler repeats it.
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
			playCue(next ? "toggle-on" : "toggle-off");
			onCheckedChange?.(next);
		}

		const wrapperClasses = cn(
			"ft-switch-wrap inline-flex items-center gap-[10px] text-[13px]",
			effectiveDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
			className
		);

		return (
			<label className={wrapperClasses}>
				<input
					ref={forwardedRef}
					type="checkbox"
					role="switch"
					data-size={size}
					className="ft-switch"
					id={effectiveId}
					name={name}
					value={value}
					checked={checked}
					disabled={effectiveDisabled}
					required={effectiveRequired}
					aria-checked={checked}
					aria-invalid={effectiveInvalid ? "true" : undefined}
					aria-describedby={field?.describedBy}
					aria-label={label}
					onChange={handleChange}
				/>
				{children}
			</label>
		);
	}
);

Switch.displayName = "Switch";
