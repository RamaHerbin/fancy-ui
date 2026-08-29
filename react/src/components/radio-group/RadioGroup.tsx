import { forwardRef, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { RADIO_GROUP_KEY } from "./types.js";
import type { RadioGroupContext } from "./types.js";

export type RadioGroupOrientation = "horizontal" | "vertical";

export interface RadioGroupProps {
	/**
	 * The selected value. `""` means nothing is selected. Controlled when
	 * supplied: pair it with `onValueChange`, the React counterpart of the
	 * Svelte source's `bind:value`. Left out, the group keeps the selection
	 * itself and starts at `""`.
	 */
	value?: string;
	/** Called with the new value whenever the selection changes. */
	onValueChange?: (value: string) => void;
	/**
	 * The `name` shared by every item's native radio input. Generated when
	 * omitted — see the README — so two groups on the same page never fight
	 * over each other's selection.
	 */
	name?: string;
	/** Disables every item in the group. */
	disabled?: boolean;
	/** Marks the group required for native form validation. */
	required?: boolean;
	/** Marks the group invalid — sets `aria-invalid` on the group. */
	invalid?: boolean;
	/** The list's stacking axis. */
	orientation?: RadioGroupOrientation;
	/**
	 * Accessible name for the group, standalone. Inside a `FormField` that
	 * rendered its own label, `field.labelId` wins instead — see the
	 * README — since this root is a `<div role="radiogroup">`, not
	 * something `<label for>` can target; only a FormField with no
	 * `label` of its own falls back to this prop.
	 */
	label?: string;
	/** The `RadioGroupItem`s. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A set of `RadioGroupItem`s sharing one selection and one native radio
 * `name`.
 *
 * The root element arrives through the ref channel rather than a `ref`
 * prop, per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`, so the port carries no wider
 * attribute surface than the component it mirrors.
 */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
	{
		value,
		onValueChange,
		name,
		disabled = false,
		required = false,
		invalid = false,
		orientation = "vertical",
		label,
		children,
		className,
		sound = false,
	},
	ref
) {
	// Standalone by default; a surrounding FormField wins for id, described-by,
	// invalid, required and disabled so a caller never wires those by hand.
	const field = useField();

	// `internals/use-id.js`'s `uid()` is client-only by design (its counter
	// can't agree between server and client) — deferring name generation to
	// an effect until mount would leave every radio without a `name` at
	// all until hydration, and this component's own README asks for the
	// opposite: two same-page groups must stay independent from first
	// paint, not just after JS runs. `useFancyId()` gives the same
	// one-generator-per-instance guarantee safely during SSR, and it is
	// already how FormField (this same wave's other id-generating form
	// primitive) solves this exact problem, for the same reason.
	const uid = useFancyId();
	const generatedName = `${uid}-name`;

	const resolvedName = name ?? generatedName;

	// `value = $bindable("")` on the Svelte side. A supplied prop wins and
	// the consumer owns the value; with nothing supplied the component owns
	// it, starting at the same `""` the Svelte default uses.
	const [uncontrolledValue, setUncontrolledValue] = useState("");
	const isControlled = value !== undefined;
	const currentValue = isControlled ? value : uncontrolledValue;

	const effectiveDisabled = field?.disabled ?? disabled;
	const effectiveRequired = field?.required ?? required;
	const effectiveInvalid = field?.invalid ?? invalid;

	const playCue = useSoundCue(sound);

	// The only place `value` changes. A plain function called from an
	// item's event handler, not an effect — writing `value` there would
	// mean reading and writing the same state in one pass, and would fight a
	// caller's own controlled write.
	const select = useCallback(
		(itemValue: string) => {
			if (effectiveDisabled) return;
			const changed = currentValue !== itemValue;
			if (!isControlled) setUncontrolledValue(itemValue);
			// The `sound &&` half of the Svelte guard lives inside `useSoundCue`.
			if (changed) playCue("select");
			onValueChange?.(itemValue);
		},
		[effectiveDisabled, currentValue, isControlled, playCue, onValueChange]
	);

	// Rebuilt when any of its inputs actually changes — that rebuild is what
	// re-renders the items reading it, and it is the React counterpart of the
	// Svelte context's live getters.
	const context = useMemo<RadioGroupContext>(
		() => ({
			name: resolvedName,
			value: currentValue,
			disabled: effectiveDisabled,
			required: effectiveRequired,
			invalid: effectiveInvalid,
			isSelected(itemValue: string) {
				return currentValue === itemValue;
			},
			select,
		}),
		[resolvedName, currentValue, effectiveDisabled, effectiveRequired, effectiveInvalid, select]
	);

	const classes = cn(
		"ft-radio-group inline-flex",
		orientation === "vertical"
			? "flex-col gap-[10px]"
			: "flex-row flex-wrap gap-x-[20px] gap-y-[10px]",
		className
	);

	return (
		<RADIO_GROUP_KEY.Provider value={context}>
			{/*
				`controlId`/`<label for>` cannot label this element — a div with
				role="radiogroup" is not one of the elements `for` can target, ARIA role
				or not — so `field.labelId` (the id of the label FormField actually
				rendered) drives `aria-labelledby` instead. `field.labelId` is
				`undefined` both outside a FormField and inside one that rendered no
				label of its own, and in both of those cases the own `label` prop is
				what has to carry the accessible name — so `aria-label` only renders
				when there is no `labelId` to point at, never both at once.
			*/}
			<div
				ref={ref}
				id={field?.controlId}
				className={classes}
				role="radiogroup"
				data-orientation={orientation}
				aria-label={field?.labelId ? undefined : label}
				aria-labelledby={field?.labelId}
				aria-describedby={field?.describedBy}
				aria-invalid={effectiveInvalid ? "true" : undefined}
				aria-required={effectiveRequired ? "true" : undefined}
			>
				{children}
			</div>
		</RADIO_GROUP_KEY.Provider>
	);
});

RadioGroup.displayName = "RadioGroup";
