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
	import type { Side, Align } from "../_internals/anchor-position.js";
	import { anchored, originFor } from "../_internals/motion/anchored.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { POPOVER_KEY, type PopoverContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: PopoverContentProps = $props();

	// `Popover` only ever mounts this component inside its own `{#if open}`,
	// so the context is always present by the time this runs — there is no
	// standalone-usage fallback to design for, unlike RadioGroupItem's.
	const ctx = getContext<PopoverContext>(POPOVER_KEY);

	// Seeded with the REQUESTED side rather than a hardcoded `"bottom"`, so a
	// panel that never flips reads the right growth origin without depending
	// on whether `anchorPosition`'s `onPlacement` has run yet. The action
	// overwrites it with the resolved side on its first placement, and again
	// only when a later scroll or resize genuinely flips it.
	let resolvedSide = $state<Side>(ctx.side);

	// The cross-axis alignment as ACTUALLY placed, reported by `anchorPosition`
	// alongside the side. It differs from the requested alignment whenever
	// clamping slid the panel along that axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	let resolvedAlign = $state<Align>(ctx.align);

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

	`in:` and never `transition:`: an entrance must not delay the unmount. The
	panel leaves the DOM the instant `open` flips false, which is what keeps
	`focusTrap`'s return-focus and every dismissal assertion synchronous.
	`focusTrap` moving focus into a node that is mid-entrance is fine — it
	calls `.focus()`, which is instant and untouched by an opacity/scale
	transition; nothing here animates focus itself.
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
		onPlacement: (side, align) => {
			resolvedSide = side;
			resolvedAlign = align;
		},
	}}
	use:focusTrap={{ returnFocus: true }}
	use:dismissable={{
		onDismiss: ctx.close,
		escape: ctx.dismissible,
		outsideClick: ctx.dismissible,
		exclude: () => [ctx.triggerRef],
	}}
	in:anchored={{ side: resolvedSide }}
	data-side={resolvedSide}
	data-align={ctx.align}
	style:transform-origin={originFor(resolvedSide, resolvedAlign)}
>
	{@render children?.()}
</div>
