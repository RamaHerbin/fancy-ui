<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ChatMessage
 */
export interface ChatMessageProps {
	/** Who produced this turn. Drives alignment, chrome, and the accessible name. */
	role?: "user" | "assistant" | "system";
	/** The message body. Growing strings animate — see StreamingText's contract. */
	content?: string;
	/** Whether `content` is still arriving. Passed through to the body renderer. */
	streaming?: boolean;
	/** Render the body as markdown instead of a tinted plain-text stream. */
	markdown?: boolean;
	/** When the turn was produced. Rendered relative, with the exact time as its tooltip. */
	timestamp?: Date | number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays press on a message action and select on a branch step,
	 * through the sound controller. Off by default; only audible once
	 * the user has enabled sound. Threaded to `ChatMessageAction` and
	 * `ChatMessageBranches` through context — enable it on one layer
	 * only, since a sound-enabled action nested inside another
	 * sound-enabled control would otherwise double-play.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import StreamingText from "../streaming-text/StreamingText.vue";
import { formatRelativeTime } from "../../internals/relative-time.js";
import { createNow } from "../../internals/elapsed.js";
import { CHAT_MESSAGE_CONTEXT_KEY, type ChatMessageContext } from "./types.js";

defineOptions({ name: "ChatMessage", inheritAttrs: false });

const {
	role = "assistant",
	content = "",
	streaming = false,
	markdown = false,
	timestamp,
	class: className,
	sound = false,
} = defineProps<ChatMessageProps>();

defineSlots<{
	/** Rendered beside the body: an image, initials, an icon. */
	avatar?(): unknown;
	/** Replaces the default body rendering entirely. `content` is then ignored. */
	default?(): unknown;
	/** Action buttons, in a rail that fades in on hover or focus. Put `ChatMessageActions` here. */
	actions?(): unknown;
	/** Rendered under the body — where `ChatMessageBranches` belongs. */
	footer?(): unknown;
}>();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
defineExpose({ ref: rootEl });

const LABELS = {
	user: "User message",
	assistant: "Assistant message",
	system: "System message",
} as const;

// Pointer and focus are tracked separately and OR-ed: a pointer leaving the
// message while a button inside it still holds focus must not yank the rail
// out from under the keyboard.
const pointerInside = ref(false);
const focusInside = ref(false);

const context: ChatMessageContext = {
	get role() {
		return role;
	},
	get streaming() {
		return streaming;
	},
	hovered: {
		get current() {
			return pointerInside.value || focusInside.value;
		},
	},
	get sound() {
		return sound;
	},
};

provide(CHAT_MESSAGE_CONTEXT_KEY, context);

const isUser = computed(() => role === "user");
const isSystem = computed(() => role === "system");

const time = computed(() =>
	timestamp === undefined
		? undefined
		: timestamp instanceof Date
			? timestamp.getTime()
			: timestamp
);
const isValidTime = computed(() => time.value !== undefined && Number.isFinite(time.value));

// A message left mounted through a long-lived session must not freeze at
// whatever age it had on first paint. `now` only ticks while a timestamp is
// actually shown; stopping it on unmount — and the moment the timestamp is
// cleared — is what the source's effect cleanup did.
//
// The clock is built here but never read here: `createNow` schedules nothing
// and touches no wall clock at construction, so the server render and the
// hydration render both see the "not started yet" sentinel and agree (D-V20).
const now = createNow();

onMounted(() => {
	if (isValidTime.value) now.start();
});

watch(
	isValidTime,
	(valid) => {
		if (valid) now.start();
		else now.stop();
	},
	{ flush: "post" }
);

onBeforeUnmount(() => now.stop());

const relative = computed(() =>
	isValidTime.value ? formatRelativeTime(time.value as number, { now: now.value }) : ""
);
const iso = computed(() =>
	isValidTime.value ? new Date(time.value as number).toISOString() : undefined
);
</script>

<template>
	<article
		ref="rootEl"
		:class="cn('ft-message flex w-full gap-3', isUser && 'flex-row-reverse', isSystem && 'justify-center', className)"
		:data-role="role"
		:aria-label="LABELS[role]"
		@pointerenter="pointerInside = true"
		@pointerleave="pointerInside = false"
		@focusin="focusInside = true"
		@focusout="focusInside = false"
	>
		<div
			v-if="isSystem"
			class="text-muted-foreground flex max-w-prose flex-col items-center gap-1 py-1 text-center"
		>
			<div
				class="text-xs leading-relaxed text-balance"
				aria-live="polite"
				aria-atomic="true"
				:aria-busy="streaming"
			>
				<slot v-if="$slots.default" />
				<StreamingText v-else :text="content" :streaming="streaming" :markdown="markdown" />
			</div>
			<time
				v-if="relative"
				class="text-[0.6875rem] tabular-nums opacity-80"
				:datetime="iso"
				:title="iso"
				>{{ relative }}</time
			>
			<slot v-if="$slots.footer" name="footer" />
		</div>
		<template v-else>
			<div v-if="$slots.avatar" class="ft-message-avatar mt-0.5 shrink-0"><slot name="avatar" /></div>

			<div
				:class="[
					cn('flex min-w-0 flex-col gap-1.5', isUser ? 'items-end' : 'w-full'),
					{ 'ft-message-capped': isUser },
				]"
			>
				<div
					:class="[
						cn('text-sm leading-relaxed', isUser && 'rounded-2xl px-4 py-2.5'),
						{ 'ft-message-bubble': isUser },
					]"
					aria-live="polite"
					aria-atomic="true"
					:aria-busy="streaming"
				>
					<slot v-if="$slots.default" />
					<StreamingText v-else :text="content" :streaming="streaming" :markdown="markdown" />
				</div>

				<div
					v-if="relative || $slots.actions"
					:class="cn('flex items-center gap-2', isUser && 'flex-row-reverse')"
				>
					<time
						v-if="relative"
						class="text-muted-foreground text-xs tabular-nums"
						:datetime="iso"
						:title="iso"
						>{{ relative }}</time
					>
					<slot v-if="$slots.actions" name="actions" />
				</div>

				<slot v-if="$slots.footer" name="footer" />
			</div>
		</template>
	</article>
</template>

<style scoped>
/*
 * A user turn is a bubble; an assistant turn is plain flow, the way a written
 * answer reads. Only the bubble is capped, so a long answer uses the column it
 * was given instead of being squeezed into a column-and-a-bit.
 */
.ft-message-capped {
	max-inline-size: var(--ft-message-max-width, 85%);
}

.ft-message-bubble {
	background: var(--ft-message-user-bg, color-mix(in oklab, currentColor 8%, transparent));
	color: var(--ft-message-user-fg, inherit);
}
</style>
