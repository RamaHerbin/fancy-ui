import { forwardRef, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./password-input.css";

/** Result of scoring a password's strength. */
export interface PasswordStrengthResult {
	/** 0 = very weak, 4 = strongest. The bars fill left to right by this count. */
	score: 0 | 1 | 2 | 3 | 4;
	/** Carries the actual meaning — see the component README on why colour alone never does. */
	label: string;
}

export interface PasswordInputProps {
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
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Native `autocomplete` hint. `"new-password"` opts a password manager into offering to generate one. */
	autocomplete?: "current-password" | "new-password" | "off";
	/** Renders the show/hide toggle button. Defaults to `true`. */
	showToggle?: boolean;
	/** Renders the strength meter and label once there's a value. Defaults to `false`. */
	showStrength?: boolean;
	/** Overrides the built-in heuristic scorer — see the README before trusting the default one. */
	strength?: (value: string) => PasswordStrengthResult;
	/** Additional CSS classes, merged onto the root field surface (not the bare `<input>`). */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

// The reveal toggle swaps one 16px glyph for another in place. A hard cut
// at that scale reads as a flicker, so the two icons cross-fade over
// `micro` (80ms) — a beat that only registers as a beat.
//
// This is the one bidirectional transition in this pass, and it earns it:
// a cross-fade needs both layers mounted at once, which an enter-only
// animation cannot give. It is safe because nothing observes the icon's
// unmount — `aria-label` and `aria-pressed` live on the <button> and flip
// synchronously, and both glyphs are `aria-hidden`, so a screen reader
// never sees the overlap. The two-layer grid stack below is what keeps the
// overlap free of layout impact.
//
// `prefersReducedMotion()` is called from the params FACTORY rather than
// stored here: `usePresence` reads a factory at the instant a leg starts,
// so the preference is read when the transition begins, never at
// construction and never during SSR. `duration: 0` makes the runner skip
// `element.animate()` outright.
const iconFade = preset("fade");
const fadeParams = () => ({
	duration: prefersReducedMotion() ? 0 : DURATIONS.micro,
});

/**
 * Length plus character-class variety — nothing more. This is a UX
 * heuristic for nudging a user toward a better password while they type,
 * not a security control: it has no notion of dictionary words, leaked
 * password lists, or keyboard-walk patterns, so a password like
 * "Password1!" scores far better here than it should. A real deployment
 * needs a proper strength estimator run server-side — pass `strength` to
 * replace this scorer entirely rather than trusting it for anything that
 * matters.
 */
function defaultStrength(password: string): PasswordStrengthResult {
	let classes = 0;
	if (/[a-z]/.test(password)) classes++;
	if (/[A-Z]/.test(password)) classes++;
	if (/[0-9]/.test(password)) classes++;
	if (/[^a-zA-Z0-9]/.test(password)) classes++;

	const lengthBonus = password.length >= 12 ? 2 : password.length >= 8 ? 1 : 0;
	const raw = classes + lengthBonus;
	const score = (raw <= 1 ? 0 : raw === 2 ? 1 : raw === 3 ? 2 : raw === 4 ? 3 : 4) as
		| 0
		| 1
		| 2
		| 3
		| 4;
	const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
	return { score, label: labels[score] };
}

const eyeIcon: ReactNode = (
	<svg
		className="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
);

const eyeOffIcon: ReactNode = (
	<svg
		className="size-4"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a17.6 17.6 0 0 1-2.16 3.19m-3.22 2.62A9.2 9.2 0 0 1 12 20c-7 0-11-8-11-8a17.7 17.7 0 0 1 4.09-5.41" />
		<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
		<line x1="1" y1="1" x2="23" y2="23" />
	</svg>
);

interface CapturedSelection {
	start: number | null;
	end: number | null;
	direction: "forward" | "backward" | "none" | undefined;
}

/**
 * A password field with a reveal toggle and an optional strength meter.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<input>`.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
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
			label,
			autocomplete = "current-password",
			showToggle = true,
			showStrength = false,
			strength,
			className,
			sound = false,
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

		const [revealed, setRevealed] = useState(false);
		const type = revealed ? "text" : "password";

		const uid = useFancyId();
		const strengthId = `${uid}-strength`;

		const inputRef = useRef<HTMLInputElement | null>(null);
		const composedRef = useComposedRefs(forwardedRef, inputRef);

		const playCue = useSoundCue(sound);

		// One clock per icon layer, both fed the same bidirectional fade —
		// during a toggle both layers are mounted at once and both animate,
		// which is exactly what the Svelte `transition:` pair does.
		const revealedIcon = usePresence(revealed);
		const hiddenIcon = usePresence(!revealed);

		const scoreFn = strength ?? defaultStrength;
		// No result at all while the field is empty — an unfilled meter under an
		// empty field would be noise, not a signal, and there is nothing yet to
		// describe.
		const result = showStrength && value ? scoreFn(value) : undefined;

		// The strength label rides along on aria-describedby instead of a live
		// region. A screen reader announces a field's description once, when
		// focus lands on it — wiring the label into the description reports the
		// current strength on focus without re-announcing it on every keystroke
		// the way a polite live region would while the user is still typing. The
		// visible label span below *is* the description target, so there is no
		// separate hidden node to keep in sync with it. React also only touches
		// that span's text when the string actually changes, so a screen reader
		// that does treat aria-describedby text as live content still would not
		// hear it churn on every character.
		const describedBy =
			[field?.describedBy, result ? strengthId : undefined].filter(Boolean).join(" ") || undefined;

		const tierClass = !result
			? ""
			: result.score <= 1
				? "bg-destructive"
				: result.score === 2
					? "bg-muted-foreground"
					: "ft-password-strength-bar--strong";

		const wrapperClasses = cn(
			"ft-password-input flex w-full items-center gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] transition-colors",
			effectiveDisabled && "cursor-not-allowed opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		);

		// The single place `value` changes. A native `disabled` input never fires
		// `input` from real typing, but a synthetic dispatch walks straight past
		// that guard the same way a synthetic click does on a button, so the
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

		// Swapping `type` between "password" and "text" resets selection in some
		// browsers even though it's the same element and the same characters —
		// the caret (or a real selection) is captured here and restored once the
		// new `type` has actually reached the DOM. The layout effect below is
		// what makes "actually reached the DOM" true: the `type` attribute is
		// driven by the `revealed` state, and that write is batched like any
		// other state write — reading `el.selectionStart` right after flipping
		// `revealed` would still see the old `type`.
		const pendingSelection = useRef<CapturedSelection | null>(null);

		function toggleReveal() {
			if (effectiveDisabled) return;
			const el = inputRef.current;
			pendingSelection.current = {
				start: el?.selectionStart ?? null,
				end: el?.selectionEnd ?? null,
				direction: el?.selectionDirection ?? undefined,
			};
			// The cue is named after the state the flip lands ON, not the one it
			// leaves: revealing plays `toggle-on`, hiding plays `toggle-off`. It
			// fires here, in the synchronous part of the click handler, rather
			// than from the selection-restore effect below — a cue that lands
			// after the gesture has ended is outside the user activation an
			// unlocked audio context is granted on.
			const next = !revealed;
			setRevealed(next);
			playCue(next ? "toggle-on" : "toggle-off");
		}

		useIsomorphicLayoutEffect(() => {
			const captured = pendingSelection.current;
			pendingSelection.current = null;
			const el = inputRef.current;
			if (el && captured && captured.start !== null && captured.end !== null) {
				el.setSelectionRange(captured.start, captured.end, captured.direction ?? undefined);
			}
		}, [revealed]);

		// A mouse click on the toggle would otherwise move focus onto the button
		// before `toggleReveal` runs its capture step — this keeps focus (and the
		// visible caret) on the input throughout a mouse-driven toggle. Keyboard
		// activation still moves focus to the button as normal; the selection is
		// still restored on the input either way, so it's correct the moment
		// focus returns there.
		function preventFocusSteal(event: MouseEvent<HTMLButtonElement>) {
			event.preventDefault();
		}

		return (
			<div className="ft-password-input-wrapper flex w-full flex-col gap-1.5">
				<div className={wrapperClasses}>
					<input
						ref={composedRef}
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
						aria-describedby={describedBy}
						aria-label={label}
						className="ft-password-input-field text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
						onChange={handleInput}
					/>
					{showToggle && (
						<button
							type="button"
							className="ft-password-input-toggle text-muted-foreground hover:text-foreground flex shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
							disabled={effectiveDisabled}
							aria-pressed={revealed}
							aria-label={revealed ? "Hide password" : "Show password"}
							onMouseDown={preventFocusSteal}
							onClick={toggleReveal}
						>
							<span className="ft-password-input-eye">
								{revealedIcon.mounted && (
									<span
										className="ft-password-input-eye-layer"
										ref={revealedIcon.register(iconFade, fadeParams)}
									>
										{eyeOffIcon}
									</span>
								)}
								{hiddenIcon.mounted && (
									<span
										className="ft-password-input-eye-layer"
										ref={hiddenIcon.register(iconFade, fadeParams)}
									>
										{eyeIcon}
									</span>
								)}
							</span>
						</button>
					)}
				</div>
				{result && (
					<div className="ft-password-strength flex flex-col gap-1">
						{/* `ft-password-strength-bar` is a styling hook, not a state class:
						    every segment carries it at every tier, so the colour transition
						    in the stylesheet has one selector to attach to instead of four. */}
						<div className="flex gap-1" aria-hidden="true">
							<span
								className={cn(
									"ft-password-strength-bar h-1 flex-1 rounded-full",
									result.score >= 1 ? tierClass : "bg-border"
								)}
							></span>
							<span
								className={cn(
									"ft-password-strength-bar h-1 flex-1 rounded-full",
									result.score >= 2 ? tierClass : "bg-border"
								)}
							></span>
							<span
								className={cn(
									"ft-password-strength-bar h-1 flex-1 rounded-full",
									result.score >= 3 ? tierClass : "bg-border"
								)}
							></span>
							<span
								className={cn(
									"ft-password-strength-bar h-1 flex-1 rounded-full",
									result.score >= 4 ? tierClass : "bg-border"
								)}
							></span>
						</div>
						<span id={strengthId} className="text-[11px]">
							{result.label}
						</span>
					</div>
				)}
			</div>
		);
	}
);

PasswordInput.displayName = "PasswordInput";
