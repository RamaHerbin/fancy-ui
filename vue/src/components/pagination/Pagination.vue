<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface PaginationProps {
	/** Total number of pages. */
	count: number;
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
	/** Called with the new page whenever it changes, however the change happened. */
	onPageChange?: (page: number) => void;
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
import { computed, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { buildPageRange } from "./pagination-range.js";

defineOptions({ name: "Pagination", inheritAttrs: false });

const {
	count,
	siblingCount = 1,
	boundaryCount = 1,
	showEdges = false,
	disabled = false,
	label = "Pagination",
	onPageChange,
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

// The current-page pill pops when the page changes — but a bare
// `[aria-current="page"] { animation: … }` also fires on first paint, for
// whichever page happens to already be current. That reads as a glitch on
// load, so the animation is armed only once the page has really moved, and
// the flag is a `data-*` attribute the CSS selects on rather than a class
// (nothing else keys off it, and it stays out of the merged class string).
//
// Armed off `safePage`, not from inside `goTo()`: a controlled `Pagination`
// whose `page` prop is changed from outside never calls `goTo`, and its pill
// should pop just the same. A plain `watch` with no `immediate` never fires
// on its first tick, which is what keeps the very first paint unarmed
// without a separate baseline value to seed (the source's `untrack` read).
const popArmed = ref(false);
watch(
	safePage,
	() => {
		popArmed.value = true;
	},
	{ flush: "post" }
);

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

			<li v-for="(item, i) in items" :key="item === 'ellipsis' ? `ellipsis-${i}` : `page-${item}`">
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
	 * The newly-current page pops once, so the eye can find where it landed
	 * without hunting for a colour change among nine identical squares.
	 *
	 * `transform` only: `box-shadow` on this same button is the focus ring
	 * above, and a focus ring must never animate. `data-armed` keeps the pop
	 * off the first paint (see the script). `--ft-ease-out` because the pill
	 * arrives at its new place — it is not toggling in position.
	 *
	 * 150ms = tokens.DURATIONS.fast, cubic-bezier(0.16, 1, 0.3, 1) = tokens.EASINGS.out
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-pagination[data-armed="true"] button[aria-current="page"] {
			animation: ft-pagination-pop var(--ft-pagination-pop-duration, var(--ft-duration-fast, 150ms))
				var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
		}
	}

	/* 0.92 is the library's scale floor — the same value every entrance preset
	   starts from, so a pop and a panel opening read as one vocabulary. */
	@keyframes ft-pagination-pop {
		from {
			transform: scale(0.92);
		}
		to {
			transform: scale(1);
		}
	}
</style>
