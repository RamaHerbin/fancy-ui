<script lang="ts">
export interface StoryNodeProps {
	/** Id the thread runs through; referenced by StoryThread's `segments`. */
	id: string;
	/** `"dot"` is a filled dot; `"ring"` a hollow ring, for a fork or a destination. */
	variant?: "dot" | "ring";
}
</script>

<script setup lang="ts">
// Forwarded attributes go first so the managed ones below always win.
defineOptions({ name: "StoryNode", inheritAttrs: false });

withDefaults(defineProps<StoryNodeProps>(), { variant: "dot" });
</script>

<template>
	<span
		v-bind="$attrs"
		class="st-node"
		:data-story-node="id"
		:data-variant="variant"
		aria-hidden="true"
	></span>
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
		background-color var(--ft-duration-base, 300ms) ease,
		border-color var(--ft-duration-base, 300ms) ease,
		box-shadow var(--ft-duration-base, 300ms) ease,
		scale var(--ft-duration-base, 300ms) var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
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
