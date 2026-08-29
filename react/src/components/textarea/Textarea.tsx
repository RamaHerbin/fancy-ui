import { forwardRef, useRef, useState } from "react";
import type { ChangeEvent, HTMLInputAutoCompleteAttribute } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import "./textarea.css";

export interface TextareaProps {
	/**
	 * Current value. Controlled when supplied: pair it with `onValueChange`,
	 * the React counterpart of the Svelte source's `bind:value`.
	 */
	value?: string;
	/** Initial value when uncontrolled (no `value` prop given). */
	defaultValue?: string;
	/** Called with the new value on every input event. */
	onValueChange?: (value: string) => void;
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
	/** Visible height in text rows before anything grows it. Also the no-JS fallback height. */
	rows?: number;
	/** Native character ceiling; also the counter's denominator. */
	maxlength?: number;
	/** Renders the live "n / max" counter under the field. */
	showCount?: boolean;
	/** Grows to fit content instead of scrolling; disables manual resize. */
	autoResize?: boolean;
	/** Additional CSS classes — applied to the `<textarea>` itself, not the wrapper. */
	className?: string;
}

/**
 * A styled native `<textarea>` with full FormField integration, an optional
 * character counter and an optional grow-to-fit mode.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<textarea>`.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			value: valueProp,
			defaultValue = "",
			onValueChange,
			placeholder,
			disabled = false,
			readonly = false,
			required = false,
			invalid = false,
			id,
			name,
			autocomplete,
			label,
			rows = 3,
			maxlength,
			showCount = false,
			autoResize = false,
			className,
		},
		forwardedRef
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

		const reactId = useFancyId();
		const countId = `${reactId}-count`;
		const count = value.length;
		const atLimit = maxlength != null && count >= maxlength;

		// The count rides along on aria-describedby instead of an aria-live
		// region. A screen reader announces a field's description once, when
		// focus lands on it — wiring the counter into the description reports
		// the current count on focus without re-announcing it on every keystroke
		// the way a polite live region would while the user is still typing. The
		// visible counter span below *is* the description target, so there is no
		// separate hidden node to keep in sync with it.
		const describedBy =
			[field?.describedBy, showCount ? countId : undefined].filter(Boolean).join(" ") ||
			undefined;

		const classes = cn(
			"ft-textarea w-full rounded-[8px] border border-input bg-background px-[12px] py-[10px] text-[13px] leading-[1.5] text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			autoResize ? "resize-none overflow-hidden" : "resize-y",
			effectiveInvalid && "border-destructive/50",
			className
		);

		const innerRef = useRef<HTMLTextAreaElement | null>(null);
		const composedRef = useComposedRefs(forwardedRef, innerRef);

		// Measured once from the mounted element: line-height/padding/border
		// don't change under this component's feet, so re-reading them on every
		// keystroke would force a layout for an answer already known.
		const metricsRef = useRef<{ line: number; extra: number } | null>(null);

		function px(input: string): number {
			const parsed = Number.parseFloat(input);
			return Number.isFinite(parsed) ? parsed : 0;
		}

		function measure(el: HTMLTextAreaElement): { line: number; extra: number } {
			if (metricsRef.current) return metricsRef.current;
			const style = getComputedStyle(el);
			const declared = Number.parseFloat(style.lineHeight);
			const fontSize = Number.parseFloat(style.fontSize);
			// jsdom (and a `line-height: normal` in real browsers) reports no
			// usable line-height at all — fall back to a 1.5x multiple of the
			// font size, then to a flat pixel guess if even that is unavailable.
			const line =
				Number.isFinite(declared) && declared > 0
					? declared
					: Number.isFinite(fontSize) && fontSize > 0
						? fontSize * 1.5
						: 20;
			const padding = px(style.paddingTop) + px(style.paddingBottom);
			// scrollHeight covers content and padding but never the border, which
			// a border-box height does include.
			const border =
				style.boxSizing === "border-box"
					? px(style.borderTopWidth) + px(style.borderBottomWidth)
					: 0;
			metricsRef.current = { line, extra: padding + border };
			return metricsRef.current;
		}

		/**
		 * Fits the box to its content, floored at `rows`.
		 *
		 * `height: auto` first, otherwise `scrollHeight` reports the box already
		 * set rather than the text inside it, and the element could only ever
		 * grow. Measures and writes within the same call, and only ever touches
		 * `el.style` — never React state — so this can never re-trigger the
		 * effect that calls it below.
		 */
		function grow() {
			const el = innerRef.current;
			if (!el) return;
			const { line, extra } = measure(el);
			el.style.height = "auto";
			const min = rows * line + extra;
			el.style.height = `${Math.max(el.scrollHeight, min)}px`;
		}

		function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
			if (effectiveDisabled) return;
			const next = event.currentTarget.value;
			if (!isControlled) setUncontrolledValue(next);
			onValueChange?.(next);
			if (autoResize) grow();
		}

		// Growth also has to answer to writes that never pass through
		// `handleInput` — a controlled value assigned from outside, or a
		// restored draft. Reads `value`, writes only `el.style.height`, so it
		// can never wake itself. Layout phase, so the height lands before the
		// user's first painted frame.
		useIsomorphicLayoutEffect(() => {
			if (!autoResize) return;
			grow();
			// grow() reads `rows` and the rendered `value`; both belong in the deps.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [autoResize, value, rows]);

		return (
			<div className="ft-textarea-wrapper flex w-full flex-col gap-1.5">
				<textarea
					ref={composedRef}
					id={effectiveId}
					placeholder={placeholder}
					name={name}
					autoComplete={autocomplete}
					rows={rows}
					maxLength={maxlength}
					disabled={effectiveDisabled}
					readOnly={readonly}
					required={effectiveRequired}
					aria-invalid={effectiveInvalid ? "true" : undefined}
					aria-describedby={describedBy}
					aria-label={label}
					className={classes}
					value={value}
					onChange={handleInput}
				></textarea>
				{showCount && (
					<span
						id={countId}
						className="ft-textarea-count text-muted-foreground self-end text-[11px]"
						data-limit-reached={atLimit ? "true" : undefined}
					>
						{count}
						{maxlength != null ? ` / ${maxlength}` : ""}
					</span>
				)}
			</div>
		);
	}
);

Textarea.displayName = "Textarea";
