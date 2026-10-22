<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	export interface AccordionTriggerOwnProps {
		/** The level of the heading that wraps the button, 1 to 6. Defaults to 3. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Disables this trigger on top of its item's and the accordion's `disabled`. */
		disabled?: boolean;
		/** The trigger's label. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the button. */
		class?: string;
		/** Element reference to the button. */
		ref?: HTMLButtonElement | null;
	}

	/** Native `<button>` attributes and listeners are forwarded to the button; `id`, `type`, `aria-expanded`, `aria-controls` and `data-state` stay the component's. */
	export type AccordionTriggerProps = AccordionTriggerOwnProps &
		Omit<HTMLButtonAttributes, keyof AccordionTriggerOwnProps>;
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import CollapsibleTrigger from "../collapsible/CollapsibleTrigger.svelte";
	import {
		ACCORDION_ITEM_KEY,
		ACCORDION_KEY,
		type AccordionContext,
		type AccordionItemContext,
	} from "./types.js";

	let {
		headingLevel = 3,
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
		onkeydown,
		...rest
	}: AccordionTriggerProps = $props();

	const root = getContext<AccordionContext | undefined>(ACCORDION_KEY);
	const item = getContext<AccordionItemContext | undefined>(ACCORDION_ITEM_KEY);

	// A single accordion that may not collapse keeps its open item open. The
	// button stays focusable (so it is not `disabled`) and says so to assistive
	// technology instead.
	const locked = $derived(item && root ? root.isLocked(item.value) : false);

	// Runs the navigation first, then hands the SAME event to the consumer. A
	// disabled trigger gets no key events from a real browser; the guard covers
	// a synthetic one, and keeps it away from the consumer too.
	function handleKeydown(
		event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		if (item?.disabled || disabled) return;
		if (root?.navigate(event.currentTarget, event.key)) event.preventDefault();
		(onkeydown as ((e: typeof event) => void) | null | undefined)?.(event);
	}
</script>

<div role="heading" aria-level={headingLevel} class="ft-accordion-header m-0 flex">
	<CollapsibleTrigger
		{...rest}
		bind:ref
		{disabled}
		class={cn(
			"ft-accordion-trigger flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium",
			"hover:underline",
			"[&[data-state=open]>svg]:rotate-180",
			className
		)}
		data-ft-accordion-trigger=""
		aria-disabled={locked ? "true" : rest["aria-disabled"]}
		onkeydown={handleKeydown}
	>
		{#if children}
			{@render children()}
		{/if}
		<svg
			class="ft-accordion-chevron text-muted-foreground size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d="m4 6 4 4 4-4" />
		</svg>
	</CollapsibleTrigger>
</div>
