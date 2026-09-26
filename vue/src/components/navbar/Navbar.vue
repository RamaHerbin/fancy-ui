<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface NavbarProps {
	/** Accessible name for the `<nav>` landmark. Defaults to `"Main"`. */
	label?: string;
	/** Pins the bar to the viewport top with `position: sticky` and a translucent, blurred background. */
	sticky?: boolean;
	/** Draws a 1px hairline along the bottom edge. Defaults to `true`. */
	bordered?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "Navbar", inheritAttrs: false });

const {
	label = "Main",
	sticky = false,
	bordered = true,
	class: className,
} = defineProps<NavbarProps>();

defineSlots<{
	/** The brand mark / wordmark, on the left. */
	brand?(): unknown;
	/** The navigation links, between the brand and the actions. */
	default?(): unknown;
	/** Actions on the right — search, sign-in, a theme switch. */
	actions?(): unknown;
}>();

const navRef = useTemplateRef<HTMLElement>("navRef");
defineExpose({ ref: navRef });

const classes = computed(() =>
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

<template>
	<nav ref="navRef" :aria-label="label" :class="classes">
		<div
			v-if="$slots.brand"
			class="ft-navbar-brand flex shrink-0 items-center gap-2 text-sm font-bold"
		>
			<slot name="brand" />
		</div>
		<div v-if="$slots.default" class="flex min-w-0 items-center gap-5">
			<slot />
		</div>
		<div
			v-if="$slots.actions"
			class="ft-navbar-actions ml-auto flex shrink-0 items-center gap-3"
		>
			<slot name="actions" />
		</div>
	</nav>
</template>

<style scoped>
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
