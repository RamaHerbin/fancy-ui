import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { preset } from "../../internals/motion/transitions.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { runTransition } from "../../internals/motion/animate.js";
import type { TransitionRun } from "../../internals/motion/animate.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./search-input.css";

export interface SearchInputProps {
	/**
	 * Current value. Controlled when supplied: pair it with `onValueChange`,
	 * the React counterpart of the Svelte source's `bind:value`.
	 */
	value?: string;
	/** Initial value when uncontrolled (no `value` prop given). */
	defaultValue?: string;
	/** Called with the new value on every input event. */
	onValueChange?: (value: string) => void;
	/**
	 * Fired on Enter, and again on debounced settle whenever `debounceMs` is
	 * set — Enter itself always cancels a pending debounce first, so a
	 * settle never fires a second time for the value Enter already reported.
	 */
	onSearch?: (value: string) => void;
	/** Shown while the field is empty. */
	placeholder?: string;
	/**
	 * Delay, in milliseconds, before a settled value fires `onSearch` on its
	 * own. `0` (the default) disables debouncing entirely — no timer is ever
	 * scheduled, and `onSearch` only fires from Enter.
	 */
	debounceMs?: number;
	/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Blocks typing and clearing but stays focusable and is still submitted, unlike `disabled`. */
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
	/** Renders a clear button once there is something to clear. Defaults to `true`. */
	clearable?: boolean;
	/** Additional CSS classes, merged onto the root field surface (not the bare `<input>`). */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

// The clear button appears mid-interaction, the instant the field stops
// being empty — a 150ms grow-and-fade is what stops it materialising as a
// hard pop next to the caret the user is watching.
//
// An intro and never an exit, deliberately: `clearValue()` calls
// `focus()` on the input synchronously right after emptying the field, and
// the button's own conditional goes false in the same update. An outro
// would keep the button mounted past that focus call, reordering focus
// against `onValueChange` for anything listening. The exit is left for a
// later pass that can move the focus handoff first.
//
// `prefersReducedMotion()` is called at the instant the intro starts — the
// ref callback below runs when the button actually attaches — never at
// construction and never during SSR. `duration: 0` makes the runner skip
// `element.animate()` outright instead of running a zero-length animation.
const pop = preset("scale");

const searchIcon = (
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
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
);

/**
 * A search field with a debounced `onSearch`, Escape-to-clear, and an
 * animated clear button.
 *
 * The element reference arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`), pointing at the native `<input>`.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	(
		{
			value: valueProp,
			defaultValue = "",
			onValueChange,
			onSearch,
			placeholder = "Search",
			debounceMs = 0,
			disabled = false,
			readonly = false,
			required = false,
			invalid = false,
			id,
			name,
			label,
			clearable = true,
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

		const playCue = useSoundCue(sound);

		// Whether the clear affordance — the button and Escape's clear-on-press —
		// is available at all right now. Kept as one value so the button's
		// presence and Escape's behaviour never disagree about when clearing is
		// actually possible.
		const canClear = clearable && !effectiveDisabled && !readonly && value !== "";

		const inputRef = useRef<HTMLInputElement | null>(null);
		const composedRef = useComposedRefs(forwardedRef, inputRef);

		const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

		function clearDebounce() {
			if (debounceTimer.current !== undefined) {
				clearTimeout(debounceTimer.current);
				debounceTimer.current = undefined;
			}
		}

		// Runs once at mount and its cleanup is exactly the unmount teardown —
		// the same shape CopyButton uses for its own timer. A pending debounce
		// must never fire onSearch after the component backing it is gone.
		// Doubles as the "past the initial render" latch the intro below reads:
		// a local intro never plays on the block's first run within the initial
		// render, only when the button appears mid-interaction.
		const hasMountedOnce = useRef(false);
		useEffect(() => {
			hasMountedOnce.current = true;
			return () => {
				hasMountedOnce.current = false;
				clearDebounce();
			};
		}, []);

		// The intro leg in flight, aborted if the button detaches before it
		// settles. The ref callback is where the button's attach is observed,
		// which is the exact moment the source starts the intro — pre-paint,
		// in the same commit that put the node in the DOM.
		const introRun = useRef<TransitionRun | null>(null);
		const clearButtonRef = useCallback((node: HTMLButtonElement | null) => {
			if (node === null) {
				introRun.current?.abort();
				introRun.current = null;
				return;
			}
			if (!hasMountedOnce.current) return;
			const spec = pop(
				node,
				{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast },
				{ direction: "in" }
			);
			// The leg aborts itself the moment it lands, exactly as the presence
			// core does on an enter leg: aborting is what drops `fill: forwards`,
			// so the button falls back to its resting style instead of holding
			// `opacity` and `transform` at animation priority — over any consumer
			// CSS — for the rest of its life, and it releases the Animation object
			// the runner's own `abort()` calls a Chromium leak. The handle box is
			// what makes the run reachable from inside its own finish callback: a
			// duration-0 leg finishes synchronously inside `runTransition`, before
			// the return value exists, and that leg's `abort` is a no-op anyway.
			const handle: { current: TransitionRun | null } = { current: null };
			const run = runTransition(node, spec, 1, undefined, () => {
				handle.current?.abort();
				introRun.current = null;
			});
			handle.current = run;
			introRun.current = run;
		}, []);

		const classes = cn(
			"ft-search-input flex w-full items-center gap-2 rounded-full border border-input bg-background px-[14px] py-[9px] text-[13px] transition-colors",
			effectiveDisabled && "cursor-not-allowed opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		);

		// The single place `value` changes from typing. A native `disabled` input
		// never fires `input` from real typing, but a synthetic dispatch walks
		// straight past that guard the same way a synthetic click does on a
		// button, so the early return is repeated here rather than trusted to the
		// attribute alone.
		function handleInput(event: ChangeEvent<HTMLInputElement>) {
			if (effectiveDisabled) return;
			const next = event.currentTarget.value;
			if (!isControlled) setUncontrolledValue(next);
			onValueChange?.(next);

			clearDebounce();
			if (debounceMs > 0) {
				debounceTimer.current = setTimeout(() => {
					debounceTimer.current = undefined;
					onSearch?.(next);
				}, debounceMs);
			}
		}

		function handleKeydown(event: KeyboardEvent<HTMLInputElement>) {
			if (effectiveDisabled) return;

			if (event.key === "Enter") {
				// Enter always wins over a debounce still in flight — without this,
				// a settle firing moments later would report the same value onSearch
				// was just handed, a second time.
				clearDebounce();
				onSearch?.(value);
				return;
			}

			// Escape-clears-a-search-field is the platform convention, but only
			// while there is something to clear — `canClear` is the same flag the
			// button's own presence is gated on, so the two never disagree about
			// when Escape does something. `stopPropagation` runs only in that same
			// case: this component has no dismissable layer of its own, but an
			// ancestor might (a popover or dialog this input sits inside), and its
			// Escape-to-close listener is registered on `document` — stopping the
			// bubble here is what keeps that ancestor closed only once this field
			// has nothing left of its own to clear.
			if (event.key === "Escape" && canClear) {
				event.stopPropagation();
				clearValue();
			}
		}

		function clearValue() {
			if (effectiveDisabled || readonly) return;
			if (!isControlled) setUncontrolledValue("");
			playCue("press");
			onValueChange?.("");
			clearDebounce();
			// The button that triggered this is about to disappear (it only
			// renders while there's something to clear) — focus would otherwise be
			// left on a node no longer in the DOM. Escape reaching here already has
			// focus on the input, so this is a no-op in that path.
			inputRef.current?.focus();
		}

		return (
			<div className={classes}>
				<span className="ft-search-input-icon text-muted-foreground flex shrink-0 items-center">
					{searchIcon}
				</span>
				<input
					ref={composedRef}
					type="search"
					placeholder={placeholder}
					name={name}
					id={effectiveId}
					value={value}
					disabled={effectiveDisabled}
					readOnly={readonly}
					required={effectiveRequired}
					aria-invalid={effectiveInvalid ? "true" : undefined}
					aria-describedby={field?.describedBy}
					aria-label={label}
					className="ft-search-input-field text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
					onChange={handleInput}
					onKeyDown={handleKeydown}
				/>
				{canClear && (
					<button
						ref={clearButtonRef}
						type="button"
						className="ft-search-input-clear text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-[18px] shrink-0 items-center justify-center rounded-full"
						aria-label="Clear search"
						onClick={clearValue}
					>
						<svg
							className="size-2.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				)}
			</div>
		);
	}
);

SearchInput.displayName = "SearchInput";
