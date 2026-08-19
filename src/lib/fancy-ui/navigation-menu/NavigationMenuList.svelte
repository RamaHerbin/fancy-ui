<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavigationMenuListProps {
		/** The `NavigationMenuItem`s (and any plain link that isn't a disclosure). */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLUListElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { NAVIGATION_MENU_KEY, type NavigationMenuContext } from "./types.js";

	let { children, class: className, ref = $bindable(null) }: NavigationMenuListProps = $props();

	const root = getContext<NavigationMenuContext>(NAVIGATION_MENU_KEY);

	// This is the element every panel anchors against (start-aligned to the
	// whole row, not to whichever trigger opened it — see
	// NavigationMenuContent) and the element trigger buttons are queried from
	// for roving-tabindex order. Handing the root a plain element reference,
	// not a snippet prop, keeps `NavigationMenuTrigger`/`NavigationMenuContent`
	// unaware that a `NavigationMenuList` even exists.
	$effect(() => {
		root.setListRef(ref);
		return () => root.setListRef(null);
	});
</script>

<ul
	bind:this={ref}
	class={cn("ft-navigation-menu-list m-0 flex list-none items-center gap-1 p-0", className)}
>
	{@render children?.()}
</ul>
