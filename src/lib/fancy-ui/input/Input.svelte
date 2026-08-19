<script lang="ts" module>
	import type { FullAutoFill } from "svelte/elements";

	export interface InputProps {
		/** Current value; bindable. */
		value?: string;
		/** Called with the new value on every input event. */
		onValueChange?: (value: string) => void;
		/** Native input type. */
		type?: "text" | "email" | "url" | "tel" | "password" | "search" | "number";
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
		/** Native `autocomplete` hint — the real token set the DOM accepts, not a bare string. */
		autocomplete?: FullAutoFill;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";

	let {
		value = $bindable(""),
		onValueChange,
		type = "text",
		placeholder,
		disabled = false,
		readonly = false,
		required = false,
		invalid = false,
		id,
		name,
		autocomplete,
		label,
		class: className,
		ref = $bindable(null),
	}: InputProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	const classes = $derived(
		cn(
			"ft-input w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);

	// The single place `value` changes. A native `disabled` input never fires
	// `input` from real typing, but a synthetic dispatch walks straight past
	// that guard the same way a synthetic click does on a button — so the
	// early return is repeated here rather than trusted to the attribute alone.
	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) return;
		const next = event.currentTarget.value;
		value = next;
		onValueChange?.(next);
	}
</script>

<input
	bind:this={ref}
	{type}
	{placeholder}
	{name}
	{autocomplete}
	id={effectiveId}
	{value}
	disabled={effectiveDisabled}
	{readonly}
	required={effectiveRequired}
	aria-invalid={effectiveInvalid ? "true" : undefined}
	aria-describedby={field?.describedBy}
	aria-label={label}
	class={classes}
	oninput={handleInput}
/>

<style>
	/*
	 * The brand accent has no semantic token, so it is declared locally with a
	 * light-dark() fallback — the same shape Toggle and Button use for their
	 * own accent ring. The 3px halo is the mockup's focus state exactly;
	 * the resting/error/disabled looks are plain utility classes above.
	 */
	.ft-input:focus-visible {
		--ft-input-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-input-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-input-accent) 25%, transparent);
	}
</style>
