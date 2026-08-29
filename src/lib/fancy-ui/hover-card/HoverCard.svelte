<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { Side, Align } from "../_internals/anchor-position.js";

	export interface HoverCardProps {
		/** Whether the card is open. Bindable. */
		open?: boolean;
		/** Fires whenever the open state changes, from any trigger — pointer, focus, Escape or an outside click. */
		onOpenChange?: (open: boolean) => void;
		/** Side of the trigger the card opens on. Flips to the opposite side when it would overflow the viewport. */
		side?: Side;
		/** Alignment along the trigger's cross axis. */
		align?: Align;
		/** Gap in pixels between the trigger and the card. */
		offset?: number;
		/** Delay in ms before the card opens after the pointer enters the trigger. Ignored for focus, which opens immediately. */
		openDelay?: number;
		/**
		 * Delay in ms before the card closes after the pointer leaves the trigger
		 * or the card. Gives the pointer time to travel from one to the other
		 * without the card vanishing mid-trip. Ignored for blur, which closes
		 * immediately.
		 */
		closeDelay?: number;
		/**
		 * The element that opens the card on hover or focus. Receives the
		 * card's id (or `undefined` while closed) — put it on your own
		 * trigger element's `aria-describedby` yourself. HoverCard cannot do
		 * this for you: the wrapper it renders around this snippet has no
		 * accessible role of its own, so an attribute set there would not be
		 * picked up for whatever focusable element you render inside it.
		 */
		trigger?: Snippet<[descriptionId: string | undefined]>;
		/**
		 * The card's content. Supplementary only — nothing inside should be the
		 * only way to reach information or an action. See the README before
		 * putting links or buttons in here.
		 */
		children?: Snippet;
		/** Additional classes for the card panel. */
		class?: string;
		/** Element reference for the trigger wrapper. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { anchored, markSurfaceState, originFor } from "../_internals/motion/anchored.js";

	let {
		open = $bindable(false),
		onOpenChange,
		side = "bottom",
		align = "center",
		offset = 8,
		openDelay = 300,
		closeDelay = 150,
		trigger,
		children,
		class: className,
		ref = $bindable(null),
	}: HoverCardProps = $props();

	// One id, stable across SSR and hydration — `uid()` would throw on the
	// server (see _internals/id.ts), and this needs to exist before the card
	// ever opens so the trigger's aria-describedby always resolves to a real
	// element the moment it points at one.
	const panelId = $props.id();

	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function clearOpenTimer() {
		if (openTimer !== undefined) {
			clearTimeout(openTimer);
			openTimer = undefined;
		}
	}

	function clearCloseTimer() {
		if (closeTimer !== undefined) {
			clearTimeout(closeTimer);
			closeTimer = undefined;
		}
	}

	function setOpen(next: boolean) {
		clearOpenTimer();
		clearCloseTimer();
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
	}

	function scheduleOpen() {
		// A pointer arriving back on the trigger while a close is pending (it
		// travelled trigger → card → trigger) must cancel that close rather
		// than restart the open delay — the card never actually closed.
		clearCloseTimer();
		if (open) return;
		clearOpenTimer();
		openTimer = setTimeout(() => setOpen(true), openDelay);
	}

	// Called when the pointer leaves the trigger AND when it leaves the card.
	// The delay is what lets it cross the gap between the two: if it lands on
	// the other one before this fires, that element's own pointerenter clears
	// the timer first.
	function scheduleClose() {
		clearOpenTimer();
		if (!open) return;
		clearCloseTimer();
		closeTimer = setTimeout(() => setOpen(false), closeDelay);
	}

	onMount(() => {
		return () => {
			clearOpenTimer();
			clearCloseTimer();
		};
	});

	let panelEl = $state<HTMLDivElement | null>(null);

	// Seeded with the REQUESTED side rather than a hardcoded `"bottom"`, so a
	// card that never flips reads the right growth origin without depending on
	// whether `anchorPosition`'s `onPlacement` has run yet. `untrack` silences
	// the compiler's `state_referenced_locally` warning and is honest about
	// the shape: this read of `side` is deliberately one-shot, and every later
	// value — a flip, or a change to the `side` prop itself — arrives through
	// `onPlacement` below, which is the one source of truth for where the card
	// actually landed.
	let resolvedSide = $state<Side>(untrack(() => side));

	// The cross-axis alignment as ACTUALLY placed, reported by `anchorPosition`
	// alongside the side. It differs from the requested alignment whenever
	// clamping slid the panel along that axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	let resolvedAlign = $state<Align>(untrack(() => align));

	// The documented contract is that nothing inside the card is interactive
	// (see the README), so in the shape this component was designed for,
	// focus never moves from the trigger into the card and this check never
	// matters. It exists for the caller who ignores that contract anyway: an
	// unconditional close-on-blur would unmount the card the instant Tab
	// starts moving focus toward whatever they put inside it — vanishing out
	// from under a keyboard user reaching for something a mouse user could
	// already click freely, since a mouse click never routes through the
	// trigger's focus at all. Checking `relatedTarget` against the panel is
	// the standard trigger-to-content handoff: don't close if focus is
	// headed into the very thing that would otherwise disappear.
	function handleTriggerFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (next && panelEl?.contains(next)) return;
		setOpen(false);
	}

	const classes = $derived(
		cn(
			"ft-hover-card-panel bg-popover text-popover-foreground border-border flex w-60 flex-col gap-2.5 rounded-xl border p-3.5 shadow-[0_12px_32px_rgba(0,0,0,.5)]",
			className
		)
	);
</script>

<div
	bind:this={ref}
	class="ft-hover-card-trigger inline-block"
	onpointerenter={scheduleOpen}
	onpointerleave={scheduleClose}
	onfocusin={() => setOpen(true)}
	onfocusout={handleTriggerFocusOut}
>
	{@render trigger?.(open ? panelId : undefined)}
</div>

<!--
	ONE bidirectional `transition:` directive, never a split `in:`/`out:` pair.
	This is the directive that earns its keep most on a hover surface: pointers
	change their mind, and a bidirectional directive passes the in-flight
	counterpart's current position into the fresh call, so a card the pointer
	comes back to mid-fade continues from where it is instead of snapping to
	invisible and starting the entrance over. `entering: open` is what tells
	the transition which way it is going — Svelte reports `direction: "both"`
	for a bidirectional directive and cannot tell the two apart on its own —
	and the params are read fresh, outside any reactive context, at the moment
	each direction starts.

	`closeDelay` and the exit are two different waits and both are wanted.
	`closeDelay` is the grace period the pointer gets to travel from the
	trigger to the card, spent BEFORE anything visible happens; the exit is the
	card leaving, spent after. `open` still flips at the end of the delay, so
	`onOpenChange(false)` and the caller's `bind:open` are exactly where they
	were — only the removal now trails it by 150 ms, during which Svelte marks
	this node `inert` so the card the pointer has already abandoned cannot be
	interacted with on its way out. `dismissable` is disarmed at that same
	instant through `active`, so an Escape during the fade reaches whatever
	layer is underneath rather than being swallowed by a card that is leaving.

	`data-state` is a STATIC literal, changed only by `markSurfaceState` from
	the two handlers below. Svelte marks this branch inert before it plays the
	outro and the scheduler skips inert effects, so a reactive `data-state={…}`
	would never reach the DOM on a real close.

	Reduced motion needs no rule of its own: `anchored` collapses the duration
	to 0, Svelte's own falsy-duration fast path then skips `element.animate()`
	entirely, and the card appears and disappears in the frame it mounts and
	unmounts — the close is fully synchronous again. Its visibility never
	depended on the animation — `{#if open}` alone decides that — so nothing is
	reachable only through motion.
-->
{#if open}
	<div
		bind:this={panelEl}
		id={panelId}
		class={classes}
		use:portal
		use:anchorPosition={{
			anchor: () => ref,
			side,
			align,
			offset,
			onPlacement: (placed, placedAlign) => {
				resolvedSide = placed;
				resolvedAlign = placedAlign;
			},
		}}
		use:dismissable={{
			onDismiss: () => setOpen(false),
			exclude: () => [ref],
			active: () => open,
		}}
		transition:anchored={{ side: resolvedSide, entering: open }}
		data-state="open"
		data-side={resolvedSide}
		data-align={align}
		style:transform-origin={originFor(resolvedSide, resolvedAlign)}
		onpointerenter={clearCloseTimer}
		onpointerleave={scheduleClose}
		onintrostart={(e) => markSurfaceState(e, "open")}
		onoutrostart={(e) => markSurfaceState(e, "closing")}
	>
		{@render children?.()}
	</div>
{/if}
