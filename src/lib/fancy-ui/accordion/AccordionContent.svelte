<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	export interface AccordionContentOwnProps {
		/**
		 * Keeps the children mounted while the item is closed. On by default; pass
		 * `false` to unmount them once the collapse has finished and mount them
		 * again on open. Defaults to `true`, as on `CollapsibleContent`: the trigger's `aria-controls` always points at an element that exists, the closed markup is server-rendered, and nothing has to be measured.
		 * See `CollapsibleContent`.
		 */
		forceMount?: boolean;
		/** The item's content. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the inner body so padding collapses with the panel. */
		class?: string;
		/** Element reference to the region that animates. */
		ref?: HTMLDivElement | null;
	}

	/** Native `<div>` attributes and listeners are forwarded to the region; `id`, `role`, `aria-labelledby` and `data-state` stay the component's. */
	export type AccordionContentProps = AccordionContentOwnProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof AccordionContentOwnProps>;
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import CollapsibleContent from "../collapsible/CollapsibleContent.svelte";
	import { COLLAPSIBLE_KEY, type CollapsibleContext } from "../collapsible/types.js";

	let {
		forceMount,
		children,
		class: className,
		ref = $bindable(null),
		...rest
	}: AccordionContentProps = $props();

	// The item's collapsible context names the trigger that labels this region.
	const context = getContext<CollapsibleContext | undefined>(COLLAPSIBLE_KEY);
</script>

<CollapsibleContent
	{...rest}
	bind:ref
	{forceMount}
	class={cn("ft-accordion-content text-muted-foreground pb-4 text-sm", className)}
	role="region"
	aria-labelledby={context?.triggerId}
>
	{#if children}
		{@render children()}
	{/if}
</CollapsibleContent>
