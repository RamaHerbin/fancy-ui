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
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
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
	into a trap.
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
		}}
		use:dismissable={{
			onDismiss: () => root.close(),
			exclude: () => [root.triggerRef],
		}}
		onkeydown={handleKeydown}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	@media (prefers-reduced-motion: no-preference) {
		.ft-dropdown-menu-content {
			animation: ft-dropdown-menu-in 0.12s ease-out;
		}
	}

	@keyframes ft-dropdown-menu-in {
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
