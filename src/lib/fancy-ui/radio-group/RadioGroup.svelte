<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type RadioGroupOrientation = "horizontal" | "vertical";

	export interface RadioGroupProps {
		/** The selected value, bindable. `""` means nothing is selected. */
		value?: string;
		/** Called with the new value whenever the selection changes. */
		onValueChange?: (value: string) => void;
		/**
		 * The `name` shared by every item's native radio input. Generated when
		 * omitted — see the README — so two groups on the same page never fight
		 * over each other's selection.
		 */
		name?: string;
		/** Disables every item in the group. */
		disabled?: boolean;
		/** Marks the group required for native form validation. */
		required?: boolean;
		/** Marks the group invalid — sets `aria-invalid` on the group. */
		invalid?: boolean;
		/** The list's stacking axis. */
		orientation?: RadioGroupOrientation;
		/**
		 * Accessible name for the group, standalone. Inside a `FormField` that
		 * rendered its own label, `field.labelId` wins instead — see the
		 * README — since this root is a `<div role="radiogroup">`, not
		 * something `<label for>` can target; only a FormField with no
		 * `label` of its own falls back to this prop.
		 */
		label?: string;
		/** The `RadioGroupItem`s. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/**
		 * Plays the matching interface cue through the sound controller. Off
		 * by default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { RADIO_GROUP_KEY, type RadioGroupContext } from "./types.js";

	let {
		value = $bindable(""),
		onValueChange,
		name,
		disabled = false,
		required = false,
		invalid = false,
		orientation = "vertical",
		label,
		children,
		class: className,
		sound = false,
		ref = $bindable(null),
	}: RadioGroupProps = $props();

	// Standalone by default; a surrounding FormField wins for id, described-by,
	// invalid, required and disabled so a caller never wires those by hand.
	const field = getField();

	// `_internals/id.js`'s `uid()` is client-only by design (its counter
	// can't agree between server and client) — deferring name generation to
	// an `$effect` until mount would leave every radio without a `name` at
	// all until hydration, and this component's own README asks for the
	// opposite: two same-page groups must stay independent from first
	// paint, not just after JS runs. `$props.id()` gives the same
	// one-generator-per-instance guarantee safely during SSR, and it is
	// already how FormField (this same wave's other id-generating form
	// primitive) solves this exact problem, for the same reason.
	const uid = $props.id();
	const generatedName = `${uid}-name`;

	const resolvedName = $derived(name ?? generatedName);

	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// The only place `value` changes. A plain function called from an
	// item's event handler, not an $effect — writing `value` there would
	// mean reading and writing the same state in one pass, and would fight a
	// caller's own `bind:value` write.
	function select(itemValue: string) {
		if (effectiveDisabled) return;
		const changed = value !== itemValue;
		value = itemValue;
		if (sound && changed) soundFx.play("select");
		onValueChange?.(itemValue);
	}

	const context: RadioGroupContext = {
		get name() {
			return resolvedName;
		},
		get value() {
			return value;
		},
		get disabled() {
			return effectiveDisabled;
		},
		get required() {
			return effectiveRequired;
		},
		get invalid() {
			return effectiveInvalid;
		},
		isSelected(itemValue) {
			return value === itemValue;
		},
		select,
	};

	setContext(RADIO_GROUP_KEY, context);

	const classes = $derived(
		cn(
			"ft-radio-group inline-flex",
			orientation === "vertical"
				? "flex-col gap-[10px]"
				: "flex-row flex-wrap gap-x-[20px] gap-y-[10px]",
			className
		)
	);
</script>

<!--
	`controlId`/`<label for>` cannot label this element — a div with
	role="radiogroup" is not one of the elements `for` can target, ARIA role
	or not — so `field.labelId` (the id of the label FormField actually
	rendered) drives `aria-labelledby` instead. `field.labelId` is
	`undefined` both outside a FormField and inside one that rendered no
	label of its own, and in both of those cases the own `label` prop is
	what has to carry the accessible name — so `aria-label` only renders
	when there is no `labelId` to point at, never both at once.
-->
<div
	bind:this={ref}
	id={field?.controlId}
	class={classes}
	role="radiogroup"
	data-orientation={orientation}
	aria-label={field?.labelId ? undefined : label}
	aria-labelledby={field?.labelId}
	aria-describedby={field?.describedBy}
	aria-invalid={effectiveInvalid ? "true" : undefined}
	aria-required={effectiveRequired ? "true" : undefined}
>
	{#if children}
		{@render children()}
	{/if}
</div>
