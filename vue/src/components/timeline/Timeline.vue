<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TimelineItem {
	id: string;
	label: string;
}

export interface TimelineProps {
	/** Timeline entries */
	items?: TimelineItem[];
	/** Heading text */
	title?: string;
	/** Subheading text */
	description?: string;
	/** Additional CSS classes for the outer wrapper */
	class?: HTMLAttributes["class"];
	/**
	 * Colour of the travelling head, its trail and the lit dots. Any CSS
	 * colour. Unset, it follows the theme's `--primary` token and falls back
	 * to a soft violet when no theme is present. Also settable from CSS via
	 * `--timeline-accent`.
	 */
	accent?: string;
}

/** Half of the 40px dot box: the dot's centre sits this far below its row's padding edge. */
const DOT_HALF = 20;
/** The head stops this far above the bottom of the track, inside the rail's fade-out. */
const END_PAD = 56;
/** Sticky offset of the label column (`top-40`), used until the real value is measured. */
const STICKY_FALLBACK = 160;
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";

defineOptions({ name: "Timeline", inheritAttrs: false });

const { items = [], title, description, class: className, accent } = defineProps<TimelineProps>();

defineSlots<{
	/** Rendered inside each entry's content column. Receives the entry. */
	content?(props: { item: TimelineItem }): unknown;
}>();

const reduced = useReducedMotion();

const rootRef = useTemplateRef<HTMLDivElement>("rootRef");
const timelineRef = useTemplateRef<HTMLDivElement>("timelineRef");
/** Row elements by index; only read by `measure()`, so a plain array. */
const rowEls: (HTMLDivElement | undefined)[] = [];

const timelineHeight = ref(0);
/** Each dot's resting offset from the top of the track; only read by `place()`. */
let dotOffsets: number[] = [];
/** Viewport y of the reading line: where a docked (sticky) dot's centre sits. */
let readingLine = STICKY_FALLBACK + DOT_HALF;
/**
 * Where the head sits, in px from the top of the track. Not a ref: scroll
 * fires once per frame, and a reactive write per frame would re-render every
 * row and re-run the `content` slot for the whole list to move one custom
 * property. `place()` writes it straight to the root as `--tl-progress`, and a
 * render re-states the latest value. State only changes when a dot is crossed.
 */
let head = 0;
const ready = ref(false);
/** Index of the row whose dot the head has most recently reached, or -1. */
const activeIndex = ref(-1);

function rowState(index: number): "past" | "active" | "upcoming" {
	if (index === activeIndex.value) return "active";
	return index < activeIndex.value ? "past" : "upcoming";
}

function setRowEl(index: number, el: unknown) {
	rowEls[index] = (el as HTMLDivElement | null) ?? undefined;
}

/** Reads the track's position and places the head on the reading line —
 * the line a sticky dot docks on. */
function place() {
	const el = timelineRef.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	const start = dotOffsets[0] ?? 0;
	const end = Math.max(start, timelineHeight.value - END_PAD);
	const raw = readingLine - rect.top;
	head = Math.min(end, Math.max(start, raw));
	rootRef.value?.style.setProperty("--tl-progress", `${head}px`);

	let idx = -1;
	for (let i = 0; i < dotOffsets.length; i++) {
		if (dotOffsets[i]! <= head + 0.5) idx = i;
	}
	activeIndex.value = idx;
	ready.value = true;
}

/** Layout reads that only change on resize: track height, each dot's
 * resting offset (its unstuck position), and the sticky offset. */
function measure() {
	const el = timelineRef.value;
	if (!el) return;
	timelineHeight.value = el.offsetHeight;
	const next: number[] = [];
	let firstDotCentre = DOT_HALF;
	for (const row of rowEls) {
		if (!row) continue;
		const padTop = parseFloat(getComputedStyle(row).paddingTop) || 0;
		// The dot box is positioned inside the sticky label (its offsetParent),
		// which rests at the row's padding edge — so this is the unstuck centre.
		const box = row.querySelector<HTMLElement>("[data-timeline-dot-box]");
		const centre = box && box.offsetHeight ? box.offsetTop + box.offsetHeight / 2 : DOT_HALF;
		if (next.length === 0) firstDotCentre = centre;
		next.push(row.offsetTop + padTop + centre);
	}
	dotOffsets = next;
	const label = el.querySelector<HTMLElement>("[data-timeline-label]");
	const top = label ? parseFloat(getComputedStyle(label).top) : NaN;
	readingLine = (Number.isFinite(top) ? top : STICKY_FALLBACK) + firstDotCentre;
	place();
}

onMounted(() => {
	const onScroll = rafThrottle(place);
	const onResize = rafThrottle(measure);

	const resizeObserver = new ResizeObserver(() => onResize());
	if (timelineRef.value) resizeObserver.observe(timelineRef.value);
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onResize, { passive: true });
	measure();

	onBeforeUnmount(() => {
		onScroll.cancel();
		onResize.cancel();
		resizeObserver.disconnect();
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("resize", onResize);
	});
});

// Items added or removed after mount: re-measure once the new rows exist.
watch(
	() => items.length,
	() => {
		if (timelineRef.value) queueMicrotask(measure);
	},
	{ flush: "post" }
);

const pad = (n: number) => String(n).padStart(2, "0");
</script>

<template>
	<div
		ref="rootRef"
		:class="cn('tl-root w-full font-sans md:px-10', className)"
		:style="{ '--timeline-accent': accent, '--tl-progress': `${head}px` }"
		:data-motion="reduced ? 'reduced' : 'full'"
	>
		<div v-if="title || description" class="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16 lg:px-10">
			<h2
				v-if="title"
				class="text-foreground mb-3 max-w-4xl text-lg font-medium tracking-tight text-balance md:text-4xl"
			>
				{{ title }}
			</h2>
			<p v-if="description" class="text-muted-foreground max-w-sm text-sm md:text-base">
				{{ description }}
			</p>
		</div>

		<div ref="timelineRef" class="relative z-0 mx-auto max-w-7xl pb-20" data-timeline-track>
			<div
				v-for="(item, index) in items"
				:key="`${item.id}-${index}`"
				:ref="(el) => setRowEl(index, el)"
				class="tl-row flex justify-start pt-10 md:gap-10 md:pt-32"
				data-timeline-row
				:data-state="rowState(index)"
			>
				<!-- Sticky label -->
				<div
					class="tl-label sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm"
					data-timeline-label
				>
					<div
						class="absolute left-3 flex size-10 items-center justify-center md:left-3"
						data-timeline-dot-box
						aria-hidden="true"
					>
						<span class="tl-dot" data-timeline-dot :data-lit="String(index <= activeIndex)">
							<span class="tl-dot-flare"></span>
							<span class="tl-dot-core"></span>
						</span>
					</div>
					<div class="tl-label-text relative hidden md:block md:pl-20">
						<span class="tl-index" aria-hidden="true">{{ pad(index + 1) }}</span>
						<h3 class="tl-heading text-xl font-semibold tracking-tight md:text-4xl">
							{{ item.label }}
						</h3>
					</div>
				</div>

				<!-- Item content -->
				<div class="tl-content w-full pr-4 pl-20 md:pl-4">
					<slot name="content" :item="item" />
				</div>
			</div>

			<!-- Rail: hairline + the lit trail behind the head, faded at both ends -->
			<div class="tl-rail" :style="{ height: `${timelineHeight}px` }" aria-hidden="true">
				<div class="tl-rail-line"></div>
				<div class="tl-trail"></div>
			</div>

			<!-- Travelling head (full motion only) -->
			<div
				v-if="!reduced && items.length > 0"
				class="tl-head"
				data-timeline-head
				:data-ready="String(ready)"
				aria-hidden="true"
			>
				<span class="tl-head-streak"></span>
				<span class="tl-head-halo"></span>
				<span class="tl-head-core"></span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.tl-root {
	/* Public hooks: --timeline-accent (colour). --tl-progress is written by the component. */
	--_tl-accent: var(--timeline-accent, var(--primary, oklch(0.7 0.13 285)));
	--_tl-cool: oklch(0.72 0.1 262);
	/* Light surfaces: the glow leans on the cool tint so a dark accent never reads as a smudge. */
	--_tl-glow: color-mix(in oklab, var(--_tl-accent) 40%, var(--_tl-cool));
	--_tl-hot: color-mix(in oklab, var(--_tl-accent) 45%, white);
	--_tl-core: var(--_tl-accent);
	--_tl-hair: rgba(0, 0, 0, 0.12);
	--_tl-ring: rgba(0, 0, 0, 0.2);
	--_tl-surface: var(--background, #fafafa);
	--_tl-muted: rgba(0, 0, 0, 0.42);
	--_tl-glow-a: 38%;
	--_tl-ease: cubic-bezier(0.16, 1, 0.3, 1);
	--_tl-x: 2rem;
}

/* The source's `:global(.dark) .tl-root`. Spelled without `:global()` here:
   the scoped compiler replaces a whole selector that contains `:global(...)`
   with the wrapped part alone, while a plain ancestor selector is left
   unscoped and only `.tl-root` gets the attribute. */
.dark .tl-root {
	--_tl-glow: color-mix(in oklab, var(--_tl-accent) 72%, var(--_tl-cool));
	--_tl-core: var(--_tl-hot);
	--_tl-hair: rgba(255, 255, 255, 0.12);
	--_tl-ring: rgba(255, 255, 255, 0.2);
	--_tl-muted: rgba(255, 255, 255, 0.38);
	--_tl-glow-a: 60%;
}

/* ── Rail ─────────────────────────────────────────────── */
.tl-rail {
	position: absolute;
	top: 0;
	left: calc(var(--_tl-x) - 1px);
	width: 3px;
	pointer-events: none;
	-webkit-mask-image: linear-gradient(
		to bottom,
		transparent 0,
		#000 7%,
		#000 93%,
		transparent 100%
	);
	mask-image: linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%);
}

.tl-rail-line,
.tl-trail {
	position: absolute;
	inset: 0 auto 0 1px;
	width: 1px;
}

.tl-rail-line {
	background: var(--_tl-hair);
}

/* The filled part: faint far behind, brightening into the head, nothing past it. */
.tl-trail {
	background: linear-gradient(
		to bottom,
		transparent 0,
		color-mix(in oklab, var(--_tl-accent) 22%, transparent) calc(var(--tl-progress) - 320px),
		color-mix(in oklab, var(--_tl-glow) 85%, transparent) var(--tl-progress),
		transparent var(--tl-progress)
	);
}

/* ── Head ─────────────────────────────────────────────── */
.tl-head {
	position: absolute;
	top: 0;
	left: calc(var(--_tl-x) + 0.5px);
	z-index: 50;
	width: 0;
	height: 0;
	pointer-events: none;
	transform: translate3d(0, var(--tl-progress), 0);
	opacity: 0;
}

.tl-head[data-ready="true"] {
	opacity: 1;
}

.tl-head > span {
	position: absolute;
	display: block;
	border-radius: 999px;
}

.tl-head-streak {
	left: -1px;
	top: -96px;
	width: 2px;
	height: 96px;
	background: linear-gradient(
		to top,
		var(--_tl-hot),
		color-mix(in oklab, var(--_tl-glow) 55%, transparent) 35%,
		transparent
	);
	filter: blur(0.6px);
}

.tl-head-halo {
	left: -28px;
	top: -28px;
	width: 56px;
	height: 56px;
	background: radial-gradient(
		closest-side,
		color-mix(in oklab, var(--_tl-glow) var(--_tl-glow-a), transparent),
		color-mix(in oklab, var(--_tl-glow) 14%, transparent) 55%,
		transparent
	);
	filter: blur(6px);
}

.tl-head-core {
	left: -3.5px;
	top: -3.5px;
	width: 7px;
	height: 7px;
	background: var(--_tl-core);
	box-shadow:
		0 0 0 1.5px color-mix(in oklab, var(--_tl-hot) 45%, transparent),
		0 0 10px 1px color-mix(in oklab, var(--_tl-glow) 70%, transparent);
}

/* ── Dots ─────────────────────────────────────────────── */
.tl-dot {
	position: relative;
	display: grid;
	place-items: center;
	width: 15px;
	height: 15px;
	border-radius: 999px;
	border: 1px solid var(--_tl-ring);
	background: var(--_tl-surface);
	transform: scale(0.8);
}

.tl-dot-core {
	width: 7px;
	height: 7px;
	border-radius: 999px;
	background: var(--_tl-core);
	opacity: 0;
	transform: scale(0.2);
}

.tl-dot-flare {
	position: absolute;
	inset: -1px;
	border-radius: 999px;
	border: 1px solid color-mix(in oklab, var(--_tl-glow) 70%, transparent);
	opacity: 0;
	pointer-events: none;
}

.tl-dot[data-lit="true"] {
	transform: scale(1);
	border-color: color-mix(in oklab, var(--_tl-accent) 55%, var(--_tl-ring));
	box-shadow: 0 0 12px color-mix(in oklab, var(--_tl-glow) 40%, transparent);
}

.tl-dot[data-lit="true"] .tl-dot-core {
	opacity: 1;
	transform: scale(1);
}

/* ── Labels ───────────────────────────────────────────── */
/* Sits above the label out of flow, so the dot centres on the label itself. */
.tl-index {
	position: absolute;
	bottom: calc(100% + 0.2rem);
	display: block;
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 0.6875rem;
	letter-spacing: 0.12em;
	color: var(--_tl-muted);
	transition: color 260ms ease;
}

.tl-heading {
	color: var(--_tl-muted);
	transition: color 260ms ease;
}

.tl-row[data-state="active"] .tl-heading {
	color: color-mix(in oklab, var(--_tl-accent) 28%, var(--foreground, #0a0a0a));
}

.tl-row[data-state="active"] .tl-index {
	color: color-mix(in oklab, var(--_tl-glow) 70%, var(--foreground, #0a0a0a));
}

.tl-row[data-state="past"] .tl-label-text,
.tl-row[data-state="past"] .tl-content {
	opacity: 0.5;
}

/* ── Motion ───────────────────────────────────────────── */
@media (prefers-reduced-motion: no-preference) {
	.tl-root[data-motion="full"] .tl-head {
		transition: opacity 500ms var(--_tl-ease);
	}

	.tl-root[data-motion="full"] .tl-dot {
		transition:
			transform 260ms var(--_tl-ease),
			border-color 260ms ease,
			box-shadow 260ms ease;
	}

	.tl-root[data-motion="full"] .tl-dot-core {
		transition:
			transform 260ms var(--_tl-ease),
			opacity 200ms ease;
	}

	.tl-root[data-motion="full"] .tl-dot[data-lit="true"] .tl-dot-flare {
		animation: tl-ignite 700ms var(--_tl-ease) both;
	}

	.tl-root[data-motion="full"] .tl-label-text,
	.tl-root[data-motion="full"] .tl-content {
		transition: opacity 300ms var(--_tl-ease);
	}
}

@keyframes tl-ignite {
	from {
		opacity: 0.9;
		transform: scale(1);
	}
	to {
		opacity: 0;
		transform: scale(2.6);
	}
}

/* ── Reduced motion: a plain filled rail, no glow, dots lit by position ── */
.tl-root[data-motion="reduced"] .tl-trail {
	background: linear-gradient(
		to bottom,
		color-mix(in oklab, var(--_tl-accent) 70%, transparent) var(--tl-progress),
		transparent var(--tl-progress)
	);
}

.tl-root[data-motion="reduced"] .tl-dot[data-lit="true"] {
	box-shadow: none;
}
</style>
