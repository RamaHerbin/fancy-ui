<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { FIELD_KEY, createFieldState } from "../_internals/field.svelte.js";
	import { preset } from "../_internals/motion/transitions.js";
	import { prefersReducedMotion } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import Label from "../label/Label.svelte";
	import type { FormFieldProps } from "./types.js";

	// Both message paragraphs and the valid glyph arrive the same way: a small
	// grow-and-fade, so a message that appears under a field the user is
	// typing in reads as "this just changed" instead of as a layout jolt.
	//
	// `in:` on every one of them, never `transition:`. The error and the
	// description are the two branches of ONE `{#if}`, and each carries the id
	// that `aria-describedby` points at — an outro would leave a paragraph on
	// screen for 150ms after the control had already stopped describing it,
	// which is an accessibility hazard rather than a nicety. With `in:` only,
	// the outgoing branch is gone in the same tick the incoming one mounts, so
	// the id wiring and the pixels never disagree.
	//
	// `prefersReducedMotion()` is called from each params expression at the
	// call site rather than stored here: Svelte re-evaluates a directive's
	// params on every invocation, so the preference is read at the instant the
	// transition starts, never at construction and never during SSR.
	// `duration: 0` makes Svelte skip `element.animate()` outright.
	const pop = preset("scale");

	let {
		label,
		description,
		error,
		valid = false,
		required = false,
		disabled = false,
		id,
		children,
		class: className,
		ref = $bindable(null),
	}: FormFieldProps = $props();

	// A single per-instance seed, suffixed for the control and both message
	// ids — the property the brief scoping this wave asked for ("a page with
	// ten fields has no collisions") from a single generator call. That brief
	// named _internals/id.ts's uid() for the job, but uid() throws outside
	// the browser by design (its counter can't agree between server and
	// client), and a FormField that only renders once JS has hydrated is not
	// on the table for a form primitive. $props.id() gives the identical
	// guarantee — one seed, N collision-free suffixes across a page — safely
	// during SSR, and it is already how every other multi-id component here
	// (ReasoningPanel, ComposerCommandMenu, ToolCall, ...) solves this exact
	// problem.
	//
	// `base` is that seed, or the caller's own `id` when given — either way,
	// every id this field hands out is a suffix of the same value, so a
	// caller who supplies `id="email"` can predict `email-description` and
	// `email-error` too. That matters beyond tidiness: a control that isn't
	// context-aware (none of this wave's controls exist yet where this file
	// lives) still has a documented, stable way to wire itself up by hand.
	const uid = $props.id();
	const base = $derived(id ?? uid);
	const controlId = $derived(id ?? `${uid}-control`);
	const descriptionId = $derived(`${base}-description`);
	const errorId = $derived(`${base}-error`);
	// Undefined, not a generated id with nothing pointing at it, while no
	// label is rendered — labelId exists specifically so a control's
	// aria-labelledby never targets an id with no element behind it, the
	// same rule describedBy already follows for help/error.
	const labelId = $derived(label ? `${base}-label` : undefined);

	const hasError = $derived(!!error);
	// Error replaces help text rather than stacking under it — the mockup
	// never shows both at once, and stale help sitting under a live error
	// would just be noise competing with the message that actually matters.
	const hasDescription = $derived(!hasError && !!description);
	// `createFieldState` itself also enforces "error wins" on `field.valid` —
	// this local copy only needs to gate FormField's own decorative glyph
	// below, but is derived the same way so the two never disagree.
	const showValid = $derived(valid && !hasError);

	const field = createFieldState({
		controlId: () => controlId,
		labelId: () => labelId,
		descriptionId: () => descriptionId,
		errorId: () => errorId,
		hasDescription: () => hasDescription,
		hasError: () => hasError,
		valid: () => valid,
		required: () => required,
		disabled: () => disabled,
	});
	setContext(FIELD_KEY, field);

	const classes = $derived(cn("ft-form-field flex flex-col gap-1.5", className));
</script>

<div bind:this={ref} class={classes}>
	{#if label}
		<!-- No for/required passed explicitly: Label reads both straight off
		     this same context, which is the entire point of publishing it. -->
		<Label>{label}</Label>
	{/if}

	{@render children?.()}

	{#if hasError}
		<p
			id={errorId}
			class="ft-form-field-message text-destructive flex items-center gap-1.5 text-[12px]"
			in:pop={{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast }}
		>
			<span aria-hidden="true">✕</span>
			{error}
		</p>
	{:else if hasDescription}
		<p
			class="ft-form-field-message text-muted-foreground flex items-center gap-1.5 text-[12px]"
			id={descriptionId}
			in:pop={{ duration: prefersReducedMotion() ? 0 : DURATIONS.fast }}
		>
			{#if showValid}
				<!-- Decorative reinforcement of the help text next to it, not a
				     replacement for it — see the README for why this doesn't grow
				     its own message the way the error state does.

				     A glyph-scale beat, not a message-scale one: it is one
				     character wide, so it gets `micro` (80ms) rather than the
				     paragraph's 150ms. It also only animates when `valid` flips
				     while the help text is ALREADY on screen — mounted together
				     with its paragraph, this `{#if}` is running for the first
				     time and Svelte skips a local intro, which is exactly right
				     for a field that renders already-valid. -->
				<span
					aria-hidden="true"
					class="ft-form-field-valid-glyph"
					in:pop={{ duration: prefersReducedMotion() ? 0 : DURATIONS.micro }}>✓</span
				>
			{/if}
			{description}
		</p>
	{/if}
</div>

<style>
	/*
	 * `--ft-status-done` is the family's "operation landed"/success vocabulary
	 * — the same token CopyButton, ToolCall, AgentPlan, ContextRing and others
	 * read. Reusing it (fallback hue included, not a fresh literal) means a
	 * validated field sitting near any of those on the same page reads as one
	 * palette, and retinting the token once moves every success surface in
	 * the library together, this one included.
	 */
	.ft-form-field-valid-glyph {
		color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
	}
</style>
