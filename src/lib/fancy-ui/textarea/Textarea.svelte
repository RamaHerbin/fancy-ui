<script lang="ts" module>
	import type { FullAutoFill } from "svelte/elements";

	export interface TextareaProps {
		/** Current value; bindable. */
		value?: string;
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
		/** Native `autocomplete` hint — the real token set the DOM accepts, not a bare string. */
		autocomplete?: FullAutoFill;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Visible height in text rows before anything grows it. Also the no-JS fallback height. */
		rows?: number;
		/** Native character ceiling; also the counter's denominator. */
		maxlength?: number;
		/** Renders the live "n / max" counter under the field. */
		showCount?: boolean;
		/** Grows to fit content instead of scrolling; disables manual resize. */
		autoResize?: boolean;
		/** Additional CSS classes — applied to the `<textarea>` itself, not the wrapper. */
		class?: string;
		/** Element reference. */
		ref?: HTMLTextAreaElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";

	let {
		value = $bindable(""),
		onValueChange,
		placeholder,
		disabled = false,
		readonly = false,
		required = false,
		invalid = false,
		id,
		name,
		autocomplete,
		label,
		rows = 3,
		maxlength,
		showCount = false,
		autoResize = false,
		class: className,
		ref = $bindable(null),
	}: TextareaProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	const uid = $props.id();
	const countId = `${uid}-count`;
	const count = $derived(value.length);
	const atLimit = $derived(maxlength != null && count >= maxlength);

	// The count rides along on aria-describedby instead of an aria-live
	// region. A screen reader announces a field's description once, when
	// focus lands on it — wiring the counter into the description reports
	// the current count on focus without re-announcing it on every keystroke
	// the way a polite live region would while the user is still typing. The
	// visible counter span below *is* the description target, so there is no
	// separate hidden node to keep in sync with it.
	const describedBy = $derived(
		[field?.describedBy, showCount ? countId : undefined].filter(Boolean).join(" ") || undefined
	);

	const classes = $derived(
		cn(
			"ft-textarea w-full rounded-[8px] border border-input bg-background px-[12px] py-[10px] text-[13px] leading-[1.5] text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			autoResize ? "resize-none overflow-hidden" : "resize-y",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);

	// Measured once from the mounted element: line-height/padding/border
	// don't change under this component's feet, so re-reading them on every
	// keystroke would force a layout for an answer already known.
	let metrics: { line: number; extra: number } | null = null;

	function px(input: string): number {
		const parsed = Number.parseFloat(input);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function measure(el: HTMLTextAreaElement): { line: number; extra: number } {
		if (metrics) return metrics;
		const style = getComputedStyle(el);
		const declared = Number.parseFloat(style.lineHeight);
		const fontSize = Number.parseFloat(style.fontSize);
		// jsdom (and a `line-height: normal` in real browsers) reports no
		// usable line-height at all — fall back to a 1.5x multiple of the
		// font size, then to a flat pixel guess if even that is unavailable.
		const line =
			Number.isFinite(declared) && declared > 0
				? declared
				: Number.isFinite(fontSize) && fontSize > 0
					? fontSize * 1.5
					: 20;
		const padding = px(style.paddingTop) + px(style.paddingBottom);
		// scrollHeight covers content and padding but never the border, which
		// a border-box height does include.
		const border =
			style.boxSizing === "border-box" ? px(style.borderTopWidth) + px(style.borderBottomWidth) : 0;
		metrics = { line, extra: padding + border };
		return metrics;
	}

	/**
	 * Fits the box to its content, floored at `rows`.
	 *
	 * `height: auto` first, otherwise `scrollHeight` reports the box already
	 * set rather than the text inside it, and the element could only ever
	 * grow. Measures and writes within the same call, and only ever touches
	 * `el.style` — never a `$state` — so this can never re-trigger the effect
	 * that calls it below.
	 */
	function grow() {
		const el = ref;
		if (!el) return;
		const { line, extra } = measure(el);
		el.style.height = "auto";
		const min = rows * line + extra;
		el.style.height = `${Math.max(el.scrollHeight, min)}px`;
	}

	function handleInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
		if (effectiveDisabled) return;
		const next = event.currentTarget.value;
		value = next;
		onValueChange?.(next);
		if (autoResize) grow();
	}

	// Growth also has to answer to writes that never pass through
	// `handleInput` — a bound value assigned from outside, or a restored
	// draft. Reads `value`, writes only `el.style.height`, so it can never
	// wake itself.
	$effect(() => {
		if (!autoResize) return;
		void value;
		grow();
	});
</script>

<div class="ft-textarea-wrapper flex w-full flex-col gap-1.5">
	<textarea
		bind:this={ref}
		id={effectiveId}
		{placeholder}
		{name}
		{autocomplete}
		{rows}
		{maxlength}
		disabled={effectiveDisabled}
		{readonly}
		required={effectiveRequired}
		aria-invalid={effectiveInvalid ? "true" : undefined}
		aria-describedby={describedBy}
		aria-label={label}
		class={classes}
		{value}
		oninput={handleInput}
	></textarea>
	{#if showCount}
		<span
			id={countId}
			class="ft-textarea-count text-muted-foreground self-end text-[11px]"
			data-limit-reached={atLimit ? "true" : undefined}
		>
			{count}{maxlength != null ? ` / ${maxlength}` : ""}
		</span>
	{/if}
</div>

<style>
	/*
	 * The brand accent has no semantic token, so it is declared locally with a
	 * light-dark() fallback — the same shape Toggle, Button and Input use for
	 * their own accent ring.
	 */
	.ft-textarea:focus-visible {
		--ft-textarea-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-textarea-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-textarea-accent) 25%, transparent);
	}

	/* Reaching the character limit needs a cue that survives without colour:
	   weight carries it here, so a colour-blind or monochrome-display reader
	   still sees the counter's state change, not just its digits. */
	.ft-textarea-count[data-limit-reached="true"] {
		font-weight: 600;
	}
</style>
