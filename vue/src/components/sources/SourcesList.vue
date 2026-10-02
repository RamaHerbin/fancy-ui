<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for SourcesList
 */
export interface SourcesListProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject } from "vue";
import { cn } from "../../utils.js";
import type { SourceData } from "../../internals/ai-types.js";
import SourceCard from "./SourceCard.vue";
import { SOURCES_CONTEXT_KEY, type SourcesContext } from "./types.js";

defineOptions({ name: "SourcesList", inheritAttrs: false });

const { class: className } = defineProps<SourcesListProps>();

defineSlots<{
	/** Replaces the default card. Receives the source and its index. */
	item?(props: { source: SourceData; index: number }): unknown;
}>();

// Undefined when the list is used outside a Sources root: it then renders an
// empty, permanently open region rather than throwing.
const sources = inject<SourcesContext | undefined>(SOURCES_CONTEXT_KEY, undefined);

// `inert` is bound through an attribute object rather than `:inert`: the DOM
// property is not implemented everywhere the package runs, and a plain binding
// would write `inert="false"` — which still makes the subtree inert. Present or
// absent is the only spelling that means what the source means.
const items = computed(() => sources?.sources ?? []);
const isOpen = computed(() => sources?.open.current ?? true);
</script>

<template>
	<div class="ft-sources-list" :class="{ 'ft-open': isOpen }">
		<div class="overflow-hidden">
			<ul
				:id="sources?.listId"
				v-bind="isOpen ? {} : { inert: true }"
				aria-label="Sources"
				:class="cn('ft-sources-grid', className)"
			>
				<!--
					The entrance animation hangs off `.ft-in` rather than mount, because
					the cards never unmount: collapsing is a height transition over live
					DOM, so re-adding the class is the only thing that can replay it.
				-->
				<li
					v-for="(source, index) in items"
					:key="source.id"
					class="ft-sources-item"
					:class="{ 'ft-in': isOpen }"
					:style="{ '--ft-sources-index': index }"
				>
					<slot name="item" :source="source" :index="index">
						<SourceCard :source="source" />
					</slot>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
/*
 * 0fr → 1fr on a one-row grid is the only way to transition "auto" height
 * without measuring anything. The inner wrapper does the clipping.
 */
.ft-sources-list {
	display: grid;
	grid-template-rows: 0fr;
}

.ft-sources-list.ft-open {
	grid-template-rows: 1fr;
}

/*
 * Cards flow into as many columns as the container can hold, so the same list
 * is a stack in a chat column and a grid in a document.
 */
.ft-sources-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(var(--ft-sources-min-column, 13rem), 1fr));
	gap: var(--ft-sources-gap, 0.5rem);
	/* The list reset is written out rather than borrowed from a utility, so the
	   compound looks the same in an app whose CSS never resets `ul`. */
	margin: 0;
	padding: 0.5rem 0 0;
	list-style: none;
}

.ft-sources-item {
	display: flex;
}

.ft-sources-item > :deep(*) {
	flex: 1;
	min-width: 0;
}

/*
 * Everything that moves lives behind the query, so reduced motion gets the
 * same two states with nothing to shorten or fall back from.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-sources-list {
		transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.ft-sources-item.ft-in {
		animation: ft-sources-in 240ms cubic-bezier(0.2, 0, 0, 1) backwards;
		/* Clamped: past a handful of cards the stagger stops reading as sequence
		   and starts reading as lag, so the tail all lands together. */
		animation-delay: calc(min(var(--ft-sources-index, 0), 6) * 45ms);
	}
}

@keyframes ft-sources-in {
	from {
		opacity: 0;
		transform: translateY(0.375rem);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
