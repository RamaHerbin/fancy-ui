<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DropdownMenuSubTriggerProps {
		/** Disables the row: skipped by keyboard navigation and typeahead, inert to click/hover. */
		disabled?: boolean;
		/** Leading icon. */
		icon?: Snippet;
		/** The row's label. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { MENU_KEY, SUB_KEY, type MenuContext, type SubContext } from "./types.js";

	let {
		disabled = false,
		icon,
		children,
		class: className,
	}: DropdownMenuSubTriggerProps = $props();

	const parentMenu = getContext<MenuContext>(MENU_KEY);
	const sub = getContext<SubContext>(SUB_KEY);

	let itemRef: HTMLButtonElement | null = null;
	let openIntentTimer: ReturnType<typeof setTimeout> | null = null;

	// Open-intent delay, mirroring `DropdownMenuSub`'s close-intent one: a
	// pointer merely passing over this row on its way somewhere else
	// shouldn't pop the submenu open.
	const OPEN_INTENT_MS = 150;

	// This row is itself a menu item at the *parent* level — it takes part
	// in the parent's arrow-key navigation and typeahead exactly like a
	// `DropdownMenuItem` does, on top of owning its own submenu's open state.
	// Its label span (below) is isolated from the icon and the caret — both
	// `aria-hidden` siblings — so `menu.svelte.ts`'s typeahead fallback
	// (visible text, skipping `aria-hidden` subtrees) already matches this
	// row correctly; see `DropdownMenuItem`'s own comment for why this
	// component doesn't set `data-typeahead-label` to duplicate that.
	$effect(() => {
		if (!itemRef) return;
		sub.setTriggerRef(itemRef);
		const unregister = parentMenu.focus.register(itemRef);
		return () => {
			unregister();
			sub.setTriggerRef(null);
		};
	});

	// Cancels a pending open-intent timer on destroy, not just on
	// mouseleave — a keyed `{#each}` reordering can destroy this exact
	// component while the parent context and its siblings stay alive, and a
	// timer left running past that point would call `sub.openSub()` against
	// a `SubContext` this component no longer owns a row in. Every downstream
	// call along that path happens to guard itself against a stale/detached
	// element, so this was never a crash — but there's no reason to leave a
	// callback armed once the row it belongs to is gone.
	$effect(() => {
		return clearOpenIntent;
	});

	function clearOpenIntent(): void {
		if (openIntentTimer !== null) {
			clearTimeout(openIntentTimer);
			openIntentTimer = null;
		}
	}

	function handleClick(): void {
		if (disabled) return;
		// Same reasoning as `DropdownMenuItem`'s own click handler: hover
		// already syncs the parent menu's tracked focus position, but a
		// click reached without one first (a touch tap) wouldn't otherwise.
		if (itemRef) parentMenu.focus.focusItem(itemRef);
		sub.openSub();
	}

	function handleMouseEnter(): void {
		if (disabled || !itemRef) return;
		sub.keepOpen();
		parentMenu.focus.focusItem(itemRef);
		clearOpenIntent();
		openIntentTimer = setTimeout(() => {
			openIntentTimer = null;
			sub.openSub();
		}, OPEN_INTENT_MS);
	}

	function handleMouseLeave(): void {
		clearOpenIntent();
		sub.scheduleClose();
	}

	// ArrowRight always means "into the submenu", regardless of which side
	// it actually rendered on after a flip — see `SubContext.resolvedSide`'s
	// own doc comment. Only this row's own ArrowRight is handled here;
	// ArrowLeft belongs to `DropdownMenuSubContent`, on the element it's
	// actually about once focus has moved inside.
	function handleKeydown(event: KeyboardEvent): void {
		if (disabled) return;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			sub.openSub();
		}
	}

	// No font-size here — same reasoning as `DropdownMenuItem`'s own classes:
	// it inherits from whichever panel this row renders inside.
	const classes = $derived(
		cn(
			"ft-dropdown-menu-item flex w-full cursor-pointer items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[7px] text-left text-foreground outline-none",
			"hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
			"disabled:pointer-events-none disabled:opacity-50",
			className
		)
	);
</script>

<button
	bind:this={itemRef}
	id={sub.triggerId}
	type="button"
	role="menuitem"
	tabindex="-1"
	{disabled}
	aria-disabled={disabled ? "true" : undefined}
	aria-haspopup="menu"
	aria-expanded={sub.open}
	aria-controls={sub.open ? sub.contentId : undefined}
	class={classes}
	onclick={handleClick}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onkeydown={handleKeydown}
>
	<span class="flex items-center gap-[10px]">
		{#if icon}
			<span class="ft-dropdown-menu-item-icon" aria-hidden="true">{@render icon()}</span>
		{/if}
		<span>{@render children?.()}</span>
	</span>
	<span aria-hidden="true" class="ft-dropdown-menu-sub-caret text-muted-foreground text-[10px]">
		{sub.resolvedSide === "left" ? "‹" : "›"}
	</span>
</button>
