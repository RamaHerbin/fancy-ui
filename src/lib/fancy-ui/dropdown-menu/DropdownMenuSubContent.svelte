<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DropdownMenuSubContentProps {
		/** The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/nested `DropdownMenuSub` children. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext, setContext, tick } from "svelte";
	import { cn } from "$lib/utils.js";
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { anchored, originFor } from "../_internals/motion/anchored.js";
	import { createMenuFocus } from "../_internals/menu.svelte.js";
	import { MENU_KEY, SUB_KEY, type MenuContext, type SubContext } from "./types.js";
	import { handleMenuContentKeydown, createOpenSubRegistry } from "./menu-shared.js";

	let { children, class: className, ref = $bindable(null) }: DropdownMenuSubContentProps = $props();

	// Captured before `setContext(MENU_KEY, ...)` below shadows it for this
	// subtree — `menuContext.closeAll` delegates straight to this, so a
	// selection three submenus deep still closes the whole tree in one hop
	// (see `menu-shared.ts`'s header comment).
	const parentMenu = getContext<MenuContext>(MENU_KEY);
	const sub = getContext<SubContext>(SUB_KEY);

	const focus = createMenuFocus();
	const { registerOpenSub, closeSiblingSubs } = createOpenSubRegistry();

	const menuContext: MenuContext = {
		get focus() {
			return focus;
		},
		// Forwarded, not re-decided: this level's own density is whatever the
		// level above it — the root panel, or another `*SubContent` one level
		// up — already resolved, so a submenu nested under `ContextMenu` stays
		// at 12px and one nested under `DropdownMenu` stays at 13px, all the
		// way down. See `MenuContext.itemTextClass`'s own doc for why this has
		// to travel through context rather than plain CSS inheritance.
		get itemTextClass() {
			return parentMenu.itemTextClass;
		},
		// Copied from the parent level for the same reason as `itemTextClass`
		// just above: a submenu's own sound behaviour follows whatever the
		// root resolved, all the way down through nested submenus.
		get sound() {
			return parentMenu.sound;
		},
		closeAll(options) {
			parentMenu.closeAll(options);
		},
		registerOpenSub,
		closeSiblingSubs,
	};
	setContext(MENU_KEY, menuContext);

	$effect(() => {
		if (sub.open) {
			void tick().then(() => focus.moveToEdge("first"));
		}
	});

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			sub.closeSub(true);
			return;
		}
		handleMenuContentKeydown(event, menuContext, {
			// Tab closes the *whole* tree, not just this level — the browser's
			// own Tab traversal should leave the entire menu system behind, the
			// same as it does from the root content.
			onTab: () => parentMenu.closeAll({ returnFocus: false }),
		});
	}

	function handleMouseEnter(): void {
		sub.keepOpen();
	}

	function handleMouseLeave(): void {
		sub.scheduleClose();
	}

	// No fixed font-size in the string below — `parentMenu.itemTextClass` is
	// spliced in instead, since this panel is portalled to `document.body`
	// independently of its own parent panel and can't inherit that parent's
	// size via plain CSS once both are open (they end up as DOM siblings,
	// not ancestor/descendant). See `MenuContext.itemTextClass`'s own doc.
	const classes = $derived(
		cn(
			"ft-dropdown-menu-content flex w-max min-w-[160px] flex-col gap-[1px] rounded-[10px] border border-border bg-popover p-[5px] text-popover-foreground shadow-lg outline-none",
			parentMenu.itemTextClass,
			className
		)
	);
</script>

<!--
	Self-gated on `sub.open`, same reasoning as `DropdownMenuContent`: the
	consumer writes `<DropdownMenuSubContent>` unconditionally inside
	`<DropdownMenuSub>`, so this component hides its own DOM rather than
	asking the caller to.

	`use:dismissable` registers this panel as its own layer — Escape and an
	outside click close only THIS submenu (returning focus to its trigger),
	not the root, one interaction at a time; see `_internals/dismissable.ts`'s
	own header comment for why that's the deliberate, shared behaviour every
	nested overlay in this library gets, not a gap specific to submenus.

	The entrance reads `sub.resolvedSide` directly rather than keeping a local
	copy: that value is already published on the sub context and already
	drives `DropdownMenuSubTrigger`'s caret glyph, so a second `$state` here
	would give the caret and the growth origin two sources of truth that could
	disagree after a flip. `align` is the literal `"start"` for the same
	reason it is on `use:anchorPosition` below — a submenu never aligns any
	other way.
-->
{#if sub.open}
	<div
		bind:this={ref}
		id={sub.contentId}
		role="menu"
		tabindex="-1"
		class={classes}
		use:portal
		use:anchorPosition={{
			anchor: () => sub.triggerRef,
			side: "right",
			align: "start",
			offset: 2,
			onPlacement: (side) => sub.setResolvedSide(side),
		}}
		use:dismissable={{
			onDismiss: () => sub.closeSub(true),
			exclude: () => [sub.triggerRef],
		}}
		in:anchored={{ side: sub.resolvedSide }}
		data-side={sub.resolvedSide}
		data-align="start"
		style:transform-origin={originFor(sub.resolvedSide, "start")}
		onkeydown={handleKeydown}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		{@render children?.()}
	</div>
{/if}
