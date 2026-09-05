<script lang="ts" module>
	export interface NumberInputProps {
		/** Current value; bindable. `null` when the field is empty. */
		value?: number | null;
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
		class?: string;
		/** Reference to the underlying `<input>`. */
		ref?: HTMLInputElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { onDestroy } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		value = $bindable(null),
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
		class: className,
		ref = $bindable(null),
		sound = false,
	}: NumberInputProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// `type="number"`'s own value-sanitization silently reports "" for ANY
	// syntactically incomplete number — "9.", "-", "1e" all read back as the
	// empty string, indistinguishable from a genuinely cleared field. That
	// collapsed "the user is mid-typing a decimal" into "the user cleared
	// it", nulling the bound value the instant a "." landed. A plain text
	// input sidesteps the sanitization entirely: `rawText` always holds
	// exactly what was typed, and `value` (the parsed number) only updates
	// once that text is a complete, unambiguous number — never on an
	// incomplete intermediate.
	let rawText = $state(value === null ? "" : String(value));
	let isFocused = $state(false);

	// Keeps the display in sync with `value` for a change that did not
	// originate from typing here — an external rebind, the initial mount —
	// but never while focused: resyncing mid-keystroke is exactly what would
	// turn "9." back into "9" (or "1.20" back into "1.2") before the rest of
	// what the user is typing ever lands. The step buttons and the keyboard
	// handler below write `rawText` themselves directly for the same reason
	// they write `value` directly, so this effect re-running after them is a
	// harmless same-string no-op, not the only path they rely on.
	$effect(() => {
		if (isFocused) return;
		rawText = value === null ? "" : String(value);
	});

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
	const decrementDisabled = $derived(
		effectiveDisabled || readonly || (value !== null && min !== undefined && value <= min)
	);
	const incrementDisabled = $derived(
		effectiveDisabled || readonly || (value !== null && max !== undefined && value >= max)
	);

	// Which stepper just fired, for `DURATIONS.micro` (80ms) afterwards, or
	// `null` between steps. A pointer gets its press feedback from `:active`
	// for free; a keyboard press has no `:active` to give, so this flag hands
	// the very same rule to the arrow keys. One shared visual answer to "that
	// stepper just fired", whichever device fired it — no second keyframe, and
	// so no animation-restart problem on a held key.
	//
	// Nothing here touches the `<input>`: a transform on the field would blur
	// the digits the reader is checking and fight the caret.
	let steppingDirection = $state<1 | -1 | null>(null);
	let steppingTimer: ReturnType<typeof setTimeout> | null = null;

	// Re-armed, never stacked: a held ArrowUp repeats faster than 80ms, and a
	// second timer on top of the first would clear the flag mid-repeat.
	function flagStepping(direction: 1 | -1) {
		steppingDirection = direction;
		if (steppingTimer !== null) clearTimeout(steppingTimer);
		steppingTimer = setTimeout(() => {
			steppingTimer = null;
			steppingDirection = null;
		}, DURATIONS.micro);
	}

	onDestroy(() => {
		if (steppingTimer !== null) clearTimeout(steppingTimer);
	});

	// Shared by the buttons and the keyboard handler below, so button-driven
	// and arrow-key-driven stepping can never drift apart in rounding — and,
	// since `flagStepping` is called from here and from nowhere else, so that
	// the feedback can only ever fire on an actual step. Typing goes through
	// `handleInput`, which cannot reach it: a field that flashed a stepper on
	// every keystroke would be reporting something that did not happen.
	function applyStep(direction: 1 | -1) {
		const next = nextStepValue(direction);
		value = next;
		rawText = String(next);
		if (sound) soundFx.play("tick");
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
	function handleKeydown(event: KeyboardEvent) {
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

	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled || readonly) return;
		const raw = event.currentTarget.value;
		rawText = raw;

		if (raw === "") {
			if (value !== null) {
				value = null;
				onValueChange?.(null);
			}
			return;
		}

		const parsed = Number(raw);
		// A syntactically incomplete number — "9.", "-", "1e", "." — parses
		// to NaN here. Leave `value` untouched and let the user keep typing;
		// `rawText` above already shows exactly what they typed.
		if (Number.isNaN(parsed)) return;

		value = parsed;
		onValueChange?.(parsed);
	}

	function handleFocus() {
		isFocused = true;
	}

	// Clamping happens here, not per keystroke — that would make typing "50"
	// past a lower max impossible to type through — and this is also where
	// the display is canonicalised: a trailing "." or a lone "-" that never
	// resolved into a full number is dropped once typing is done.
	function handleBlur() {
		isFocused = false;
		if (value !== null) {
			const clamped = clampValue(value);
			if (clamped !== value) {
				value = clamped;
				onValueChange?.(clamped);
			}
		}
		rawText = value === null ? "" : String(value);
	}
</script>

<div
	class={cn(
		"ft-number-input border-input inline-flex w-fit items-stretch overflow-hidden rounded-[8px] border",
		effectiveInvalid && "border-destructive/50",
		className
	)}
>
	<!--
		`ft-number-input-step` exists so the scoped `<style>` can reach these two
		buttons at all — they carried no `ft-*` class before. It also replaces
		`transition-colors`, which a scoped `transition` shorthand on the same
		element would have overridden silently; see the stylesheet for the
		colour channel written back by hand.
	-->
	<button
		type="button"
		class="ft-number-input-step text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground flex w-[34px] shrink-0 cursor-pointer items-center justify-center border-r focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
		aria-label="Decrease value"
		disabled={decrementDisabled}
		data-stepping={steppingDirection === -1 ? "true" : undefined}
		onclick={handleDecrement}
	>
		−
	</button>
	<input
		bind:this={ref}
		type="text"
		inputmode="decimal"
		class="ft-number-input-field text-foreground w-full min-w-[3ch] border-0 bg-transparent px-[18px] py-[9px] text-center font-mono text-[13px] focus-visible:outline-none disabled:cursor-not-allowed"
		id={effectiveId}
		{name}
		value={rawText}
		disabled={effectiveDisabled}
		{readonly}
		required={effectiveRequired}
		aria-invalid={effectiveInvalid ? "true" : undefined}
		aria-describedby={field?.describedBy}
		aria-label={label}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
		onblur={handleBlur}
	/>
	<button
		type="button"
		class="ft-number-input-step text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground flex w-[34px] shrink-0 cursor-pointer items-center justify-center border-l focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
		aria-label="Increase value"
		disabled={incrementDisabled}
		data-stepping={steppingDirection === 1 ? "true" : undefined}
		onclick={handleIncrement}
	>
		+
	</button>
</div>

<style>
	.ft-number-input-field:focus-visible {
		--ft-number-input-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		box-shadow: inset 0 0 0 1px var(--ft-number-input-accent);
	}

	.ft-number-input-step {
		/* One local alias so the token pair is typed once rather than seven times.
		   150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
		--ft-number-input-motion: var(--ft-duration-fast, 150ms)
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
		/* Replaces the `transition-colors` utility removed from the class string
		   above. Colour is a state change, not motion, so it stays outside the
		   reduced-motion query. `text-decoration-color`, `fill` and `stroke`
		   never change on these two buttons, so the three that do are the
		   faithful subset of what the utility covered. */
		transition:
			color var(--ft-number-input-motion),
			background-color var(--ft-number-input-motion),
			border-color var(--ft-number-input-motion);
		/* Kills the ~300ms tap delay without blocking scroll — the same rule,
		   for the same reason, as `.ft-pressable`. Stepping a value is exactly
		   the interaction a finger repeats, so the delay is felt here. */
		touch-action: manipulation;
	}

	/*
	 * Universal fallback — a press must be acknowledged under reduced motion
	 * too, and a UA that supports neither query still needs some affordance.
	 * `:not(:disabled)` is redundant against `disabled:pointer-events-none`
	 * and deliberately kept: a bound-reached stepper must read as inert, and
	 * that should not depend on a utility staying in the class string.
	 */
	.ft-number-input-step:active:not(:disabled),
	.ft-number-input-step[data-stepping="true"]:not(:disabled) {
		opacity: var(--ft-number-input-press-opacity, 0.85);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-number-input-step {
			/* The individual `scale` property, not `transform: scale()`: this
			   scoped rule is unlayered, so a `transform` here would beat any
			   transform utility a consumer passes through the public `class`
			   prop — a `rotate-45` would silently vanish, at rest AND under
			   the press. `scale` composes with the consumer's `transform`
			   instead of replacing it. */
			scale: 1;
			transition:
				color var(--ft-number-input-motion),
				background-color var(--ft-number-input-motion),
				border-color var(--ft-number-input-motion),
				scale var(--ft-number-input-motion);
		}

		.ft-number-input-step:active:not(:disabled),
		.ft-number-input-step[data-stepping="true"]:not(:disabled) {
			scale: var(--ft-number-input-press-scale, 0.97);
			/* Full motion = scale only; reduced motion = opacity only. Never both. */
			opacity: 1;
		}
	}
</style>
