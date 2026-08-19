<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface SidebarProps {
		/** Accessible name for the `<nav>` landmark. Defaults to `"Sidebar"`. */
		label?: string;
		/**
		 * Whether the sidebar is collapsed to an icon-only rail. Plain, not
		 * bindable — `Sidebar` has no internal control of its own that ever
		 * changes this, so there is nothing for a binding to round-trip. Own
		 * the state yourself and pass it down.
		 */
		collapsed?: boolean;
		/** `SidebarGroup`, `SidebarSeparator` and `SidebarFooter`. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLElement | null;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

	let {
		label = "Sidebar",
		collapsed = false,
		children,
		class: className,
		ref = $bindable(null),
	}: SidebarProps = $props();

	const context: SidebarContext = {
		get collapsed() {
			return collapsed;
		},
	};
	setContext(SIDEBAR_KEY, context);
</script>

<nav
	bind:this={ref}
	aria-label={label}
	data-collapsed={collapsed}
	class={cn(
		"ft-sidebar bg-background flex h-full flex-col gap-3 p-3",
		collapsed ? "w-[64px] items-center px-2" : "w-[240px]",
		className
	)}
>
	{@render children?.()}
</nav>

<style>
	/*
	 * `SidebarItem` declares this same fallback again, locally on itself —
	 * deliberately, not a drift: an item is a fully standalone component, and
	 * this declaration here only reaches it through DOM inheritance, which
	 * plain CSS custom properties do regardless of Svelte's style scoping.
	 * `Autocomplete`/`Combobox`/`TimePicker` and its portalled `TimePickerPanel`
	 * are the precedent — a component that can render somewhere other than as
	 * a literal descendant needs its own copy, not just an ancestor's. Neither
	 * declaration redeclares `--ft-accent` itself, so a consumer retinting the
	 * whole tree via `--ft-accent` still reaches both.
	 */
	.ft-sidebar {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-sidebar {
			transition: width 0.15s ease-out;
		}
	}
</style>
