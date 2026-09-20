<script lang="ts">
import { computed } from "vue";
import { resolvePortalTarget } from "./portal.js";

export interface PortalProps {
	/**
	 * Element, CSS selector, or undefined for `document.body`. A selector
	 * matching nothing falls back to `document.body`.
	 */
	target?: HTMLElement | string;
	/** Render children in place instead of portalling. */
	disabled?: boolean;
}

// Re-exported so a consumer of this component never needs a second import
// from "./portal.js" for the helper it already has to name.
export { resolvePortalTarget };
</script>

<script setup lang="ts">
defineOptions({ name: "Portal", inheritAttrs: false });
const props = defineProps<PortalProps>();
defineSlots<{ default?: () => unknown }>();

// Evaluated at patch time, never in a lazy initializer (C-7). On the server
// there is no `document` to resolve against, and the server output does not
// go through the target anyway: an open surface is emitted inline in the
// document body, ahead of the app root, wrapped in the teleport anchor
// comments, and `#teleports` is emitted empty. So the server hands
// `<Teleport>` the one target that is always true of that output and the
// client resolves the real element on the first patch.
const to = computed<HTMLElement | string>(() =>
	typeof document === "undefined" ? "body" : resolvePortalTarget(props.target)
);
</script>

<template>
	<Teleport v-if="!disabled" :to="to"><slot /></Teleport>
	<slot v-else />
</template>
