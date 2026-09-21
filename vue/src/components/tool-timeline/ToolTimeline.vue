<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ToolTimelineItemData } from "../../internals/ai-types.js";

/**
 * Props for ToolTimeline
 */
export interface ToolTimelineProps {
	/** The agent's activity log, oldest first */
	items: ToolTimelineItemData[];
	/** Called when a row is activated; supplying it turns every row into a button */
	onSelect?: (item: ToolTimelineItemData, index: number) => void;
	/** Tighter rows with the detail line dropped */
	compact?: boolean;
	/** Accessible name for the list */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { formatRelativeTime } from "../../internals/relative-time.js";
import { useNow } from "../../internals/use-elapsed.js";

defineOptions({ name: "ToolTimeline", inheritAttrs: false });

const {
	items,
	onSelect,
	compact = false,
	label = "Activity",
	class: className,
	sound = false,
} = defineProps<ToolTimelineProps>();

defineSlots<{
	/** Replaces the built-in row body, keeping the rail and its dot */
	item?(props: { item: ToolTimelineItemData; index: number }): unknown;
}>();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
defineExpose({ ref: rootEl });

// A relative label is only recomputed when something makes this component
// render, so a timeline left mounted across a minute boundary would keep
// reporting the age its rows had when they first appeared. One shared clock
// for the whole list costs a single interval, whatever the row count.
const now = useNow();

const playCue = useSoundCue(() => sound);

function iso(timestamp: Date | number) {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

/** A row activation is a fresh gesture every time — an appended entry or the
 *  shared clock ticking never routes through here, only an actual pick does. */
function selectEntry(entry: ToolTimelineItemData, index: number) {
	playCue("select");
	onSelect?.(entry, index);
}
</script>

<template>
	<!--
		`ft-tooltimeline-compact` is applied through an object binding rather than
		`cn()` alongside the static classes, mirroring the Svelte source's
		`class:` directive: the class is conditional and nothing else about the
		root class needs to change with it.
	-->
	<div
		ref="rootEl"
		:class="[cn('ft-tooltimeline w-full text-sm', className), { 'ft-tooltimeline-compact': compact }]"
	>
		<ol class="ft-tooltimeline-list" :aria-label="label">
			<!--
				Keyed by id so an appended entry mounts as a fresh node and plays the
				entrance animation on its own, while the rows already on screen keep the
				DOM nodes they had and stay put.
			-->
			<li v-for="(entry, index) in items" :key="entry.id" class="ft-tooltimeline-row">
				<span class="ft-tooltimeline-dot" aria-hidden="true"></span>

				<button
					v-if="onSelect"
					type="button"
					class="ft-tooltimeline-body hover:bg-muted/60 focus-visible:ring-ring flex w-full cursor-pointer items-baseline gap-3 rounded-md text-left transition-colors focus-visible:ring-1 focus-visible:outline-none"
					@click="selectEntry(entry, index)"
				>
					<template v-if="$slots.item">
						<slot name="item" :item="entry" :index="index" />
					</template>
					<template v-else>
						<span class="ft-tooltimeline-text min-w-0 flex-1">
							<span class="flex min-w-0 items-baseline gap-1.5">
								<span class="ft-tooltimeline-verb font-medium">{{ entry.verb }}</span>
								<span
									class="ft-tooltimeline-target truncate font-mono text-[0.8125rem]"
									:title="entry.target"
									>{{ entry.target }}</span
								>
							</span>
							<span
								v-if="!compact && entry.detail"
								class="ft-tooltimeline-detail text-muted-foreground mt-0.5 block truncate"
								>{{ entry.detail }}</span
							>
						</span>

						<span class="ft-tooltimeline-meta flex shrink-0 items-baseline gap-2">
							<!--
								`role="img"` is what carries the label into the accessibility
								tree: on a bare span an aria-label is ignored, and "+12" on its
								own is announced as a bare number.
							-->
							<span
								v-if="entry.additions != null"
								class="ft-tooltimeline-additions tabular-nums"
								role="img"
								:aria-label="`${entry.additions} additions`"
								>+{{ entry.additions }}</span
							>
							<span
								v-if="entry.deletions != null"
								class="ft-tooltimeline-deletions tabular-nums"
								role="img"
								:aria-label="`${entry.deletions} deletions`"
								>−{{ entry.deletions }}</span
							>
							<time
								v-if="entry.timestamp != null"
								class="ft-tooltimeline-time text-muted-foreground tabular-nums"
								:datetime="iso(entry.timestamp)"
								:title="iso(entry.timestamp)"
								>{{ formatRelativeTime(entry.timestamp, { now: now.value }) }}</time
							>
						</span>
					</template>
				</button>
				<span v-else class="ft-tooltimeline-body flex items-baseline gap-3 rounded-md">
					<template v-if="$slots.item">
						<slot name="item" :item="entry" :index="index" />
					</template>
					<template v-else>
						<span class="ft-tooltimeline-text min-w-0 flex-1">
							<span class="flex min-w-0 items-baseline gap-1.5">
								<span class="ft-tooltimeline-verb font-medium">{{ entry.verb }}</span>
								<span
									class="ft-tooltimeline-target truncate font-mono text-[0.8125rem]"
									:title="entry.target"
									>{{ entry.target }}</span
								>
							</span>
							<span
								v-if="!compact && entry.detail"
								class="ft-tooltimeline-detail text-muted-foreground mt-0.5 block truncate"
								>{{ entry.detail }}</span
							>
						</span>

						<span class="ft-tooltimeline-meta flex shrink-0 items-baseline gap-2">
							<span
								v-if="entry.additions != null"
								class="ft-tooltimeline-additions tabular-nums"
								role="img"
								:aria-label="`${entry.additions} additions`"
								>+{{ entry.additions }}</span
							>
							<span
								v-if="entry.deletions != null"
								class="ft-tooltimeline-deletions tabular-nums"
								role="img"
								:aria-label="`${entry.deletions} deletions`"
								>−{{ entry.deletions }}</span
							>
							<time
								v-if="entry.timestamp != null"
								class="ft-tooltimeline-time text-muted-foreground tabular-nums"
								:datetime="iso(entry.timestamp)"
								:title="iso(entry.timestamp)"
								>{{ formatRelativeTime(entry.timestamp, { now: now.value }) }}</time
							>
						</span>
					</template>
				</span>
			</li>
		</ol>
	</div>
</template>

<style scoped>
.ft-tooltimeline {
	/* Rail and dot are mixes of currentColor, so one set of values reads
	   correctly in both light and dark themes. The stat colours cannot do that
	   — they are text, and no single token clears 4.5:1 on both white and near
	   black — so they are read at their point of use off the `--ft-status-*`
	   vocabulary this family shares, whose defaults are `light-dark()` pairs. */
	--ft-tooltimeline-rail: color-mix(in oklab, currentColor 16%, transparent);
	--ft-tooltimeline-dot: color-mix(in oklab, currentColor 38%, transparent);
	--ft-tooltimeline-row-pad: 0.375rem;
	--ft-tooltimeline-enter-duration: 320ms;

	/* Geometry shared by the rail, the dot, and the row indent, so moving the
	   rail moves all three together. */
	--ft-tooltimeline-dot-size: 0.5rem;
	--ft-tooltimeline-rail-x: 0.25rem;
}

.ft-tooltimeline-compact {
	--ft-tooltimeline-row-pad: 0.125rem;
}

.ft-tooltimeline-list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.ft-tooltimeline-row {
	position: relative;
	/* Leaves room for the rail; the body adds the rest of the text indent. */
	padding-left: 0.875rem;
}

/* The connecting line is drawn per row rather than once behind the list, so it
   stretches with the row it belongs to and needs no height measurement. */
.ft-tooltimeline-row::before {
	content: "";
	position: absolute;
	top: 0;
	bottom: 0;
	left: calc(var(--ft-tooltimeline-rail-x) - 1px);
	width: 2px;
	background: var(--ft-tooltimeline-rail);
}

/* Trim the line at the first and last dot instead of letting it overshoot the
   list into empty space. */
.ft-tooltimeline-row:first-child::before {
	top: calc(var(--ft-tooltimeline-row-pad) + 0.625rem);
}

.ft-tooltimeline-row:last-child::before {
	bottom: auto;
	height: calc(var(--ft-tooltimeline-row-pad) + 0.625rem);
}

.ft-tooltimeline-row:only-child::before {
	display: none;
}

.ft-tooltimeline-dot {
	position: absolute;
	/* Aligned to the middle of the first text line: half a 1.25rem line box
	   minus half the dot. */
	top: calc(var(--ft-tooltimeline-row-pad) + 0.375rem);
	left: 0;
	width: var(--ft-tooltimeline-dot-size);
	height: var(--ft-tooltimeline-dot-size);
	border-radius: 9999px;
	background: var(--ft-tooltimeline-dot);
}

.ft-tooltimeline-body {
	padding: var(--ft-tooltimeline-row-pad) 0.5rem;
}

.ft-tooltimeline-text {
	min-width: 0;
}

.ft-tooltimeline-meta {
	margin-left: auto;
}

.ft-tooltimeline-additions {
	color: var(
		--ft-tooltimeline-additions,
		var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
	);
}

.ft-tooltimeline-deletions {
	color: var(
		--ft-tooltimeline-deletions,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
}

/*
 * The entrance lives entirely inside `no-preference`, so reduced motion is not
 * a degraded variant to keep in sync: with the rule gone a new row simply
 * appears at its final position and opacity.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-tooltimeline-row {
		animation: ft-tooltimeline-enter var(--ft-tooltimeline-enter-duration)
			cubic-bezier(0.16, 1, 0.3, 1) both;
	}
}

@keyframes ft-tooltimeline-enter {
	from {
		opacity: 0;
		transform: translateY(-0.25rem);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
