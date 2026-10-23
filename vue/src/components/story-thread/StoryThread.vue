<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { StoryThreadDash, StoryThreadLayout, StoryThreadSegment } from "./types.js";

export interface StoryThreadProps {
	/**
	 * `"horizontal"` pins a full-height viewport and pans the content sideways
	 * as the page scrolls; `"vertical"` keeps a plain stack. `"auto"` is
	 * horizontal from 900 × 520 px up, vertical below.
	 */
	layout?: StoryThreadLayout;
	/**
	 * The thread's segments, each through a list of StoryNode ids. Leave it
	 * out for one segment through every node in document order. Several
	 * segments that leave the same node and meet again draw a fork whose
	 * branches advance together.
	 */
	segments?: StoryThreadSegment[];
	/** Where the tip of the thread sits in the viewport, 0..1 along the reading axis. */
	lead?: number;
	/** Curve tension between nodes: 0 draws straight lines, 1 long flat tangents. */
	tension?: number;
	/** Stroke pattern of the thread. */
	dash?: StoryThreadDash;
	/** Draw a glowing dot at the tip of every segment while it is drawing. */
	head?: boolean;
	/**
	 * Plays a soft `tick` each time the thread reaches a node going forward.
	 * Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Called with a node's id each time the thread reaches it going forward. */
	onReach?: (id: string) => void;
	/** Accessible name of the region. */
	ariaLabel?: string;
	/** Additional CSS classes on the root. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	createStoryThread,
	STORY_THREAD_DEFAULTS,
	type StoryThreadCore,
} from "./story-thread-core.js";

defineOptions({ name: "StoryThread", inheritAttrs: false });

const props = withDefaults(defineProps<StoryThreadProps>(), {
	layout: STORY_THREAD_DEFAULTS.layout,
	segments: () => [],
	lead: STORY_THREAD_DEFAULTS.lead,
	tension: STORY_THREAD_DEFAULTS.tension,
	dash: STORY_THREAD_DEFAULTS.dash,
	head: STORY_THREAD_DEFAULTS.head,
	sound: false,
	ariaLabel: "Story",
});

defineSlots<{
	/** The story: sections holding StoryNode anchors. */
	default?(): unknown;
}>();

const root = useTemplateRef<HTMLElement>("root");
const viewport = useTemplateRef<HTMLElement>("viewport");
const track = useTemplateRef<HTMLElement>("track");
const svg = useTemplateRef<SVGSVGElement>("svg");
const core = shallowRef<StoryThreadCore | null>(null);

const reduced = useReducedMotion();

function options() {
	return {
		layout: props.layout,
		segments: props.segments,
		lead: props.lead,
		tension: props.tension,
		dash: props.dash,
		head: props.head,
		reducedMotion: reduced.value,
	};
}

onMounted(() => {
	if (!root.value || !viewport.value || !track.value || !svg.value) return;
	core.value = createStoryThread(root.value, viewport.value, track.value, svg.value, {
		...options(),
		onReach(id) {
			if (props.sound) soundFx.play("tick", { volume: 0.5 });
			props.onReach?.(id);
		},
	});
});

onBeforeUnmount(() => {
	core.value?.destroy();
	core.value = null;
});

watch(
	[
		() => props.layout,
		() => props.segments,
		() => props.lead,
		() => props.tension,
		() => props.dash,
		() => props.head,
		reduced,
	],
	() => core.value?.update(options()),
	{ flush: "post" }
);
</script>

<template>
	<!-- Focusable so the arrow keys can pan a story with no control in it, the
	     same contract as a scrollable region. -->
	<div
		ref="root"
		:class="cn('st-root', props.class)"
		role="region"
		:aria-label="ariaLabel"
		tabindex="0"
	>
		<div ref="viewport" class="st-viewport">
			<div ref="track" class="st-track">
				<svg ref="svg" class="st-svg" aria-hidden="true" focusable="false"></svg>
				<slot />
			</div>
		</div>
	</div>
</template>

<style scoped>
.st-root {
	--story-thread-color: currentColor;
	--story-thread-faint: color-mix(in oklab, currentColor 22%, transparent);
	--story-thread-head: var(--story-thread-color);
	--story-thread-width: 2px;
	position: relative;
	outline-offset: -2px;
}
.st-viewport {
	position: relative;
}
.st-track {
	position: relative;
	isolation: isolate;
}
.st-root[data-layout="horizontal"] .st-viewport {
	position: sticky;
	top: 0;
	height: var(--st-vh, 100dvh);
	overflow: hidden;
}
.st-root[data-layout="horizontal"] .st-track {
	display: flex;
	flex-wrap: nowrap;
	width: max-content;
	height: 100%;
	will-change: transform;
}
.st-root[data-dragging] {
	cursor: grabbing;
	user-select: none;
}
.st-svg {
	position: absolute;
	top: 0;
	left: 0;
	z-index: -1;
	overflow: visible;
	pointer-events: none;
}
.st-svg :deep(.st-ghost),
.st-svg :deep(.st-bright) {
	fill: none;
	stroke-width: var(--story-thread-width);
	stroke-linecap: round;
}
.st-svg :deep(.st-ghost) {
	stroke: var(--story-thread-faint);
}
.st-svg :deep(.st-bright) {
	stroke: var(--st-seg, var(--story-thread-color));
}
.st-svg :deep(.st-mask) {
	fill: none;
	stroke: #fff;
	stroke-width: 12;
}
.st-svg :deep(.st-head) {
	color: var(--st-seg, var(--story-thread-head));
	opacity: 0;
	transition: opacity 0.3s ease;
}
.st-svg :deep(.st-head[data-visible]) {
	opacity: 1;
}
.st-svg :deep(.st-glow-core) {
	stop-color: var(--st-seg, var(--story-thread-head));
	stop-opacity: 0.6;
}
.st-svg :deep(.st-glow-edge) {
	stop-color: var(--st-seg, var(--story-thread-head));
	stop-opacity: 0;
}
.st-svg :deep(.st-head-glow) {
	transform-box: fill-box;
	transform-origin: center;
	animation: st-breathe 1.8s ease-in-out infinite;
}
.st-svg :deep(.st-head-dot) {
	fill: currentColor;
}
@keyframes st-breathe {
	0%,
	100% {
		scale: 0.75;
		opacity: 1;
	}
	50% {
		scale: 1;
		opacity: 0.7;
	}
}
@media (prefers-reduced-motion: reduce) {
	.st-svg :deep(.st-head-glow) {
		animation: none;
	}
}
</style>
