<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavbarProps {
		/** Accessible name for the `<nav>` landmark. Defaults to `"Main"`. */
		label?: string;
		/** Pins the bar to the viewport top with `position: sticky` and a translucent, blurred background. */
		sticky?: boolean;
		/** Draws a 1px hairline along the bottom edge. Defaults to `true`. */
		bordered?: boolean;
		/** The brand mark / wordmark, on the left. */
		brand?: Snippet;
		/** The navigation links, between the brand and the actions. */
		children?: Snippet;
		/** Actions on the right — search, sign-in, a theme switch. */
		actions?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		label = "Main",
		sticky = false,
		bordered = true,
		brand,
		children,
		actions,
		class: className,
		ref = $bindable(null),
	}: NavbarProps = $props();

	const classes = $derived(
		cn(
			"ft-navbar flex h-[52px] w-full items-center gap-5 bg-background px-5",
			bordered && "border-border border-b",
			// A translucent fill instead of the opaque default: content scrolling
			// underneath the pinned bar stays legible through the blur rather than
			// vanishing behind a flat panel.
			sticky && "sticky top-0 z-40 bg-background/80 backdrop-blur-md",
			className
		)
	);
</script>

<nav bind:this={ref} aria-label={label} class={classes}>
	{#if brand}
		<div class="ft-navbar-brand flex shrink-0 items-center gap-2 text-sm font-bold">
			{@render brand()}
		</div>
	{/if}
	{#if children}
		<div class="flex min-w-0 items-center gap-5">
			{@render children()}
		</div>
	{/if}
	{#if actions}
		<div class="ft-navbar-actions ml-auto flex shrink-0 items-center gap-3">
			{@render actions()}
		</div>
	{/if}
</nav>

<style>
	/*
	 * `NavbarLink` declares this same fallback again, locally on itself —
	 * deliberately, not a drift: it is a fully standalone component ("keep
	 * them independent so a consumer can put a NavbarLink anywhere" — a
	 * mobile menu, a footer), so this declaration here only reaches it when
	 * it happens to render as a DOM descendant of a Navbar. `Autocomplete`/
	 * `Combobox`/`TimePicker` and its portalled `TimePickerPanel` are the
	 * precedent — a component that can render somewhere other than as a
	 * literal descendant needs its own copy, not just an ancestor's. Neither
	 * declaration redeclares `--ft-accent` itself, so a consumer retinting
	 * the whole tree via `--ft-accent` still reaches both.
	 */
	.ft-navbar {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
