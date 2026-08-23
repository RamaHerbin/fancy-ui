<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ContextMenuContentProps {
		/** The `ContextMenuItem`/`ContextMenuSeparator`/`ContextMenuLabel`/`ContextMenuSub` children. */
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
	import { handleMenuContentKeydown, createOpenSubRegistry } from "../dropdown-menu/menu-shared.js";
	import {
		MENU_KEY,
		type MenuContext,
		CONTEXT_MENU_KEY,
		type ContextMenuRootContext,
	} from "./types.js";

	let { children, class: className, ref = $bindable(null) }: ContextMenuContentProps = $props();

	const root = getContext<ContextMenuRootContext>(CONTEXT_MENU_KEY);

	// The side the panel was ACTUALLY placed on, seeded with the requested one
	// so an un-flipped open never depends on `onPlacement` having fired first.
	// This is the panel where a flip is routine rather than exceptional: the
	// anchor is a point at the pointer, and a right-click anywhere in the
	// lower or right band of the viewport flips it. Growing from the corner
	// nearest that point is what keeps the menu feeling attached to the click
	// instead of erupting from its own middle.
	let resolvedSide = $state<Side>(root.side);

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
		itemTextClass: "text-[12px]",
		closeAll(options) {
			root.close(options);
		},
		registerOpenSub,
		closeSiblingSubs,
	};
	setContext(MENU_KEY, menuContext);

	$effect(() => {
		if (root.open) {
			void tick().then(() => focus.moveToEdge("first"));
		}
	});

	function handleKeydown(event: KeyboardEvent): void {
		handleMenuContentKeydown(event, menuContext, {
			onTab: () => root.close({ returnFocus: false }),
		});
	}

	// text-[12px]: this family's own density, distinct from DropdownMenu's
	// 13px — the mockup specifies both explicitly. Every shared item leaf
	// inherits this from here via normal CSS (they carry no font-size of
	// their own); a nested `ContextMenuSubContent` gets it forwarded through
	// `menuContext.itemTextClass` instead, since a portalled submenu is a
	// DOM sibling of this panel once open, not a descendant, and can't
	// inherit it directly — see `MenuContext.itemTextClass`'s own doc.
	const classes = $derived(
		cn(
			"ft-context-menu-content flex w-max min-w-[180px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-[12px] text-popover-foreground shadow-lg outline-none",
			className
		)
	);
</script>

<!--
	Self-gated on `root.open`, same reasoning as `DropdownMenuContent`. Not
	modal: no `focusTrap`, no `lockScroll`. Positioned against a *virtual*
	anchor — `ContextMenu`'s own zero-size `anchorRef` span, moved to the
	last right-click's coordinates — instead of a real trigger element, but
	`anchorPosition`'s flip/clamp behaviour needs nothing different for that:
	a zero-size `DOMRect` at the pointer flips and clamps at the viewport
	edges exactly the same way a real element's rect does — and the growth
	origin below follows that same resolved side, so a menu that flipped to
	sit *above* a click near the bottom of the viewport grows out of its own
	bottom edge, the one still touching the pointer, instead of its top. The
	exit collapses back into that same corner.

	ONE bidirectional `transition:`, never a split `in:`/`out:` pair, with
	`entering: root.open` as the direction signal: a bidirectional directive
	hands the in-flight counterpart's current position to the fresh call, so
	a menu reopened mid-exit continues from where it is rather than snapping
	to invisible first, and Svelte's own `direction: "both"` cannot tell an
	arrival from a departure. Only `opacity` and `transform` animate.

	Focus needs nothing here: `ContextMenu`'s own `setOpen` returns focus to
	whatever was focused before the right-click, from a plain function
	outside this `{#if}`, so the return still happens at the dismiss instant
	rather than waiting out the fade. `data-state` is a static literal moved
	only by `markSurfaceState` from the two handlers below — a reactive
	attribute inside a closing block never reaches the DOM — and `inert`
	comes free with the `transition:` for the whole exit.
-->
{#if root.open}
	<div
		bind:this={ref}
		id={root.contentId}
		role="menu"
		tabindex="-1"
		class={classes}
		use:portal
		use:anchorPosition={{
			anchor: () => root.anchorRef,
			side: root.side,
			align: root.align,
			offset: root.offset,
			onPlacement: (side) => (resolvedSide = side),
		}}
		use:dismissable={{
			onDismiss: () => root.close(),
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
