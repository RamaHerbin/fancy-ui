<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface NavigationMenuItemProps {
		/** This item's value — what `NavigationMenu`'s `value` becomes while its panel is open. */
		value: string;
		/** A `NavigationMenuTrigger` + `NavigationMenuContent` pair. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { NAVIGATION_MENU_ITEM_KEY, type NavigationMenuItemContext } from "./types.js";

	let { value, children, class: className }: NavigationMenuItemProps = $props();

	// Stable across SSR and hydration — `_internals/id.js`'s `uid()` throws
	// on the server, and the trigger's `aria-controls` / the panel's
	// `aria-labelledby` need to agree with themselves from the first
	// server-rendered paint.
	const baseId = $props.id();

	const context: NavigationMenuItemContext = {
		get value() {
			return value;
		},
		get triggerId() {
			return `${baseId}-trigger`;
		},
		get contentId() {
			return `${baseId}-content`;
		},
	};
	setContext(NAVIGATION_MENU_ITEM_KEY, context);
</script>

<li class={cn("ft-navigation-menu-item", className)}>
	{@render children?.()}
</li>
