<script lang="ts" module>
	import type { Snippet } from "svelte";
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
		class?: string;
		/** The story: sections holding StoryNode anchors. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import {
		createStoryThread,
		STORY_THREAD_DEFAULTS,
		type StoryThreadCore,
	} from "./story-thread-core.js";

	let {
		layout = STORY_THREAD_DEFAULTS.layout,
		segments = [],
		lead = STORY_THREAD_DEFAULTS.lead,
		tension = STORY_THREAD_DEFAULTS.tension,
		dash = STORY_THREAD_DEFAULTS.dash,
		head = STORY_THREAD_DEFAULTS.head,
		sound = false,
		onReach,
		ariaLabel = "Story",
		class: className,
		children,
	}: StoryThreadProps = $props();

	let root: HTMLElement | undefined = $state();
	let viewport: HTMLElement | undefined = $state();
	let track: HTMLElement | undefined = $state();
	let svg: SVGSVGElement | undefined = $state();
	let core: StoryThreadCore | null = $state(null);

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	$effect(() => {
		if (!root || !viewport || !track || !svg) return;
		const instance = createStoryThread(root, viewport, track, svg, {
			...untrack(() => ({
				layout,
				segments,
				lead,
				tension,
				dash,
				head,
				reducedMotion: reduced.current,
			})),
			onReach(id) {
				if (sound) soundFx.play("tick", { volume: 0.5 });
				onReach?.(id);
			},
		});
		core = instance;
		return () => {
			instance.destroy();
			core = null;
		};
	});

	$effect(() => {
		core?.update({ layout, segments, lead, tension, dash, head, reducedMotion: reduced.current });
	});
</script>

<!-- Focusable so the arrow keys can pan a story with no control in it, the
     same contract as a scrollable region. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={root}
	class={cn("st-root", className)}
	role="region"
	aria-label={ariaLabel}
	tabindex="0"
>
	<div bind:this={viewport} class="st-viewport">
		<div bind:this={track} class="st-track">
			<svg bind:this={svg} class="st-svg" aria-hidden="true" focusable="false"></svg>
			{@render children?.()}
		</div>
	</div>
</div>

<style>
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
	.st-root:global([data-layout="horizontal"]) .st-viewport {
		position: sticky;
		top: 0;
		height: var(--st-vh, 100dvh);
		overflow: hidden;
	}
	.st-root:global([data-layout="horizontal"]) .st-track {
		display: flex;
		flex-wrap: nowrap;
		width: max-content;
		height: 100%;
		will-change: transform;
	}
	.st-root:global([data-dragging]) {
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
	.st-svg :global(.st-ghost),
	.st-svg :global(.st-bright) {
		fill: none;
		stroke-width: var(--story-thread-width);
		stroke-linecap: round;
	}
	.st-svg :global(.st-ghost) {
		stroke: var(--story-thread-faint);
	}
	.st-svg :global(.st-bright) {
		stroke: var(--st-seg, var(--story-thread-color));
	}
	.st-svg :global(.st-mask) {
		fill: none;
		stroke: #fff;
		stroke-width: 12;
	}
	.st-svg :global(.st-head) {
		color: var(--st-seg, var(--story-thread-head));
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	.st-svg :global(.st-head[data-visible]) {
		opacity: 1;
	}
	.st-svg :global(.st-glow-core) {
		stop-color: var(--st-seg, var(--story-thread-head));
		stop-opacity: 0.6;
	}
	.st-svg :global(.st-glow-edge) {
		stop-color: var(--st-seg, var(--story-thread-head));
		stop-opacity: 0;
	}
	.st-svg :global(.st-head-glow) {
		transform-box: fill-box;
		transform-origin: center;
		animation: st-breathe 1.8s ease-in-out infinite;
	}
	.st-svg :global(.st-head-dot) {
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
		.st-svg :global(.st-head-glow) {
			animation: none;
		}
	}
</style>
