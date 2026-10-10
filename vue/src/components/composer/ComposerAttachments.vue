<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ComposerAttachments
 */
export interface ComposerAttachmentsProps {
	/** Accessible name and tooltip for the add button. */
	addLabel?: string;
	/** `accept` for the file picker, e.g. `"image/*,.pdf"`. Omitted by default. */
	accept?: string;
	/** Whether one pick may carry several files. */
	multiple?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import ComposerAttachment from "./ComposerAttachment.vue";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

defineOptions({ name: "ComposerAttachments", inheritAttrs: false });

const {
	addLabel = "Attach files",
	accept,
	multiple = true,
	class: className,
} = defineProps<ComposerAttachmentsProps>();

defineSlots<{
	/** Replaces the default chips. The add button and its file input stay. */
	default?(): unknown;
}>();

// Undefined when the row is used outside a Composer: there is then nothing to
// list and nowhere to send a pick, so it renders nothing rather than throwing.
const composer = inject<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY, undefined);

// Only ever reached imperatively, from the add button's click.
const inputEl = useTemplateRef<HTMLInputElement>("inputEl");

const attachments = computed(() => composer?.attachments.current ?? []);
const disabled = computed(() => composer?.disabled ?? false);
// An empty row inside a composer still earns its line — that is where the
// paperclip lives. An empty row outside one is a button that could not work.
const empty = computed(() => composer === undefined && attachments.value.length === 0);

function pick() {
	// The real picker is the hidden input; the button exists to be named,
	// focusable, and styled like the rest of the composer chrome.
	inputEl.value?.click();
}

function handleChange(event: Event) {
	const target = event.currentTarget as HTMLInputElement;
	const files = Array.from(target.files ?? []);
	// Cleared before anything else: re-picking the same file fires no second
	// change event while the input still holds the first pick, and a consumer
	// that rejects an upload would be stuck with it.
	target.value = "";
	if (files.length === 0) return;
	composer?.addFiles(files);
}
</script>

<template>
	<div
		v-if="!empty"
		:class="cn('ft-composer-attachments flex flex-wrap items-center gap-1.5', className)"
	>
		<slot v-if="$slots.default" />
		<template v-else>
			<!-- The index rides along in the key: two uploads of the same file can
			     arrive carrying the same id, and a duplicate key is a crash. -->
			<div
				v-for="(attachment, index) in attachments"
				:key="`${attachment.id}#${index}`"
				class="ft-composer-attachment-slot flex min-w-0"
			>
				<ComposerAttachment :attachment="attachment" />
			</div>
		</template>

		<button
			type="button"
			class="ft-composer-attach text-foreground/70 hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
			:disabled="disabled"
			:aria-label="addLabel"
			:title="addLabel"
			@click="pick"
		>
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path
					d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
				/>
			</svg>
		</button>

		<!-- Out of the tab order and out of the accessibility tree: the button above
		     is the control, and two names for one picker is one too many. -->
		<input
			ref="inputEl"
			class="ft-composer-file-input"
			type="file"
			:accept="accept"
			:multiple="multiple"
			:disabled="disabled"
			tabindex="-1"
			aria-hidden="true"
			@change="handleChange"
		/>
	</div>
</template>

<style scoped>
/* Visually hidden rather than `display: none`: a clipped input still opens its
   picker on every engine, and still belongs to the form it sits in. */
.ft-composer-file-input {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

/*
 * The entrance belongs to the row, not to the chip: a chip appears because
 * this list grew one. With the rule gone a new chip is simply there, which is
 * the same information without the travel.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-composer-attachment-slot {
		animation: ft-composer-attachment-enter var(--ft-composer-attachment-enter-duration, 180ms)
			cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes ft-composer-attachment-enter {
		from {
			opacity: 0;
			transform: translateY(4px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
}
</style>
