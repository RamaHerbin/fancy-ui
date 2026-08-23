<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DropdownMenuContentProps {
		/** The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/`DropdownMenuSub` children. */
		children?: Snippet;
		/** Additional CSS classes, merged onto the panel. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { setContext, getContext, tick } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition, type Side } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, originFor, markSurfaceState } from "../_internals/motion/anchored.js";
	import { createMenuFocus } from "../_internals/menu.svelte.js";
	import {
		DROPDOWN_MENU_KEY,
		MENU_KEY,
		type DropdownMenuRootContext,
		type MenuContext,
	} from "./types.js";
	import { handleMenuContentKeydown, createOpenSubRegistry } from "./menu-shared.js";

	let { children, class: className, ref = $bindable(null) }: DropdownMenuContentProps = $props();

	const root = getContext<DropdownMenuRootContext>(DROPDOWN_MENU_KEY);

	// The side the panel was ACTUALLY placed on — `root.side` until
	// `computePosition` flips it away from a viewport edge. Seeded with the
	// *requested* side rather than a hardcoded `"bottom"` so the common,
	// never-flipped case never depends on `onPlacement` having fired first:
	// the action does run before the transition reads its params, but a wrong
	// seed would still show as a one-frame origin jump on every open, and only
	// a real flip should ever move the growth origin.
	//
	// This mirrors what `DropdownMenuSubContent` has always done through
	// `SubContext.resolvedSide` — the root panel had no equivalent because
	// nothing here used to care which side it landed on.
	let resolvedSide = $state<Side>(root.side);

	// A getter property, not a plain value, so every read inside the core
	// (`move()` reads `options.loop` fresh on each call) sees `root.loop`
	// live rather than whatever it was when this component first mounted.
	const focus = createMenuFocus({
		get loop() {
			return root.loop;
		},
	});

	const { registerOpenSub, closeSiblingSubs } = createOpenSubRegistry();

	const menuContext: MenuContext = {
		get focus() {
			return focus;
		},
		itemTextClass: "text-[13px]",
		get sound() {
			return root.sound;
		},
		closeAll(options) {
			// Closing the root unmounts this whole subtree — every nested
			// `DropdownMenuSub`/`DropdownMenuSubContent` goes with it, so there
			// is nothing more for this level to do to close a deeply-nested
			// submenu's own state; see menu-shared.ts's header comment.
			root.close(options);
		},
		registerOpenSub,
		closeSiblingSubs,
	};
	setContext(MENU_KEY, menuContext);

	// Items register themselves from their own mount `$effect`, which runs
	// after this component's own setup — `tick()` waits for that flush
	// before asking the (now-populated) core to move to an edge, the same
	// pattern `TimePicker`/`DatePicker` use to wait for the DOM to catch up
	// before touching it.
	$effect(() => {
		if (root.open) {
			const edge = root.focusEdge;
			void tick().then(() => focus.moveToEdge(edge));
		}
	});

	function handleKeydown(event: KeyboardEvent): void {
		handleMenuContentKeydown(event, menuContext, {
			onTab: () => root.close({ returnFocus: false }),
		});
	}

	// text-[13px]: this family's own density, distinct from ContextMenu's
	// 12px — the mockup specifies both explicitly. Every shared item leaf
	// inherits this from here via normal CSS (they carry no font-size of
	// their own); a nested `DropdownMenuSubContent` gets it forwarded
	// through `menuContext.itemTextClass` instead, since a portalled submenu
	// is a DOM sibling of this panel once open, not a descendant, and can't
	// inherit it directly — see `MenuContext.itemTextClass`'s own doc.
	const classes = $derived(
		cn(
			"ft-dropdown-menu-content flex w-max min-w-[180px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-[13px] text-popover-foreground shadow-lg outline-none",
			className
		)
	);
</script>

<!--
	`DropdownMenu` renders `DropdownMenuTrigger` and `DropdownMenuContent` as
	plain, unconditional children — the compound owns no wrapper of its own
	to hang an `{#if}` on (see its own file: it renders nothing but
	`children`). So this component gates its own DOM on `root.open` itself,
	the same self-gating `DropdownMenuSubContent` does for its submenu.

	Portal-before-dismissable-and-position ordering doesn't matter the way
	portal-before-focus-trap does — none of these actions call `.focus()` on
	mount — but `use:portal` is still written first, matching every other
	floating surface in this library (`PopoverContent`, `SelectPanel`) so the
	convention stays uniform rather than "matters here, doesn't there".

	No `focusTrap`: a dropdown menu is not modal. Tab is handled inside
	`handleKeydown` above instead — it closes the menu and is never
	`preventDefault`ed, so the browser's own Tab traversal continues from
	wherever real DOM focus currently sits, rather than being cycled back
	into a trap. That also means this panel needs no eager focus-return
	handle the way a modal surface does: `DropdownMenu`'s own `setOpen`
	refocuses the trigger from a plain function outside this `{#if}`, so the
	return already lands at the dismiss instant rather than at unmount, exit
	transition or not.

	ONE bidirectional `transition:`, never a split `in:`/`out:` pair: a
	bidirectional directive passes the in-flight counterpart's current
	position into the fresh call, so a menu reopened mid-exit continues from
	where it is instead of snapping to invisible first. `entering: root.open`
	is what tells it which way it is going — Svelte reports
	`direction: "both"` for a bidirectional directive and cannot distinguish
	the two on its own, and the params are read fresh (outside any reactive
	context) at the instant each direction starts. The transition itself is
	`_internals/motion/anchored.js`, shared with every other floating surface
	in the library, and it animates `opacity` + `transform` only.

	`data-state` is a STATIC literal, changed only by `markSurfaceState` from
	the two handlers below. Svelte marks this branch inert before it plays
	the outro and the scheduler skips inert effects, so a reactive
	`data-state={…}` would never reach the DOM on a real close. `inert`
	itself is never written by hand: Svelte sets it on any element carrying a
	`transition:` for the whole exit, which is what keeps a menu on its way
	out from answering a click.

	`active: () => root.open` disarms the dismiss layer the instant `open`
	flips, so a second Escape during the fade is neither answered again nor
	swallowed on its way to whatever sits underneath — the layer is still on
	the stack (its `destroy()` is delayed by the outro) but no longer top of
	it.
-->
{#if root.open}
	<div
		bind:this={ref}
		id={root.contentId}
		role="menu"
		aria-labelledby={root.triggerId}
		tabindex="-1"
		class={classes}
		use:portal
		use:anchorPosition={{
			anchor: () => root.triggerRef,
			side: root.side,
			align: root.align,
			offset: root.offset,
			onPlacement: (side) => (resolvedSide = side),
		}}
		use:dismissable={{
			onDismiss: () => root.close(),
			exclude: () => [root.triggerRef],
			active: () => root.open,
		}}
		transition:anchored={{ side: resolvedSide, entering: root.open }}
		data-state="open"
		data-side={resolvedSide}
		data-align={root.align}
		style:transform-origin={originFor(resolvedSide, root.align)}
		onkeydown={handleKeydown}
		onintrostart={(e) => markSurfaceState(e, "open")}
		onoutrostart={(e) => markSurfaceState(e, "closing")}
	>
		{@render children?.()}
	</div>
{/if}
