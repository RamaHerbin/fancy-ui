<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	export interface AccordionItemOwnProps {
		/** This item's value: what `Accordion`'s `value` holds while it is open. */
		value: string;
		/** Disables just this item. Its trigger is skipped by the arrow keys. */
		disabled?: boolean;
		/** An `AccordionTrigger` and an `AccordionContent`. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}

	/** Native `<div>` attributes and listeners are forwarded to the item. */
	export type AccordionItemProps = AccordionItemOwnProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof AccordionItemOwnProps>;
</script>

<script lang="ts">
	import { getContext, setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { COLLAPSIBLE_KEY, type CollapsibleContext } from "../collapsible/types.js";
	import {
		ACCORDION_ITEM_KEY,
		ACCORDION_KEY,
		type AccordionContext,
		type AccordionItemContext,
	} from "./types.js";

	let {
		value,
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
		...rest
	}: AccordionItemProps = $props();

	// Undefined outside an Accordion: the item then behaves as a closed,
	// standalone collapsible instead of throwing.
	const root = getContext<AccordionContext | undefined>(ACCORDION_KEY);

	const isOpen = $derived(root?.isOpen(value) ?? false);
	const isDisabled = $derived((root?.disabled ?? false) || disabled);

	const itemContext: AccordionItemContext = {
		get value() {
			return value;
		},
		get disabled() {
			return isDisabled;
		},
	};

	// An item is a collapsible whose open state belongs to the accordion: the
	// trigger and the region below it read this exactly as they would a
	// `Collapsible` root's.
	const collapsible: CollapsibleContext = {
		get open() {
			return isOpen;
		},
		get disabled() {
			return isDisabled;
		},
		toggle() {
			if (isDisabled) return;
			root?.toggle(value);
		},
		get triggerId() {
			return root?.triggerId(value) ?? `ft-accordion-trigger-${value}`;
		},
		get contentId() {
			return root?.contentId(value) ?? `ft-accordion-content-${value}`;
		},
	};

	setContext(ACCORDION_ITEM_KEY, itemContext);
	setContext(COLLAPSIBLE_KEY, collapsible);
</script>

<div
	{...rest}
	bind:this={ref}
	class={cn("ft-accordion-item border-border border-b", className)}
	data-state={isOpen ? "open" : "closed"}
	data-orientation={root?.orientation ?? "vertical"}
	data-disabled={isDisabled ? "" : undefined}
>
	{#if children}
		{@render children()}
	{/if}
</div>
