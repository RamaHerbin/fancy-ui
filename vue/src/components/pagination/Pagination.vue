<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface PaginationProps {
	/** The current page, 1-based. Two-way through `v-model:page`. */
	page?: number;
	/** Total number of pages. */
	count: number;
	/** Called with the new page whenever it changes, however the change happened. */
	onPageChange?: (page: number) => void;
	/** Pages shown on each side of the current page. Defaults to `1`. */
	siblingCount?: number;
	/** Pages always shown at each end of the run. Defaults to `1`. */
	boundaryCount?: number;
	/** Shows First/Last jump buttons alongside Previous/Next. Defaults to `false`. */
	showEdges?: boolean;
	/** Disables every control in the nav. */
	disabled?: boolean;
	/** Accessible name for the `<nav>` landmark. Defaults to `"Pagination"`. */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the select cue through the sound controller. Off by default;
	 * only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	TransitionGroup,
	useTemplateRef,
	watch,
} from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { runTransition } from "../../internals/motion/animate.js";
import { linear } from "../../internals/motion/easing.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { buildPageRange } from "./pagination-range.js";

defineOptions({ name: "Pagination", inheritAttrs: false });

const {
	count,
	onPageChange,
	siblingCount = 1,
	boundaryCount = 1,
	showEdges = false,
	disabled = false,
	label = "Pagination",
	class: className,
	sound = false,
} = defineProps<PaginationProps>();

defineSlots<{
	/** Overrides the Previous button's content. */
	previousLabel?(): unknown;
	/** Overrides the Next button's content. */
	nextLabel?(): unknown;
}>();

// The source's `page = $bindable(1)`.
const page = defineModel<number>("page", { default: 1 });

const navRef = useTemplateRef<HTMLElement>("navRef");
defineExpose({ ref: navRef });

const playCue = useSoundCue(() => sound);

const items = computed(() => buildPageRange(page.value, count, siblingCount, boundaryCount));

// Floored, not just clamped, and used everywhere this component reasons
// about "which page" rather than trusting the raw props: `count` can arrive
// fractional (`totalItems / pageSize` without `Math.ceil`). Without a floored
// value here, `handleLast` would call `goTo(count)` and set `page` itself to
// that same fractional value — `buildPageRange`'s own flooring would still
// save the *rendered* sequence, but `item === page` in the template below
// would compare an integer against a value that can now never match again,
// so `aria-current` and the pill styling would stay wrong for the rest of
// the session. See `pagination-range.ts` for why the pure function floors
// independently of this — both layers guard the same invariant on purpose,
// the same redundancy the boundary buttons already rely on below.
const safeCount = computed(() => Math.max(0, Math.floor(count)));
const safePage = computed(() =>
	Math.min(Math.max(Math.floor(page.value), 1), Math.max(safeCount.value, 1))
);

const isFirst = computed(() => safePage.value <= 1);
const isLast = computed(() => safePage.value >= safeCount.value);

// The current-page pill slides from the old page to the new one — but it
// must not fly in on first paint, from wherever an unplaced box sits. So
// the slide is armed only once the page has really moved, and the flag is
// a `data-*` attribute the CSS selects on rather than a class (nothing
// else keys off it, and it stays out of the merged class string).
//
// Armed off `safePage`, not from inside `goTo()`: a controlled `Pagination`
// whose `page` prop is changed from outside never calls `goTo`, and its pill
// should slide just the same. `lastPage` seeds the baseline with the page the
// component started on without making the seed itself reactive.
const popArmed = ref(false);
let lastPage = safePage.value;

/*
 * ---------------------------------------------------------------------
 * The sliding pill
 * ---------------------------------------------------------------------
 *
 * One `aria-hidden` box under the numbers, moved with `translate()` alone
 * to the current page's button (every page button is the same size, so
 * position is all it needs). When the run of numbers itself shifts — a new
 * window after a jump, an ellipsis moving — the numbers glide to their new
 * places on the same duration (the list's move transition), so the pill and
 * its number arrive together.
 *
 * A progressive enhancement, never the only signal: the current button
 * keeps `aria-current="page"` and its own `bg-accent`, which the CSS only
 * hides once the pill has actually been placed (`data-indicator`). A
 * JS-off render, a forced-colors user and a screen reader all still get it.
 */
const reduced = useReducedMotion();

const indicatorRef = useTemplateRef<HTMLSpanElement>("indicatorRef");
const indicatorPlaced = ref(false);
const flipDuration = computed(() => (reduced.value ? 0 : DURATIONS.base));

function placeIndicator(animate: boolean) {
	const el = indicatorRef.value;
	const nav = navRef.value;
	const current = nav?.querySelector<HTMLElement>('button[aria-current="page"]');
	if (!el || !current || current.offsetWidth === 0) {
		indicatorPlaced.value = false;
		return;
	}
	// Sum offsets up to the nav rather than trusting `offsetLeft` alone:
	// while the numbers glide, each `<li>` carries a transform, which makes
	// it the button's `offsetParent` (offset ≈ 0). Offsets ignore
	// transforms, so the sum is the button's final place — where the pill
	// must land, together with the number gliding there.
	let x = 0;
	let y = 0;
	for (let n: HTMLElement | null = current; n && n !== nav; ) {
		x += n.offsetLeft;
		y += n.offsetTop;
		n = n.offsetParent as HTMLElement | null;
	}
	const transform = `translate(${x}px, ${y}px)`;
	el.style.width = `${current.offsetWidth}px`;
	el.style.height = `${current.offsetHeight}px`;
	if (el.style.transform === transform) {
		indicatorPlaced.value = true;
		return;
	}
	if (animate && el.style.transform) {
		el.style.transform = transform;
	} else {
		// Snap: suspend the transition, write, force a reflow, restore.
		const previous = el.style.transition;
		el.style.transition = "none";
		el.style.transform = transform;
		void el.offsetWidth;
		el.style.transition = previous;
	}
	indicatorPlaced.value = true;
}

// Re-place after every page or range change, once the DOM has the new
// buttons. Slides once armed; the first placement snaps. The arming runs
// first in the same callback, so the slide is armed by the very change that
// moves the page.
watch(
	[safePage, items],
	() => {
		if (safePage.value !== lastPage) {
			lastPage = safePage.value;
			popArmed.value = true;
		}
		const animate = popArmed.value;
		void nextTick().then(() => placeIndicator(animate));
	},
	{ flush: "post" }
);

onMounted(() => {
	void nextTick().then(() => placeIndicator(false));

	// Resizes, font loads and zoom move the buttons without a page change:
	// follow them with a snap, never a slide.
	const nav = navRef.value;
	if (!nav || typeof ResizeObserver === "undefined") return;
	const ro = new ResizeObserver(() => placeIndicator(false));
	ro.observe(nav);
	onBeforeUnmount(() => ro.disconnect());
});

// A newly shown number fades in once the run has moved. No initial-render
// fade: the list does not run enter transitions on its first paint, matching
// the source's intro-less mount.
function onItemEnter(el: Element, done: () => void) {
	const animated = flipDuration.value !== 0;
	runTransition(
		el,
		{
			delay: animated ? 60 : 0,
			duration: animated ? DURATIONS.fast : 0,
			easing: linear,
			css: (t) => `opacity: ${t}`,
		},
		1,
		undefined,
		done
	);
}

function goTo(next: number) {
	if (disabled) return;
	const clamped = Math.max(1, Math.min(Math.floor(next), Math.max(safeCount.value, 1)));
	if (clamped === page.value) return;
	page.value = clamped;
	if (sound) playCue("select");
	onPageChange?.(clamped);
}

// Each handler re-checks the boundary itself rather than trusting the
// `disabled` attribute below — a synthetic click bypasses the native guard,
// as does `fireEvent.click` in tests.
function handlePrevious() {
	if (disabled || isFirst.value) return;
	goTo(safePage.value - 1);
}
function handleNext() {
	if (disabled || isLast.value) return;
	goTo(safePage.value + 1);
}
function handleFirst() {
	if (disabled || isFirst.value) return;
	goTo(1);
}
function handleLast() {
	if (disabled || isLast.value) return;
	goTo(safeCount.value);
}

const pageButtonBase =
	"inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
const navButtonBase =
	"inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
</script>

<template>
	<nav
		ref="navRef"
		:aria-label="label"
		:data-armed="popArmed ? 'true' : undefined"
		:data-indicator="indicatorPlaced ? '' : undefined"
		:class="cn('ft-pagination', className)"
	>
		<ul class="flex items-center gap-1">
			<li v-if="showEdges">
				<button
					type="button"
					:class="navButtonBase"
					:disabled="disabled || isFirst"
					aria-label="First page"
					title="First page"
					@click="handleFirst"
				>
					« First
				</button>
			</li>

			<li>
				<button
					type="button"
					:class="navButtonBase"
					:disabled="disabled || isFirst"
					aria-label="Previous page"
					title="Previous page"
					@click="handlePrevious"
				>
					<slot name="previousLabel">‹ Previous</slot>
				</button>
			</li>

			<TransitionGroup move-class="ft-pagination-move" :css="false" @enter="onItemEnter">
				<li
					v-for="(item, i) in items"
					:key="item === 'ellipsis' ? `ellipsis-${i}` : `page-${item}`"
				>
					<!-- Decorative only: it stands for a run of hidden pages, not a
					     control, so it must not take focus or be reachable by Tab. -->
					<span
						v-if="item === 'ellipsis'"
						aria-hidden="true"
						class="text-muted-foreground flex size-8 items-center justify-center select-none"
					>
						…
					</span>
					<button
						v-else
						type="button"
						:class="
							cn(
								pageButtonBase,
								item === safePage
									? 'bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
							)
						"
						:disabled="disabled"
						:aria-current="item === safePage ? 'page' : undefined"
						:aria-label="`Go to page ${item}`"
						:title="`Go to page ${item}`"
						@click="goTo(item as number)"
					>
						{{ item }}
					</button>
				</li>
			</TransitionGroup>

			<li>
				<button
					type="button"
					:class="navButtonBase"
					:disabled="disabled || isLast"
					aria-label="Next page"
					title="Next page"
					@click="handleNext"
				>
					<slot name="nextLabel">Next ›</slot>
				</button>
			</li>

			<li v-if="showEdges">
				<button
					type="button"
					:class="navButtonBase"
					:disabled="disabled || isLast"
					aria-label="Last page"
					title="Last page"
					@click="handleLast"
				>
					Last »
				</button>
			</li>
		</ul>

		<span ref="indicatorRef" class="ft-pagination-indicator" aria-hidden="true"></span>
	</nav>
</template>

<style scoped>
/*
 * The current-page pill reads the app's semantic `bg-accent` token (the
 * mockup's neutral highlight, not the brand purple) — Pagination never
 * needs the purple accent for its own surface. The focus ring is the one
 * place this component reaches for the shared nav accent, matching
 * ToggleGroupItem's identical `--ft-toggle-group-accent` pattern: no
 * semantic token owns "focus ring purple", so it is declared locally
 * with a light-dark() fallback, retintable from higher up the tree via
 * `--ft-accent`.
 */
.ft-pagination {
	--ft-nav-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}

.ft-pagination button:focus-visible {
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
}

/*
 * The nav is the page buttons' `offsetParent` (no `<ul>`/`<li>` in between
 * is positioned), so `offsetLeft`/`offsetTop` and the pill's own
 * `left: 0; top: 0` share one origin. `isolation` lets the pill sit at
 * `z-index: -1` — above the nav's background, under the buttons.
 */
.ft-pagination {
	position: relative;
	isolation: isolate;
}

.ft-pagination-indicator {
	position: absolute;
	left: 0;
	top: 0;
	z-index: -1;
	pointer-events: none;
	border-radius: var(--radius-md, 0.375rem);
	background: var(--ft-pagination-indicator-color, var(--color-accent));
	opacity: 0;
}

.ft-pagination[data-indicator] .ft-pagination-indicator {
	opacity: 1;
}

/* The pill has taken over: the current button's own fill steps aside. */
.ft-pagination[data-indicator] button[aria-current="page"] {
	background: transparent;
}

/*
 * 300ms = tokens.DURATIONS.base, cubic-bezier(0.16, 1, 0.3, 1) =
 * tokens.EASINGS.out — the same curve and length as the numbers' own
 * glide, so the pill lands with its number. Gated: under reduced
 * motion the pill still follows the page, it just arrives.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-pagination[data-armed="true"] .ft-pagination-indicator {
		transition: transform
			var(
				--ft-pagination-slide-duration,
				var(--ft-pagination-pop-duration, var(--ft-duration-base, 300ms))
			)
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}

	/*
	 * The numbers' glide when the visible run shifts: the list's move
	 * class, on the pill's own duration and curve (the CSS twin of the
	 * source's 300 ms expo-out FLIP). Outside this block the class has no
	 * transform transition, so under reduced motion the list does not
	 * glide at all — the source's zero-duration flip.
	 */
	.ft-pagination-move {
		transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
	}
}
</style>
