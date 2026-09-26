<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NumberInputProps {
	/** Current value, two-way through `v-model:value`. `null` when the field is empty. */
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
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "NumberInput", inheritAttrs: false });

const {
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
	sound = false,
} = defineProps<NumberInputProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const value = defineModel<number | null>("value", { default: null });

// Convention C-4: exactly where the source declares its bindable `ref`.
const inputEl = useTemplateRef<HTMLInputElement>("inputEl");
defineExpose({ ref: inputEl });

// Undefined outside a FormField — every value below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

// `type="number"`'s own value-sanitization silently reports "" for ANY
// syntactically incomplete number — "9.", "-", "1e" all read back as the
// empty string, indistinguishable from a genuinely cleared field. That
// collapsed "the user is mid-typing a decimal" into "the user cleared
// it", nulling the bound value the instant a "." landed. A plain text
// input sidesteps the sanitization entirely: `rawText` always holds
// exactly what was typed, and `value` (the parsed number) only updates
// once that text is a complete, unambiguous number — never on an
// incomplete intermediate.
const rawText = ref(value.value === null ? "" : String(value.value));

// Never drives a render, so a plain binding rather than a `ref`: it is read
// only by the resync guard below and written by the focus/blur handlers. A
// `watch` callback body is untracked by construction, so the guard does not
// need it to be reactive the way the source's `$effect` did.
let isFocused = false;

// Keeps the display in sync with `value` for a change that did not
// originate from typing here — an external rebind, the initial mount —
// but never while focused: resyncing mid-keystroke is exactly what would
// turn "9." back into "9" (or "1.20" back into "1.2") before the rest of
// what the user is typing ever lands. The step buttons and the keyboard
// handler below write `rawText` themselves directly for the same reason
// they write `value` directly, so this watcher re-running after them is a
// harmless same-string no-op, not the only path they rely on. The mount
// pass the source's `$effect` contributed is `rawText`'s own initialiser
// above, so this never needs `immediate` — and therefore never runs on the
// server.
watch(
	value,
	(next) => {
		if (isFocused) return;
		rawText.value = next === null ? "" : String(next);
	},
	{ flush: "post" }
);

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
	if (value.value === null) return clampValue(min ?? 0);
	return clampValue(roundToStep(value.value + direction * step));
}

// A control at its bound can still receive a synthetic click that walks
// straight past the native `disabled` attribute on the button, so these
// are read by the click/keydown handlers below rather than trusted to
// the attribute alone — and reused to actually disable the buttons, so
// the bound is communicated visually and not just enforced silently.
const decrementDisabled = computed(
	() =>
		effectiveDisabled.value ||
		readonly ||
		(value.value !== null && min !== undefined && value.value <= min)
);
const incrementDisabled = computed(
	() =>
		effectiveDisabled.value ||
		readonly ||
		(value.value !== null && max !== undefined && value.value >= max)
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
const steppingDirection = ref<1 | -1 | null>(null);
let steppingTimer: ReturnType<typeof setTimeout> | null = null;

// Re-armed, never stacked: a held ArrowUp repeats faster than 80ms, and a
// second timer on top of the first would clear the flag mid-repeat.
function flagStepping(direction: 1 | -1) {
	steppingDirection.value = direction;
	if (steppingTimer !== null) clearTimeout(steppingTimer);
	steppingTimer = setTimeout(() => {
		steppingTimer = null;
		steppingDirection.value = null;
	}, DURATIONS.micro);
}

onBeforeUnmount(() => {
	if (steppingTimer !== null) clearTimeout(steppingTimer);
});

// A no-op while `sound` is false, so the call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

// Shared by the buttons and the keyboard handler below, so button-driven
// and arrow-key-driven stepping can never drift apart in rounding — and,
// since `flagStepping` is called from here and from nowhere else, so that
// the feedback can only ever fire on an actual step. Typing goes through
// `handleInput`, which cannot reach it: a field that flashed a stepper on
// every keystroke would be reporting something that did not happen.
function applyStep(direction: 1 | -1) {
	const next = nextStepValue(direction);
	value.value = next;
	rawText.value = String(next);
	playCue("tick");
	onValueChange?.(next);
	flagStepping(direction);
}

function handleDecrement() {
	if (decrementDisabled.value) return;
	applyStep(-1);
}

function handleIncrement() {
	if (incrementDisabled.value) return;
	applyStep(1);
}

// Arrow keys step a native `type="number"` input for free; a plain text
// input has no such native behaviour, so it is reimplemented here,
// routed through the same `nextStepValue` the buttons use rather than a
// second copy of the rounding/clamping logic.
function handleKeydown(event: KeyboardEvent) {
	if (effectiveDisabled.value || readonly) return;
	if (event.key === "ArrowUp") {
		event.preventDefault();
		if (incrementDisabled.value) return;
		applyStep(1);
	} else if (event.key === "ArrowDown") {
		event.preventDefault();
		if (decrementDisabled.value) return;
		applyStep(-1);
	}
}

function handleInput(event: Event) {
	if (effectiveDisabled.value || readonly) return;
	const raw = (event.currentTarget as HTMLInputElement).value;
	rawText.value = raw;

	if (raw === "") {
		if (value.value !== null) {
			value.value = null;
			onValueChange?.(null);
		}
		return;
	}

	const parsed = Number(raw);
	// A syntactically incomplete number — "9.", "-", "1e", "." — parses
	// to NaN here. Leave `value` untouched and let the user keep typing;
	// `rawText` above already shows exactly what they typed.
	if (Number.isNaN(parsed)) return;

	value.value = parsed;
	onValueChange?.(parsed);
}

function handleFocus() {
	isFocused = true;
}

// Clamping happens here, not per keystroke — that would make typing "50"
// past a lower max impossible to type through — and this is also where
// the display is canonicalised: a trailing "." or a lone "-" that never
// resolved into a full number is dropped once typing is done.
//
// The settled number is held locally rather than re-read off the model:
// with a caller driving `value` through `v-model:value`, the model does
// not report the write above until that caller's own update lands, so a
// re-read would canonicalise the display from the pre-clamp number.
function handleBlur() {
	isFocused = false;
	let settled = value.value;
	if (settled !== null) {
		const clamped = clampValue(settled);
		if (clamped !== settled) {
			settled = clamped;
			value.value = clamped;
			onValueChange?.(clamped);
		}
	}
	rawText.value = settled === null ? "" : String(settled);
}

const classes = computed(() =>
	cn(
		"ft-number-input border-input inline-flex w-fit items-stretch overflow-hidden rounded-[8px] border",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);
</script>

<template>
	<div :class="classes">
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
			:disabled="decrementDisabled"
			:data-stepping="steppingDirection === -1 ? 'true' : undefined"
			@click="handleDecrement"
		>
			−
		</button>
		<input
			ref="inputEl"
			type="text"
			inputmode="decimal"
			class="ft-number-input-field text-foreground w-full min-w-[3ch] border-0 bg-transparent px-[18px] py-[9px] text-center font-mono text-[13px] focus-visible:outline-none disabled:cursor-not-allowed"
			:id="effectiveId"
			:name="name"
			:value="rawText"
			:disabled="effectiveDisabled"
			:readonly="readonly"
			:required="effectiveRequired"
			:aria-invalid="effectiveInvalid ? 'true' : undefined"
			:aria-describedby="field?.describedBy"
			:aria-label="label"
			@input="handleInput"
			@keydown="handleKeydown"
			@focus="handleFocus"
			@blur="handleBlur"
		/>
		<button
			type="button"
			class="ft-number-input-step text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground flex w-[34px] shrink-0 cursor-pointer items-center justify-center border-l focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Increase value"
			:disabled="incrementDisabled"
			:data-stepping="steppingDirection === 1 ? 'true' : undefined"
			@click="handleIncrement"
		>
			+
		</button>
	</div>
</template>

<style scoped>
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
