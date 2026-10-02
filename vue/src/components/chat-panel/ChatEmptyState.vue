<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ChatEmptyState
 */
export interface ChatEmptyStateProps {
	/** The greeting, read as the heading of the empty conversation. */
	title?: string;
	/** A line under the greeting saying what this assistant is for. */
	description?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "ChatEmptyState", inheritAttrs: false });

const {
	title = "How can I help?",
	description,
	class: className,
} = defineProps<ChatEmptyStateProps>();

defineSlots<{
	/** Decorative mark above the greeting, replacing the default sparkle. */
	icon?(): unknown;
	/** Rendered under the description — where `PromptSuggestions` belongs. */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });
</script>

<template>
	<div
		ref="el"
		:class="
			cn(
				'ft-empty text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center',
				className
			)
		"
	>
		<!--
			Decorative by definition: the greeting below carries the meaning, so the
			mark is hidden from the accessibility tree whether it is ours or a
			consumer's.
		-->
		<span class="ft-empty-icon" aria-hidden="true">
			<slot v-if="$slots.icon" name="icon" />
			<svg
				v-else
				class="size-8 opacity-60"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M11 5 12.6 10.9 18.5 12.5 12.6 14.1 11 20 9.4 14.1 3.5 12.5 9.4 10.9Z" />
				<path d="M18.5 3 19.1 5.4 21.5 6 19.1 6.6 18.5 9 17.9 6.6 15.5 6 17.9 5.4Z" />
			</svg>
		</span>

		<h2 class="ft-empty-title text-foreground text-lg font-semibold text-balance">{{ title }}</h2>

		<p
			v-if="description"
			class="ft-empty-description max-w-prose text-sm leading-relaxed text-balance"
		>
			{{ description }}
		</p>

		<div v-if="$slots.default" class="ft-empty-extra mt-2 flex w-full flex-col items-center">
			<slot />
		</div>
	</div>
</template>
