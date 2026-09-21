<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NavigationMenuItemProps {
	/** This item's value — what `NavigationMenu`'s `value` becomes while its panel is open. */
	value: string;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { NAVIGATION_MENU_ITEM_KEY, type NavigationMenuItemContext } from "./types.js";

/**
 * One disclosure in the row: its trigger, its panel, and the identity that
 * ties the two together. The source exposes no ref here, so neither does this.
 */
defineOptions({ name: "NavigationMenuItem", inheritAttrs: false });

const { value, class: className } = defineProps<NavigationMenuItemProps>();

defineSlots<{
	/** A `NavigationMenuTrigger` + `NavigationMenuContent` pair. */
	default?: () => unknown;
}>();

// Stable across SSR and hydration — `uid()` throws on the server, and the
// trigger's `aria-controls` / the panel's `aria-labelledby` need to agree with
// themselves from the first server-rendered paint (convention C-6).
const baseId = useFancyId();

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
NAVIGATION_MENU_ITEM_KEY.provide(context);
</script>

<template>
	<li :class="cn('ft-navigation-menu-item', className)">
		<slot />
	</li>
</template>
