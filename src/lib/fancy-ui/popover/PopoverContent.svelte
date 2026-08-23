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
	import type { Side } from "../_internals/anchor-position.js";
	import { anchored, markSurfaceState, originFor } from "../_internals/motion/anchored.js";
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

	const classes = $derived(
		cn(
			"ft-popover-content flex w-max flex-col gap-[6px] rounded-[10px] border border-border bg-popover px-[14px] py-[12px] text-[12px] text-popover-foreground shadow-lg outline-none",
			className
		)
	);

	// Handed over by `focusTrap` the moment the trap arms; called at
	// `outrostart`, which is the dismiss instant on EVERY close path (Escape,
	// an outside click, a second click on the trigger, a caller's own
	// `bind:open` write). Waiting for the trap's own `destroy()` would strand
	// a keyboard user on `<body>` for the whole length of the fade, because
	// Svelte sets `inert` on this panel the instant the exit starts.
	let returnFocusNow: (() => void) | null = null;

	// The other half of that handover, called at `introstart`. A popover
	// reopened DURING its fade reverses the outro instead of remounting, so
	// `use:focusTrap` is never re-created: without this the panel would come
	// back interactive with focus left on the trigger behind it, Tab walking
	// the page rather than the panel, and the eager return already spent for
	// the life of the instance.
	let rearmFocusTrap: (() => void) | null = null;

	function handleIntroStart(event: Event) {
		markSurfaceState(event, "open");
		rearmFocusTrap?.();
	}

	function handleOutroStart(event: Event) {
		markSurfaceState(event, "closing");
		returnFocusNow?.();
	}
</script>

<!--
	No `role` here on purpose. A popover is a disclosure, not a dialog — it
	has no title to hang `aria-labelledby` off (the `trigger` snippet is
	whatever the caller passed, not a documented "title"), and `role="dialog"`
	without an accessible name is worse than no role at all. Reachability
	comes from `focusTrap` (moves focus in, and returns it to the trigger the
	instant the panel is dismissed) and `dismissable`, not from a landmark role.

	ONE bidirectional `transition:` directive, never a split `in:`/`out:` pair:
	a bidirectional directive passes the in-flight counterpart's current
	position into the fresh call, so a panel reopened mid-exit continues from
	where it is instead of snapping to invisible first. `entering: ctx.open` is
	what tells the transition which way it is going — Svelte reports
	`direction: "both"` for a bidirectional directive and cannot tell the two
	apart on its own — and the params are read fresh, outside any reactive
	context, at the moment each direction starts. The `{#if}` that mounts this
	component lives in `Popover`, one level up; a local transition on a child's
	root element is still collected by the parent's branch, so the exit plays.

	The panel now outlives `open` by the length of the fade, which is why
	nothing here waits for the unmount any more: `dismissable` is disarmed at
	the dismiss instant through `active`, focus goes back to the trigger at
	`outrostart`, and Svelte marks the node `inert` for the whole exit so the
	fading panel cannot be clicked or tabbed into on its way out.

	`data-state` is a STATIC literal, changed only by `markSurfaceState` from
	the two handlers below. Svelte marks this branch inert before it plays the
	outro and the scheduler skips inert effects, so a reactive `data-state={…}`
	would never reach the DOM on a real close. `inert` itself is never written
	by hand — Svelte sets it on any element carrying a `transition:`.
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
		onPlacement: (side) => (resolvedSide = side),
	}}
	use:focusTrap={{
		returnFocus: true,
		onActivate: (returnNow, rearm) => {
			returnFocusNow = returnNow;
			rearmFocusTrap = rearm;
		},
	}}
	use:dismissable={{
		onDismiss: ctx.close,
		escape: ctx.dismissible,
		outsideClick: ctx.dismissible,
		exclude: () => [ctx.triggerRef],
		active: () => ctx.open,
	}}
	transition:anchored={{ side: resolvedSide, entering: ctx.open }}
	data-state="open"
	data-side={resolvedSide}
	data-align={ctx.align}
	style:transform-origin={originFor(resolvedSide, ctx.align)}
	onintrostart={handleIntroStart}
	onoutrostart={handleOutroStart}
>
	{@render children?.()}
</div>
