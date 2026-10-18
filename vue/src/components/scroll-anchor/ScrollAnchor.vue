<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ScrollAnchor
 */
export interface ScrollAnchorProps {
	/**
	 * Whether the region pins itself to the bottom as content arrives. Bind it
	 * to whatever says a response is still streaming; `false` leaves an ordinary
	 * scroll box that never moves on its own.
	 */
	active?: boolean;
	/** How close to the bottom (px) still counts as pinned. */
	bottomThreshold?: number;
	/** Label on the floating return button. */
	returnLabel?: string;
	/** Whether the floating return button appears once the reader scrolls away. */
	showReturn?: boolean;
	/** Height cap on the scrolling region — any CSS length. */
	maxHeight?: string;
	/** Called when the region pins itself to the bottom or lets go, never on every scroll. */
	onStickChange?: (stuck: boolean) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the press cue through the sound controller when the
	 * return-to-latest pill is activated. Off by default; only audible
	 * once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { scrollToBottom } from "../../internals/autoscroll.js";
import { useAutoscroll } from "../../internals/use-autoscroll.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "ScrollAnchor", inheritAttrs: false });

const {
	active = true,
	bottomThreshold = 40,
	returnLabel = "Jump to latest",
	showReturn = true,
	maxHeight = "100%",
	onStickChange,
	class: className,
	sound = false,
} = defineProps<ScrollAnchorProps>();

defineSlots<{
	/** The scrolling content. Required. */
	default(): unknown;
}>();

/*
 * The root element. `h-full` in its class list so the region's default
 * `max-height: 100%` has something definite to resolve against: a percentage
 * against a parent of `height: auto` computes to no cap at all. With no bounded
 * ancestor this still resolves to `auto`, so nothing changes for a wrapper that
 * was sizing itself. (The note lives here rather than above the tag: a leading
 * template comment would make this a fragment root.)
 */
const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

const region = useTemplateRef<HTMLDivElement>("region");
// Content that fits, or a container already at its bottom edge, counts as
// pinned — the same opening assumption the autoscroll core makes.
const stuck = ref(true);

const playCue = useSoundCue(() => sound);

/**
 * The core is the one that decides; this only mirrors its answer so the button
 * can be rendered from it, and passes the same answer on untouched.
 */
function handleStick(next: boolean) {
	stuck.value = next;
	onStickChange?.(next);
}

useAutoscroll(
	() => region.value,
	() => ({
		enabled: active,
		bottomThreshold,
		onStickChange: handleStick,
	})
);

/*
 * The button belongs to the pinning behaviour, so it goes when the pinning
 * does: with `active` false the core has disconnected its scroll listener and
 * would never be able to tell us the reader had come back down, leaving a pill
 * on screen that nothing could ever dismiss.
 */
const showPill = computed(() => showReturn && active && !stuck.value);

// The core reads the container once when it is attached and then only speaks up
// on a transition, so a region that mounts already overflowing — a transcript
// rendered in one go — would otherwise show no way down to the end. Reading the
// same geometry here keeps the two in step from the first frame.
// `bottomThreshold` is a watch source on purpose: it changes the answer with
// nothing having scrolled, so the pill has to be recomputed when it does.
// `stuck` is only written here, never read, so this cannot re-trigger itself.
// Post-flush and without `immediate`, so the geometry is never read on the
// server or before the region exists.
watch(
	[() => region.value, () => bottomThreshold],
	([node, threshold]) => {
		if (!node) return;
		stuck.value = node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
	},
	{ flush: "post" }
);

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function jump() {
	const node = region.value;
	if (!node) return;
	playCue("press");
	// The button is about to unmount under the pointer, which would drop the
	// keyboard back to the document body. Focus goes to the region it just
	// scrolled, so the arrow keys carry on where the button left off.
	node.focus({ preventScroll: true });
	// A journey the reader asked for is worth showing — unless they have asked
	// for no journeys at all, in which case they simply arrive.
	scrollToBottom(node, prefersReducedMotion() ? "instant" : "smooth");
}
</script>

<template>
	<div ref="el" :class="cn('ft-scrollanchor relative h-full', className)">
		<!--
			`tabindex="-1"` is there for the return button alone: the region takes focus
			when the button that had it unmounts, and stays out of the tab order the rest
			of the time, so nothing about a consumer's tab sequence changes. The ring is
			drawn inset because the region fills the root edge to edge.
		-->
		<div
			ref="region"
			class="ft-scrollanchor-region focus-visible:ring-ring overflow-y-auto overscroll-y-contain rounded-[inherit] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
			:style="{ maxHeight }"
			tabindex="-1"
		>
			<slot></slot>
		</div>

		<button
			v-if="showPill"
			type="button"
			class="ft-scrollanchor-return border-border bg-background text-foreground focus-visible:ring-ring cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-md focus-visible:ring-2 focus-visible:outline-none"
			@click="jump"
		>
			<svg
				class="size-3.5 flex-none"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 5v14" />
				<path d="m19 12-7 7-7-7" />
			</svg>
			{{ returnLabel }}
		</button>
	</div>
</template>

<style scoped>
/*
 * Centring lives here rather than on a `-translate-x-1/2` utility: the
 * entrance keyframes below animate `transform`, and a utility writing the
 * separate `translate` property would compose with it into a double shift.
 */
.ft-scrollanchor-return {
	position: absolute;
	bottom: var(--ft-scrollanchor-offset, 0.75rem);
	left: 50%;
	z-index: 10;
	display: flex;
	align-items: center;
	gap: 0.375rem;
	transform: translateX(-50%);
}

/*
 * The only thing that moves. Reduced motion gets the same button in the same
 * place, simply already there.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-scrollanchor-return {
		animation: ft-scrollanchor-in 180ms cubic-bezier(0.4, 0, 0.2, 1) both;
	}
}

@keyframes ft-scrollanchor-in {
	from {
		opacity: 0;
		transform: translate(-50%, 0.375rem);
	}
	to {
		opacity: 1;
		transform: translate(-50%, 0);
	}
}
</style>
