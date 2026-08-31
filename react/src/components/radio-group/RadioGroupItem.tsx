import { forwardRef, useContext } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { RADIO_GROUP_KEY } from "./types.js";
import "./radio-group-item.css";

export interface RadioGroupItemProps {
	/** This item's value — what the group's `value` becomes when it is picked. */
	value: string;
	/** Disables just this item, independent of the group's own `disabled`. */
	disabled?: boolean;
	/** Visible label text, rendered next to the control. Falls back to `children`, then to `value`. */
	label?: string;
	/** Custom content rendered in place of `label`, e.g. richer markup. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the wrapping `<label>`. */
	className?: string;
}

/**
 * One item of a `RadioGroup` — a real `<input type="radio">` inside the
 * `<label>` that names it.
 *
 * The native input arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
	function RadioGroupItem({ value, disabled = false, label, children, className }, ref) {
		// Undefined outside a RadioGroup: the item then has no selection or
		// shared `name` to take part in, and renders as a plain, unchecked,
		// standalone radio rather than throwing.
		const group = useContext(RADIO_GROUP_KEY);

		const isDisabled = disabled || (group?.disabled ?? false);
		const isChecked = group?.isSelected(value) ?? false;

		// Deliberately no `tabindex` anywhere on the input below. That is what
		// leaves the browser's own sequential-focus-navigation algorithm for
		// same-`name` radio groups in charge: the first item is the tab stop
		// while none is checked, and the checked one becomes the tab stop the
		// instant a selection exists — for free, and correctly, as long as
		// nothing here overrides it.
		//
		// The native `disabled` attribute below is the real gate, but a change
		// synthesised straight at the element — as a test does, and as some
		// assistive tech does — walks straight past it, so the handler repeats
		// the guard itself.
		function handleChange() {
			if (isDisabled) return;
			group?.select(value);
		}

		const labelClasses = cn(
			"ft-radio-item inline-flex items-center gap-[10px] text-[13px] cursor-pointer",
			isDisabled && "cursor-not-allowed opacity-50",
			className
		);

		// Echoes the group's invalid state on the still-unselected ring; the
		// error text itself (with its own icon) lives in the surrounding
		// FormField, so this border tint is a secondary cue, never the only one.
		// Plain semantic Tailwind tokens, same as every other border on this
		// input — only the brand accent below gets a local fallback, because
		// unlike `--input`/`--destructive` it has no conventionally-named token a
		// consumer's theme is likely to already define.
		const controlClasses = cn(
			"ft-radio-item-control",
			group?.invalid && !isChecked ? "border-destructive" : "border-input"
		);

		return (
			<label className={labelClasses}>
				{/*
					Controlled only inside a group. Outside one there is nothing to
					control: a `checked` prop React can restore would undo the
					browser's own local check right after the click, where the Svelte
					source leaves it standing. `defaultChecked` keeps the standalone
					item behaving as the plain radio it is.
				*/}
				<input
					ref={ref}
					type="radio"
					className={controlClasses}
					value={value}
					{...(group ? { checked: isChecked } : { defaultChecked: false })}
					disabled={isDisabled}
					required={group?.required}
					name={group?.name}
					onChange={handleChange}
				/>
				{children != null ? children : (label ?? value)}
			</label>
		);
	}
);

RadioGroupItem.displayName = "RadioGroupItem";
