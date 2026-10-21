<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	export interface CollapsibleTriggerOwnProps {
		/** Disables this trigger on top of the root's own `disabled`. */
		disabled?: boolean;
		/** The trigger's content. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLButtonElement | null;
	}

	/** Native `<button>` attributes and listeners are forwarded; `id`, `type`, `aria-expanded`, `aria-controls` and `data-state` stay the component's. */
	export type CollapsibleTriggerProps = CollapsibleTriggerOwnProps &
		Omit<HTMLButtonAttributes, keyof CollapsibleTriggerOwnProps>;
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { COLLAPSIBLE_KEY, type CollapsibleContext } from "./types.js";

	let {
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
		onclick,
		...rest
	}: CollapsibleTriggerProps = $props();

	// Undefined outside a Collapsible: the trigger then has nothing to toggle
	// and renders as a plain button rather than throwing, the same degradation
	// every other compound piece in this library falls back to.
	const context = getContext<CollapsibleContext | undefined>(COLLAPSIBLE_KEY);

	const isDisabled = $derived(disabled || (context?.disabled ?? false));
	const isOpen = $derived(context?.open ?? false);

	// The native `disabled` attribute is the real gate, but a synthetic click
	// fired straight at the element walks past it, so the handler repeats the
	// guard. A guarded click reaches neither the toggle nor the consumer.
	function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (isDisabled) return;
		context?.toggle();
		(onclick as ((e: typeof event) => void) | null | undefined)?.(event);
	}
</script>

<button
	{...rest}
	bind:this={ref}
	type="button"
	id={context?.triggerId ?? rest.id}
	class={cn(
		"ft-collapsible-trigger cursor-pointer",
		"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	disabled={isDisabled}
	aria-expanded={context ? isOpen : rest["aria-expanded"]}
	aria-controls={context?.contentId ?? rest["aria-controls"]}
	data-state={context ? (isOpen ? "open" : "closed") : undefined}
	data-disabled={isDisabled ? "" : undefined}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
