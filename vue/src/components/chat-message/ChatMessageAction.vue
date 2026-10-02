<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ChatMessageAction
 */
export interface ChatMessageActionProps {
	/** Accessible name and tooltip. Required — the icon alone names nothing. */
	label: string;
	/** Called on click, before any confirmation label swaps in. */
	onclick?: (event: MouseEvent) => void;
	/** Pressed state for a toggle. Omit entirely for a plain button. */
	active?: boolean;
	/** Swapped in as the label for two seconds after a click, e.g. "Copied". */
	confirmLabel?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref } from "vue";
import { cn } from "../../utils.js";
import { CHAT_MESSAGE_CONTEXT_KEY } from "./types.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "ChatMessageAction", inheritAttrs: false });

// `active = undefined` is load-bearing, not decoration: Vue casts an absent
// declared Boolean prop to `false`, which would put `aria-pressed="false"` on
// every plain button. An explicit default keeps the three states the source
// has — absent, false, true.
const { label, onclick, active = undefined, confirmLabel, class: className } =
	defineProps<ChatMessageActionProps>();

defineSlots<{
	/** The icon. */
	default?(): unknown;
}>();

// A loose action button — used outside a `ChatMessage` root — is silent:
// there is no root `sound` prop to read, so this falls through to `false`.
const message = inject(CHAT_MESSAGE_CONTEXT_KEY, undefined);
const playCue = useSoundCue(() => message?.sound ?? false);

/** How long the confirmation label holds before the button says what it does again. */
const CONFIRM_MS = 2000;

const confirmed = ref(false);
// A plain let: the timer must not wake anything that writes it.
let timer: ReturnType<typeof setTimeout> | undefined;

function clearTimer() {
	if (timer !== undefined) {
		clearTimeout(timer);
		timer = undefined;
	}
}

// The source's `$effect(() => clearTimer)` reads nothing, so it exists only for
// its teardown: the unmount cleanup.
onBeforeUnmount(clearTimer);

function handleClick(event: MouseEvent) {
	// Press, never toggle-on/off: `active` is fully controlled by the caller,
	// so the post-click state is unknowable here.
	playCue("press");
	onclick?.(event);
	if (!confirmLabel) return;
	confirmed.value = true;
	// A second click restarts the window rather than inheriting the old deadline.
	clearTimer();
	timer = setTimeout(() => {
		confirmed.value = false;
		timer = undefined;
	}, CONFIRM_MS);
}

const currentLabel = computed(() => (confirmed.value && confirmLabel ? confirmLabel : label));
</script>

<template>
	<button
		type="button"
		:class="cn('text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none', active && 'bg-muted text-foreground', className)"
		:aria-label="currentLabel"
		:title="currentLabel"
		:aria-pressed="active"
		@click="handleClick"
	>
		<slot v-if="$slots.default" />
	</button>
</template>
