<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { SourceData } from "../../internals/ai-types.js";

/**
 * Props for Sources
 */
export interface SourcesProps {
	/** The documents backing the answer, in the order they should be read. */
	sources: SourceData[];
	/** Whether the list is expanded. Two-way through `v-model:open`; starts closed. */
	open?: boolean;
	/** Called whenever the list opens or closes. */
	onToggle?: (open: boolean) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays open/close through the sound controller when the source list
	 * expands or collapses. Off by default; only audible once the user
	 * has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { provide, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import SourcesTrigger from "./SourcesTrigger.vue";
import SourcesList from "./SourcesList.vue";
import { SOURCES_CONTEXT_KEY, type SourcesContext } from "./types.js";

defineOptions({ name: "Sources", inheritAttrs: false });

const {
	sources,
	onToggle,
	class: className,
	sound: soundProp = false,
} = defineProps<SourcesProps>();

const open = defineModel<boolean>("open", { default: false });

defineSlots<{
	/** Replaces the default trigger-and-list composition entirely. */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

const uid = useFancyId();
const listId = `${uid}-list`;

const playCue = useSoundCue(() => soundProp);

// Getters throughout: a part reading any of these inside its own reactive
// scope re-runs when the root's props change, without the object being
// rebuilt and re-published on every keystroke upstream.
const context: SourcesContext = {
	open: {
		get current() {
			return open.value;
		},
	},
	get count() {
		return sources.length;
	},
	get sources() {
		return sources;
	},
	listId,
	toggle() {
		// The source reads `open` back after writing it, which a binding keeps
		// synchronous there. A `v-model:open` write only reaches this model on
		// the parent's next render, so the next state is computed once and used
		// for all three steps — same values, same order.
		const next = !open.value;
		open.value = next;
		playCue(next ? "open" : "close");
		onToggle?.(next);
	},
};

provide(SOURCES_CONTEXT_KEY, context);
</script>

<template>
	<div ref="el" :class="cn('ft-sources w-full', className)" :data-open="open">
		<slot>
			<SourcesTrigger />
			<SourcesList />
		</slot>
	</div>
</template>
