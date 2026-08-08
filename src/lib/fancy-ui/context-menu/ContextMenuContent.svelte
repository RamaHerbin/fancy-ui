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
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
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
	edges exactly the same way a real element's rect does.
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
		}}
		use:dismissable={{
			onDismiss: () => root.close(),
		}}
		onkeydown={handleKeydown}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ft-context-menu-content {
			animation: ft-context-menu-in 0.12s ease-out;
		}
	}

	@keyframes ft-context-menu-in {
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
