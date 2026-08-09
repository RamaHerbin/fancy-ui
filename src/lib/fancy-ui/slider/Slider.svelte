<script lang="ts" module>
	export interface SliderProps {
		/** Current value; bindable. */
		value?: number;
		/** Called with the new value on every input event. */
		onValueChange?: (value: number) => void;
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
		class?: string;
		/** Reference to the underlying `<input type="range">`. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";

	let {
		value = $bindable(0),
		onValueChange,
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
		ref = $bindable(null),
	}: SliderProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	// Slider carries no local `invalid` prop of its own — a surrounding
	// FormField is the only source for it, same as aria-describedby below.
	// `field.required` has no counterpart here at all: the ARIA slider role
	// does not support aria-required (a range always carries a value, so
	// there is no "empty" state to require filling in), and any visible
	// required marker is the FormField's own Label to render, not this input's.
	const effectiveInvalid = $derived(field?.invalid ?? false);

	// A native range input clamps its own displayed value to [min,max]
	// automatically, but a `value` prop set out of range (or left there
	// after `max` shrinks past it at runtime) would otherwise leave
	// aria-valuenow and the showValue bubble reporting the raw, unclamped
	// number while the thumb sits wherever the browser actually clamped it —
	// visible to a sighted user as a bubble that disagrees with the thumb's
	// own position. Every render below reads `clampedValue`, not `value`, so
	// this is correct from the very first paint (including SSR) regardless
	// of when the effect below gets around to correcting the prop itself.
	const clampedValue = $derived(Math.min(max, Math.max(min, value)));

	// Also corrects the bindable `value` itself, the same way NumberInput
	// clamps on blur, so a caller's own bound variable does not stay
	// silently out of range forever. `min`/`max` are read normally, so they
	// are this effect's only tracked dependency; `value` is read through
	// `untrack` so that writing it below can never cause this same effect to
	// re-run — deliberately not the "read and write one $state inside one
	// effect" shape, since what this effect reacts to (min/max) and what it
	// corrects (value) are kept separate on purpose.
	$effect(() => {
		const current = untrack(() => value);
		const clamped = Math.min(max, Math.max(min, current));
		if (clamped !== current) {
			value = clamped;
			onValueChange?.(clamped);
		}
	});

	// The one number the gradient fill and the value bubble both need, computed
	// once here rather than duplicated as a CSS calc() on each consumer of it.
	const fraction = $derived(
		max > min ? Math.min(1, Math.max(0, (clampedValue - min) / (max - min))) : 0
	);

	// The single place `value` changes. A native `disabled` input never fires
	// `input` from a real drag or key press, but a synthetic dispatch walks
	// straight past that guard the same way a synthetic click does on a
	// button — so the early return is repeated here rather than trusted to
	// the attribute alone.
	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) return;
		const next = Number(event.currentTarget.value);
		value = next;
		onValueChange?.(next);
	}
</script>

<div class={cn("ft-slider-wrap flex w-full flex-col gap-4", className)}>
	<div class="relative" style:padding-top={showValue ? "22px" : undefined}>
		{#if showValue}
			<!-- Decorative: the input's own aria-valuenow already carries this
			     number for assistive tech, so the bubble is hidden from it to
			     avoid announcing the value twice. -->
			<span
				class="ft-slider-bubble border-input bg-background pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap"
				style:left="{fraction * 100}%"
				style:color="var(--ft-slider-accent-end)"
				aria-hidden="true"
			>
				{clampedValue}
			</span>
		{/if}
		<input
			bind:this={ref}
			type="range"
			class="ft-slider h-1 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			id={effectiveId}
			{name}
			{min}
			{max}
			{step}
			value={clampedValue}
			disabled={effectiveDisabled}
			aria-describedby={field?.describedBy}
			aria-invalid={effectiveInvalid ? "true" : undefined}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={clampedValue}
			aria-label={label}
			style:--ft-slider-fill="{fraction * 100}%"
			oninput={handleInput}
		/>
	</div>
	{#if showBounds}
		<!-- Decorative echo of min/max; the authoritative values live on the
		     input's own min/max/aria-valuemin/aria-valuemax attributes. -->
		<div class="text-muted-foreground flex justify-between text-[11px]" aria-hidden="true">
			<span>{min}</span>
			<span>{max}</span>
		</div>
	{/if}
</div>

<style>
	/*
	 * Declared on the wrapper, not on `.ft-slider` itself, so the value bubble
	 * — a sibling `<span>`, not a descendant of the input — can inherit the
	 * same two custom properties for its text colour instead of duplicating
	 * the values. Custom properties inherit down the whole subtree (including
	 * into the input's own vendor thumb/track pseudo-elements below), just
	 * not sideways between siblings, which is what forced this up a level.
	 */
	.ft-slider-wrap {
		--ft-slider-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		/*
		 * The fill's cool end has no semantic token either — declared the same
		 * shape as the accent above, just a second stop for the purple-to-cyan
		 * gradient the mockup shows tracking the current value.
		 * Precomputed: #42cfff = oklch(0.8001 0.1345 225.49). Its darker
		 * light-mode partner is derived the same way the accent pair's is —
		 * lightness and chroma scaled by the accent pair's own light:dark
		 * ratios (≈0.899 and ≈0.970), hue shifted by the same ≈-1.53° — giving
		 * oklch(0.7196 0.1305 223.96). Light mode takes the darker end.
		 */
		--ft-slider-accent-end: light-dark(oklch(0.7196 0.1305 223.96), oklch(0.8001 0.1345 225.49));
	}

	/*
	 * A native range input has no cross-browser "filled portion" of its own.
	 * WebKit lets the track's background do double duty: a hard-stop gradient
	 * paints the accent up to --ft-slider-fill and the resting track colour
	 * after it. Firefox has no equivalent hook on ::-moz-range-track, so its
	 * filled portion is drawn as the separate ::-moz-range-progress layer
	 * below instead.
	 */
	.ft-slider::-webkit-slider-runnable-track {
		height: 4px;
		border-radius: 999px;
		background: linear-gradient(
			to right,
			var(--ft-slider-accent),
			var(--ft-slider-accent-end) var(--ft-slider-fill, 0%),
			var(--color-input, color-mix(in oklab, currentColor 12%, transparent))
				var(--ft-slider-fill, 0%)
		);
	}
	.ft-slider::-moz-range-track {
		height: 4px;
		border-radius: 999px;
		background: var(--color-input, color-mix(in oklab, currentColor 12%, transparent));
	}
	.ft-slider::-moz-range-progress {
		height: 4px;
		border-radius: 999px;
		background: linear-gradient(to right, var(--ft-slider-accent), var(--ft-slider-accent-end));
	}

	/*
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
		width: 14px;
		height: 14px;
		margin-top: -5px; /* centers a 14px thumb on the 4px track */
		border-radius: 50%;
		background: var(--color-background, #0f0f13);
		border: 2px solid var(--ft-slider-accent);
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--ft-slider-accent) 25%, transparent);
	}
	.ft-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--color-background, #0f0f13);
		border: 2px solid var(--ft-slider-accent);
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--ft-slider-accent) 25%, transparent);
	}

	.ft-slider:disabled::-webkit-slider-thumb {
		box-shadow: none;
	}
	.ft-slider:disabled::-moz-range-thumb {
		box-shadow: none;
	}
</style>
