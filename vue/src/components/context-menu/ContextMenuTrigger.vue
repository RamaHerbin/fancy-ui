<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface ContextMenuTriggerProps {
	/** Disables the region: `contextmenu` is left alone and the browser's native menu shows instead. */
	disabled?: boolean;
	/** Additional CSS classes, merged onto the wrapping element. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { CONTEXT_MENU_KEY } from "./types.js";

/**
 * The region a right-click opens the menu over.
 *
 * The source declares `ref = $bindable(null)`, so the wrapping element
 * arrives through `defineExpose({ ref })` rather than a prop (convention
 * C-4).
 */
defineOptions({ name: "ContextMenuTrigger", inheritAttrs: false });

const { disabled = false, class: className } = defineProps<ContextMenuTriggerProps>();

/** The wrapped region's content. */
defineSlots<{ default?: () => unknown }>();

// `ContextMenu` only ever mounts this alongside `ContextMenuContent` under its
// own context, so there is no standalone-usage fallback to design for — the
// same assumption every other context-consuming leaf in this library makes
// about its own root.
const ctx = CONTEXT_MENU_KEY.useRequired();

// Convention C-4: exactly where the source declares `ref = $bindable(null)`.
const region = useTemplateRef<HTMLDivElement>("region");
defineExpose({ ref: region });

// How the keyboard path (the Menu key, Shift+F10) is told apart from a
// real right-click: both dispatch the same `contextmenu` event — there is
// no separate keyboard event to listen for — but `event.button` reports
// which mouse button actually fired it, and a keyboard-synthesized
// `contextmenu` reports `0` (the same value a synthetic/keyboard-sourced
// event always carries), never `2` (the right mouse button). That is not
// an inference about where the pointer probably wasn't — it is what the
// event states about its own origin — so it holds even for a genuine
// right-click at the literal viewport corner, unlike a coordinate-based
// guess. The keyboard path still has no real pointer position to open
// at, so it falls back to this region's own rect, same as before.
function handleContextMenu(event: MouseEvent): void {
	if (disabled) return;
	event.preventDefault();
	const isKeyboardInvoked = event.button !== 2;
	const node = region.value;
	if (isKeyboardInvoked && node) {
		const rect = node.getBoundingClientRect();
		ctx.openAt(rect.left, rect.top);
	} else {
		ctx.openAt(event.clientX, event.clientY);
	}
}

const classes = computed(() => cn("ft-context-menu-trigger", className));
</script>

<template>
	<!--
		No `role`, and no `aria-haspopup`/`aria-expanded`/`aria-controls`
		either, unlike `DropdownMenuTrigger`: `contextmenu` is a pointer
		gesture with an OS-level keyboard equivalent (the Menu key,
		Shift+F10), not a role-driven interaction an AT user "activates" via
		Enter/Space the way a button or link is. There is no ARIA role that
		describes "right-clickable region", and inventing one (or borrowing
		`role="button"`) would claim a keyboard/AT interaction model this
		element doesn't actually offer; the three `aria-*` attributes describe
		a control a user *activates* to open something, and this wrapping
		element isn't one. See the README's Accessibility section for the same
		note.
	-->
	<div ref="region" :class="classes" @contextmenu="handleContextMenu">
		<slot />
	</div>
</template>
