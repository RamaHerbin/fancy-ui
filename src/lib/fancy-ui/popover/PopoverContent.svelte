<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface PopoverContentProps {
		/** The panel's content, forwarded straight from `Popover`'s own `children`. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the panel. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { POPOVER_KEY, type PopoverContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: PopoverContentProps = $props();

	// `Popover` only ever mounts this component inside its own `{#if open}`,
	// so the context is always present by the time this runs — there is no
	// standalone-usage fallback to design for, unlike RadioGroupItem's.
	const ctx = getContext<PopoverContext>(POPOVER_KEY);

	const classes = $derived(
		cn(
			"ft-popover-content flex w-max flex-col gap-[6px] rounded-[10px] border border-border bg-popover px-[14px] py-[12px] text-[12px] text-popover-foreground shadow-lg outline-none",
			className
		)
	);
</script>

<!--
	No `role` here on purpose. A popover is a disclosure, not a dialog — it
	has no title to hang `aria-labelledby` off (the `trigger` snippet is
	whatever the caller passed, not a documented "title"), and `role="dialog"`
	without an accessible name is worse than no role at all. Reachability
	comes from `focusTrap` (moves focus in, returns it to the trigger on
	destroy) and `dismissable`, not from a landmark role.
-->
<div
	bind:this={ref}
	id={ctx.contentId}
	class={classes}
	use:portal
	use:anchorPosition={{
		anchor: () => ctx.triggerRef,
		side: ctx.side,
		align: ctx.align,
		offset: ctx.offset,
	}}
	use:focusTrap={{ returnFocus: true }}
	use:dismissable={{
		onDismiss: ctx.close,
		escape: ctx.dismissible,
		outsideClick: ctx.dismissible,
		exclude: () => [ctx.triggerRef],
	}}
>
	{@render children?.()}
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ft-popover-content {
			animation: ft-popover-in 0.12s ease-out;
		}
	}

	@keyframes ft-popover-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
