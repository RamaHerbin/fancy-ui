<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface LabelProps {
		/** Explicit target id. Inside a FormField the field's own control id wins — see the README. */
		for?: string;
		/** Renders the required asterisk. Inside a FormField the field's own `required` wins. */
		required?: boolean;
		/** The label text/content. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLLabelElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";

	let {
		for: forProp,
		required = false,
		children,
		class: className,
		ref = $bindable(null),
	}: LabelProps = $props();

	// A surrounding FormField exists specifically so a caller never wires
	// `for` by hand, so it is the authority over both of these whenever one
	// is present — the same precedence every control in this wave follows
	// for its own id/required/disabled. Standalone, with no FormField above,
	// the plain props are all there is.
	const field = getField();
	const resolvedFor = $derived(field?.controlId ?? forProp);
	const resolvedRequired = $derived(field?.required ?? required);
	// Not a prop — `field.labelId` only exists to be carried on *this*
	// element, so a control whose root isn't labelable (a `<div
	// role="radiogroup">`, say) has an id to point its own `aria-labelledby`
	// at. `undefined` outside a FormField: nothing needs to reach a
	// standalone Label that way, `for` already does the job wherever it
	// applies.
	const labelId = $derived(field?.labelId);

	const classes = $derived(cn("ft-label text-[13px] font-medium", className));
</script>

<label bind:this={ref} id={labelId} for={resolvedFor} class={classes}>
	{@render children?.()}
	{#if resolvedRequired}
		<span aria-hidden="true" class="text-destructive">*</span>
	{/if}
</label>
