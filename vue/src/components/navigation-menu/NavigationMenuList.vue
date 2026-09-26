<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NavigationMenuListProps {
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { NAVIGATION_MENU_KEY } from "./types.js";

defineOptions({ name: "NavigationMenuList", inheritAttrs: false });

const { class: className } = defineProps<NavigationMenuListProps>();

defineSlots<{
	/** The `NavigationMenuItem`s (and any plain link that isn't a disclosure). */
	default?: () => unknown;
}>();

const el = useTemplateRef<HTMLUListElement>("el");
defineExpose({ ref: el });

const root = NAVIGATION_MENU_KEY.useRequired();

// This is the element every panel anchors against (start-aligned to the whole
// row, not to whichever trigger opened it — see NavigationMenuContent) and the
// element trigger buttons are queried from for roving-tabindex order. Handing
// the root a plain element reference, not a slot prop, keeps
// `NavigationMenuTrigger`/`NavigationMenuContent` unaware that a
// `NavigationMenuList` even exists.
//
// `onMounted`, not a `flush: 'post'` watcher on the template ref, and the
// difference is observable rather than stylistic: a watcher only queues its
// job once the ref-setting post job has run, and jobs queued during the very
// first post flush are deferred to the next one — the list would still be
// unpublished for a keystroke arriving in the same turn as the first render.
// `onMounted` is already in that first batch, and by then the ref is assigned.
// The source's effect has no other dependency: `ref` is `bind:this` on a
// static element, so it moves only at mount and unmount.
onMounted(() => {
	root.setListRef(el.value);
	onBeforeUnmount(() => root.setListRef(null));
});
</script>

<template>
	<ul
		ref="el"
		:class="cn('ft-navigation-menu-list m-0 flex list-none items-center gap-1 p-0', className)"
	>
		<slot />
	</ul>
</template>
