import { forwardRef, useState } from "react";
import type { ChangeEvent, HTMLInputAutoCompleteAttribute } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import "./input.css";

export interface InputProps {
	/**
	 * Current value. Controlled when supplied: pair it with `onValueChange`,
	 * the React counterpart of the Svelte source's `bind:value`.
	 */
	value?: string;
	/** Initial value when uncontrolled (no `value` prop given). */
	defaultValue?: string;
	/** Called with the new value on every input event. */
	onValueChange?: (value: string) => void;
	/** Native input type. */
	type?: "text" | "email" | "url" | "tel" | "password" | "search" | "number";
	/** Shown while the field is empty. */
	placeholder?: string;
	/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Blocks typing but stays focusable and is still submitted, unlike `disabled`. */
	readonly?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission. */
	name?: string;
	/** Native `autocomplete` hint — the real token set the DOM accepts, not a bare string. */
	autocomplete?: HTMLInputAutoCompleteAttribute;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * A styled native `<input>` with full FormField integration.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<input>`.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			value: valueProp,
			defaultValue = "",
			onValueChange,
			type = "text",
			placeholder,
			disabled = false,
			readonly = false,
			required = false,
			invalid = false,
			id,
			name,
			autocomplete,
			label,
			className,
		},
		ref
	) => {
		// The Svelte side's `value = $bindable("")` becomes the standard
		// controlled/uncontrolled split: uncontrolled by default, controlled
		// the moment a `value` prop is passed.
		const isControlled = valueProp !== undefined;
		const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
		const value = isControlled ? valueProp : uncontrolledValue;

		// Undefined outside a FormField — every fallback below then uses this
		// component's own props instead of the context, so the control works
		// standalone exactly as it does wrapped.
		const field = useField();

		const effectiveId = field?.controlId ?? id;
		const effectiveDisabled = field?.disabled ?? disabled;
		const effectiveRequired = field?.required ?? required;
		const effectiveInvalid = field?.invalid ?? invalid;

		const classes = cn(
			"ft-input w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		);

		// The single place `value` changes. A native `disabled` input never fires
		// `input` from real typing, but a synthetic dispatch walks straight past
		// that guard the same way a synthetic click does on a button — so the
		// early return is repeated here rather than trusted to the attribute
		// alone. Putting the DOM's value back keeps a disabled control's visible
		// text from drifting away from the app's own model.
		function handleInput(event: ChangeEvent<HTMLInputElement>) {
			if (effectiveDisabled) {
				event.currentTarget.value = value;
				return;
			}
			const next = event.currentTarget.value;
			if (!isControlled) setUncontrolledValue(next);
			onValueChange?.(next);
		}

		return (
			<input
				ref={ref}
				type={type}
				placeholder={placeholder}
				name={name}
				autoComplete={autocomplete}
				id={effectiveId}
				value={value}
				disabled={effectiveDisabled}
				readOnly={readonly}
				required={effectiveRequired}
				aria-invalid={effectiveInvalid ? "true" : undefined}
				aria-describedby={field?.describedBy}
				aria-label={label}
				className={classes}
				onChange={handleInput}
			/>
		);
	}
);

Input.displayName = "Input";
