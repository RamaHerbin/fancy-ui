<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for StreamingText
 */
export interface StreamingTextProps {
	/**
	 * The accumulated text so far — not the latest delta. Reassign it with a
	 * longer string as chunks arrive and the growth is what animates.
	 */
	text: string;
	/** While true, a soft block cursor trails the last character. */
	streaming?: boolean;
	/** Render the text as markdown instead of a tinted plain-text stream. */
	markdown?: boolean;
	/** How long a newly arrived chunk stays tinted, in ms. Plain mode only. */
	settleMs?: number;
	/** Colour a chunk fades from, and the cursor's fill. Any CSS colour. */
	tintColor?: string;
	/** Called once when `streaming` goes from true to false. */
	onComplete?: () => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import StreamText from "../../internals/StreamText.vue";
import Markdown from "../../internals/Markdown.vue";

defineOptions({ name: "StreamingText", inheritAttrs: false });

const {
	text,
	streaming = false,
	markdown = false,
	settleMs = 350,
	tintColor,
	onComplete,
	class: className,
} = defineProps<StreamingTextProps>();

const rootRef = useTemplateRef<HTMLSpanElement>("root");
defineExpose({ ref: rootRef });

// Seeded from the initial prop so a component that mounts with streaming
// already false — a replayed transcript, say — does not report completion it
// never witnessed. Only the true → false edge fires. The watcher's callback
// body is untracked by construction, so no explicit untrack is needed.
let wasStreaming = streaming;

watch(
	() => streaming,
	(now) => {
		if (wasStreaming && !now) onComplete?.();
		wasStreaming = now;
	},
	{ flush: "post" }
);

const style = computed(() => (tintColor ? { "--ft-tint-color": tintColor } : undefined));
</script>

<template>
	<span
		ref="root"
		:class="[cn('ft-streaming-text', className), { 'ft-streaming-block': markdown }]"
		:style="style"
		><Markdown v-if="markdown" :text="text"
			><template v-if="streaming" #trailingCursor
				><span class="ft-streaming-cursor" aria-hidden="true"></span></template
		></Markdown
		><template v-else
			><StreamText :text="text" :settle-ms="settleMs" /><span
				v-if="streaming"
				class="ft-streaming-cursor"
				aria-hidden="true"
			></span></template
	></span>
</template>

<style scoped>
.ft-streaming-text {
	display: inline;
}

/*
 * Markdown renders block children, which need a block box to lay out in.
 */
.ft-streaming-block {
	display: block;
}

/*
 * Falls back to currentColor rather than the tint's own blue default: an
 * untinted stream should not grow a coloured cursor, but a tinted one reads
 * as a single gesture when the cursor matches what it is depositing.
 */
.ft-streaming-cursor {
	display: inline-block;
	inline-size: 0.5em;
	block-size: 1em;
	margin-inline-start: 0.12em;
	vertical-align: text-bottom;
	border-radius: 1px;
	background: var(--ft-tint-color, currentColor);
	opacity: 0.75;
}

/*
 * Reduced motion keeps the cursor as a steady block: it still marks where the
 * next character lands, it just stops flashing.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-streaming-cursor {
		animation: ft-streaming-blink 1.05s steps(1, end) infinite;
	}

	@keyframes ft-streaming-blink {
		0%,
		50% {
			opacity: 0.75;
		}
		50.01%,
		100% {
			opacity: 0;
		}
	}
}
</style>
