<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface DropdownMenuTriggerProps {
	/** Disables the trigger — the menu cannot be opened. */
	disabled?: boolean;
	/** Additional CSS classes, merged onto the trigger. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { DROPDOWN_MENU_KEY } from "./types.js";

defineOptions({ name: "DropdownMenuTrigger", inheritAttrs: false });

const { disabled = false, class: className } = defineProps<DropdownMenuTriggerProps>();

/** The trigger's content. */
defineSlots<{ default?: () => unknown }>();

// `DropdownMenu` only ever mounts this alongside `DropdownMenuContent` under
// its own context, so there is no standalone-usage fallback to design for —
// the same assumption every other context-consuming leaf in this library makes
// about its own root.
const ctx = DROPDOWN_MENU_KEY.useRequired();

// Convention C-4: exactly where the source declares `ref = $bindable(null)`.
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
defineExpose({ ref: trigger });

// The source's mount effect, with the same cleanup: the root keeps the element
// the panel anchors against and excludes from its own outside-click check.
// Read from a watcher, never in `setup` (convention C-1) — a template ref is
// null there and on the server.
watch(
	trigger,
	(node, _prev, onCleanup) => {
		ctx.setTriggerRef(node);
		onCleanup(() => ctx.setTriggerRef(null));
	},
	{ flush: "post" }
);

function handleClick(): void {
	if (disabled) return;
	if (ctx.open) {
		// Focus is already here — it's the element that was just clicked — so
		// there is nothing for a forced `.focus()` to do.
		ctx.close({ returnFocus: false });
	} else {
		ctx.openWithFocus("first");
	}
}

function handleKeydown(event: KeyboardEvent): void {
	if (disabled) return;
	switch (event.key) {
		case "Enter":
		case " ":
		case "ArrowDown":
			event.preventDefault();
			ctx.openWithFocus("first");
			return;
		case "ArrowUp":
			event.preventDefault();
			ctx.openWithFocus("last");
			return;
	}
}

const classes = computed(() =>
	cn(
		"ft-dropdown-menu-trigger border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-nav-accent)]/35 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
		className
	)
);
</script>

<template>
	<button
		ref="trigger"
		:id="ctx.triggerId"
		type="button"
		:disabled="disabled"
		:class="classes"
		aria-haspopup="menu"
		:aria-expanded="ctx.open"
		:aria-controls="ctx.open ? ctx.contentId : undefined"
		@click="handleClick"
		@keydown="handleKeydown"
	>
		<slot />
	</button>
</template>

<style scoped>
.ft-dropdown-menu-trigger {
	--ft-nav-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}
</style>
