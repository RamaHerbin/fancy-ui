<script lang="ts">
export interface StoryNodeProps {
	/** Id the thread runs through; referenced by StoryThread's `segments`. */
	id: string;
	/** `"dot"` is a filled dot; `"ring"` a hollow ring, for a fork or a destination. */
	variant?: "dot" | "ring";
}
</script>

<script setup lang="ts">
defineOptions({ name: "StoryNode" });

withDefaults(defineProps<StoryNodeProps>(), { variant: "dot" });
</script>

<template>
	<span class="st-node" :data-story-node="id" :data-variant="variant" aria-hidden="true"></span>
</template>

<style scoped>
.st-node {
	display: inline-block;
	flex: none;
	width: 10px;
	height: 10px;
	border-radius: 9999px;
	background: var(--story-thread-faint, color-mix(in oklab, currentColor 22%, transparent));
	transition:
		background-color 0.35s ease,
		border-color 0.35s ease,
		box-shadow 0.35s ease,
		scale 0.35s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.st-node[data-variant="ring"] {
	width: 14px;
	height: 14px;
	background: var(--background, Canvas);
	border: 2px solid var(--story-thread-faint, color-mix(in oklab, currentColor 22%, transparent));
}
.st-node[data-reached] {
	background: var(--story-thread-color, currentColor);
	scale: 1.15;
	box-shadow:
		0 0 0 4px color-mix(in oklab, var(--story-thread-color, currentColor) 16%, transparent),
		0 0 16px color-mix(in oklab, var(--story-thread-color, currentColor) 45%, transparent);
}
.st-node[data-variant="ring"][data-reached] {
	background: var(--background, Canvas);
	border-color: var(--story-thread-color, currentColor);
}
@media (prefers-reduced-motion: reduce) {
	.st-node {
		transition: none;
	}
}
</style>
