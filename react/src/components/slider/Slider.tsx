import { forwardRef, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./slider.css";

export interface SliderProps {
	/** Current value; seeds internal state and resyncs whenever the prop changes. */
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
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
	(
		{
			value: valueProp = 0,
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
			className,
			sound = false,
		},
		ref
	) => {
		// `value` mirrors the Svelte side's `value = $bindable(0)`: the prop
		// seeds internal state, the component keeps writing that state itself
		// on every input event, and a caller that re-passes a NEW prop value
		// resyncs it — the render-phase adjust below, same shape as Input's.
		const [value, setValue] = useState(valueProp);
		const [seededFrom, setSeededFrom] = useState(valueProp);
		if (valueProp !== seededFrom) {
			setSeededFrom(valueProp);
			setValue(valueProp);
		}

		// Undefined outside a FormField — every derived below then falls back to
		// this component's own props instead of the context, so the control works
		// standalone exactly as it does wrapped.
		const field = useField();

		const effectiveId = field?.controlId ?? id;
		const effectiveDisabled = field?.disabled ?? disabled;
		// Slider carries no local `invalid` prop of its own — a surrounding
		// FormField is the only source for it, same as aria-describedby below.
		// `field.required` has no counterpart here at all: the ARIA slider role
		// does not support aria-required (a range always carries a value, so
		// there is no "empty" state to require filling in), and any visible
		// required marker is the FormField's own Label to render, not this input's.
		const effectiveInvalid = field?.invalid ?? false;

		// A native range input clamps its own displayed value to [min,max]
		// automatically, but a `value` prop set out of range (or left there
		// after `max` shrinks past it at runtime) would otherwise leave
		// aria-valuenow and the showValue bubble reporting the raw, unclamped
		// number while the thumb sits wherever the browser actually clamped it —
		// visible to a sighted user as a bubble that disagrees with the thumb's
		// own position. Every render below reads `clampedValue`, not `value`, so
		// this is correct from the very first paint (including SSR) regardless
		// of when the effect below gets around to correcting the state itself.
		const clampedValue = Math.min(max, Math.max(min, value));

		// Also corrects `value` itself, the same way NumberInput clamps on
		// blur, so a caller's own state does not stay silently out of range
		// forever. `min`/`max` are the only tracked dependency, matching the
		// Svelte source's `$effect` which reads `value` through `untrack` —
		// here that untracked read is `valueRef`, a plain mutable ref kept in
		// sync with `value` on every render (not `useLiveRef`, whose contract
		// is read-only: this effect also WRITES the mirror back, below, so a
		// StrictMode re-invoke sees the already-corrected number instead of
		// the stale one). The clamp is computed in the effect BODY, never
		// inside a `setValue` updater: React runs updaters during the next
		// render pass (twice under StrictMode), so calling `onValueChange`
		// from one would fire a consumer's callback twice for a single clamp
		// and update a parent from another component's render phase.
		const valueRef = useRef(value);
		valueRef.current = value;
		useEffect(() => {
			const current = valueRef.current;
			const clamped = Math.min(max, Math.max(min, current));
			if (clamped !== current) {
				// Written back before the state lands so a StrictMode
				// re-invoke of this same effect sees the corrected number and
				// stays a no-op.
				valueRef.current = clamped;
				setValue(clamped);
				onValueChange?.(clamped);
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [min, max]);

		// The one number the gradient fill and the value bubble both need,
		// computed once here rather than duplicated as a CSS calc() on each
		// consumer of it.
		const fraction = max > min ? Math.min(1, Math.max(0, (clampedValue - min) / (max - min))) : 0;

		// The single place `value` changes. A native `disabled` input never fires
		// `input` from a real drag or key press, but a synthetic dispatch walks
		// straight past that guard the same way a synthetic click does on a
		// button — so the early return is repeated here rather than trusted to
		// the attribute alone.
		function handleInput(event: ChangeEvent<HTMLInputElement>) {
			if (effectiveDisabled) return;
			const next = Number(event.currentTarget.value);
			setValue(next);
			onValueChange?.(next);
		}

		// React's `onChange` prop on a controlled range input is wired to the
		// native `input` event (handleInput above), which fires continuously
		// while dragging — the wrong moment for a cue that must fire once per
		// commit. The native `change` event (drag release, or once per
		// committed keyboard step) has no React prop of its own, so it is
		// picked up with a plain listener on the node itself, mirroring the
		// Svelte source's separate `oninput`/`onchange` handlers.
		const [inputNode, inputNodeRef] = useElementRef<HTMLInputElement>();
		const composedRef = useComposedRefs(ref, inputNodeRef);
		const effectiveDisabledRef = useLiveRef(effectiveDisabled);
		const playCue = useSoundCue(sound);
		useEffect(() => {
			if (!inputNode) return;
			function handleChange() {
				if (effectiveDisabledRef.current) return;
				playCue("tick");
			}
			inputNode.addEventListener("change", handleChange);
			return () => inputNode.removeEventListener("change", handleChange);
		}, [inputNode, effectiveDisabledRef, playCue]);

		return (
			<div className={cn("ft-slider-wrap flex w-full flex-col gap-4", className)}>
				<div className="relative" style={showValue ? { paddingTop: "22px" } : undefined}>
					{showValue && (
						// Decorative: the input's own aria-valuenow already carries this
						// number for assistive tech, so the bubble is hidden from it to
						// avoid announcing the value twice.
						<span
							className="ft-slider-bubble border-input bg-background pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap"
							style={{ left: `${fraction * 100}%`, color: "var(--ft-slider-accent-end)" }}
							aria-hidden="true"
						>
							{clampedValue}
						</span>
					)}
					<input
						ref={composedRef}
						type="range"
						className="ft-slider h-1 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						id={effectiveId}
						name={name}
						min={min}
						max={max}
						step={step}
						value={clampedValue}
						disabled={effectiveDisabled}
						aria-describedby={field?.describedBy}
						aria-invalid={effectiveInvalid ? "true" : undefined}
						aria-valuemin={min}
						aria-valuemax={max}
						aria-valuenow={clampedValue}
						aria-label={label}
						style={{ "--ft-slider-fill": `${fraction * 100}%` } as React.CSSProperties}
						onChange={handleInput}
					/>
				</div>
				{showBounds && (
					// Decorative echo of min/max; the authoritative values live on the
					// input's own min/max/aria-valuemin/aria-valuemax attributes.
					<div className="text-muted-foreground flex justify-between text-[11px]" aria-hidden="true">
						<span>{min}</span>
						<span>{max}</span>
					</div>
				)}
			</div>
		);
	}
);

Slider.displayName = "Slider";
