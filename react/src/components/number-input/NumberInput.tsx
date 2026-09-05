import { forwardRef, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./number-input.css";

export interface NumberInputProps {
	/**
	 * Current value; `null` when the field is empty. Controlled when supplied:
	 * pair it with `onValueChange`, the React counterpart of the Svelte
	 * source's `bind:value`.
	 */
	value?: number | null;
	/** Initial value when uncontrolled (no `value` prop given). `null` for an empty field. */
	defaultValue?: number | null;
	/** Called with the new value on every change, including a clear to `null`. */
	onValueChange?: (value: number | null) => void;
	/** Lower bound. Leave unset for no lower bound. */
	min?: number;
	/** Upper bound. Leave unset for no upper bound. */
	max?: number;
	/** Increment size, including fractional steps. */
	step?: number;
	/** Blocks focus, typing and the step buttons; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Blocks typing and the step buttons but stays focusable and is still submitted, unlike `disabled`. */
	readonly?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Additional CSS classes, applied to the outer bordered wrapper. */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
	(
		{
			value: valueProp,
			defaultValue = null,
			onValueChange,
			min,
			max,
			step = 1,
			disabled = false,
			readonly = false,
			required = false,
			invalid = false,
			id,
			name,
			label,
			className,
			sound = false,
		},
		ref
	) => {
		// The Svelte side's `value = $bindable(null)` becomes the standard
		// controlled/uncontrolled split: uncontrolled by default, controlled
		// the moment a `value` prop is passed (`null` counts — it is a real
		// value meaning "empty", not an absence).
		const isControlled = valueProp !== undefined;
		const [uncontrolledValue, setUncontrolledValue] = useState<number | null>(defaultValue);
		const value = isControlled ? valueProp : uncontrolledValue;

		// The single internal write site for `value`. In controlled mode the
		// parent owns the value and hears about the change through
		// `onValueChange` instead.
		function setValue(next: number | null) {
			if (!isControlled) setUncontrolledValue(next);
		}

		// `type="number"`'s own value-sanitization silently reports "" for ANY
		// syntactically incomplete number — "9.", "-", "1e" all read back as the
		// empty string, indistinguishable from a genuinely cleared field. That
		// collapsed "the user is mid-typing a decimal" into "the user cleared
		// it", nulling the bound value the instant a "." landed. A plain text
		// input sidesteps the sanitization entirely: `rawText` always holds
		// exactly what was typed, and `value` (the parsed number) only updates
		// once that text is a complete, unambiguous number — never on an
		// incomplete intermediate.
		const [rawText, setRawText] = useState(value === null ? "" : String(value));

		// Never drives a render, so a ref: it is read only by the resync guard
		// below and written by the focus/blur handlers.
		const isFocused = useRef(false);

		// Keeps the display in sync with `value` for a change that did not
		// originate from typing here — a controlled parent passing a new value,
		// the initial mount — but never while focused: resyncing mid-keystroke
		// is exactly what would turn "9." back into "9" (or "1.20" back into
		// "1.2") before the rest of what the user is typing ever lands. The
		// step buttons and the keyboard handler below write `rawText`
		// themselves directly for the same reason they write `value` directly,
		// so this effect re-running after them is a harmless same-string no-op,
		// not the only path they rely on.
		useEffect(() => {
			if (isFocused.current) return;
			setRawText(value === null ? "" : String(value));
		}, [value]);

		// Undefined outside a FormField — every derived below then falls back to
		// this component's own props instead of the context, so the control works
		// standalone exactly as it does wrapped.
		const field = useField();

		const effectiveId = field?.controlId ?? id;
		const effectiveDisabled = field?.disabled ?? disabled;
		const effectiveRequired = field?.required ?? required;
		const effectiveInvalid = field?.invalid ?? invalid;

		const playCue = useSoundCue(sound);

		// How many decimal digits a number carries, e.g. 2 for 0.25.
		function decimalPlaces(n: number): number {
			const s = String(n);
			const dot = s.indexOf(".");
			return dot === -1 ? 0 : s.length - dot - 1;
		}

		// The step grid is anchored at `min` (or 0 with none set), not at
		// `step`'s own decimal count alone — rounding to `step` alone breaks the
		// moment the grid's arithmetic needs more precision than `step` carries.
		// With `min={0.25} step={0.5}`, 0.25 + 0.5 is exactly 0.75; rounding that
		// to step's one decimal place would corrupt an already-exact result to
		// 0.8.
		function gridPrecision(): number {
			return Math.max(decimalPlaces(step), decimalPlaces(min ?? 0));
		}

		// Rounds to the grid's precision after every add, so ten 0.1 increments
		// land on exactly 1 instead of drifting to something like
		// 0.9999999999999999 the way plain float addition would.
		function roundToStep(n: number): number {
			const factor = 10 ** gridPrecision();
			return Math.round(n * factor) / factor;
		}

		function clampValue(n: number): number {
			let result = n;
			if (min !== undefined) result = Math.max(min, result);
			if (max !== undefined) result = Math.min(max, result);
			return result;
		}

		// Mirrors the native stepUp()/stepDown() behaviour for an empty field:
		// the first step lands exactly on the minimum (or 0 with none set),
		// never on min + step and never on NaN. A step that lands past a bound
		// clamps there, and every step after that continues arithmetic from the
		// clamped value rather than re-snapping to the nearest point on the
		// original grid — matching how a native number input's own
		// stepUp()/stepDown() keeps going from wherever clamping left it. E.g.
		// with min=0 max=10 step=3: 9 → 10 (clamped) → 7 → 4 → 1, not back to
		// the 0/3/6/9 grid.
		function nextStepValue(direction: 1 | -1): number {
			if (value === null) return clampValue(min ?? 0);
			return clampValue(roundToStep(value + direction * step));
		}

		// A control at its bound can still receive a synthetic click that walks
		// straight past the native `disabled` attribute on the button, so these
		// are read by the click/keydown handlers below rather than trusted to
		// the attribute alone — and reused to actually disable the buttons, so
		// the bound is communicated visually and not just enforced silently.
		const decrementDisabled =
			effectiveDisabled || readonly || (value !== null && min !== undefined && value <= min);
		const incrementDisabled =
			effectiveDisabled || readonly || (value !== null && max !== undefined && value >= max);

		// Which stepper just fired, for `DURATIONS.micro` (80ms) afterwards, or
		// `null` between steps. A pointer gets its press feedback from `:active`
		// for free; a keyboard press has no `:active` to give, so this flag hands
		// the very same rule to the arrow keys. One shared visual answer to "that
		// stepper just fired", whichever device fired it — no second keyframe, and
		// so no animation-restart problem on a held key.
		//
		// Nothing here touches the `<input>`: a transform on the field would blur
		// the digits the reader is checking and fight the caret.
		const [steppingDirection, setSteppingDirection] = useState<1 | -1 | null>(null);
		const steppingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

		// Re-armed, never stacked: a held ArrowUp repeats faster than 80ms, and a
		// second timer on top of the first would clear the flag mid-repeat.
		function flagStepping(direction: 1 | -1) {
			setSteppingDirection(direction);
			if (steppingTimer.current !== null) clearTimeout(steppingTimer.current);
			steppingTimer.current = setTimeout(() => {
				steppingTimer.current = null;
				setSteppingDirection(null);
			}, DURATIONS.micro);
		}

		useEffect(() => {
			return () => {
				if (steppingTimer.current !== null) clearTimeout(steppingTimer.current);
			};
		}, []);

		// Shared by the buttons and the keyboard handler below, so button-driven
		// and arrow-key-driven stepping can never drift apart in rounding — and,
		// since `flagStepping` is called from here and from nowhere else, so that
		// the feedback can only ever fire on an actual step. Typing goes through
		// `handleInput`, which cannot reach it: a field that flashed a stepper on
		// every keystroke would be reporting something that did not happen.
		function applyStep(direction: 1 | -1) {
			const next = nextStepValue(direction);
			setValue(next);
			setRawText(String(next));
			playCue("tick");
			onValueChange?.(next);
			flagStepping(direction);
		}

		function handleDecrement() {
			if (decrementDisabled) return;
			applyStep(-1);
		}

		function handleIncrement() {
			if (incrementDisabled) return;
			applyStep(1);
		}

		// Arrow keys step a native `type="number"` input for free; a plain text
		// input has no such native behaviour, so it is reimplemented here,
		// routed through the same `nextStepValue` the buttons use rather than a
		// second copy of the rounding/clamping logic.
		function handleKeydown(event: KeyboardEvent<HTMLInputElement>) {
			if (effectiveDisabled || readonly) return;
			if (event.key === "ArrowUp") {
				event.preventDefault();
				if (incrementDisabled) return;
				applyStep(1);
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				if (decrementDisabled) return;
				applyStep(-1);
			}
		}

		function handleInput(event: ChangeEvent<HTMLInputElement>) {
			if (effectiveDisabled || readonly) return;
			const raw = event.currentTarget.value;
			setRawText(raw);

			if (raw === "") {
				if (value !== null) {
					setValue(null);
					onValueChange?.(null);
				}
				return;
			}

			const parsed = Number(raw);
			// A syntactically incomplete number — "9.", "-", "1e", "." — parses
			// to NaN here. Leave `value` untouched and let the user keep typing;
			// `rawText` above already shows exactly what they typed.
			if (Number.isNaN(parsed)) return;

			setValue(parsed);
			onValueChange?.(parsed);
		}

		function handleFocus(_event: FocusEvent<HTMLInputElement>) {
			isFocused.current = true;
		}

		// Clamping happens here, not per keystroke — that would make typing "50"
		// past a lower max impossible to type through — and this is also where
		// the display is canonicalised: a trailing "." or a lone "-" that never
		// resolved into a full number is dropped once typing is done.
		function handleBlur(_event: FocusEvent<HTMLInputElement>) {
			isFocused.current = false;
			let settled = value;
			if (settled !== null) {
				const clamped = clampValue(settled);
				if (clamped !== settled) {
					settled = clamped;
					setValue(clamped);
					onValueChange?.(clamped);
				}
			}
			setRawText(settled === null ? "" : String(settled));
		}

		return (
			<div
				className={cn(
					"ft-number-input border-input inline-flex w-fit items-stretch overflow-hidden rounded-[8px] border",
					effectiveInvalid && "border-destructive/50",
					className
				)}
			>
				{/*
					`ft-number-input-step` exists so the colocated stylesheet can reach
					these two buttons at all — they carried no `ft-*` class before. It
					also replaces `transition-colors`, which an unlayered `transition`
					shorthand on the same element would have overridden silently; see
					the stylesheet for the colour channel written back by hand.
				*/}
				<button
					type="button"
					className="ft-number-input-step text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground flex w-[34px] shrink-0 cursor-pointer items-center justify-center border-r focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Decrease value"
					disabled={decrementDisabled}
					data-stepping={steppingDirection === -1 ? "true" : undefined}
					onClick={handleDecrement}
				>
					−
				</button>
				<input
					ref={ref}
					type="text"
					inputMode="decimal"
					className="ft-number-input-field text-foreground w-full min-w-[3ch] border-0 bg-transparent px-[18px] py-[9px] text-center font-mono text-[13px] focus-visible:outline-none disabled:cursor-not-allowed"
					id={effectiveId}
					name={name}
					value={rawText}
					disabled={effectiveDisabled}
					readOnly={readonly}
					required={effectiveRequired}
					aria-invalid={effectiveInvalid ? "true" : undefined}
					aria-describedby={field?.describedBy}
					aria-label={label}
					onChange={handleInput}
					onKeyDown={handleKeydown}
					onFocus={handleFocus}
					onBlur={handleBlur}
				/>
				<button
					type="button"
					className="ft-number-input-step text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground flex w-[34px] shrink-0 cursor-pointer items-center justify-center border-l focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Increase value"
					disabled={incrementDisabled}
					data-stepping={steppingDirection === 1 ? "true" : undefined}
					onClick={handleIncrement}
				>
					+
				</button>
			</div>
		);
	}
);

NumberInput.displayName = "NumberInput";
