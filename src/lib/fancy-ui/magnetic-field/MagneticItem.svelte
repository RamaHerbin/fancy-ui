<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	export interface MagneticItemOwnProps {
		/** How heavy the item is. Above 1 it moves and leans less and settles more slowly; below 1 it is livelier. */
		mass?: number;
		/** Per-item pull multiplier, applied on top of the field's `strength`. */
		strength?: number;
		/** Whether the item moves toward the magnet. */
		pull?: boolean;
		/** Whether the item leans toward the magnet. */
		rotate?: boolean;
		/** Renders `<span>` wrappers with `display: inline-block` instead of block `<div>`s, for items that sit inside a line of text or an inline row. */
		inline?: boolean;
		/** The element that reacts. */
		children?: Snippet;
		/** Additional CSS classes, on the static outer wrapper. */
		class?: string;
		/** Reference to the static outer wrapper (bindable). */
		ref?: HTMLElement | null;
	}

	/** Native attributes and listeners are forwarded to the static outer wrapper. */
	export type MagneticItemProps = MagneticItemOwnProps &
		Omit<HTMLAttributes<HTMLElement>, keyof MagneticItemOwnProps>;
</script>

<script lang="ts">
	import { getContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { MAGNETIC_FIELD_KEY, type MagneticFieldContext } from "./types.js";

	let {
		mass = 1,
		strength = 1,
		pull = true,
		rotate = true,
		inline = false,
		children,
		class: className,
		ref = $bindable(null),
		...rest
	}: MagneticItemProps = $props();

	// Undefined outside a MagneticField: the item then renders the same markup
	// and simply never moves.
	const ctx = getContext<MagneticFieldContext | undefined>(MAGNETIC_FIELD_KEY);

	let inner = $state<HTMLElement | null>(null);

	const tag = $derived(inline ? "span" : "div");

	$effect(() => {
		const outer = ref;
		const node = inner;
		if (!ctx || !outer || !node) return;
		return ctx.register(
			outer,
			node,
			untrack(() => ({ mass, strength, pull, rotate }))
		);
	});

	$effect(() => {
		const options = { mass, strength, pull, rotate };
		const outer = untrack(() => ref);
		if (ctx && outer) ctx.updateItem(outer, options);
	});
</script>

<svelte:element
	this={tag}
	bind:this={ref}
	class={cn("ft-magnetic-item", className)}
	{...rest}
	data-inline={inline || undefined}
>
	<svelte:element this={tag} bind:this={inner} class="ft-magnetic-item-inner">
		{@render children?.()}
	</svelte:element>
</svelte:element>

<style>
	/* The outer node is never transformed: it is the box the field measures. */
	.ft-magnetic-item {
		position: relative;
		display: block;
	}

	.ft-magnetic-item[data-inline] {
		display: inline-block;
	}

	/* Registered as non-inherited: a write on an inner then restyles that node
	   alone, not its whole subtree. The values the core writes ("3.21px",
	   "1.20deg") match these syntaxes. */
	@property --ft-mf-x {
		syntax: "<length>";
		inherits: false;
		initial-value: 0px;
	}

	@property --ft-mf-y {
		syntax: "<length>";
		inherits: false;
		initial-value: 0px;
	}

	@property --ft-mf-r {
		syntax: "<angle>";
		inherits: false;
		initial-value: 0deg;
	}

	/* The core writes the three variables; the fallbacks keep SSR markup at rest.
	   A 2D transform keeps a resting item off the compositor: the core promotes
	   an item with `will-change` only while it moves. */
	.ft-magnetic-item-inner {
		display: block;
		transform: translate(var(--ft-mf-x, 0px), var(--ft-mf-y, 0px)) rotate(var(--ft-mf-r, 0deg));
		transform-origin: 50% 50%;
	}

	.ft-magnetic-item[data-inline] > .ft-magnetic-item-inner {
		display: inline-block;
	}
</style>
