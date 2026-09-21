<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ChatMessageActions
 */
export interface ChatMessageActionsProps {
	/** Keep the rail on screen even when the message is neither hovered nor focused. */
	alwaysVisible?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject } from "vue";
import { cn } from "../../utils.js";
import { CHAT_MESSAGE_CONTEXT_KEY } from "./types.js";

defineOptions({ name: "ChatMessageActions", inheritAttrs: false });

const { alwaysVisible = false, class: className } = defineProps<ChatMessageActionsProps>();

defineSlots<{
	/** The buttons — `ChatMessageAction` elements. */
	default?(): unknown;
}>();

// Undefined when the rail is used outside a ChatMessage: it then behaves as a
// plain always-hidden-until-focused button group rather than throwing.
const message = inject(CHAT_MESSAGE_CONTEXT_KEY, undefined);

const visible = computed(() => alwaysVisible || (message?.hovered.current ?? false));
</script>

<template>
	<div
		:class="[cn('ft-message-actions flex items-center gap-0.5', className), { 'ft-visible': visible }]"
		role="group"
		aria-label="Message actions"
	>
		<slot v-if="$slots.default" />
	</div>
</template>

<style scoped>
/*
 * Hidden by opacity rather than display: the rail keeps its box, so revealing
 * it never reflows the message underneath. It stays focusable while invisible,
 * which is the point of the `:focus-within` rule — a keyboard user tabbing
 * into it makes it appear.
 */
.ft-message-actions {
	opacity: 0;
}

.ft-message-actions.ft-visible,
.ft-message-actions:focus-within {
	opacity: 1;
}

/*
 * There is no hover on a touch screen, so gating on it would hide the actions
 * for good. Those pointers get a permanently visible rail.
 */
@media (hover: none) {
	.ft-message-actions {
		opacity: 1;
	}
}

@media (prefers-reduced-motion: no-preference) {
	.ft-message-actions {
		transition: opacity 150ms ease;
	}
}
</style>
