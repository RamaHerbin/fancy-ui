<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type SwitchSize = "sm" | "md" | "lg";

	export interface SwitchProps {
		/** Whether the switch is on; bindable. */
		checked?: boolean;
		/** Called with the new value whenever the switch is activated. */
		onCheckedChange?: (checked: boolean) => void;
		/** Blocks interaction; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Native `required`. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name`, read on form submission. */
		name?: string;
		/** Form value submitted while on. */
		value?: string;
		/**
		 * Accessible name, rendered as `aria-label`. Typically for a control
		 * with no visible `children` text; also applies alongside `children`
		 * that render no text of their own (e.g. an icon), since the two props
		 * aren't mutually exclusive and there is no way to detect from here
		 * whether an arbitrary `Snippet` renders text. Skip this when
		 * `children` already supplies the visible label text — passing both
		 * means `aria-label` wins the accessible name and the visible text is
		 * announced by nothing.
		 */
		label?: string;
		/** Visible label text, rendered beside the track. */
		children?: Snippet;
		/** Track/knob size. */
		size?: SwitchSize;
		/** Additional CSS classes, merged onto the wrapping `<label>`. */
		class?: string;
		/**
		 * Plays the matching interface cue through the sound controller. Off
		 * by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Element reference to the native `<input>`. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		checked = $bindable(false),
		onCheckedChange,
		disabled = false,
		required = false,
		id,
		name,
		value,
		label,
		children,
		size = "md",
		class: className,
		sound = false,
		ref = $bindable(null),
	}: SwitchProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. Switch has no own `invalid` prop
	// (a switch takes effect immediately; there is usually nothing to
	// validate), but it still surfaces aria-invalid when a surrounding
	// FormField says the field is invalid.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? false);

	// The native `disabled` attribute already blocks real interaction, but a
	// synthetic event dispatched straight at the element — as a test does —
	// walks past that guard, so the handler repeats it.
	function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) {
			// A disabled control must never let its visible state drift from the
			// app's own model. A real browser already refuses to run the
			// default toggle action on a disabled checkbox, but a synthetic
			// event dispatched straight at the element — as a test does — can
			// still mutate the DOM property directly, so the handler puts it
			// back rather than trusting the guard above alone.
			event.currentTarget.checked = checked;
			return;
		}
		const next = event.currentTarget.checked;
		checked = next;
		if (sound) soundFx.play(next ? "toggle-on" : "toggle-off");
		onCheckedChange?.(next);
	}

	const wrapperClasses = $derived(
		cn(
			"ft-switch-wrap inline-flex items-center gap-[10px] text-[13px]",
			effectiveDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
			className
		)
	);
</script>

<label class={wrapperClasses}>
	<input
		bind:this={ref}
		type="checkbox"
		role="switch"
		data-size={size}
		class="ft-switch"
		id={effectiveId}
		{name}
		{value}
		{checked}
		disabled={effectiveDisabled}
		required={effectiveRequired}
		aria-checked={checked}
		aria-invalid={effectiveInvalid ? "true" : undefined}
		aria-describedby={field?.describedBy}
		aria-label={label}
		onchange={handleChange}
	/>
	{#if children}
		{@render children()}
	{/if}
</label>

<style>
	/*
	 * The native input IS the track — restyled, not replaced. The knob is a
	 * `::after` pseudo-element on it rather than a second DOM node, so the
	 * input stays the only focusable, checkable thing (same rule
	 * RadioGroupItem's own filled centre follows).
	 */
	.ft-switch {
		--ft-switch-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		appearance: none;
		flex: none;
		margin: 0;
		border-radius: 999px;
		background-color: var(--color-input, rgba(154, 163, 178, 0.3));
		position: relative;
		cursor: pointer;
		vertical-align: middle;
		transition: background-color 0.15s ease;
	}

	.ft-switch::after {
		content: "";
		position: absolute;
		top: 3px;
		left: 3px;
		border-radius: 50%;
		background-color: var(--color-muted-foreground, #9aa3b2);
		transition: background-color 0.15s ease;
	}

	.ft-switch:checked {
		background-color: var(--ft-switch-accent);
	}

	.ft-switch:checked::after {
		background-color: white;
	}

	.ft-switch:disabled {
		cursor: not-allowed;
	}

	.ft-switch:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-switch-accent) 25%, transparent);
	}

	/*
	 * Geometry per size — exact pixel values, not the closest Tailwind scale
	 * step, so the three sizes stay proportioned to each other and the
	 * knob's travel always lands exactly on
	 * track width − knob size − 2 × inset.
	 */
	.ft-switch[data-size="sm"] {
		width: 32px;
		height: 18px;
	}
	.ft-switch[data-size="sm"]::after {
		width: 12px;
		height: 12px;
	}
	.ft-switch[data-size="sm"]:checked::after {
		transform: translateX(14px);
	}

	.ft-switch[data-size="md"] {
		width: 40px;
		height: 22px;
	}
	.ft-switch[data-size="md"]::after {
		width: 16px;
		height: 16px;
	}
	.ft-switch[data-size="md"]:checked::after {
		transform: translateX(18px);
	}

	.ft-switch[data-size="lg"] {
		width: 48px;
		height: 26px;
	}
	.ft-switch[data-size="lg"]::after {
		width: 20px;
		height: 20px;
	}
	.ft-switch[data-size="lg"]:checked::after {
		transform: translateX(22px);
	}

	/*
	 * The knob's slide is the only motion here — colour changes above are
	 * exempt from reduced-motion the same way Toggle's and Input's own
	 * hover/pressed colour transitions are, but a moving element needs the
	 * opt-out. Under reduced motion the knob still lands in the right place,
	 * it just snaps instead of sliding.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-switch::after {
			transition:
				background-color 0.15s ease,
				transform 0.15s ease;
		}
	}
</style>
