<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SliderProps {
	/** Current value, two-way through `v-model:value`. */
	value?: number;
	/** Called with the new value on every input event. */
	onValueChange?: (value: number) => void;
	/** A consumer `@input`, run once after the internal value update. */
	onInput?: (event: Event) => void;
	/** A consumer `@change`, run once after the internal handling. */
	onChange?: (event: Event) => void;
	/** Lower bound. */
	min?: number;
	/** Upper bound. */
	max?: number;
	/** Increment size, including fractional steps. */
	step?: number;
	/** Blocks dragging and keyboard interaction. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Shows the current value in a bubble that tracks the thumb. */
	showValue?: boolean;
	/** Shows `min` and `max` as end labels below the track. */
	showBounds?: boolean;
	/** Additional CSS classes, applied to the outer wrapper. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, useAttrs, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "Slider", inheritAttrs: false });

const attrs = useAttrs() as Record<string, string | undefined>;

const {
	onValueChange,
	onInput,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	disabled = false,
	id,
	name,
	label,
	showValue = false,
	showBounds = false,
	class: className,
	sound = false,
} = defineProps<SliderProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const value = defineModel<number>("value", { default: 0 });

// Convention C-4: exactly where the source declares its bindable `ref`.
const el = useTemplateRef<HTMLInputElement>("el");
defineExpose({ ref: el });

// Undefined outside a FormField — every value below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
// Slider carries no local `invalid` prop of its own — a surrounding
// FormField is the only source for it, same as aria-describedby below.
// `field.required` has no counterpart here at all: the ARIA slider role
// does not support aria-required (a range always carries a value, so
// there is no "empty" state to require filling in), and any visible
// required marker is the FormField's own Label to render, not this input's.
const effectiveInvalid = computed(() => field?.invalid ?? false);

// A native range input clamps its own displayed value to [min,max]
// automatically, but a `value` set out of range (or left there after `max`
// shrinks past it at runtime) would otherwise leave aria-valuenow and the
// showValue bubble reporting the raw, unclamped number while the thumb sits
// wherever the browser actually clamped it — visible to a sighted user as a
// bubble that disagrees with the thumb's own position. Every render below
// reads `clampedValue`, not `value`, so this is correct from the very first
// paint (including SSR) regardless of when the correction below gets around
// to fixing the model itself.
const clampedValue = computed(() => Math.min(max, Math.max(min, value.value)));

// Also corrects the model itself, the same way NumberInput clamps on blur, so
// a caller's own bound variable does not stay silently out of range forever.
// `min`/`max` are the watched source, so they are the only tracked
// dependency; `value` is read inside the callback, which is untracked by
// construction — the counterpart of the source's `untrack`, so that writing
// the model here can never make this run again. The mount call stands in for
// the source's `$effect` firing once after the first render: a `watch` with
// `immediate` would instead run inside `setup`, on the server too, where the
// source's effect never runs at all.
function clampModel() {
	const current = value.value;
	const clamped = Math.min(max, Math.max(min, current));
	if (clamped !== current) {
		value.value = clamped;
		onValueChange?.(clamped);
	}
}
onMounted(clampModel);
watch(() => [min, max], clampModel, { flush: "post" });

// The one number the gradient fill and the value bubble both need, computed
// once here rather than duplicated as a CSS calc() on each consumer of it.
const fraction = computed(() =>
	max > min ? Math.min(1, Math.max(0, (clampedValue.value - min) / (max - min))) : 0
);

// The single place `value` changes. A native `disabled` input never fires
// `input` from a real drag or key press, but a synthetic dispatch walks
// straight past that guard the same way a synthetic click does on a
// button — so the early return is repeated here rather than trusted to
// the attribute alone.
/**
 * A consumer listener rides a declared camelCase prop (not the fall-through
 * attrs) so a guarded activation can skip it; Vue hands several `@event`
 * bindings over as an array.
 */
function callListener(listener: unknown, ...args: unknown[]) {
	if (Array.isArray(listener)) {
		for (const fn of listener) if (typeof fn === "function") fn(...args);
	} else if (typeof listener === "function") {
		listener(...args);
	}
}

function handleInput(event: Event) {
	if (effectiveDisabled.value) return;
	const next = Number((event.currentTarget as HTMLInputElement).value);
	value.value = next;
	onValueChange?.(next);
	callListener(onInput, event);
}

const playCue = useSoundCue(() => sound);

// `input` fires continuously while dragging (and once per key press), so
// it is the wrong event to hang a cue on — that would fire dozens of
// times per drag. `change` fires exactly once a value is committed: on
// drag release, or once per committed keyboard step. This handler plays
// only; it never writes `value` or calls `onValueChange` — `handleInput`
// above stays the single place the value itself changes.
function handleChange(event: Event) {
	if (effectiveDisabled.value) return;
	playCue("tick");
	callListener(onChange, event);
}
</script>

<template>
	<div :class="cn('ft-slider-wrap flex w-full flex-col gap-4', className)">
		<div class="relative" :style="showValue ? { paddingTop: '22px' } : undefined">
			<!-- Decorative: the input's own aria-valuenow already carries this
			     number for assistive tech, so the bubble is hidden from it to
			     avoid announcing the value twice. -->
			<span
				v-if="showValue"
				class="ft-slider-bubble border-input bg-background pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap"
				:style="{ left: `${fraction * 100}%`, color: 'var(--ft-slider-accent)' }"
				aria-hidden="true"
			>
				{{ clampedValue }}
			</span>
			<input
				v-bind="attrs"
				ref="el"
				type="range"
				class="ft-slider h-1 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				:id="effectiveId"
				:name="name"
				:min="min"
				:max="max"
				:step="step"
				:value="clampedValue"
				:disabled="effectiveDisabled"
				:aria-describedby="
					[field?.describedBy, attrs['aria-describedby']].filter(Boolean).join(' ') || undefined
				"
				:aria-invalid="
					effectiveInvalid ? 'true' : (attrs['aria-invalid'] as 'true' | 'false' | undefined)
				"
				:aria-valuemin="min"
				:aria-valuemax="max"
				:aria-valuenow="clampedValue"
				:aria-label="label ?? attrs['aria-label']"
				:style="{ '--ft-slider-fill': `${fraction * 100}%` }"
				@input="handleInput"
				@change="handleChange"
			/>
		</div>
		<!-- Decorative echo of min/max; the authoritative values live on the
		     input's own min/max/aria-valuemin/aria-valuemax attributes. -->
		<div
			v-if="showBounds"
			class="text-muted-foreground flex justify-between text-[11px]"
			aria-hidden="true"
		>
			<span>{{ min }}</span>
			<span>{{ max }}</span>
		</div>
	</div>
</template>

<style scoped>
/*
 * Declared on the wrapper, not on `.ft-slider` itself, so the value bubble
 * — a sibling `<span>`, not a descendant of the input — can inherit the
 * same custom property for its text colour instead of duplicating the
 * value. Custom properties inherit down the whole subtree (including into
 * the input's own vendor thumb/track pseudo-elements below), just not
 * sideways between siblings, which is what forced this up a level.
 *
 * One colour, not a two-stop gradient: the fill reads as a single beam of
 * light running along the rail — it starts from nothing at the left edge
 * and brightens into a warm-white head under the thumb. Light mode takes a
 * near-black ink instead, so the head keeps its contrast on a pale surface.
 */
.ft-slider-wrap {
	--ft-slider-accent: var(--ft-accent, light-dark(oklch(0.27 0.012 80), oklch(0.96 0.016 85)));
	--ft-slider-rail: var(--color-input, color-mix(in oklab, currentColor 12%, transparent));
}

/*
 * The glint: a short comet of light that travels along the filled tail
 * towards the thumb while the control is engaged (hover, keyboard focus,
 * drag). Two registered properties drive it so they can be animated and
 * transitioned: --ft-slider-sweep is the comet's progress along the fill
 * (0 → 1), --ft-slider-glint its overall strength (fades in and out with
 * engagement). Both are set on the input and inherit into its track
 * pseudo-elements. At rest the animation is paused, not removed, so the
 * comet fades out where it is instead of snapping back to the start, and
 * no frames are produced while nothing changes.
 */
@property --ft-slider-sweep {
	syntax: "<number>";
	inherits: true;
	initial-value: 0;
}
@property --ft-slider-glint {
	syntax: "<number>";
	inherits: true;
	initial-value: 0;
}
@keyframes ft-slider-sweep {
	from {
		--ft-slider-sweep: 0;
	}
	to {
		--ft-slider-sweep: 1;
	}
}
.ft-slider {
	--ft-slider-glint-at: calc(var(--ft-slider-fill, 0%) * var(--ft-slider-sweep));
	/* Ramps in over the first fifth of each pass so the comet never pops
	   into view at the start of the rail when the loop restarts. */
	--ft-slider-glint-color: color-mix(
		in oklab,
		var(--ft-slider-accent) calc(var(--ft-slider-glint) * min(1, var(--ft-slider-sweep) * 5) * 90%),
		transparent
	);
	animation: ft-slider-sweep 1.6s cubic-bezier(0.45, 0, 0.25, 1) infinite paused;
	transition: --ft-slider-glint 260ms ease-out;
}
.ft-slider:not(:disabled):is(:hover, :focus-visible, :active) {
	--ft-slider-glint: 1;
	animation-play-state: running;
}

/*
 * A native range input has no cross-browser "filled portion" of its own.
 * WebKit lets the track's background do double duty: a gradient paints the
 * beam's tail up to --ft-slider-fill — transparent at the start, a faint
 * glow halfway, the full accent at the head — and the resting rail after
 * it. Firefox has no equivalent hook on ::-moz-range-track, so its filled
 * portion is drawn as the separate ::-moz-range-progress layer below.
 */
.ft-slider::-webkit-slider-runnable-track {
	height: 2px;
	border-radius: 999px;
	background:
		linear-gradient(
			to right,
			transparent calc(var(--ft-slider-glint-at) - 36px),
			var(--ft-slider-glint-color) var(--ft-slider-glint-at),
			transparent calc(var(--ft-slider-glint-at) + 2px)
		),
		linear-gradient(
			to right,
			transparent 0,
			color-mix(in oklab, var(--ft-slider-accent) 35%, transparent)
				calc(var(--ft-slider-fill, 0%) * 0.55),
			var(--ft-slider-accent) var(--ft-slider-fill, 0%),
			transparent var(--ft-slider-fill, 0%)
		),
		var(--ft-slider-rail);
}
.ft-slider::-moz-range-track {
	height: 2px;
	border-radius: 999px;
	background: var(--ft-slider-rail);
}
.ft-slider::-moz-range-progress {
	height: 2px;
	border-radius: 999px;
	/* The progress box is the fill itself, so the glint's position is a
	   plain fraction of it here rather than of the whole rail. */
	background:
		linear-gradient(
			to right,
			transparent calc(var(--ft-slider-sweep) * 100% - 36px),
			var(--ft-slider-glint-color) calc(var(--ft-slider-sweep) * 100%),
			transparent calc(var(--ft-slider-sweep) * 100% + 2px)
		),
		linear-gradient(
			to right,
			transparent 0,
			color-mix(in oklab, var(--ft-slider-accent) 35%, transparent) 55%,
			var(--ft-slider-accent)
		);
}

/*
 * The thumb is the beam's head: a solid disc of the accent with a soft,
 * two-layer bloom around it instead of a hard ring. Keyboard focus adds a
 * crisp ring on top so the focus state never relies on the glow alone.
 *
 * Vendor pseudo-elements for the thumb cannot be combined into one
 * selector list — a selector list is invalid in its entirety the moment
 * one part of it is unrecognised, so folding ::-webkit-slider-thumb and
 * ::-moz-range-thumb together would make the whole rule drop silently in
 * whichever browser doesn't own the other vendor's part. Two separate
 * rules, restyled identically, is the only way both browsers apply either
 * of them.
 */
.ft-slider::-webkit-slider-thumb {
	appearance: none;
	width: 12px;
	height: 12px;
	margin-top: -5px; /* centers a 12px thumb on the 2px track */
	border: none;
	border-radius: 50%;
	background: var(--ft-slider-accent);
	box-shadow:
		0 0 6px 1px color-mix(in oklab, var(--ft-slider-accent) 55%, transparent),
		0 0 18px 4px color-mix(in oklab, var(--ft-slider-accent) 22%, transparent);
	transition:
		transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
		box-shadow 200ms ease-out;
}
.ft-slider::-moz-range-thumb {
	width: 12px;
	height: 12px;
	border: none;
	border-radius: 50%;
	background: var(--ft-slider-accent);
	box-shadow:
		0 0 6px 1px color-mix(in oklab, var(--ft-slider-accent) 55%, transparent),
		0 0 18px 4px color-mix(in oklab, var(--ft-slider-accent) 22%, transparent);
	transition:
		transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
		box-shadow 200ms ease-out;
}

.ft-slider:not(:disabled):hover::-webkit-slider-thumb,
.ft-slider:not(:disabled):active::-webkit-slider-thumb {
	transform: scale(1.15);
	box-shadow:
		0 0 8px 2px color-mix(in oklab, var(--ft-slider-accent) 65%, transparent),
		0 0 26px 7px color-mix(in oklab, var(--ft-slider-accent) 28%, transparent);
}
.ft-slider:not(:disabled):hover::-moz-range-thumb,
.ft-slider:not(:disabled):active::-moz-range-thumb {
	transform: scale(1.15);
	box-shadow:
		0 0 8px 2px color-mix(in oklab, var(--ft-slider-accent) 65%, transparent),
		0 0 26px 7px color-mix(in oklab, var(--ft-slider-accent) 28%, transparent);
}

/* Grabbing the thumb presses it out further than hover: the spring easing
   above gives it a small overshoot, so the grab reads as physical. */
.ft-slider:not(:disabled):active::-webkit-slider-thumb {
	transform: scale(1.3);
}
.ft-slider:not(:disabled):active::-moz-range-thumb {
	transform: scale(1.3);
}

/* The value bubble lifts a little while the thumb is held. */
.ft-slider-bubble {
	transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ft-slider-wrap:has(.ft-slider:not(:disabled):active) .ft-slider-bubble {
	transform: translateY(-4px) scale(1.06);
}

.ft-slider:focus-visible::-webkit-slider-thumb {
	box-shadow:
		0 0 0 2px var(--color-background, #0f0f13),
		0 0 0 4px var(--ft-slider-accent),
		0 0 18px 4px color-mix(in oklab, var(--ft-slider-accent) 22%, transparent);
}
.ft-slider:focus-visible::-moz-range-thumb {
	box-shadow:
		0 0 0 2px var(--color-background, #0f0f13),
		0 0 0 4px var(--ft-slider-accent),
		0 0 18px 4px color-mix(in oklab, var(--ft-slider-accent) 22%, transparent);
}

.ft-slider:disabled::-webkit-slider-thumb {
	box-shadow: none;
}
.ft-slider:disabled::-moz-range-thumb {
	box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
	.ft-slider {
		animation: none;
		transition: none;
		--ft-slider-glint: 0;
	}
	.ft-slider:not(:disabled):is(:hover, :focus-visible, :active) {
		--ft-slider-glint: 0;
	}
	.ft-slider::-webkit-slider-thumb {
		transition: none;
	}
	.ft-slider::-moz-range-thumb {
		transition: none;
	}
	.ft-slider:not(:disabled):is(:hover, :active)::-webkit-slider-thumb {
		transform: none;
	}
	.ft-slider:not(:disabled):is(:hover, :active)::-moz-range-thumb {
		transform: none;
	}
	.ft-slider-bubble {
		transition: none;
	}
	.ft-slider-wrap:has(.ft-slider:not(:disabled):active) .ft-slider-bubble {
		transform: none;
	}
}
</style>
