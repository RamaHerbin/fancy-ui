<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NavigationMenuLinkProps {
	/** Destination URL. */
	href: string;
	/** Marks this as the current page: sets `aria-current="page"` and the current-row styling. */
	current?: boolean;
	/** The row's title. Ignored when the default slot is given. */
	title?: string;
	/** The row's supporting description, shown under the title. Ignored when the default slot is given. */
	description?: string;
	/** Marks the destination as off-site: opens in a new tab with a safe `rel`, and adds an sr-only note. */
	external?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";

import { cn } from "../../utils.js";

defineOptions({ name: "NavigationMenuLink", inheritAttrs: false });

const {
	href,
	current = false,
	title,
	description,
	external = false,
	class: className,
} = defineProps<NavigationMenuLinkProps>();

defineSlots<{
	/**
	 * Full override for the row's content — e.g. the mockup's feature tile,
	 * which pairs an icon with its title on one line. Takes over from
	 * `title`/`description` entirely when given.
	 */
	default?: () => unknown;
}>();

const classes = computed(() =>
	cn(
		"ft-navigation-menu-link flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left no-underline transition-colors",
		"hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
		current && "bg-accent text-accent-foreground",
		className
	)
);
</script>

<template>
	<a
		:href="href"
		:class="classes"
		:aria-current="current ? 'page' : undefined"
		:target="external ? '_blank' : undefined"
		:rel="external ? 'noopener noreferrer' : undefined"
	>
		<slot v-if="$slots.default" />
		<template v-else>
			<span
				v-if="title"
				class="ft-navigation-menu-link-title text-foreground block text-[12px] font-medium"
				>{{ title }}</span
			>
			<span
				v-if="description"
				class="ft-navigation-menu-link-description text-muted-foreground text-[12px]"
				>{{ description }}</span
			>
		</template>
		<span v-if="external" class="sr-only"> (opens in a new tab)</span>
	</a>
</template>

<style scoped>
/*
 * Optional utility for the mockup's feature tile — a `NavigationMenuLink`
 * rendered as the panel's highlighted first column. Not a boolean prop: the
 * mockup only ever shows one per panel, so a prop would exist for a single
 * call site, where `class="ft-navigation-menu-feature"` composes with
 * everything else the `class` prop already merges in. Reads
 * `--ft-nav-accent`, which `NavigationMenuContent` declares — this class only
 * ever makes visual sense on a link rendered inside a content panel, so the
 * property is always present by the time it's read here.
 */
.ft-navigation-menu-feature {
	background: linear-gradient(
		135deg,
		color-mix(in oklch, var(--ft-nav-accent) 12%, transparent),
		color-mix(in oklch, oklch(0.8001 0.1345 225.49) 6%, transparent)
	);
}
</style>
