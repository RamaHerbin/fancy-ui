<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface DropdownMenuItemProps {
		/** Called when the item is selected, by click or (in a real browser) by Enter/Space while it holds focus. */
		onSelect?: () => void;
		/** Disables the item: skipped by keyboard navigation and typeahead, inert to click. */
		disabled?: boolean;
		/** Visual/semantic variant. `"destructive"` renders in the destructive color. */
		variant?: "default" | "destructive";
		/** Display-only keyboard shortcut, rendered as a trailing `<kbd>`. This component binds no global keys for it. */
		shortcut?: string;
		/** Whether selecting the item closes the whole menu. Defaults to true. */
		closeOnSelect?: boolean;
		/** Leading icon. */
		icon?: Snippet;
		/** The item's label. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { MENU_KEY, type MenuContext } from "./types.js";

	let {
		onSelect,
		disabled = false,
		variant = "default",
		shortcut,
		closeOnSelect = true,
		icon,
		children,
		class: className,
	}: DropdownMenuItemProps = $props();

	// `DropdownMenuContent`/`DropdownMenuSubContent` (or `ContextMenu`'s
	// equivalents) always provide this before mounting their children, so
	// there is no standalone-usage fallback to design for — the same
	// assumption every context-consuming sub-component in this library makes
	// about its own root.
	const ctx = getContext<MenuContext>(MENU_KEY);

	let itemRef: HTMLButtonElement | null = null;

	$effect(() => {
		if (!itemRef) return;
		return ctx.focus.register(itemRef);
	});

	// This item's own label — `<span>{@render children?.()}</span>` below,
	// nothing else — is already isolated from the icon and the shortcut
	// (both separate `aria-hidden` siblings), so `menu.svelte.ts`'s typeahead
	// fallback (visible text, skipping `aria-hidden` subtrees) already gets
	// this markup right on its own. An earlier version of this component set
	// `data-typeahead-label` explicitly instead, computed once in a mount
	// effect — which put a second, staler source of truth in front of a live
	// computation that was already correct: a label that changes again later
	// without the item remounting (a count in the text, a toggled "Show/Hide"
	// word) would keep matching its mount-time text forever. Removed for
	// that reason. `data-typeahead-label` is still there in the core for a
	// consumer hand-building menu items who hasn't marked their own icons
	// `aria-hidden` — this component just doesn't need the escape hatch,
	// because it already satisfies the convention the fallback relies on.

	// A native `disabled` attribute already blocks a real click, but
	// `fireEvent.click` in a test — and, per the brief, any synthetic click —
	// walks straight past it, so the handler guards again rather than
	// trusting the attribute alone.
	function handleClick(): void {
		if (disabled) return;
		// Mouse hover already syncs the menu core's tracked focus position
		// (see `handleMouseEnter` below), and the common `closeOnSelect`
		// path makes this redundant too — closing moves focus back to the
		// trigger regardless. The gap is `closeOnSelect: false` reached by
		// something that skips `mouseenter` entirely, a touch tap being the
		// realistic case: without this, the core's own idea of "focused"
		// stays wherever it last was (or unset), and the next arrow key
		// starts from the wrong place even though this row is what the user
		// just interacted with. `ToggleGroupItem` calls `ref?.focus()` after
		// its own click for the same reason.
		if (itemRef) ctx.focus.focusItem(itemRef);
		onSelect?.();
		if (closeOnSelect) ctx.closeAll();
	}

	// Real DOM focus IS the highlight in a `role="menu"` built on
	// `menu.svelte.ts` (see its header comment) — so, unlike `SelectPanel`'s
	// rows, hovering an item deliberately moving focus onto it is correct
	// here, not the mousedown-steals-focus bug the brief warns about. There
	// is nothing to cancel: this is the behaviour a mouse user needs to stay
	// in sync with a keyboard user's own arrow-key highlight.
	function handleMouseEnter(): void {
		if (disabled || !itemRef) return;
		ctx.focus.focusItem(itemRef);
	}

	// No font-size here: it inherits from whichever panel renders this item
	// (`DropdownMenuContent` at 13px, `ContextMenuContent` at 12px, or a
	// `*SubContent` carrying its own family's size through — see
	// `DropdownMenuSubContent`'s own comment on `MenuContext.itemTextClass`
	// for why a submenu needs that context field rather than plain CSS
	// inheritance). A hardcoded size here would win over all of them.
	const classes = $derived(
		cn(
			"ft-dropdown-menu-item flex w-full cursor-pointer items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[7px] text-left text-foreground outline-none",
			"hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
			"disabled:pointer-events-none disabled:opacity-50",
			variant === "destructive" &&
				"text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive",
			className
		)
	);
</script>

<button
	bind:this={itemRef}
	type="button"
	role="menuitem"
	tabindex="-1"
	{disabled}
	aria-disabled={disabled ? "true" : undefined}
	data-variant={variant}
	class={classes}
	onclick={handleClick}
	onmouseenter={handleMouseEnter}
>
	<span class="flex items-center gap-[10px]">
		{#if icon}
			<span class="ft-dropdown-menu-item-icon" aria-hidden="true">{@render icon()}</span>
		{/if}
		<span>{@render children?.()}</span>
	</span>
	{#if shortcut}
		<!--
			Real DOM text, not CSS `content` — that's what lets it participate in
			the button's accessible name at all — but marked `aria-hidden`
			anyway: raw symbol glyphs like "⌘R" don't announce usefully as
			speech, and this item's own label text already carries the
			meaningful accessible name on its own.
		-->
		<kbd
			aria-hidden="true"
			class="ft-dropdown-menu-item-shortcut text-muted-foreground font-mono text-[10px]"
			>{shortcut}</kbd
		>
	{/if}
</button>
