<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	export interface CollapsibleOwnProps {
		/** Whether the content is expanded, bindable. Defaults to `false`. */
		open?: boolean;
		/** Called with the new state each time the trigger toggles it. */
		onOpenChange?: (open: boolean) => void;
		/** Makes the trigger inert. A bound `open` can still be changed from outside. */
		disabled?: boolean;
		/** A `CollapsibleTrigger` and a `CollapsibleContent`. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}

	/** Native `<div>` attributes and listeners are forwarded to the root. */
	export type CollapsibleProps = CollapsibleOwnProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof CollapsibleOwnProps>;
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { COLLAPSIBLE_KEY, type CollapsibleContext } from "./types.js";

	let {
		open = $bindable(false),
		onOpenChange,
		disabled = false,
		children,
		class: className,
		ref = $bindable(null),
		...rest
	}: CollapsibleProps = $props();

	// SSR-stable: `_internals/id.js`'s `uid()` is client-only, and the
	// trigger/content ids must already agree on the first server-rendered paint
	// so `aria-controls` is correct before hydration.
	const uid = $props.id();

	const context: CollapsibleContext = {
		get open() {
			return open;
		},
		get disabled() {
			return disabled;
		},
		// The only place `open` changes from inside. A plain function, not an
		// `$effect`: writing `open` from an effect would read and write the same
		// state in one pass and fight a caller's own `bind:open`.
		toggle() {
			if (disabled) return;
			const next = !open;
			open = next;
			onOpenChange?.(next);
		},
		triggerId: `${uid}-trigger`,
		contentId: `${uid}-content`,
	};

	setContext(COLLAPSIBLE_KEY, context);
</script>

<div
	{...rest}
	bind:this={ref}
	class={cn("ft-collapsible", className)}
	data-state={open ? "open" : "closed"}
	data-disabled={disabled ? "" : undefined}
>
	{#if children}
		{@render children()}
	{/if}
</div>
