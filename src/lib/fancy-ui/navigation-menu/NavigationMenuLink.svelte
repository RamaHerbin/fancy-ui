<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavigationMenuLinkProps {
		/** Destination URL. */
		href: string;
		/** Marks this as the current page: sets `aria-current="page"` and the current-row styling. */
		current?: boolean;
		/** The row's title. Ignored when `children` is given. */
		title?: string;
		/** The row's supporting description, shown under the title. Ignored when `children` is given. */
		description?: string;
		/** Marks the destination as off-site: opens in a new tab with a safe `rel`, and adds an sr-only note. */
		external?: boolean;
		/**
		 * Full override for the row's content — e.g. the mockup's feature tile,
		 * which pairs an icon with its title on one line. Takes over from
		 * `title`/`description` entirely when given.
		 */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		href,
		current = false,
		title,
		description,
		external = false,
		children,
		class: className,
	}: NavigationMenuLinkProps = $props();

	const classes = $derived(
		cn(
			"ft-navigation-menu-link flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left no-underline transition-colors",
			"hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
			current && "bg-accent text-accent-foreground",
			className
		)
	);
</script>

<a
	{href}
	class={classes}
	aria-current={current ? "page" : undefined}
	target={external ? "_blank" : undefined}
	rel={external ? "noopener noreferrer" : undefined}
>
	{#if children}
		{@render children()}
	{:else}
		{#if title}
			<span class="ft-navigation-menu-link-title text-foreground block text-[12px] font-medium"
				>{title}</span
			>
		{/if}
		{#if description}
			<span class="ft-navigation-menu-link-description text-muted-foreground text-[12px]"
				>{description}</span
			>
		{/if}
	{/if}
	{#if external}
		<span class="sr-only">{" "}(opens in a new tab)</span>
	{/if}
</a>

<style>
	/*
	 * Optional utility for the mockup's feature tile — a `NavigationMenuLink`
	 * rendered as the panel's highlighted first column. Not a boolean prop:
	 * the mockup only ever shows one per panel, so a prop would exist for a
	 * single call site, where `class="ft-navigation-menu-feature"` composes
	 * with everything else the `class` prop already merges in. Reads
	 * `--ft-nav-accent`, which `NavigationMenuContent` declares — this class
	 * only ever makes visual sense on a link rendered inside a content panel,
	 * so the property is always present by the time it's read here.
	 */
	.ft-navigation-menu-feature {
		background: linear-gradient(
			135deg,
			color-mix(in oklch, var(--ft-nav-accent) 12%, transparent),
			color-mix(in oklch, oklch(0.8001 0.1345 225.49) 6%, transparent)
		);
	}
</style>
