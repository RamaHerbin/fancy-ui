<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface CheckboxProps {
		/**
		 * Whether the box is checked; bindable. This is the real state
		 * underneath even while `indeterminate` is true — a click always
		 * resolves to this value, never to a third state.
		 */
		checked?: boolean;
		/**
		 * Mixed/dash visual state; bindable. A DOM property with no HTML
		 * attribute equivalent, so it is assigned straight to the element and
		 * reapplied whenever this prop changes, not only on mount. Any
		 * interaction that changes `checked` clears it back to `false`.
		 */
		indeterminate?: boolean;
		/** Called with the new checked value whenever the box is activated. */
		onCheckedChange?: (checked: boolean) => void;
		/** Blocks interaction; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Native `required`. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name`, read on form submission. */
		name?: string;
		/** Form value submitted while checked. */
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
		/** Visible label text, rendered beside the box. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the wrapping `<label>`. */
		class?: string;
		/** Element reference to the native `<input>`. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		onCheckedChange,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		value,
		label,
		children,
		class: className,
		ref = $bindable(null),
	}: CheckboxProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// No HTML attribute reflects `indeterminate` — it exists only as a DOM
	// property — so it has to be assigned imperatively. Re-running on every
	// change (not just on mount) is what keeps a later prop update in sync;
	// reading `ref` here rather than caching the element once also covers the
	// element being (re)bound.
	$effect(() => {
		if (ref) ref.indeterminate = indeterminate;
	});

	// The native `disabled` attribute already blocks real interaction, but a
	// synthetic event dispatched straight at the element — as a test does —
	// walks past that guard, so the handler repeats it. Reading the DOM's own
	// post-toggle `checked` (rather than computing `!checked` ourselves)
	// trusts the browser's native activation behaviour for a checkbox, which
	// already resolves an indeterminate box to a real boolean on interaction;
	// `indeterminate` is still cleared explicitly below so the prop mirrors
	// that outcome regardless of how faithfully a given environment applies it.
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
		indeterminate = false;
		onCheckedChange?.(next);
	}

	const wrapperClasses = $derived(
		cn(
			"ft-checkbox inline-flex items-center gap-[10px] text-[13px]",
			effectiveDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
			className
		)
	);
</script>

<label class={wrapperClasses}>
	<input
		bind:this={ref}
		type="checkbox"
		class="ft-checkbox-control border-input"
		id={effectiveId}
		{name}
		{value}
		{checked}
		disabled={effectiveDisabled}
		required={effectiveRequired}
		aria-checked={indeterminate ? "mixed" : checked}
		aria-invalid={effectiveInvalid ? "true" : undefined}
		aria-describedby={field?.describedBy}
		aria-label={label}
		data-invalid={effectiveInvalid ? "true" : undefined}
		onchange={handleChange}
	/>
	{#if children}
		{@render children()}
	{/if}
</label>

<style>
	.ft-checkbox-control {
		--ft-checkbox-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		appearance: none;
		flex: none;
		width: 18px;
		height: 18px;
		margin: 0;
		border-radius: 5px;
		border-width: 1.5px;
		position: relative;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	.ft-checkbox-control:disabled {
		cursor: not-allowed;
	}

	.ft-checkbox-control:checked,
	.ft-checkbox-control:indeterminate {
		border-color: transparent;
		background-color: var(--ft-checkbox-accent);
	}

	/*
	 * A rotated corner of a square border, not a background image or an inline
	 * SVG — it inherits white for free and needs no asset. Checked and
	 * indeterminate each get their own distinct shape (corner vs. flat dash)
	 * rather than only a colour difference between the two.
	 */
	.ft-checkbox-control:checked::after {
		content: "";
		position: absolute;
		left: 5px;
		top: 2px;
		width: 5px;
		height: 9px;
		border: solid white;
		border-width: 0 1.5px 1.5px 0;
		transform: rotate(45deg);
	}

	.ft-checkbox-control:indeterminate::after {
		content: "";
		position: absolute;
		inset: 0;
		margin: auto;
		width: 9px;
		height: 1.5px;
		border-radius: 1px;
		background: white;
	}

	.ft-checkbox-control:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-checkbox-accent) 25%, transparent);
	}

	/*
	 * Echoes aria-invalid on the resting border, same as Input and
	 * RadioGroupItem. On its own this would vanish exactly when the box
	 * fills in for checked/indeterminate, since the border goes transparent
	 * under the fill — the outline ring below is what survives that.
	 */
	.ft-checkbox-control[data-invalid="true"]:not(:checked):not(:indeterminate) {
		border-color: var(--color-destructive, oklch(0.63 0.24 25));
	}

	/*
	 * A ring outside the box, not a colour change to the fill or border — this
	 * is what keeps the invalid cue visible once checked or indeterminate
	 * fills the box and makes its own border transparent. It is unconditional
	 * (not scoped to :checked), so resting, checked and indeterminate all
	 * carry the same shape cue rather than only the resting look getting one.
	 * Offset past the focus-visible halo (0–3px) so the two rings never
	 * visually merge into one blurred band when both are active at once.
	 */
	.ft-checkbox-control[data-invalid="true"] {
		outline: 1.5px solid var(--color-destructive, oklch(0.63 0.24 25));
		outline-offset: 3px;
	}
</style>
