<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface SidebarItemProps {
		/** Renders an `<a>` when set; a `<button type="button">` otherwise. */
		href?: string;
		/**
		 * Marks this as the current item: `aria-current="page"` plus the
		 * accent left bar — current is never conveyed by colour alone.
		 */
		current?: boolean;
		/** A count or short flag, e.g. `4` — rendered as a pill and folded into the accessible name. */
		badge?: string | number;
		/**
		 * What the badge means, read alongside its value in the accessible
		 * name (`"Inbox, 4 unread"`). Defaults to just the badge value if not given.
		 */
		badgeLabel?: string;
		/** Disables both the click and keyboard-activation paths. */
		disabled?: boolean;
		/** Native click handler, for the `<button>` branch. Never called while `disabled`. */
		onclick?: (event: MouseEvent) => void;
		/** A decorative glyph or icon, shown even when the sidebar is collapsed. */
		icon?: Snippet;
		/** The item's label. Moves to `sr-only` text while the sidebar is collapsed — never removed. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLAnchorElement | HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

	let {
		href,
		current = false,
		badge,
		badgeLabel,
		disabled = false,
		onclick,
		icon,
		children,
		class: className,
		ref = $bindable(null),
	}: SidebarItemProps = $props();

	const sidebar = getContext<SidebarContext | undefined>(SIDEBAR_KEY);
	const collapsed = $derived(sidebar?.collapsed ?? false);

	const hasBadge = $derived(badge !== undefined && badge !== null && badge !== "");

	const classes = $derived(
		cn(
			"ft-sidebar-item flex w-full items-center gap-2.5 rounded-[6px] px-2 py-[7px] text-[13px] transition-colors",
			"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
			collapsed && "justify-center",
			current
				? "ft-sidebar-item--current bg-accent text-accent-foreground font-medium"
				: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			disabled && "pointer-events-none opacity-50",
			className
		)
	);

	// The native `disabled` attribute on the `<button>` branch already blocks
	// real pointer/keyboard input, and the anchor branch strips `href`
	// entirely below — but a synthetic click (a test's `fireEvent.click`,
	// some assistive tech) reaches this handler regardless of either, so the
	// guard is what actually stops the callback in both cases.
	function handleClick(event: MouseEvent) {
		if (disabled) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	}
</script>

{#snippet content()}
	{#if icon}
		<span class="ft-sidebar-item-icon shrink-0" aria-hidden="true">
			{@render icon()}
		</span>
	{/if}
	<span class={cn("min-w-0 flex-1 truncate text-left", collapsed && "sr-only")}>
		{@render children?.()}
	</span>
	{#if hasBadge}
		<span class={cn("ft-sidebar-item-badge shrink-0", collapsed && "sr-only")}>
			{badge}
			{#if badgeLabel}
				<span class="sr-only">{" "}{badgeLabel}</span>
			{/if}
		</span>
	{/if}
{/snippet}

<li class="ft-sidebar-item-wrapper w-full list-none">
	{#if href}
		<a
			bind:this={ref}
			href={disabled ? undefined : href}
			aria-current={current ? "page" : undefined}
			aria-disabled={disabled ? "true" : undefined}
			tabindex={disabled ? -1 : undefined}
			class={classes}
			onclick={handleClick}
		>
			{@render content()}
		</a>
	{:else}
		<button
			bind:this={ref}
			type="button"
			{disabled}
			aria-current={current ? "page" : undefined}
			class={classes}
			onclick={handleClick}
		>
			{@render content()}
		</button>
	{/if}
</li>

<style>
	/*
	 * Declared here too, not just on Sidebar's root: `SidebarItem` is meant to
	 * be usable on its own DOM subtree, and relying on inheritance alone
	 * would leave the accent bar and badge fill missing wherever it doesn't
	 * happen to render as a Sidebar descendant. Same shape as
	 * `Autocomplete`/`Combobox`/`TimePicker`'s `--ft-field-accent` and
	 * `Button`'s `--ft-btn-accent` — every one of those declares its own copy
	 * of the same formula rather than trusting an ancestor. This reads
	 * `--ft-accent`, never redeclares it, so a consumer retinting the whole
	 * tree from higher up still reaches this. Declared on the item's own
	 * root class, not the `--current` modifier, so the badge fill below —
	 * which needs it regardless of `current` — inherits it too.
	 */
	.ft-sidebar-item {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-sidebar-item--current {
		box-shadow: inset 2px 0 0 var(--ft-nav-accent);
	}

	.ft-sidebar-item-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.1rem;
		border-radius: 999px;
		padding: 1px 7px;
		font-size: 10px;
		font-weight: 600;
		line-height: 1.4;
		background: var(--ft-nav-accent);
		color: var(--ft-accent-foreground, oklch(1 0 0));
	}
</style>
