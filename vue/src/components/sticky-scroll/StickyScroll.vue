<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * The module block runs ONCE per module, before any component instance
 * exists — it cannot see the instance-level `generic="T"` parameter on the
 * `<script setup>` block below. So `StickyScrollProps` declares its OWN type
 * parameter here, independent of (but named to match) the instance's `T` — a
 * consumer imports it as `StickyScrollProps<MyItem>`, and the component
 * itself infers `T` from whatever `items` it's actually given.
 */
export interface StickyScrollProps<T> {
	/** The items rendered down the scrolling column, one `item` slot per row. */
	items: T[];
	/** The currently active item's index. Holds its last value when nothing intersects the centre line. */
	activeIndex?: number;
	/** Which logical side the sticky panel sits on. Flips physically under `dir="rtl"` — nothing extra to configure. */
	panelSide?: "start" | "end";
	/** Whether the panel crossfades between items. Effective value is always `false` under reduced motion. */
	crossfade?: boolean;
	/** Additional CSS classes for the sticky panel wrapper. */
	panelClass?: string;
	/** Whether the panel is `aria-hidden` — the default, since it normally mirrors an already-visible active item. Set `false` when the panel holds content found nowhere else. */
	panelHidden?: boolean;
	/** Called when the active index changes — never on every scroll tick, only on an actual change. */
	onChange?: (index: number, item: T) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts" generic="T">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { preset } from "../../internals/motion/transitions.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import StickyScrollItem from "./StickyScrollItem.vue";

defineOptions({ name: "StickyScroll", inheritAttrs: false });

/*
 * Exactly two items live directly under `.ft-stickyscroll`: the items column
 * and the panel. One wrapping flex line does BOTH layout jobs — two
 * side-by-side columns when the container fits both, or two full-width rows
 * when it doesn't — with no breakpoint to keep in sync: each child asks for a
 * 20rem basis and they wrap when the pair (plus the real gap) no longer fits.
 * That wrap is also what gives the panel real sticky travel once stacked,
 * since a flex item's containing block is the whole container's content box
 * (see the stylesheet). Kept here rather than as a template comment: a
 * template comment renders as a real DOM node in a dev build, which the
 * source's own markup comment does not.
 */

const {
	items,
	panelSide = "end",
	crossfade = true,
	panelClass,
	panelHidden = true,
	onChange,
	class: className,
} = defineProps<StickyScrollProps<T>>();

// The counterpart of the source's bindable `activeIndex`.
const activeIndex = defineModel<number>("activeIndex", { default: 0 });

defineSlots<{
	/** Renders one row. `active` is true only for the current `activeIndex`. */
	item(props: { item: T; index: number; active: boolean }): unknown;
	/** Renders the sticky panel's content for the active item. */
	panel(props: { item: T; index: number }): unknown;
}>();

const attrs = useAttrs();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
defineExpose({ ref: rootEl });

const reduced = useReducedMotion();

// The library's ONE bidirectional preset, reused here for the panel
// crossfade rather than a second, disconnected 400ms/linear default — keeps
// the timing/easing sourced from the same tokens as every other component in
// the family.
const fadePanel = preset("fade");
const effectiveCrossfade = computed(() => crossfade && !reduced.value);
// `duration: 0` is the sampler's own synchronous fast path (see
// `internals/motion/animate.ts`'s header comment) — reduced motion and
// `crossfade={false}` both collapse to it, no separate branch needed.
const panelParams = computed(() => ({
	duration: effectiveCrossfade.value ? DURATIONS.base : 0,
}));

// Guards two edge cases at once: an empty `items` list (nothing to index),
// and `activeIndex` drifting out of range if the caller shrinks `items` out
// from under a bindable value they own. `activeIndex` itself is never
// silently rewritten here — only the INDEX USED FOR RENDERING the panel is
// clamped, so a caller reading `activeIndex` back always sees exactly what
// they (or the last intersection) set.
const panelIndex = computed(() =>
	items.length > 0 ? Math.min(Math.max(activeIndex.value, 0), items.length - 1) : 0
);

/** Always in range: the panel only renders while `items.length > 0`, and
 *  `panelIndex` is clamped into the list above. */
const panelItem = computed(() => items[panelIndex.value] as T);

function setActive(i: number) {
	if (activeIndex.value === i) return;
	activeIndex.value = i;
	onChange?.(i, items[i] as T);
}

// One keyed frame per panel index, the counterpart of the source's
// `{#key panelIndex}` block with `in:`/`out:` on its single child. Nothing in
// the frame owns a teardown that has to land at exit end, the frame is
// replaced rather than reopened mid-exit, and it is one element — so the
// framework's own transition owns the clock here and `usePresence` is not
// needed. Params are read at leg start, never at render time.
let enterRun: TransitionRun | undefined;
let leaveRun: TransitionRun | undefined;

function onPanelEnter(el: Element, done: () => void) {
	enterRun = runTransition(
		el,
		fadePanel(el, panelParams.value, { direction: "in" }),
		1,
		undefined,
		done
	);
}

function onPanelEnterCancelled() {
	enterRun?.abort();
	enterRun = undefined;
}

function onPanelLeave(el: Element, done: () => void) {
	leaveRun = runTransition(
		el,
		fadePanel(el, panelParams.value, { direction: "out" }),
		0,
		undefined,
		done
	);
}

function onPanelLeaveCancelled() {
	leaveRun?.abort();
	leaveRun = undefined;
}
</script>

<template>
	<div
		ref="rootEl"
		:class="cn('ft-stickyscroll', className)"
		v-bind="attrs"
		:data-panel-side="panelSide"
	>
		<div class="ft-stickyscroll-items">
			<StickyScrollItem
				v-for="(it, i) in items"
				:key="i"
				:index="i"
				:active="i === activeIndex"
				:on-activate="setActive"
			>
				<slot name="item" :item="it" :index="i" :active="i === activeIndex" />
			</StickyScrollItem>
		</div>

		<div
			v-if="items.length > 0"
			:class="cn('ft-stickyscroll-panel', panelClass)"
			:aria-hidden="panelHidden ? 'true' : undefined"
		>
			<Transition
				:css="false"
				@enter="onPanelEnter"
				@enter-cancelled="onPanelEnterCancelled"
				@leave="onPanelLeave"
				@leave-cancelled="onPanelLeaveCancelled"
			>
				<div :key="panelIndex" class="ft-stickyscroll-panel-frame">
					<slot name="panel" :item="panelItem" :index="panelIndex" />
				</div>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
/*
 * The two-column ⇄ stacked switch is FLEX WRAPPING, not a `@container`
 * query, and deliberately so: an element is styled by the query containers
 * ABOVE it, never by the `container-type` it declares on itself, so a
 * `@container` rule targeting `.ft-stickyscroll` could never switch this
 * element's own layout (it would match some unrelated ancestor container,
 * or nothing at all). Wrapping also does the arithmetic with the REAL gap,
 * so a `--ft-stickyscroll-gap` override moves the stacking point honestly.
 *
 * Wrapping is also what gives the panel real sticky travel once stacked: a
 * flex item's containing block is the whole flex container's content box,
 * so `top: 0` has the full column to move in. A collapsed single-column
 * GRID cannot do this — a grid item's containing block is its own grid
 * area, auto-sized to the panel's own content, so `position: sticky` would
 * compile and never visibly do anything.
 */
.ft-stickyscroll {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: var(--ft-stickyscroll-gap, 2rem);
	/* Read only by the descendant-only query at the bottom of this sheet
	   (stacked sizing/placement), so those track container width rather
	   than viewport width. The layout switch itself is above, not there. */
	container-type: inline-size;
}

/* `flex: 1 1 min(100%, 20rem)` on BOTH children is the whole responsive
   rule: they share one line while `2 × (20rem + gap) − gap` fits and grow
   to equal halves of it, and each takes its own full-width line when it
   doesn't. `min(100%, …)` keeps a container narrower than 20rem from
   overflowing instead of wrapping. */
.ft-stickyscroll-items {
	display: flex;
	flex-direction: column;
	flex: 1 1 min(100%, 20rem);
	gap: var(--ft-stickyscroll-gap, 2rem);
	order: 1;
	min-width: 0;
}

.ft-stickyscroll-panel {
	position: sticky;
	top: var(--ft-stickyscroll-top, 10vh);
	max-block-size: var(--ft-stickyscroll-panel-size, 80vh);
	overflow: hidden;
	display: grid;
	flex: 1 1 min(100%, 20rem);
	order: 2;
	min-width: 0;
}

/* Logical placement via `order`, not DOM reordering or explicit placement
   — under `dir="rtl"` the flex line's own inline flow already puts the
   first item on the physical right, so swapping which item is logically
   first is the whole trick; no `:dir(rtl)` override needed here. This
   rule's higher specificity (two classes + one attribute selector) also
   wins over the stacked-layout `order: -1` below regardless of which one
   is later in source order, so `panelSide="start"` still gets `order: 0`
   once stacked — still first, since the items column stays `order: 1`. */
.ft-stickyscroll[data-panel-side="start"] .ft-stickyscroll-panel {
	order: 0;
}

/* Both frames stack exactly on top of each other during the crossfade —
   the outgoing item's outro and the incoming item's intro genuinely
   overlap in the DOM for a moment, and without this they would ALSO
   overlap in layout, each shoving the other down the page. */
.ft-stickyscroll-panel-frame {
	grid-area: 1 / 1;
}

/*
 * Stacked-layout tuning ONLY. Every selector in here targets a DESCENDANT
 * of the query container, which is the only thing a container query can
 * ever style — the layout switch itself is flex wrapping, up at the top of
 * this sheet, for exactly that reason.
 *
 * The condition mirrors where that wrap actually happens for the DEFAULT
 * gap: the pair shares a line while `2 * (20rem + gap) - gap` fits, which
 * is `42rem` at `gap: 2rem` — not the "two 20rem tracks" 40rem a gap-blind
 * reading suggests. `width < 42rem` rather than `max-width: 42rem` so the
 * boundary agrees exactly with the wrap: at exactly 42rem the two columns
 * still fit side by side. A `--ft-stickyscroll-gap` override moves the
 * real wrap point but not this query (a container query condition can't
 * read a custom property), so the two can drift apart — see the README.
 *
 * `order: -1` (not DOM reordering) puts the panel on the first line so it
 * can overlay the items scrolling beneath it; the DOM keeps
 * items-before-panel, so the screen-reader/tab order is unchanged.
 */
@container (width < 42rem) {
	.ft-stickyscroll-panel {
		order: -1;
		top: 0;
		max-block-size: var(--ft-stickyscroll-panel-size-stacked, 40svh);
	}
	/* Keeps a section that receives focus (Tab, or an in-page anchor) from
	   landing directly under the now-overlaying panel. */
	.ft-stickyscroll-item {
		scroll-margin-block-start: var(--ft-stickyscroll-panel-size-stacked, 40svh);
	}
}
</style>
