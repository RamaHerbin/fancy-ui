<script lang="ts">
import type { HTMLAttributes } from "vue";

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
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { provide, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { SIDEBAR_KEY, type SidebarContext } from "./types.js";

defineOptions({ name: "Sidebar", inheritAttrs: false });

const { label = "Sidebar", collapsed = false, class: className } = defineProps<SidebarProps>();

defineSlots<{
	/** `SidebarGroup`, `SidebarSeparator` and `SidebarFooter`. */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLElement>("el");
defineExpose({ ref: el });

// The getter is what keeps every nested consumer live: a `computed` reading
// `sidebar.collapsed` runs it inside its own tracking scope, so the prop is
// picked up exactly as the source's `$derived` picked it up. Built once and
// never replaced.
const context: SidebarContext = {
	get collapsed() {
		return collapsed;
	},
};
provide(SIDEBAR_KEY, context);
</script>

<template>
	<nav
		ref="el"
		:aria-label="label"
		:data-collapsed="collapsed"
		:class="
			cn(
				'ft-sidebar bg-background flex h-full flex-col gap-3 p-3',
				collapsed ? 'w-[64px] items-center px-2' : 'w-[240px]',
				className
			)
		"
	>
		<slot />
	</nav>
</template>

<style scoped>
/*
 * `SidebarItem` declares this same fallback again, locally on itself —
 * deliberately, not a drift: an item is a fully standalone component, and
 * this declaration here only reaches it through DOM inheritance, which
 * plain CSS custom properties do regardless of the scoping the compiler
 * applies. `Autocomplete`/`Combobox`/`TimePicker` and its portalled
 * `TimePickerPanel` are the precedent — a component that can render
 * somewhere other than as a literal descendant needs its own copy, not just
 * an ancestor's. Neither declaration redeclares `--ft-accent` itself, so a
 * consumer retinting the whole tree via `--ft-accent` still reaches both.
 */
.ft-sidebar {
	--ft-nav-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}

/*
 * A NAMED exception to "only opacity and transform animate": a collapsing
 * sidebar is a layout change and there is no transform that reflows the
 * content beside it. Kept, retokenised, and declared as an exception rather
 * than quietly claiming compliance.
 *
 * The curve is `--ft-ease-inout`, not `--ft-ease-out`: a collapse is a
 * reversible state flip, not an arrival, and it has to read the same in
 * both directions.
 *
 * 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-sidebar {
		transition: width var(--ft-sidebar-collapse-duration, var(--ft-duration-fast, 150ms))
			var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	}
}
</style>
