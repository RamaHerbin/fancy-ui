<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavigationMenuContentProps {
		/** The panel's content — typically a feature tile plus a stack of `NavigationMenuLink`s. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { anchorPosition, type Side, type Align } from "../_internals/anchor-position.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, originFor, markSurfaceState } from "../_internals/motion/anchored.js";
	import { NAVIGATION_MENU_KEY, type NavigationMenuContext } from "./types.js";
	import { NAVIGATION_MENU_ITEM_KEY, type NavigationMenuItemContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: NavigationMenuContentProps = $props();

	const item = getContext<NavigationMenuItemContext>(NAVIGATION_MENU_ITEM_KEY);
	const root = getContext<NavigationMenuContext>(NAVIGATION_MENU_KEY);

	const isOpen = $derived(root.value === item.value);

	// The side the panel was ACTUALLY placed on. This one is anchored to the
	// whole list rather than to a single trigger and is always requested
	// below, so the seed is the literal `"bottom"` the action is given —
	// still the request, never a guess. `computePosition` flips it to `"top"`
	// for a nav sitting low in the viewport, and the growth origin follows.
	let resolvedSide = $state<Side>("bottom");

	// The cross-axis alignment as ACTUALLY placed, reported by `anchorPosition`
	// alongside the side. It differs from the requested alignment whenever
	// clamping slid the panel along that axis — near a viewport edge the
	// requested corner is no longer the one touching the anchor, and an
	// entrance grown from it would expand from the far corner instead.
	let resolvedAlign = $state<Align>("start");

	// Only Enter/Space/ArrowDown on the trigger ever calls `requestFocus`
	// (see NavigationMenuTrigger) — a hover- or click-open leaves this a
	// no-op, and focus stays exactly where it already was.
	$effect(() => {
		if (!isOpen) return;
		if (!root.consumeFocusRequest(item.value)) return;
		if (!ref) return;
		const target = ref.querySelector<HTMLElement>("a[href], button:not([disabled])") ?? ref;
		target.focus();
	});

	// The disclosure equivalent of HoverCard's own trigger-side `focusout`
	// handler: Tab is never trapped in here (see the README — a modal
	// focus-trap would break "Tab moves through the panel's links
	// naturally"), so when focus leaves this panel on its own, for content
	// the panel that no longer has focus close itself rather than linger,
	// invisible-to-the-eye-but-still-"open", off in the portal.
	function handleFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		if (next && ref?.contains(next)) return;
		root.collapseIfOpen(item.value);
	}

	const classes = $derived(
		cn(
			"ft-navigation-menu-content bg-popover text-popover-foreground border-border grid w-[480px] grid-cols-2 gap-2 rounded-xl border p-3.5 shadow-2xl outline-none",
			className
		)
	);
</script>

<!--
	No `role` here on purpose, same reasoning as Popover's content: this is a
	disclosure panel, not a dialog, and it has no title to anchor
	`aria-labelledby` on other than the trigger it already points at.
	Reachability comes from `aria-labelledby` + real DOM focus, not from a
	landmark role — and deliberately *not* from `focus-trap.js`: a
	NavigationMenu panel is not modal (see the README's "why not role=menu"
	section), so Tab must be free to walk out of it into the rest of the page.

	The motion moved out of a hand-written `@keyframes` in this file's own
	`<style>` and into `_internals/motion/anchored.js`, shared with every other
	floating surface. Two deliberate consequences: the four pixels of
	`translateY` are gone — travel a panel can only fake, since
	`anchorPosition` owns `left`/`top` on this same element — and the rise now
	grows from the panel edge nearest the list rather than from its own
	centre. Visibility still never depends on any of it: `{#if isOpen}` gates
	the DOM, and under reduced motion the panel simply appears and disappears.

	ONE bidirectional `transition:`, never a split `in:`/`out:` pair, with
	`entering: isOpen` as the direction signal — Svelte reports
	`direction: "both"` for a bidirectional directive and cannot tell an
	arrival from a departure on its own, and a bidirectional call gets the
	in-flight counterpart's position handed to it, so a panel re-opened
	inside its own fade continues from where it is instead of snapping. That
	matters more here than on a click-only surface: this one closes on a
	hover-intent timer, and a pointer that wanders back onto the bar
	mid-close is ordinary rather than exceptional.

	`data-state` is a STATIC literal, changed only by `markSurfaceState` from
	the two handlers below: Svelte marks this branch inert before it plays
	the outro and the scheduler skips inert effects, so a reactive
	`data-state={…}` would never reach the DOM on a real close. `inert`
	itself is never written by hand — Svelte sets it on any element carrying
	a `transition:` for the whole exit, which keeps a panel on its way out
	from taking a click on one of its links.

	`active: () => isOpen` disarms the dismiss layer the instant the panel
	stops being the open one, so a second Escape during the fade is neither
	answered again nor swallowed on its way to whatever sits underneath.

	Focus needs nothing: `NavigationMenu`'s own `close()` refocuses the
	trigger from a plain function outside this `{#if}`, so the return lands
	at the dismiss instant rather than at unmount — no `focusTrap` handle,
	because there is no focus trap here at all (see the README).
-->
{#if isOpen}
	<div
		bind:this={ref}
		id={item.contentId}
		aria-labelledby={item.triggerId}
		tabindex="-1"
		class={classes}
		use:portal
		use:anchorPosition={{
			anchor: () => root.listRef,
			side: "bottom",
			align: "start",
			offset: 6,
			onPlacement: (side, align) => {
				resolvedSide = side;
				resolvedAlign = align;
			},
		}}
		use:dismissable={{
			onDismiss: root.close,
			exclude: () => [root.getTriggerElement(item.value)],
			active: () => isOpen,
		}}
		transition:anchored={{ side: resolvedSide, entering: isOpen }}
		data-state="open"
		data-side={resolvedSide}
		data-align="start"
		style:transform-origin={originFor(resolvedSide, resolvedAlign)}
		onpointerenter={root.cancelClose}
		onpointerleave={root.scheduleClose}
		onfocusout={handleFocusOut}
		onintrostart={(e) => markSurfaceState(e, "open")}
		onoutrostart={(e) => markSurfaceState(e, "closing")}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	/*
	 * `--ft-nav-accent` lives here, not on `NavigationMenu`'s own `<nav>`: the
	 * panel is moved out to `document.body` by `use:portal`, which severs the
	 * DOM ancestry a CSS custom property would otherwise inherit through — a
	 * declaration up on `<nav>` would simply never reach anything rendered in
	 * here. This is the one read/declare site for the whole compound; a
	 * `NavigationMenuLink` used as the mockup's feature tile
	 * (`class="ft-navigation-menu-feature"`, see that component's own
	 * `<style>`) reads it back through ordinary inheritance, since it always
	 * renders as a descendant of this element even after the portal moves
	 * the pair of them together.
	 */
	.ft-navigation-menu-content {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
